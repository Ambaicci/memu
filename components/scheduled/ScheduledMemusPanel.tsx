'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, Send, Trash2, Edit2, X, AlertCircle } from 'lucide-react';

interface ScheduledMemu {
  id: number;
  to: string[];
  subject: string;
  nature: string;
  body: string;
  scheduledFor: string;
  createdAt: string;
}

export default function ScheduledMemusPanel() {
  const [scheduledMemus, setScheduledMemus] = useState<ScheduledMemu[]>([]);
  const [selectedMemu, setSelectedMemu] = useState<ScheduledMemu | null>(null);

  useEffect(() => {
    loadScheduledMemus();
    
    // Check every minute for memus to send
    const interval = setInterval(() => {
      checkAndSendScheduledMemus();
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const loadScheduledMemus = () => {
    const saved = localStorage.getItem('scheduled_memus');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Sort by scheduled time (soonest first)
      parsed.sort((a: ScheduledMemu, b: ScheduledMemu) => 
        new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()
      );
      setScheduledMemus(parsed);
    }
  };

  const checkAndSendScheduledMemus = () => {
    const now = new Date();
    const toSend: ScheduledMemu[] = [];
    const remaining: ScheduledMemu[] = [];
    
    scheduledMemus.forEach(memu => {
      if (new Date(memu.scheduledFor) <= now) {
        toSend.push(memu);
      } else {
        remaining.push(memu);
      }
    });
    
    if (toSend.length > 0) {
      // Send each scheduled memu
      toSend.forEach(memu => {
        console.log('Sending scheduled memu:', memu);
        // Here you would actually send the memu
        alert(`📬 Sent scheduled memu: "${memu.subject}"`);
      });
      
      // Update localStorage
      localStorage.setItem('scheduled_memus', JSON.stringify(remaining));
      setScheduledMemus(remaining);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('Delete this scheduled memu? It cannot be undone.')) {
      const updated = scheduledMemus.filter(m => m.id !== id);
      localStorage.setItem('scheduled_memus', JSON.stringify(updated));
      setScheduledMemus(updated);
    }
  };

  const handleEdit = (memu: ScheduledMemu) => {
    setSelectedMemu(memu);
    alert(`Edit scheduled memu: "${memu.subject}" - Coming soon!`);
  };

  const formatScheduledTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diff < 0) return 'Overdue';
    if (hours > 24) return date.toLocaleDateString();
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#fafaf8] to-[#f2f1ee]">
      {/* Header */}
      <div className="border-b border-[#e8e7e3] bg-white/80 backdrop-blur-sm px-6 py-5">
        <div className="flex items-center gap-2 mb-1">
          <Calendar size={20} className="text-[#4f46e5]" />
          <h1 className="text-[18px] font-medium text-[#0f0f0f]">Scheduled Memus</h1>
        </div>
        <p className="body-small">Write now, send later</p>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-6">
        {scheduledMemus.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-[#f2f1ee] flex items-center justify-center mb-4">
              <Calendar size={32} className="text-[#aaa]" />
            </div>
            <h3 className="text-[16px] font-medium text-[#0f0f0f] mb-1">No scheduled memus</h3>
            <p className="text-[13px] text-[#777]">Schedule memus to be sent at a future time</p>
          </div>
        ) : (
          <div className="space-y-3">
            {scheduledMemus.map((memu) => (
              <div
                key={memu.id}
                className="bg-white rounded-xl border border-[#e8e7e3] p-4 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-[15px] font-medium text-[#0f0f0f]">{memu.subject}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#cffafe] text-[#0891b2]">
                        {memu.nature}
                      </span>
                    </div>
                    <div className="text-[12px] text-[#777] mb-2">
                      To: {memu.to.join(', ')}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-[11px] text-[#4f46e5]">
                        <Clock size={12} />
                        <span>Sends in {formatScheduledTime(memu.scheduledFor)}</span>
                      </div>
                      <div className="text-[10px] text-[#aaa]">
                        {new Date(memu.scheduledFor).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(memu)}
                      className="p-1.5 rounded-lg hover:bg-[#f2f1ee] transition"
                      title="Edit"
                    >
                      <Edit2 size={14} className="text-[#777]" />
                    </button>
                    <button
                      onClick={() => handleDelete(memu.id)}
                      className="p-1.5 rounded-lg hover:bg-[#fee2e2] transition"
                      title="Delete"
                    >
                      <Trash2 size={14} className="text-[#777] hover:text-[#dc2626]" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}