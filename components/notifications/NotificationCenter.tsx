'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import { triggerHaptic } from '@/lib/haptics';
import { 
  Bell, Check, Mail, MessageSquare, Users, Settings, Trash2, Loader2, 
  X, Filter, Sparkles, AlertCircle, Calendar, ChevronRight
} from 'lucide-react';

interface Notification {
  id: string;
  user_id: string;
  type: 'memu_received' | 'memo_received' | 'system' | 'space_invite';
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

type FilterType = 'all' | 'memus' | 'spaces' | 'system';

interface NotificationCenterProps {
  dark?: boolean;
}

export default function NotificationCenter({ dark = false }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  const router = useRouter();
  const { showToast } = useToast();

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      } else {
        setLoading(false);
      }
    };
    getUser();
  }, []);

  // Fetch initial notifications
  const fetchNotifications = async (userId: string) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    }
    setLoading(false);
  };

  // Subscribe to real-time with proper cleanup
  useEffect(() => {
    if (!currentUserId) return;

    fetchNotifications(currentUserId);

    const supabase = createClient();
    
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channelName = `notifications-${currentUserId}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUserId}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
          setUnreadCount((prev) => prev + 1);
          triggerHaptic('medium');
          showToast('New notification received', 'info');
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [currentUserId]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const markAsRead = async (id: string) => {
    const supabase = createClient();
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAsUnread = async (id: string) => {
    const supabase = createClient();
    await supabase.from('notifications').update({ is_read: false }).eq('id', id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: false } : n)));
    setUnreadCount((prev) => prev + 1);
  };

  const markAllAsRead = async () => {
    triggerHaptic('success');
    const supabase = createClient();
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', currentUserId).eq('is_read', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    showToast('All notifications marked as read', 'success');
  };

  const deleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('light');
    const supabase = createClient();
    const notif = notifications.find(n => n.id === id);
    const wasUnread = notif && !notif.is_read;
    
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (wasUnread) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    showToast('Notification deleted', 'success');
  };

  const handleNotificationClick = (notification: Notification) => {
    triggerHaptic('light');
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    if (notification.link) {
      router.push(notification.link);
    }
    setIsOpen(false);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'memu_received': 
        return (
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center flex-shrink-0">
            <Mail size={16} className="text-indigo-600" strokeWidth={2.5} />
          </div>
        );
      case 'memo_received': 
        return (
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center flex-shrink-0">
            <MessageSquare size={16} className="text-emerald-600" strokeWidth={2.5} />
          </div>
        );
      case 'space_invite': 
        return (
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center flex-shrink-0">
            <Users size={16} className="text-amber-600" strokeWidth={2.5} />
          </div>
        );
      default: 
        return (
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gray-100 to-slate-100 flex items-center justify-center flex-shrink-0">
            <Settings size={16} className="text-gray-600" strokeWidth={2.5} />
          </div>
        );
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const mins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);
    
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getDateGroup = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const days = Math.floor(diffMs / 86400000);
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return 'This Week';
    return 'Earlier';
  };

  const filterNotifications = (notifs: Notification[]) => {
    switch (activeFilter) {
      case 'memus':
        return notifs.filter(n => n.type === 'memu_received' || n.type === 'memo_received');
      case 'spaces':
        return notifs.filter(n => n.type === 'space_invite');
      case 'system':
        return notifs.filter(n => n.type === 'system');
      default:
        return notifs;
    }
  };

  const filteredNotifications = filterNotifications(notifications);

  const groupByDate = (notifs: Notification[]) => {
    const groups: Record<string, Notification[]> = {};
    notifs.forEach(notif => {
      const group = getDateGroup(notif.created_at);
      if (!groups[group]) groups[group] = [];
      groups[group].push(notif);
    });
    return groups;
  };

  const groupedNotifications = groupByDate(filteredNotifications);

  const filters = [
    { id: 'all' as FilterType, label: 'All', icon: Sparkles },
    { id: 'memus' as FilterType, label: 'Memus', icon: Mail },
    { id: 'spaces' as FilterType, label: 'Spaces', icon: Users },
    { id: 'system' as FilterType, label: 'System', icon: Settings },
  ];

  // Conditional styles for dark mode
  const bellBtnClass = dark
    ? 'relative w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/80 hover:text-white hover:border-white/30 transition-all shadow-sm btn-press'
    : 'relative w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm btn-press';

  const badgeClass = dark
    ? 'absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg border-2 border-white/20'
    : 'absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg border-2 border-white';

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Button */}
      <button
        onClick={() => {
          triggerHaptic('light');
          setIsOpen(!isOpen);
        }}
        className={bellBtnClass}
        title="Notifications"
      >
        <Bell size={18} strokeWidth={2.5} />
        {unreadCount > 0 && (
          <span className={badgeClass}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 animate-fade-in-scale overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50/50 to-purple-50/50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                <Bell size={14} className="text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
                {unreadCount > 0 && (
                  <p className="text-[10px] text-gray-500 font-medium">{unreadCount} unread</p>
                )}
              </div>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all btn-press"
              >
                <Check size={12} strokeWidth={2.5} /> Mark all read
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-1 px-4 py-3 border-b border-gray-100 bg-gray-50/50">
            {filters.map((filter) => {
              const Icon = filter.icon;
              return (
                <button
                  key={filter.id}
                  onClick={() => {
                    triggerHaptic('light');
                    setActiveFilter(filter.id);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all btn-press ${
                    activeFilter === filter.id
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                      : 'text-gray-600 hover:bg-white'
                  }`}
                >
                  <Icon size={12} strokeWidth={2.5} />
                  {filter.label}
                </button>
              );
            })}
          </div>

          {/* List */}
          <div className="max-h-[500px] overflow-y-auto custom-scroll">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mb-2" />
                <p className="text-xs text-gray-500">Loading notifications...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center mb-3">
                  {activeFilter === 'all' ? (
                    <Bell size={28} className="text-indigo-400" strokeWidth={2} />
                  ) : (
                    <Filter size={28} className="text-indigo-400" strokeWidth={2} />
                  )}
                </div>
                <h4 className="text-sm font-bold text-gray-900 mb-1">
                  {activeFilter === 'all' ? 'No notifications yet' : 'No matching notifications'}
                </h4>
                <p className="text-xs text-gray-500 max-w-[200px]">
                  {activeFilter === 'all' 
                    ? 'When you receive notifications, they will appear here.'
                    : 'Try changing the filter to see more notifications.'}
                </p>
              </div>
            ) : (
              <div>
                {Object.entries(groupedNotifications).map(([dateGroup, notifs]) => (
                  <div key={dateGroup}>
                    {/* Date Group Header */}
                    <div className="sticky top-0 bg-white/95 backdrop-blur-sm px-5 py-2 border-b border-gray-100 z-10">
                      <div className="flex items-center gap-2">
                        <Calendar size={12} className="text-gray-400" strokeWidth={2.5} />
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{dateGroup}</span>
                      </div>
                    </div>

                    {/* Notifications */}
                    {notifs.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        onMouseEnter={() => setHoveredId(notif.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        className={`relative px-5 py-4 hover:bg-gray-50 transition-all cursor-pointer border-b border-gray-50 last:border-b-0 ${
                          !notif.is_read ? 'bg-indigo-50/30' : 'bg-white'
                        }`}
                      >
                        <div className="flex gap-3">
                          {getIcon(notif.type)}
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className={`text-sm leading-tight ${!notif.is_read ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                                {notif.title}
                              </p>
                              {!notif.is_read && (
                                <span className="w-2 h-2 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 flex-shrink-0 mt-1.5 shadow-sm" />
                              )}
                            </div>
                            
                            {notif.body && (
                              <p className="text-xs text-gray-600 mt-1 line-clamp-2 leading-relaxed">{notif.body}</p>
                            )}
                            
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-[10px] text-gray-400 font-medium">{formatTime(notif.created_at)}</p>
                              
                              {/* Quick Actions */}
                              {hoveredId === notif.id && (
                                <div className="flex items-center gap-1 animate-fadeIn">
                                  {!notif.is_read ? (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        markAsRead(notif.id);
                                      }}
                                      className="p-1 rounded hover:bg-indigo-100 text-gray-400 hover:text-indigo-600 transition-all btn-press"
                                      title="Mark as read"
                                    >
                                      <Check size={12} strokeWidth={2.5} />
                                    </button>
                                  ) : (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        markAsUnread(notif.id);
                                      }}
                                      className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-all btn-press"
                                      title="Mark as unread"
                                    >
                                      <Mail size={12} strokeWidth={2.5} />
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => deleteNotification(notif.id, e)}
                                    className="p-1 rounded hover:bg-rose-100 text-gray-400 hover:text-rose-600 transition-all btn-press"
                                    title="Delete"
                                  >
                                    <Trash2 size={12} strokeWidth={2.5} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {filteredNotifications.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
              <button
                onClick={() => {
                  router.push('/?panel=notifications');
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-all btn-press"
              >
                View all notifications
                <ChevronRight size={12} strokeWidth={2.5} />
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn { animation: fadeIn 0.15s ease-out; }
        .animate-fade-in-scale { animation: fadeInScale 0.2s ease-out; }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #d4d4d4; border-radius: 10px; }
      `}</style>
    </div>
  );
}