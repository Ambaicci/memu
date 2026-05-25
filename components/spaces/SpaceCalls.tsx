'use client';

import { useState } from 'react';
import { Phone, Video, Calendar, Clock, Users, Plus, X, ChevronRight } from 'lucide-react';

interface Call {
  id: string;
  title: string;
  time: string;
  date: string;
  participants: string[];
  type: 'scheduled' | 'recurring';
  isVideo?: boolean;
}

interface SpaceCallsProps {
  spaceId: string;
  initialCalls: Call[];
}

export default function SpaceCalls({ spaceId, initialCalls }: SpaceCallsProps) {
  const [calls, setCalls] = useState<Call[]>(initialCalls);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCall, setNewCall] = useState({ title: '', date: '', time: '', participants: '', isVideo: true });

  const handleJoinCall = (call: Call) => {
    alert(`Joining ${call.title}...`);
  };

  const handleCreateCall = () => {
    if (!newCall.title.trim() || !newCall.date || !newCall.time) return;
    const call: Call = {
      id: Date.now().toString(),
      title: newCall.title,
      date: newCall.date,
      time: newCall.time,
      participants: newCall.participants.split(',').map(p => p.trim()),
      type: 'scheduled',
      isVideo: newCall.isVideo,
    };
    setCalls([...calls, call]);
    setNewCall({ title: '', date: '', time: '', participants: '', isVideo: true });
    setShowCreateModal(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isToday = (dateStr: string) => {
    const today = new Date().toDateString();
    const callDate = new Date(dateStr).toDateString();
    return today === callDate;
  };

  const upcomingCalls = calls.filter(c => new Date(c.date) >= new Date());
  const pastCalls = calls.filter(c => new Date(c.date) < new Date());

  return (
    <div className="space-y-6">
      {/* Create Call Button */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-[#e8e7e3] rounded-xl hover:border-[#4f46e5] transition group"
      >
        <Plus size={18} className="text-[#777] group-hover:text-[#4f46e5]" />
        <span className="text-[13px] text-[#777] group-hover:text-[#4f46e5]">Schedule a Call</span>
      </button>

      {/* Upcoming Calls */}
      {upcomingCalls.length > 0 && (
        <div>
          <h3 className="text-[13px] font-medium text-[#777] mb-3 uppercase tracking-wide">Upcoming</h3>
          <div className="space-y-3">
            {upcomingCalls.map((call) => (
              <div key={call.id} className="bg-white border border-[#e8e7e3] rounded-xl p-4 hover:shadow-md transition">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${call.isVideo ? 'bg-[#ede9fe]' : 'bg-[#d1fae5]'}`}>
                      {call.isVideo ? <Video size={18} className="text-[#4f46e5]" /> : <Phone size={18} className="text-[#059669]" />}
                    </div>
                    <div>
                      <h4 className="text-[14px] font-medium text-[#0f0f0f]">{call.title}</h4>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-[11px] text-[#777] flex items-center gap-1">
                          <Calendar size={11} />
                          {isToday(call.date) ? 'Today' : formatDate(call.date)}
                        </span>
                        <span className="text-[11px] text-[#777] flex items-center gap-1">
                          <Clock size={11} />
                          {call.time}
                        </span>
                        <span className="text-[11px] text-[#777] flex items-center gap-1">
                          <Users size={11} />
                          {call.participants.join(', ')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleJoinCall(call)}
                    className="px-4 py-1.5 bg-[#0f0f0f] text-white rounded-lg text-[11px] font-medium hover:bg-[#2a2a2a] transition flex items-center gap-1"
                  >
                    {call.isVideo ? <Video size={12} /> : <Phone size={12} />}
                    Join
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past Calls */}
      {pastCalls.length > 0 && (
        <div>
          <h3 className="text-[13px] font-medium text-[#777] mb-3 uppercase tracking-wide">Past</h3>
          <div className="space-y-2">
            {pastCalls.map((call) => (
              <div key={call.id} className="bg-white border border-[#e8e7e3] rounded-xl p-3 opacity-70">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${call.isVideo ? 'bg-[#ede9fe]' : 'bg-[#d1fae5]'}`}>
                      {call.isVideo ? <Video size={14} className="text-[#4f46e5]" /> : <Phone size={14} className="text-[#059669]" />}
                    </div>
                    <div>
                      <h4 className="text-[13px] font-medium text-[#0f0f0f]">{call.title}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-[#777]">{formatDate(call.date)}</span>
                        <span className="text-[10px] text-[#777]">•</span>
                        <span className="text-[10px] text-[#777]">{call.time}</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-[#aaa]">Ended</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {calls.length === 0 && (
        <div className="text-center py-12">
          <Phone size={48} className="text-[#aaa] mx-auto mb-4" />
          <p className="text-[14px] text-[#777]">No calls scheduled</p>
          <p className="text-[12px] text-[#aaa] mt-1">Schedule a call to connect with your team</p>
        </div>
      )}

      {/* Create Call Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-2xl w-[450px] max-w-[90%] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[18px] font-semibold text-[#0f0f0f]">Schedule a Call</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-lg hover:bg-[#f2f1ee]">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-[#777] mb-1">Call Title</label>
                <input
                  type="text"
                  value={newCall.title}
                  onChange={(e) => setNewCall({ ...newCall, title: e.target.value })}
                  className="w-full px-4 py-2 border border-[#e8e7e3] rounded-lg text-[14px] focus:outline-none focus:border-[#4f46e5]"
                  placeholder="e.g., Weekly Sync"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#777] mb-1">Date</label>
                  <input
                    type="date"
                    value={newCall.date}
                    onChange={(e) => setNewCall({ ...newCall, date: e.target.value })}
                    className="w-full px-4 py-2 border border-[#e8e7e3] rounded-lg text-[14px] focus:outline-none focus:border-[#4f46e5]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#777] mb-1">Time</label>
                  <input
                    type="time"
                    value={newCall.time}
                    onChange={(e) => setNewCall({ ...newCall, time: e.target.value })}
                    className="w-full px-4 py-2 border border-[#e8e7e3] rounded-lg text-[14px] focus:outline-none focus:border-[#4f46e5]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#777] mb-1">Participants</label>
                <input
                  type="text"
                  value={newCall.participants}
                  onChange={(e) => setNewCall({ ...newCall, participants: e.target.value })}
                  className="w-full px-4 py-2 border border-[#e8e7e3] rounded-lg text-[14px] focus:outline-none focus:border-[#4f46e5]"
                  placeholder="Names separated by commas"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#777] mb-1">Call Type</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setNewCall({ ...newCall, isVideo: true })}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border transition ${
                      newCall.isVideo ? 'border-[#4f46e5] bg-[#ede9fe] text-[#4f46e5]' : 'border-[#e8e7e3] text-[#777]'
                    }`}
                  >
                    <Video size={14} />
                    Video Call
                  </button>
                  <button
                    onClick={() => setNewCall({ ...newCall, isVideo: false })}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border transition ${
                      !newCall.isVideo ? 'border-[#059669] bg-[#d1fae5] text-[#059669]' : 'border-[#e8e7e3] text-[#777]'
                    }`}
                  >
                    <Phone size={14} />
                    Audio Call
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-lg text-[13px] text-[#777] hover:bg-[#f2f1ee] transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCall}
                disabled={!newCall.title || !newCall.date || !newCall.time}
                className="px-4 py-2 rounded-lg text-[13px] font-medium bg-gradient-to-r from-[#4f46e5] to-[#0891b2] text-white hover:shadow-lg transition disabled:opacity-50"
              >
                Schedule Call
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}