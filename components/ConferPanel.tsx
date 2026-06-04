
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  Video, Mic, MicOff, VideoOff, PhoneOff, Phone, Users, 
  Calendar, Clock, ChevronRight, Share2, MessageSquare, 
  Camera, Volume2, Copy, CheckCircle, X 
} from 'lucide-react';

// ---------- Types ----------
interface Participant {
  id: string;
  name: string;
  stream?: MediaStream;
  videoEnabled: boolean;
  audioEnabled: boolean;
}

interface CallRoom {
  id: string;
  title: string;
  participants: Participant[];
  createdBy: string;
}

// ---------- Helper: generate random room ID ----------
const generateRoomId = () => Math.random().toString(36).substring(2, 10);

// ---------- Main Component ----------
export default function ConferPanel() {
  const [isInCall, setIsInCall] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callTitle, setCallTitle] = useState('');
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [copied, setCopied] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const channelRef = useRef<any>(null);
  const currentUserId = useRef<string>('');

  // Get current user name from Supabase auth
  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Get profile to show name
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        currentUserId.current = user.id;
        // Store name in participant list
        const userName = profile?.full_name || user.email?.split('@')[0] || 'Anonymous';
        // We'll use this when adding self later
        (window as any).__conferUserName = userName;
      }
    };
    getUser();
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        const supabase = createClient();
        supabase.removeChannel(channelRef.current);
      }
      if (localStream) localStream.getTracks().forEach(track => track.stop());
      peerConnectionsRef.current.forEach(pc => pc.close());
    };
  }, []);

  // Get local media
  const getLocalMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      return stream;
    } catch (err) {
      console.error('Media error:', err);
      setCallError('Could not access camera/microphone. Please check permissions.');
      return null;
    }
  };

  // Create a new call (host)
  const startNewCall = async () => {
    const newRoomId = generateRoomId();
    const userName = (window as any).__conferUserName || 'You';
    const stream = await getLocalMedia();
    if (!stream) return;

    setRoomId(newRoomId);
    setCallTitle(`Call ${newRoomId}`);
    setIsInCall(true);
    setParticipants([{ id: currentUserId.current, name: userName, videoEnabled: true, audioEnabled: true }]);

    // Join Realtime channel
    const supabase = createClient();
    const channel = supabase.channel(`call:${newRoomId}`, {
      config: { broadcast: { self: true } }
    });
    channelRef.current = channel;

    channel.on('broadcast', { event: 'signal' }, async ({ payload }) => {
      const { fromId, signal } = payload;
      if (fromId === currentUserId.current) return;
      let pc = peerConnectionsRef.current.get(fromId);
      if (!pc && signal.type === 'offer') {
        // Create answer
        pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        peerConnectionsRef.current.set(fromId, pc);
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            channel.send({ type: 'broadcast', event: 'signal', payload: { fromId: currentUserId.current, signal: { type: 'candidate', candidate: event.candidate } } });
          }
        };
        pc.ontrack = (event) => {
          setParticipants(prev => {
            const existing = prev.find(p => p.id === fromId);
            if (existing) return prev;
            return [...prev, { id: fromId, name: `Guest ${fromId.slice(0,4)}`, stream: event.streams[0], videoEnabled: true, audioEnabled: true }];
          });
        };
        localStream?.getTracks().forEach(track => {
          if (localStream) pc?.addTrack(track, localStream);
        });
        await pc.setRemoteDescription(new RTCSessionDescription(signal));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        channel.send({ type: 'broadcast', event: 'signal', payload: { fromId: currentUserId.current, signal: answer } });
      } else if (signal.type === 'answer' && pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal));
      } else if (signal.type === 'candidate' && pc) {
        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
      }
    });

    await channel.subscribe();

    // Announce self presence
    channel.send({ type: 'broadcast', event: 'signal', payload: { fromId: currentUserId.current, signal: { type: 'new-participant' } } });
  };

  // Join existing call with room ID
  const joinCall = async (joinId: string) => {
    const stream = await getLocalMedia();
    if (!stream) return;
    const userName = (window as any).__conferUserName || 'You';
    setRoomId(joinId);
    setCallTitle(`Call ${joinId}`);
    setIsInCall(true);
    setParticipants([{ id: currentUserId.current, name: userName, videoEnabled: true, audioEnabled: true }]);

    const supabase = createClient();
    const channel = supabase.channel(`call:${joinId}`, {
      config: { broadcast: { self: true } }
    });
    channelRef.current = channel;

    channel.on('broadcast', { event: 'signal' }, async ({ payload }) => {
      const { fromId, signal } = payload;
      if (fromId === currentUserId.current) return;
      let pc = peerConnectionsRef.current.get(fromId);
      if (!pc && signal.type === 'offer') {
        // Answer
        pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        peerConnectionsRef.current.set(fromId, pc);
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            channel.send({ type: 'broadcast', event: 'signal', payload: { fromId: currentUserId.current, signal: { type: 'candidate', candidate: event.candidate } } });
          }
        };
        pc.ontrack = (event) => {
          setParticipants(prev => {
            if (prev.find(p => p.id === fromId)) return prev;
            return [...prev, { id: fromId, name: `Guest ${fromId.slice(0,4)}`, stream: event.streams[0], videoEnabled: true, audioEnabled: true }];
          });
        };
        localStream?.getTracks().forEach(track => {
          if (localStream) pc?.addTrack(track, localStream);
        });
        await pc.setRemoteDescription(new RTCSessionDescription(signal));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        channel.send({ type: 'broadcast', event: 'signal', payload: { fromId: currentUserId.current, signal: answer } });
      } else if (signal.type === 'offer' && pc) {
        // If we're the caller, we already created an offer; ignore
      } else if (signal.type === 'answer' && pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal));
      } else if (signal.type === 'candidate' && pc) {
        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
      }
    });

    await channel.subscribe();

    // Send offer to all existing participants after a short delay
    setTimeout(async () => {
      for (const [id, pc] of peerConnectionsRef.current) {
        if (id !== currentUserId.current) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          channel.send({ type: 'broadcast', event: 'signal', payload: { fromId: currentUserId.current, signal: offer } });
        }
      }
    }, 500);
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const endCall = () => {
    if (channelRef.current) {
      const supabase = createClient();
      supabase.removeChannel(channelRef.current);
    }
    if (localStream) localStream.getTracks().forEach(track => track.stop());
    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();
    setLocalStream(null);
    setIsInCall(false);
    setRoomId('');
    setParticipants([]);
    setCallError(null);
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ----- Render lobby (not in call) -----
  if (!isInCall) {
    return (
      <div className="flex flex-col h-full overflow-y-auto bg-gradient-to-br from-[#fafaf8] to-[#f2f1ee]">
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="w-20 h-20 rounded-full bg-[#0f0f0f] flex items-center justify-center mb-6">
            <Video size={36} className="text-white" />
          </div>
          <h1 className="font-['Playfair_Display'] text-4xl font-normal text-[#0f0f0f] mb-3">
            memu<span className="text-[#4f46e5] italic">-confer</span>
          </h1>
          <p className="max-w-md mb-8 text-[#777]">Crystal-clear conversations — video, voice, or text.</p>
          <div className="flex gap-3">
            <button onClick={startNewCall} className="flex items-center gap-2 bg-[#0f0f0f] text-white rounded-md px-6 py-3 text-sm font-medium hover:bg-[#2a2a2a] transition shadow-md">
              <Phone size={16} /> Start a Call
            </button>
            <button onClick={() => setShowJoinInput(!showJoinInput)} className="flex items-center gap-2 bg-white border border-[#e8e7e3] rounded-md px-6 py-3 text-sm font-medium hover:border-[#777] transition">
              <Video size={16} /> Join with Code
            </button>
          </div>
          {showJoinInput && (
            <div className="mt-6 flex gap-2">
              <input
                type="text"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value)}
                placeholder="Enter room ID"
                className="border border-[#e8e7e3] rounded-md px-3 py-2 text-sm"
              />
              <button onClick={() => joinCall(joinRoomId)} className="bg-[#4f46e5] text-white px-4 py-2 rounded-md text-sm">Join</button>
            </div>
          )}
          {callError && <p className="mt-4 text-red-500 text-sm">{callError}</p>}
        </div>
      </div>
    );
  }

  // ----- In call UI -----
  return (
    <div className="flex flex-col h-full bg-[#1a1a1a]">
      {/* Video grid */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Self video */}
          <div className="relative bg-[#2a2a2a] rounded-xl overflow-hidden aspect-video">
            <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            {!localStream && <div className="absolute inset-0 flex items-center justify-center text-white">Connecting...</div>}
            <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm rounded-md px-2 py-1 text-white text-xs">You {isVideoOff && '(cam off)'}</div>
          </div>
          {/* Remote participants */}
          {participants.filter(p => p.id !== currentUserId.current).map(p => (
            <div key={p.id} className="relative bg-[#2a2a2a] rounded-xl overflow-hidden aspect-video">
              {p.stream ? (
                <video autoPlay playsInline className="w-full h-full object-cover" ref={el => { if (el && p.stream) el.srcObject = p.stream; }} />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-[#777] flex items-center justify-center mx-auto mb-2">
                      <span className="text-white text-lg font-medium">{p.name.charAt(0)}</span>
                    </div>
                    <p className="text-white/80 text-sm">{p.name}</p>
                  </div>
                </div>
              )}
              <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm rounded-md px-2 py-1 text-white text-xs">{p.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="bg-[#0f0f0f] border-t border-[#2a2a2a] py-4 px-3">
        <div className="flex items-center justify-center gap-4">
          <button onClick={toggleMute} className={`w-12 h-12 rounded-full flex items-center justify-center transition ${isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-[#2a2a2a] hover:bg-[#3a3a3a]'}`}>
            {isMuted ? <MicOff size={20} className="text-white" /> : <Mic size={20} className="text-white" />}
          </button>
          <button onClick={toggleVideo} className={`w-12 h-12 rounded-full flex items-center justify-center transition ${isVideoOff ? 'bg-red-600 hover:bg-red-700' : 'bg-[#2a2a2a] hover:bg-[#3a3a3a]'}`}>
            {isVideoOff ? <VideoOff size={20} className="text-white" /> : <Video size={20} className="text-white" />}
          </button>
          <button onClick={copyRoomId} className="w-12 h-12 rounded-full bg-[#2a2a2a] hover:bg-[#3a3a3a] flex items-center justify-center transition relative">
            {copied ? <CheckCircle size={20} className="text-green-400" /> : <Share2 size={20} className="text-white" />}
          </button>
          <button onClick={endCall} className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition">
            <PhoneOff size={20} className="text-white" />
          </button>
        </div>
        <div className="text-center mt-3 text-white/60 text-xs">Room ID: {roomId} {copied && '(copied)'}</div>
      </div>
    </div>
  );
}