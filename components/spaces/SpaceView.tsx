'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import { 
  ArrowLeft, Users, MessageSquare, Settings, Plus, 
  Loader2, Hash, AtSign, Calendar
} from 'lucide-react';
import BoardView from '../boards/BoardView';

interface Member {
  id: string;
  name: string;
  handle: string;
  initials: string;
  color: string;
  textColor: string;
  role: 'member' | 'owner';
}

interface Message {
  id: string;
  author: string;
  content: string;
  timestamp: string;
}

interface Space {
  id: string;
  name: string;
  color: string;
  members: Member[];
  messages: Message[];
}

interface SpaceViewProps {
  spaceId?: string;
}

export default function SpaceView({ spaceId }: SpaceViewProps) {
  const [space, setSpace] = useState<Space | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getUser();
  }, []);

  useEffect(() => {
    if (spaceId && currentUserId) {
      fetchSpace(spaceId);
    }
  }, [spaceId, currentUserId]);

  const fetchSpace = async (id: string) => {
    setLoading(true);
    const supabase = createClient();

    try {
      const { data: spaceData, error: spaceError } = await supabase
        .from('spaces')
        .select('*')
        .eq('id', id)
        .single();

      if (spaceError) throw spaceError;

      const { data: membersData } = await supabase
        .from('space_members')
        .select('user_id, role, profiles(full_name, username)')
        .eq('space_id', id);

      const members: Member[] = (membersData || []).map((m: any, idx: number) => ({
        id: m.user_id,
        name: m.profiles?.full_name || m.profiles?.username || 'Unknown',
        handle: `@${m.profiles?.username || 'user'}`,
        initials: (m.profiles?.full_name || m.profiles?.username || 'U').substring(0, 2).toUpperCase(),
        color: ['#4f46e5', '#059669', '#d97706', '#dc2626', '#8b5cf6'][idx % 5],
        textColor: '#ffffff',
        role: (m.role === 'admin' ? 'owner' : 'member') as 'member' | 'owner',
      }));

      setSpace({
        id: spaceData.id,
        name: spaceData.name,
        color: spaceData.color,
        members,
        messages: [],
      });
    } catch (err) {
      console.error('Error fetching space:', err);
      showToast('Failed to load space', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-[#4f46e5]" />
      </div>
    );
  }

  if (!space) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h3 className="text-[16px] font-medium text-[#0f0f0f] mb-2">Space not found</h3>
          <p className="text-[13px] text-[#777]">This space may have been deleted</p>
        </div>
      </div>
    );
  }

  if (selectedBoard) {
    const boardViewData = {
      id: space.id,
      name: space.name,
      color: space.color,
      members: space.members,
      messages: space.messages,
    };

    return (
      <BoardView
        board={boardViewData as any}
        onBack={() => setSelectedBoard(null)}
        currentUser="You"
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 md:px-8 pt-6 pb-4 border-b border-[#e8e7e3]">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => window.history.back()}
            className="p-2 rounded-lg hover:bg-[#f2f1ee] transition text-[#777]"
          >
            <ArrowLeft size={18} />
          </button>
          <div
            className="w-3 h-3 rounded-full"
            style={{ background: space.color }}
          />
          <h1 className="text-2xl md:text-3xl font-semibold text-[#0f0f0f]">
            {space.name}
          </h1>
        </div>

        <div className="flex items-center gap-4 text-[13px] text-[#777]">
          <div className="flex items-center gap-1.5">
            <Users size={14} />
            <span>{space.members.length} members</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MessageSquare size={14} />
            <span>{space.messages.length} messages</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Members Section */}
          <div className="bg-white border border-[#e8e7e3] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-[#4f46e5]" />
                <h3 className="text-[14px] font-semibold text-[#0f0f0f]">Members</h3>
              </div>
              <button className="p-2 rounded-lg hover:bg-[#f2f1ee] transition text-[#777]">
                <Plus size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {space.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#f9fafb] transition"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-semibold flex-shrink-0"
                    style={{ backgroundColor: member.color, color: member.textColor }}
                  >
                    {member.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-[#0f0f0f] truncate">
                      {member.name}
                    </div>
                    <div className="text-[11px] text-[#777] flex items-center gap-1">
                      <AtSign size={10} />
                      {member.handle}
                    </div>
                  </div>
                  <div className="text-[10px] font-medium uppercase tracking-wider text-[#777]">
                    {member.role}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setSelectedBoard('board')}
              className="bg-white border border-[#e8e7e3] rounded-xl p-5 hover:shadow-md transition-all duration-200 text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-[#ede9fe] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Hash size={18} className="text-[#7c3aed]" />
              </div>
              <h4 className="text-[14px] font-semibold text-[#0f0f0f] mb-1">Board View</h4>
              <p className="text-[12px] text-[#777]">See all activity</p>
            </button>

            <button className="bg-white border border-[#e8e7e3] rounded-xl p-5 hover:shadow-md transition-all duration-200 text-left group">
              <div className="w-10 h-10 rounded-lg bg-[#d1fae5] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <MessageSquare size={18} className="text-[#059669]" />
              </div>
              <h4 className="text-[14px] font-semibold text-[#0f0f0f] mb-1">Messages</h4>
              <p className="text-[12px] text-[#777]">Chat with members</p>
            </button>

            <button className="bg-white border border-[#e8e7e3] rounded-xl p-5 hover:shadow-md transition-all duration-200 text-left group">
              <div className="w-10 h-10 rounded-lg bg-[#fef3c7] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Settings size={18} className="text-[#d97706]" />
              </div>
              <h4 className="text-[14px] font-semibold text-[#0f0f0f] mb-1">Settings</h4>
              <p className="text-[12px] text-[#777]">Manage space</p>
            </button>
          </div>

          {/* Recent Activity */}
          <div className="bg-white border border-[#e8e7e3] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={16} className="text-[#4f46e5]" />
              <h3 className="text-[14px] font-semibold text-[#0f0f0f]">Recent Activity</h3>
            </div>

            {space.messages.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare size={32} className="text-[#aaa] mx-auto mb-3" />
                <p className="text-[13px] text-[#777]">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-3">
                {space.messages.map((msg) => (
                  <div key={msg.id} className="flex items-start gap-3 p-3 rounded-lg bg-[#f9fafb]">
                    <div className="w-8 h-8 rounded-full bg-[#4f46e5] flex items-center justify-center text-white text-[11px] font-semibold flex-shrink-0">
                      {msg.author.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-[#0f0f0f] mb-1">
                        {msg.author}
                      </div>
                      <div className="text-[12px] text-[#3a3a3a]">{msg.content}</div>
                      <div className="text-[10px] text-[#777] mt-1">{msg.timestamp}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}