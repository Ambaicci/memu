'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import { 
  ArrowLeft, Users, MessageSquare, Settings, Plus, 
  Loader2, AtSign, KanbanSquare, CheckSquare, Send, Paperclip, Smile,
  Crown, Shield, Sparkles, Image, Mic, MoreHorizontal
} from 'lucide-react';

interface Member {
  id: string;
  name: string;
  handle: string;
  initials: string;
  color: string;
  textColor: string;
  role: 'owner' | 'admin' | 'member';
}

interface Message {
  id: string;
  text: string;
  user: Member;
  timestamp: Date;
}

interface Space {
  id: string;
  name: string;
  color: string;
  members: Member[];
}

interface SpaceViewProps {
  spaceId?: string;
}

type TabType = 'chats' | 'boards' | 'tasks' | 'members';

export default function SpaceView({ spaceId }: SpaceViewProps) {
  const [space, setSpace] = useState<Space | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('chats');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [showDemoMessages, setShowDemoMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
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
    } else {
      setLoading(false);
    }
  }, [spaceId, currentUserId]);

  useEffect(() => {
    if (showDemoMessages && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, showDemoMessages]);

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

      const members: Member[] = (membersData || []).map((m: any, idx: number) => {
        let role: 'owner' | 'admin' | 'member' = 'member';
        if (m.role === 'owner') role = 'owner';
        else if (m.role === 'admin') role = 'admin';
        
        return {
          id: m.user_id,
          name: m.profiles?.full_name || m.profiles?.username || 'Unknown',
          handle: `@${m.profiles?.username || 'user'}`,
          initials: (m.profiles?.full_name || m.profiles?.username || 'U').substring(0, 2).toUpperCase(),
          color: ['#4f46e5', '#059669', '#d97706', '#dc2626', '#8b5cf6'][idx % 5],
          textColor: '#ffffff',
          role,
        };
      });

      setSpace({
        id: spaceData.id,
        name: spaceData.name,
        color: spaceData.color || '#4f46e5',
        members,
      });

      // Load demo messages after 1 second for beautiful preview
      setTimeout(() => {
        if (members.length > 0) {
          setMessages([
            {
              id: '1',
              text: 'Hey everyone! Excited to be in this space 🚀',
              user: members[0],
              timestamp: new Date(Date.now() - 3600000),
            },
            {
              id: '2',
              text: 'Welcome! Let\'s build something amazing together.',
              user: members[Math.min(1, members.length - 1)],
              timestamp: new Date(Date.now() - 1800000),
            },
          ]);
          setShowDemoMessages(true);
        }
      }, 1000);
    } catch (err) {
      console.error('Error fetching space:', err);
      showToast('Failed to load space', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = () => {
    if (message.trim() && space && currentUserId) {
      const currentUser = space.members.find(m => m.id === currentUserId);
      if (currentUser) {
        const newMessage: Message = {
          id: Date.now().toString(),
          text: message.trim(),
          user: currentUser,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, newMessage]);
        setMessage('');
        showToast('Message sent! (demo)', 'success');
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    } else if (!space) {
      showToast('Space not ready', 'error');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const tabs = [
    { id: 'chats' as TabType, label: 'Chats', icon: <MessageSquare size={14} />, gradient: 'from-blue-500/20 to-indigo-500/20' },
    { id: 'boards' as TabType, label: 'Boards', icon: <KanbanSquare size={14} />, gradient: 'from-emerald-500/20 to-teal-500/20' },
    { id: 'tasks' as TabType, label: 'Tasks', icon: <CheckSquare size={14} />, gradient: 'from-purple-500/20 to-pink-500/20' },
    { id: 'members' as TabType, label: 'Members', icon: <Users size={14} />, gradient: 'from-orange-500/20 to-amber-500/20' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-[#fafaf8] to-white">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-[#4f46e5] blur-xl opacity-20 animate-pulse"></div>
          <Loader2 className="w-10 h-10 animate-spin text-[#4f46e5] relative z-10" />
        </div>
      </div>
    );
  }

  if (!space) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-[#fafaf8] to-white">
        <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Users size={40} className="text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Space not found</h3>
          <p className="text-sm text-gray-500">This space may have been deleted or you don't have access.</p>
        </div>
      </div>
    );
  }

  const getRoleIcon = (role: string) => {
    if (role === 'owner') return <Crown size={12} className="text-amber-500" />;
    if (role === 'admin') return <Shield size={12} className="text-blue-500" />;
    return null;
  };

  const getRoleLabel = (role: string) => {
    if (role === 'owner') return 'Owner';
    if (role === 'admin') return 'Admin';
    return 'Member';
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-[#fafaf8] via-white to-[#fafaf8]">
      {/* Glassmorphic Header */}
      <div className="sticky top-0 z-10 backdrop-blur-md bg-white/80 border-b border-white/20 shadow-sm">
        <div className="px-6 md:px-10 pt-6 pb-2">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.history.back()}
                className="group p-2 rounded-xl hover:bg-white/60 transition-all duration-200 text-gray-500 hover:text-gray-900 backdrop-blur-sm"
              >
                <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
              </button>
              <div className="relative">
                <div className="absolute inset-0 rounded-full blur-md opacity-60" style={{ background: space.color }}></div>
                <div className="w-6 h-6 rounded-full shadow-md relative" style={{ background: space.color }} />
              </div>
              <h1 className="font-['Playfair_Display'] text-2xl md:text-3xl font-semibold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                {space.name}
              </h1>
            </div>
            <button className="group p-2 rounded-xl hover:bg-white/60 transition-all duration-200 text-gray-500 hover:text-gray-900">
              <Settings size={18} className="group-hover:rotate-12 transition-transform" />
            </button>
          </div>

          {/* Animated Tabs with Sliding Indicator */}
          <div className="relative flex items-center gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-5 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'text-indigo-700 bg-gradient-to-r ' + tab.gradient
                    : 'text-gray-500 hover:text-gray-700 hover:bg-white/40'
                }`}
              >
                <div className="flex items-center gap-2">
                  {tab.icon}
                  {tab.label}
                </div>
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full animate-in slide-in-from-left-2 duration-300" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Area with Smooth Scroll */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-6 md:p-8 max-w-6xl mx-auto">
          
          {/* CHATS TAB - Enhanced with Message Bubbles */}
          {activeTab === 'chats' && (
            <div className="flex flex-col h-full min-h-[500px]">
              <div className="flex-1 space-y-4 mb-6">
                {showDemoMessages && messages.length > 0 ? (
                  <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-500">
                    {messages.map((msg, idx) => (
                      <div
                        key={msg.id}
                        className={`flex gap-3 group animate-in fade-in slide-in-from-bottom-2 duration-300 delay-${idx * 100}`}
                        style={{ animationDelay: `${idx * 100}ms` }}
                      >
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shadow-sm flex-shrink-0"
                          style={{ backgroundColor: msg.user.color, color: msg.user.textColor }}
                        >
                          {msg.user.initials}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-gray-900">{msg.user.name}</span>
                            <span className="text-xs text-gray-400">{formatTime(msg.timestamp)}</span>
                          </div>
                          <div className="bg-white/80 backdrop-blur-sm rounded-2xl rounded-tl-md px-4 py-2.5 shadow-sm border border-gray-100 max-w-md">
                            <p className="text-sm text-gray-700 leading-relaxed">{msg.text}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-20">
                    <div className="text-center max-w-sm animate-in zoom-in-95 duration-500">
                      <div className="relative mx-auto w-24 h-24 mb-6">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full blur-2xl animate-pulse"></div>
                        <div className="relative bg-gradient-to-br from-indigo-50 to-purple-50 rounded-full w-24 h-24 flex items-center justify-center shadow-inner">
                          <Sparkles size={36} className="text-indigo-400" />
                        </div>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">Welcome to {space.name}</h3>
                      <p className="text-sm text-gray-500 leading-relaxed mb-6">
                        Start the conversation — share ideas, ask questions, and collaborate with your team.
                      </p>
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-full text-xs text-indigo-600 border border-indigo-100">
                        <Sparkles size={12} /> No messages yet — be the first!
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Modern Chat Input */}
              <div className="sticky bottom-4 bg-white/90 backdrop-blur-md border border-gray-200 rounded-2xl shadow-lg p-2 flex items-center gap-1 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                <button className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-all">
                  <Paperclip size={18} />
                </button>
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  className="flex-1 text-sm outline-none bg-transparent placeholder:text-gray-400 py-2.5"
                />
                <button className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-all">
                  <Smile size={18} />
                </button>
                <button className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-all">
                  <Mic size={18} />
                </button>
                <button 
                  onClick={handleSendMessage}
                  disabled={!message.trim()}
                  className={`p-2.5 rounded-xl transition-all shadow-sm ${
                    message.trim() 
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-md hover:-translate-y-0.5' 
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          )}

          {/* BOARDS TAB - Enhanced */}
          {activeTab === 'boards' && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center max-w-md animate-in zoom-in-95 duration-500">
                <div className="relative mx-auto w-28 h-28 mb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl blur-2xl animate-pulse"></div>
                  <div className="relative bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl w-28 h-28 flex items-center justify-center shadow-inner">
                    <KanbanSquare size={40} className="text-emerald-500" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">No boards yet</h3>
                <p className="text-sm text-gray-500 mb-8 leading-relaxed max-w-sm mx-auto">
                  Create a board to organize tasks, track projects, and visualize your workflow with drag-and-drop cards.
                </p>
                <button className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-medium hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
                  <Plus size={16} /> Create Board
                </button>
              </div>
            </div>
          )}

          {/* TASKS TAB - Enhanced */}
          {activeTab === 'tasks' && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center max-w-md animate-in zoom-in-95 duration-500">
                <div className="relative mx-auto w-28 h-28 mb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl blur-2xl animate-pulse"></div>
                  <div className="relative bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl w-28 h-28 flex items-center justify-center shadow-inner">
                    <CheckSquare size={40} className="text-purple-500" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">No tasks yet</h3>
                <p className="text-sm text-gray-500 mb-8 leading-relaxed max-w-sm mx-auto">
                  Add tasks to track progress, assign responsibilities, and hit your deadlines — all in one place.
                </p>
                <button className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl text-sm font-medium hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
                  <Plus size={16} /> Add Task
                </button>
              </div>
            </div>
          )}

          {/* MEMBERS TAB - Glass Card Style */}
          {activeTab === 'members' && (
            <div className="bg-white/70 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-xl p-6 animate-in slide-in-from-bottom-4 duration-400">
              <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                    <Users size={18} className="text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-800">Members</h3>
                    <p className="text-xs text-gray-500">{space.members.length} {space.members.length === 1 ? 'person' : 'people'} in this space</p>
                  </div>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-medium hover:bg-gray-800 hover:shadow-md transition-all duration-200">
                  <Plus size={12} /> Invite
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {space.members.map((member, idx) => (
                  <div
                    key={member.id}
                    className="group flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-white/50 hover:bg-white hover:shadow-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-2"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shadow-sm transition-transform group-hover:scale-105"
                      style={{ backgroundColor: member.color, color: member.textColor }}
                    >
                      {member.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <div className="text-sm font-semibold text-gray-800 truncate">
                          {member.name}
                        </div>
                        {getRoleIcon(member.role)}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <AtSign size={10} />
                        {member.handle}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 bg-gray-100 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider text-gray-600">
                      {getRoleIcon(member.role)}
                      <span>{getRoleLabel(member.role)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}
