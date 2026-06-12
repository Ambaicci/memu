'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import { 
  Video, Mic, MicOff, VideoOff, PhoneOff, Phone, Users, 
  Calendar, Clock, ChevronRight, Share2, MessageSquare, 
  Camera, Volume2, Copy, CheckCircle, X, Sparkles
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
  const [isConnecting, setIsConnecting] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const channelRef = useRef<any>(null);
  const currentUserId = useRef<string>('');
  const { showToast } = useToast();

  // Get current user name from Supabase auth
  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        currentUserId.current = user.id;
        const userName = profile?.full_name || user.email?.split('@')[0] || 'Anonymous';
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
      showToast('Camera/microphone access denied', 'error');
      return null;
    }
  };

  // Create a new call (host)
  const startNewCall = async () => {
    const newRoomId = generateRoomId();
    const userName = (window as any).__conferUserName || 'You';
    setIsConnecting(true);
    const stream = await getLocalMedia();
    if (!stream) {
      setIsConnecting(false);
      return;
    }

    setRoomId(newRoomId);
    setCallTitle(`Call ${newRoomId}`);
    setIsInCall(true);
    setParticipants([{ id: currentUserId.current, name: userName, videoEnabled: true, audioEnabled: true }]);

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
      } else if (signal.type === 'answer' && pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal));
      } else if (signal.type === 'candidate' && pc) {
        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
      }
    });

    await channel.subscribe();
    channel.send({ type: 'broadcast', event: 'signal', payload: { fromId: currentUserId.current, signal: { type: 'new-participant' } } });
    setIsConnecting(false);
    showToast(`Call started – Room ID: ${newRoomId}`, 'success');
  };

  // Join existing call with room ID
  const joinCall = async (joinId: string) => {
    if (!joinId.trim()) {
      showToast('Please enter a room ID', 'error');
      return;
    }
    setIsConnecting(true);
    const stream = await getLocalMedia();
    if (!stream) {
      setIsConnecting(false);
      return;
    }
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
        // ignore
      } else if (signal.type === 'answer' && pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal));
      } else if (signal.type === 'candidate' && pc) {
        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
      }
    });

    await channel.subscribe();

    setTimeout(async () => {
      for (const [id, pc] of peerConnectionsRef.current) {
        if (id !== currentUserId.current) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          channel.send({ type: 'broadcast', event: 'signal', payload: { fromId: currentUserId.current, signal: offer } });
        }
      }
    }, 500);
    setIsConnecting(false);
    showToast(`Joined room ${joinId}`, 'success');
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
      showToast(isMuted ? 'Microphone on' : 'Microphone muted', 'info');
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
      showToast(isVideoOff ? 'Camera on' : 'Camera off', 'info');
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
    showToast('Call ended', 'info');
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    showToast('Room ID copied', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  // ----- Render lobby (not in call) -----
  if (!isInCall) {
    return (
      <div className="flex flex-col h-full overflow-y-auto bg-[#fafaf8]">
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-lg mx-auto">
          <div className="w-20 h-20 rounded-full bg-gradient-to-r from-[#4f46e5] to-[#0891b2] flex items-center justify-center mb-6 shadow-lg">
            <Video size={36} className="text-white" />
          </div>
          <h1 className="heading-gradient font-['Playfair_Display'] text-4xl font-medium tracking-tight mb-3">
            memu<span className="text-[#4f46e5]">-confer</span>
          </h1>
          <p className="text-[#777] mb-8">Crystal-clear conversations — video, voice, or text.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              onClick={startNewCall} 
              disabled={isConnecting}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#4f46e5] to-[#0891b2] text-white rounded-full text-sm font-medium hover:from-[#5b21b6] hover:to-[#06b6d4] transition shadow-sm disabled:opacity-50"
            >
              {isConnecting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Phone size={16} />}
              {isConnecting ? 'Connecting...' : 'Start a Call'}
            </button>
            <button 
              onClick={() => setShowJoinInput(!showJoinInput)} 
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-[#e8e7e3] rounded-full text-sm font-medium text-[#777] hover:border-[#4f46e5] hover:text-[#4f46e5] transition"
            >
              <Video size={16} /> Join with Code
            </button>
          </div>
          {showJoinInput && (
            <div className="mt-6 flex gap-2 w-full max-w-sm">
              <input
                type="text"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value)}
                placeholder="Enter room ID"
                className="flex-1 border border-[#e8e7e3] rounded-full px-4 py-2 text-sm focus:outline-none focus:border-[#4f46e5] transition"
              />
              <button 
                onClick={() => joinCall(joinRoomId)} 
                disabled={isConnecting}
                className="bg-gradient-to-r from-[#4f46e5] to-[#0891b2] text-white px-5 py-2 rounded-full text-sm font-medium hover:from-[#5b21b6] hover:to-[#06b6d4] transition disabled:opacity-50"
              >
                Join
              </button>
            </div>
          )}
          {callError && <p className="mt-4 text-red-500 text-sm">{callError}</p>}
        </div>
      </div>
    );
  }

  // ----- In call UI (polished, lighter, with purple accents) -----
  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f]">
      {/* Header */}
      <div className="px-4 py-3 bg-black/40 backdrop-blur-sm flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
          <span className="text-white/70 text-xs font-medium">Live</span>
          <span className="text-white/40 text-xs ml-2">Room: {roomId}</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={copyRoomId} className="flex items-center gap-1 text-white/60 hover:text-white transition text-xs">
            {copied ? <CheckCircle size={14} className="text-[#10b981]" /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy ID'}
          </button>
          <button onClick={endCall} className="flex items-center gap-1 bg-red-500/80 hover:bg-red-600 text-white rounded-full px-3 py-1 text-xs transition">
            <PhoneOff size={12} /> Leave
          </button>
        </div>
      </div>

      {/* Video grid */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Self video */}
          <div className="relative bg-[#2a2a2a] rounded-2xl overflow-hidden aspect-video shadow-lg ring-1 ring-white/10">
            <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            {!localStream && <div className="absolute inset-0 flex items-center justify-center text-white/60">Connecting...</div>}
            <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1 text-white text-xs flex items-center gap-1">
              <Sparkles size={10} className="text-[#4f46e5]" />
              You {isVideoOff && '(cam off)'}
            </div>
          </div>
          {/* Remote participants */}
          {participants.filter(p => p.id !== currentUserId.current).map(p => (
            <div key={p.id} className="relative bg-[#2a2a2a] rounded-2xl overflow-hidden aspect-video shadow-lg ring-1 ring-white/10">
              {p.stream ? (
                <video autoPlay playsInline className="w-full h-full object-cover" ref={el => { if (el && p.stream) el.srcObject = p.stream; }} />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#4f46e5] to-[#0891b2] flex items-center justify-center mx-auto mb-2 shadow-md">
                      <span className="text-white text-lg font-medium">{p.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <p className="text-white/80 text-sm font-medium">{p.name}</p>
                  </div>
                </div>
              )}
              <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1 text-white text-xs">{p.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Controls - Apple‑style pill */}
      <div className="pb-6 pt-2 px-4">
        <div className="flex items-center justify-center gap-4 bg-black/40 backdrop-blur-md rounded-full w-fit mx-auto px-4 py-2 border border-white/10 shadow-lg">
          <button 
            onClick={toggleMute} 
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            {isMuted ? <MicOff size={18} className="text-white" /> : <Mic size={18} className="text-white" />}
          </button>
          <button 
            onClick={toggleVideo} 
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              isVideoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            {isVideoOff ? <VideoOff size={18} className="text-white" /> : <Video size={18} className="text-white" />}
          </button>
          <button 
            onClick={copyRoomId} 
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
          >
            <Share2 size={18} className="text-white" />
          </button>
          <button 
            onClick={endCall} 
            className="w-10 h-10 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all"
          >
            <PhoneOff size={18} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}