'use client';

import { useState } from 'react';
import { Video, Mic, MicOff, VideoOff, PhoneOff, Phone, Users, Calendar, Clock, ChevronRight, Share2, MessageSquare, Camera, Volume2 } from 'lucide-react';

interface UpcomingCall {
  id: string;
  title: string;
  time: string;
  date: string;
  participants: string[];
  type: 'scheduled' | 'recurring';
}

const upcomingCalls: UpcomingCall[] = [
  {
    id: '1',
    title: 'Product Sync',
    time: '2:00 PM',
    date: 'Today',
    participants: ['Aisha', 'David', 'Tobias', 'Amara'],
    type: 'scheduled',
  },
  {
    id: '2',
    title: 'Client Review — Nairobi Brief',
    time: '4:30 PM',
    date: 'Today',
    participants: ['Nairobi Design Co.', 'You'],
    type: 'scheduled',
  },
  {
    id: '3',
    title: '1:1 with Maria',
    time: '10:00 AM',
    date: 'Tomorrow',
    participants: ['Maria Santos'],
    type: 'scheduled',
  },
  {
    id: '4',
    title: 'Weekly Design Standup',
    time: '11:00 AM',
    date: 'Thursday',
    participants: ['David', 'Nairobi Design Co.', 'You'],
    type: 'recurring',
  },
  {
    id: '5',
    title: 'Board Deck Review',
    time: '3:00 PM',
    date: 'Friday',
    participants: ['Aisha', 'Exec Team'],
    type: 'scheduled',
  },
];

export default function ConferPanel() {
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [activeCall, setActiveCall] = useState<UpcomingCall | null>(null);
  const [showShareMenu, setShowShareMenu] = useState(false);

  const handleJoinCall = (call: UpcomingCall) => {
    setActiveCall(call);
    setIsInCall(true);
    setIsMuted(false);
    setIsVideoOff(false);
  };

  const handleEndCall = () => {
    setIsInCall(false);
    setActiveCall(null);
    setShowShareMenu(false);
  };

  const handleStartNewCall = () => {
    setActiveCall({
      id: 'new',
      title: 'Quick Call',
      time: 'Now',
      date: 'Today',
      participants: ['Invite people...'],
      type: 'scheduled',
    });
    setIsInCall(true);
    setIsMuted(false);
    setIsVideoOff(false);
  };

  const handleScheduleCall = () => {
    alert('Schedule a call — calendar integration coming soon! 📅');
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-[#fafaf8] to-[#f2f1ee]">
      {!isInCall ? (
        // Not in call — show confer lobby
        <div className="flex-1 overflow-y-auto">
          {/* Hero Section */}
          <div className="flex flex-col items-center justify-center text-center py-16 px-4">
            <div className="w-20 h-20 rounded-full bg-[#0f0f0f] flex items-center justify-center mb-6">
              <Video size={36} className="text-white" />
            </div>
             <h1 className="font-['Playfair_Display'] text-4xl font-normal text-[#0f0f0f] mb-3">
  memu<span className="text-[#4f46e5] italic">-confer</span>
</h1>
<p className="body max-w-md mb-8 leading-relaxed">
  Crystal-clear conversations — video, voice, or text. Scheduled or spontaneous. Your call.
</p>           <div className="flex gap-3">
              <button
                onClick={handleStartNewCall}
                className="flex items-center gap-2 bg-[#0f0f0f] text-white rounded-md px-3 md:px-6 py-3 text-[14px] font-medium hover:bg-[#2a2a2a] hover:-translate-y-0.5 transition shadow-md"
              >
                <Phone size={16} />
                Start a Call
              </button>
              <button
                onClick={handleScheduleCall}
                className="flex items-center gap-2 bg-white border border-[#e8e7e3] text-[#0f0f0f] rounded-md px-3 md:px-6 py-3 text-[14px] font-medium hover:border-[#777] hover:-translate-y-0.5 transition"
              >
                <Calendar size={16} />
                Schedule
              </button>
            </div>
          </div>

          {/* Upcoming Calls Section */}
          <div className="max-w-3xl mx-auto px-4 md:px-4 md:px-8 pb-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[15px] font-medium text-[#0f0f0f] flex items-center gap-2">
                <Clock size={16} className="text-[#777]" />
                Upcoming calls
              </h2>
              <button 
                onClick={handleScheduleCall}
                className="text-[12px] text-[#4f46e5] hover:underline"
              >
                + Schedule
              </button>
            </div>
            <div className="space-y-2">
              {upcomingCalls.map((call) => (
                <div
                  key={call.id}
                  className="bg-white border border-[#e8e7e3] rounded-xl p-4 hover:border-[#d0cfc9] hover:shadow-sm transition group"
                >
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-[14px] font-medium text-[#0f0f0f]">{call.title}</h3>
                        {call.type === 'recurring' && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#e0e7ff] text-[#4338ca]">
                            Recurring
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-[12px] text-[#777]">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {call.date} at {call.time}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users size={12} />
                          {call.participants.join(', ')}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleJoinCall(call)}
                      className="flex items-center gap-1.5 bg-[#4f46e5] text-white rounded-md px-4 py-2 text-[12px] font-medium hover:bg-[#4338ca] transition"
                    >
                      <Video size={14} />
                      Join
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="mt-8 grid grid-cols-3 gap-3">
              <button className="bg-white border border-[#e8e7e3] rounded-xl p-4 text-center hover:border-[#d0cfc9] hover:shadow-sm transition">
                <div className="w-10 h-10 rounded-full bg-[#f2f1ee] flex items-center justify-center mx-auto mb-2">
                  <Video size={18} className="text-[#0f0f0f]" />
                </div>
                <div className="text-[12px] font-medium text-[#0f0f0f]">New Meeting</div>
                <div className="text-[10px] text-[#777]">Start instantly</div>
              </button>
              <button className="bg-white border border-[#e8e7e3] rounded-xl p-4 text-center hover:border-[#d0cfc9] hover:shadow-sm transition">
                <div className="w-10 h-10 rounded-full bg-[#f2f1ee] flex items-center justify-center mx-auto mb-2">
                  <Share2 size={18} className="text-[#0f0f0f]" />
                </div>
                <div className="text-[12px] font-medium text-[#0f0f0f]">Join with Code</div>
                <div className="text-[10px] text-[#777]">Enter meeting ID</div>
              </button>
              <button className="bg-white border border-[#e8e7e3] rounded-xl p-4 text-center hover:border-[#d0cfc9] hover:shadow-sm transition">
                <div className="w-10 h-10 rounded-full bg-[#f2f1ee] flex items-center justify-center mx-auto mb-2">
                  <MessageSquare size={18} className="text-[#0f0f0f]" />
                </div>
                <div className="text-[12px] font-medium text-[#0f0f0f]">Call History</div>
                <div className="text-[10px] text-[#777]">Recent calls</div>
              </button>
            </div>
          </div>
        </div>
      ) : (
        // In call — show conference interface
        <div className="flex-1 flex flex-col">
          {/* Video Grid */}
          <div className="flex-1 bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full">
              {/* Self video */}
              <div className="relative bg-[#2a2a2a] rounded-xl overflow-hidden aspect-video">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-20 h-20 rounded-full bg-[#4f46e5] flex items-center justify-center mx-auto mb-3">
                      <span className="text-white text-2xl font-medium">JM</span>
                    </div>
                    <p className="text-white text-sm font-medium">You {isVideoOff && '(Video Off)'}</p>
                  </div>
                </div>
                {!isVideoOff && (
                  <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-sm rounded-md px-2 py-1">
                    <span className="text-white text-[10px]">You</span>
                  </div>
                )}
              </div>

              {/* Participant videos */}
              {activeCall?.participants.slice(0, 4).map((participant, idx) => (
                <div key={idx} className="relative bg-[#2a2a2a] rounded-xl overflow-hidden aspect-video">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-full bg-[#777] flex items-center justify-center mx-auto mb-2">
                        <span className="text-white text-lg font-medium">
                          {participant.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <p className="text-white/80 text-sm">{participant}</p>
                    </div>
                  </div>
                  <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-sm rounded-md px-2 py-1">
                    <span className="text-white text-[10px]">{participant}</span>
                  </div>
                </div>
              ))}

              {/* Empty slots */}
              {activeCall && activeCall.participants.length < 3 && (
                <div className="bg-[#2a2a2a]/50 rounded-xl border-2 border-dashed border-[#555] flex items-center justify-center aspect-video">
                  <div className="text-center">
                    <Users size={32} className="text-[#777] mx-auto mb-2" />
                    <p className="text-[#777] text-sm">Waiting for more participants...</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Call Controls */}
          <div className="bg-white border-t border-[#e8e7e3] py-4 px-3 md:px-6">
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition ${
                  isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-[#f2f1ee] hover:bg-[#e8e7e3]'
                }`}
              >
                {isMuted ? <MicOff size={20} className="text-white" /> : <Mic size={20} className="text-[#0f0f0f]" />}
              </button>

              <button
                onClick={() => setIsVideoOff(!isVideoOff)}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition ${
                  isVideoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-[#f2f1ee] hover:bg-[#e8e7e3]'
                }`}
              >
                {isVideoOff ? <VideoOff size={20} className="text-white" /> : <Video size={20} className="text-[#0f0f0f]" />}
              </button>

              <button className="w-12 h-12 rounded-full bg-[#f2f1ee] hover:bg-[#e8e7e3] flex items-center justify-center transition">
                <Share2 size={20} className="text-[#0f0f0f]" />
              </button>

              <button className="w-12 h-12 rounded-full bg-[#f2f1ee] hover:bg-[#e8e7e3] flex items-center justify-center transition">
                <Camera size={20} className="text-[#0f0f0f]" />
              </button>

              <button className="w-12 h-12 rounded-full bg-[#f2f1ee] hover:bg-[#e8e7e3] flex items-center justify-center transition">
                <MessageSquare size={20} className="text-[#0f0f0f]" />
              </button>

               <button
  onClick={handleEndCall}
  className="w-12 h-12 rounded-full bg-[#dc2626] hover:bg-[#b91c1c] flex items-center justify-center transition"
>
  <PhoneOff size={20} className="text-white" />
</button>           </div>

            {/* Call info */}
            <div className="text-center mt-4">
              <p className="text-[12px] text-[#777]">
                {activeCall?.title} • {activeCall?.participants.length} participants
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
