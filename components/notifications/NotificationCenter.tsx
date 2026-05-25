'use client';

import { useState, useEffect } from 'react';
import { 
  Bell, X, Mail, MessageSquare, FileText, Calendar, Users, 
  Check, CheckCheck, Trash2, Settings, AtSign, Share2
} from 'lucide-react';

export interface Notification {
  id: string;
  type: 'memu' | 'mention' | 'share' | 'calendar' | 'space' | 'board';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionLink?: string;
  icon?: React.ReactNode;
}

// Mock notifications
const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'memu',
    title: 'New memu from Aisha Kimani',
    message: 'Q4 Budget needs your sign-off by Friday',
    timestamp: '2 minutes ago',
    read: false,
    actionLink: '/?panel=inmemus',
  },
  {
    id: '2',
    type: 'mention',
    title: '@mentions you in "iPod Design" board',
    message: 'Can you review the latest renders?',
    timestamp: '1 hour ago',
    read: false,
    actionLink: '/?panel=spaces&space=work',
  },
  {
    id: '3',
    type: 'share',
    title: 'Document shared with you',
    message: 'David Osei shared "Q4 Strategy Document"',
    timestamp: 'Yesterday',
    read: true,
    actionLink: '/?panel=docs',
  },
  {
    id: '4',
    type: 'calendar',
    title: 'Calendar reminder',
    message: 'Product Sync meeting in 30 minutes',
    timestamp: 'Yesterday',
    read: true,
    actionLink: '/?panel=calendar',
  },
  {
    id: '5',
    type: 'space',
    title: 'New member joined "Work" space',
    message: 'Maria Santos joined the Work space',
    timestamp: '2 days ago',
    read: true,
    actionLink: '/?panel=spaces&space=work',
  },
];

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'memu': return <Mail size={16} className="text-[#4f46e5]" />;
    case 'mention': return <AtSign size={16} className="text-[#d97706]" />;
    case 'share': return <Share2 size={16} className="text-[#059669]" />;
    case 'calendar': return <Calendar size={16} className="text-[#0891b2]" />;
    case 'space': return <Users size={16} className="text-[#4f46e5]" />;
    case 'board': return <MessageSquare size={16} className="text-[#7c3aed]" />;
    default: return <Bell size={16} className="text-[#777]" />;
  }
};

const getTypeBg = (type: string) => {
  switch (type) {
    case 'memu': return 'bg-[#ede9fe]';
    case 'mention': return 'bg-[#fef3c7]';
    case 'share': return 'bg-[#d1fae5]';
    case 'calendar': return 'bg-[#cffafe]';
    default: return 'bg-[#f2f1ee]';
  }
};

interface NotificationCenterProps {
  onRead?: (id: string) => void;
  onMarkAllRead?: () => void;
}

export default function NotificationCenter({ onRead, onMarkAllRead }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    // Load from localStorage
    const saved = localStorage.getItem('memu_notifications');
    if (saved) {
      setNotifications(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    // Save to localStorage
    localStorage.setItem('memu_notifications', JSON.stringify(notifications));
  }, [notifications]);

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
    onRead?.(id);
  };

  const handleMarkAllRead = () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    );
    onMarkAllRead?.();
  };

  const handleDelete = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleClearAll = () => {
    if (confirm('Delete all notifications? This cannot be undone.')) {
      setNotifications([]);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
    if (notification.actionLink) {
      window.location.href = notification.actionLink;
    }
    setIsOpen(false);
  };

  const filteredNotifications = activeTab === 'all' 
    ? notifications 
    : notifications.filter(n => !n.read);

  return (
    <>
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-[#f2f1ee] transition"
      >
        <Bell size={18} className="text-[#777]" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-[#dc2626] rounded-full" />
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div className="fixed right-4 top-16 w-96 bg-white rounded-2xl shadow-xl border border-[#e8e7e3] z-50 flex flex-col max-h-[500px] animate-slideDown">
          {/* Header */}
          <div className="p-4 border-b border-[#e8e7e3] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={18} className="text-[#4f46e5]" />
              <h3 className="text-[15px] font-medium text-[#0f0f0f]">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-[#4f46e5] text-white">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[11px] text-[#4f46e5] hover:underline"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-[#f2f1ee] transition"
              >
                <X size={14} className="text-[#aaa]" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[#e8e7e3]">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-2 text-[12px] font-medium transition ${
                activeTab === 'all'
                  ? 'text-[#4f46e5] border-b-2 border-[#4f46e5]'
                  : 'text-[#777] hover:text-[#0f0f0f]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab('unread')}
              className={`flex-1 py-2 text-[12px] font-medium transition ${
                activeTab === 'unread'
                  ? 'text-[#4f46e5] border-b-2 border-[#4f46e5]'
                  : 'text-[#777] hover:text-[#0f0f0f]'
              }`}
            >
              Unread
              {unreadCount > 0 && (
                <span className="ml-1 text-[10px] text-[#dc2626]">{unreadCount}</span>
              )}
            </button>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell size={32} className="text-[#ddd] mx-auto mb-3" />
                <p className="text-[13px] text-[#777]">No notifications</p>
                <p className="text-[11px] text-[#aaa] mt-1">
                  When you receive notifications, they'll appear here
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#f2f1ee]">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 cursor-pointer transition hover:bg-[#fafaf8] ${
                      !notification.read ? 'bg-[#fafaf8]' : ''
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getTypeBg(notification.type)}`}>
                        {getTypeIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[13px] font-medium text-[#0f0f0f]">
                            {notification.title}
                          </span>
                          <span className="text-[10px] text-[#aaa] flex-shrink-0">
                            {notification.timestamp}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#777] mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                      </div>
                    </div>
                    {!notification.read && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <div className="w-2 h-2 rounded-full bg-[#4f46e5]" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-[#e8e7e3] flex justify-center">
              <button
                onClick={handleClearAll}
                className="text-[11px] text-[#dc2626] hover:underline"
              >
                Clear all notifications
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideDown {
          animation: slideDown 0.2s ease-out;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </>
  );
}