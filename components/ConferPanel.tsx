'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import {
  Video,
  Mic,
  MicOff,
  VideoOff,
  PhoneOff,
  Phone,
  Users,
  Calendar,
  Clock,
  ChevronRight,
  Share2,
  MessageSquare,
  Camera,
  Volume2,
  Copy,
  CheckCircle,
  X,
  Sparkles
} from 'lucide-react';

interface Participant {
  id: string;
  name: string;
  stream?: MediaStream;
  videoEnabled: boolean;
  audioEnabled: boolean;
}

const generateRoomId = () => Math.random().toString(36).substring(2, 10);

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
      <div className="flex flex-col h-full overflow-y-auto bg-memu-canvas animate-page-enter">
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center w-full max-w-2xl mx-auto">
          {/* Premium Header with rounded rectangle icon */}
          <div className="relative w-32 h-32 mb-8 animate-fade-in-scale">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-3xl blur-2xl animate-pulse" />
            <div className="relative bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl w-32 h-32 flex items-center justify-center shadow-xl border border-blue-200/60">
              <Video size={48} strokeWidth={2} className="text-white" />
            </div>
          </div>

          <div className="space-y-2 mb-8">
            <div className="flex items-center gap-3 text-blue-600 justify-center">
              <span className="text-sm font-semibold uppercase tracking-wider">Video Conferencing</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-semibold text-gray-900 leading-tight tracking-tight whitespace-nowrap">
              memu<span className="text-blue-600">-confer</span>
            </h1>
            <div style={{ width: '320px', margin: '0 auto' }}>
              <p className="text-gray-500 text-base font-light">
                Crystal-clear conversations — video, voice, or text.
              </p>
            </div>
          </div>

          {/* ✨ REFINED BUTTONS — Solid blue primary, consistent with MEMU design */}
          <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
            <button
              onClick={startNewCall}
              disabled={isConnecting}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5 transition-all shadow-md disabled:opacity-50 btn-press"
            >
              {isConnecting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Phone size={16} strokeWidth={2} />}
              {isConnecting ? 'Connecting...' : 'Start a Call'}
            </button>
            <button
              onClick={() => setShowJoinInput(!showJoinInput)}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:border-blue-400 hover:text-blue-600 hover:shadow-md transition-all shadow-sm btn-press"
            >
              <Video size={16} strokeWidth={2} /> Join with Code
            </button>
          </div>

          {showJoinInput && (
            <div className="flex gap-3 w-full max-w-md animate-fade-in-scale">
              <input
                type="text"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value)}
                placeholder="Enter room ID"
                className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition bg-white"
              />
              <button
                onClick={() => joinCall(joinRoomId)}
                disabled={isConnecting}
                className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5 transition-all shadow-md disabled:opacity-50 btn-press"
              >
                Join
              </button>
            </div>
          )}

          {callError && (
            <div className="mt-6 flex items-center gap-2 text-sm p-3 rounded-xl font-medium bg-rose-50 text-rose-700 border border-rose-200 animate-fade-in-scale">
              <X size={16} strokeWidth={2} />
              {callError}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ----- In call UI (unchanged) -----
  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-900 to-gray-950 animate-page-enter">
      {/* Header */}
      <div className="px-6 py-4 bg-black/40 backdrop-blur-sm flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-white/70 text-xs font-bold uppercase tracking-wider">Live</span>
          <span className="text-white/40 text-xs ml-2 font-medium">Room: {roomId}</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={copyRoomId} className="flex items-center gap-2 text-white/60 hover:text-white transition text-xs font-semibold btn-press">
            {copied ? <CheckCircle size={14} strokeWidth={2} className="text-emerald-500" /> : <Copy size={14} strokeWidth={2} />}
            {copied ? 'Copied' : 'Copy ID'}
          </button>
          <button onClick={endCall} className="flex items-center gap-2 bg-rose-500/80 hover:bg-rose-600 text-white rounded-full px-4 py-2 text-xs font-semibold transition-all btn-press">
            <PhoneOff size={12} strokeWidth={2} /> Leave
          </button>
        </div>
      </div>

      {/* Video grid */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Self video */}
          <div className="relative bg-gray-800 rounded-2xl overflow-hidden aspect-video shadow-2xl ring-1 ring-white/10 animate-slide-up" style={{ animationDelay: '0ms', opacity: 0 }}>
            <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            {!localStream && <div className="absolute inset-0 flex items-center justify-center text-white/60 font-medium">Connecting...</div>}
            <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5 text-white text-xs font-semibold flex items-center gap-2">
              <Sparkles size={10} strokeWidth={2} className="text-blue-400" />
              You {isVideoOff && '(cam off)'}
            </div>
          </div>
          {/* Remote participants */}
          {participants.filter(p => p.id !== currentUserId.current).map((p, idx) => (
            <div key={p.id} className="relative bg-gray-800 rounded-2xl overflow-hidden aspect-video shadow-2xl ring-1 ring-white/10 animate-slide-up" style={{ animationDelay: `${(idx + 1) * 100}ms`, opacity: 0 }}>
              {p.stream ? (
                <video autoPlay playsInline className="w-full h-full object-cover" ref={el => { if (el && p.stream) el.srcObject = p.stream; }} />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-lg">
                      <span className="text-white text-xl font-bold">{p.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <p className="text-white/80 text-sm font-semibold">{p.name}</p>
                  </div>
                </div>
              )}
              <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5 text-white text-xs font-semibold">{p.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Controls - Premium pill */}
      <div className="pb-8 pt-4 px-6">
        <div className="flex items-center justify-center gap-3 bg-black/60 backdrop-blur-xl rounded-full w-fit mx-auto px-5 py-3 border border-white/10 shadow-2xl animate-fade-in-scale">
          <button
            onClick={toggleMute}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-105 btn-press ${
              isMuted ? 'bg-rose-500 hover:bg-rose-600' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            {isMuted ? <MicOff size={20} strokeWidth={2} className="text-white" /> : <Mic size={20} strokeWidth={2} className="text-white" />}
          </button>
          <button
            onClick={toggleVideo}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-105 btn-press ${
              isVideoOff ? 'bg-rose-500 hover:bg-rose-600' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            {isVideoOff ? <VideoOff size={20} strokeWidth={2} className="text-white" /> : <Video size={20} strokeWidth={2} className="text-white" />}
          </button>
          <button
            onClick={copyRoomId}
            className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all hover:scale-105 btn-press"
          >
            <Share2 size={20} strokeWidth={2} className="text-white" />
          </button>
          <button
            onClick={endCall}
            className="w-12 h-12 rounded-full bg-rose-500 hover:bg-rose-600 flex items-center justify-center transition-all hover:scale-105 btn-press"
          >
            <PhoneOff size={20} strokeWidth={2} className="text-white" />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
      `}</style>
    </div>
  );
}