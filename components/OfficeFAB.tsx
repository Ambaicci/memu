'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  FileText, Presentation, Table, X, File, FolderOpen, ChevronRight, 
  Cloud, Briefcase, StickyNote, Loader2 
} from 'lucide-react';

interface OfficeSuite {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  borderClass: string;
  description: string;
}

interface RecentItem {
  id: string;
  title: string | null;
  type: 'docs' | 'slides' | 'sheets' | 'notes';
  updated_at: string;
}

const officeSuites: OfficeSuite[] = [
  {
    id: 'docs',
    name: 'memu Docs',
    icon: <FileText size={16} strokeWidth={2.5} />,
    color: 'from-indigo-600 to-purple-600',
    borderClass: 'border-indigo-200/60',
    description: 'Create and edit documents',
  },
  {
    id: 'slides',
    name: 'memu Slides',
    icon: <Presentation size={16} strokeWidth={2.5} />,
    color: 'from-emerald-600 to-teal-600',
    borderClass: 'border-emerald-200/60',
    description: 'Beautiful presentations',
  },
  {
    id: 'sheets',
    name: 'memu Sheets',
    icon: <Table size={16} strokeWidth={2.5} />,
    color: 'from-amber-600 to-orange-600',
    borderClass: 'border-amber-200/60',
    description: 'Spreadsheets & data',
  },
  {
    id: 'notes',
    name: 'memu Notes',
    icon: <StickyNote size={16} strokeWidth={2.5} />,
    color: 'from-pink-600 to-rose-600',
    borderClass: 'border-pink-200/60',
    description: 'Quick thoughts & tasks',
  },
  {
    id: 'airshare',
    name: 'memu AirShare',
    icon: <Cloud size={16} strokeWidth={2.5} />,
    color: 'from-cyan-600 to-blue-600',
    borderClass: 'border-cyan-200/60',
    description: 'Share files dynamically',
  },
];

interface OfficeFABProps {
  isGuest?: boolean;
  requireAuth?: (action: string, callback: () => void) => void;
  onOpenItem?: (suiteId: string, itemId?: string) => void;
}

export default function OfficeFAB({ isGuest, requireAuth, onOpenItem }: OfficeFABProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    getUser();
  }, []);

  useEffect(() => {
    if (isOpen && userId) {
      fetchRecentItems();
    }
  }, [isOpen, userId]);

  const fetchRecentItems = async () => {
    if (!userId) return;
    setLoadingRecent(true);
    const supabase = createClient();

    try {
      const [docsRes, slidesRes, sheetsRes, notesRes] = await Promise.all([
        supabase.from('docs').select('id, title, updated_at').eq('user_id', userId).order('updated_at', { ascending: false }).limit(2),
        supabase.from('slides_presentations').select('id, title, updated_at').eq('user_id', userId).order('updated_at', { ascending: false }).limit(2),
        supabase.from('sheets_workbooks').select('id, name, updated_at').eq('user_id', userId).order('updated_at', { ascending: false }).limit(2),
        supabase.from('notes').select('id, title, updated_at').eq('user_id', userId).order('updated_at', { ascending: false }).limit(2),
      ]);

      const items: RecentItem[] = [];
      if (docsRes.data) items.push(...docsRes.data.map(d => ({ id: d.id, title: d.title, type: 'docs' as const, updated_at: d.updated_at })));
      if (slidesRes.data) items.push(...slidesRes.data.map(d => ({ id: d.id, title: d.title, type: 'slides' as const, updated_at: d.updated_at })));
      if (sheetsRes.data) items.push(...sheetsRes.data.map(d => ({ id: d.id, title: d.name, type: 'sheets' as const, updated_at: d.updated_at })));
      if (notesRes.data) items.push(...notesRes.data.map(d => ({ id: d.id, title: d.title, type: 'notes' as const, updated_at: d.updated_at })));

      items.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      setRecentItems(items.slice(0, 3));
    } catch (err) {
      console.error('Failed to fetch recent items:', err);
    } finally {
      setLoadingRecent(false);
    }
  };

  const handleOpenItem = (suiteId: string, itemId?: string) => {
    if (isGuest && requireAuth) {
      requireAuth(suiteId, () => onOpenItem?.(suiteId, itemId));
    } else {
      onOpenItem?.(suiteId, itemId);
    }
    setIsOpen(false);
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'docs': return <FileText size={12} strokeWidth={2.5} className="text-indigo-600" />;
      case 'slides': return <Presentation size={12} strokeWidth={2.5} className="text-emerald-600" />;
      case 'sheets': return <Table size={12} strokeWidth={2.5} className="text-amber-600" />;
      case 'notes': return <StickyNote size={12} strokeWidth={2.5} className="text-pink-600" />;
      default: return <File size={12} strokeWidth={2.5} className="text-gray-400" />;
    }
  };

  const getBorderClassForType = (type: string) => {
    switch (type) {
      case 'docs': return 'border-indigo-200/60';
      case 'slides': return 'border-emerald-200/60';
      case 'sheets': return 'border-amber-200/60';
      case 'notes': return 'border-pink-200/60';
      default: return 'border-gray-200/60';
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
    return date.toLocaleDateString();
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 flex items-end gap-3" ref={menuRef}>
      {/* Floating Label */}
      <div
        className={`transition-all duration-300 ease-out mb-2 ${
          isOpen
            ? 'opacity-100 translate-x-0'
            : 'opacity-0 translate-x-4 pointer-events-none'
        }`}
      >
        <div className="bg-white rounded-full px-4 py-2 shadow-lg border border-gray-200 animate-fade-in-scale">
          <span className="text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            memu.Office
          </span>
        </div>
      </div>

      {/* Menu Items */}
      <div
        className={`absolute bottom-16 right-0 flex flex-col gap-2 transition-all duration-300 ease-out ${
          isOpen
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        {officeSuites.map((suite, index) => (
          <button
            key={suite.id}
            onClick={() => handleOpenItem(suite.id)}
            className={`group flex items-center gap-3 bg-white rounded-2xl border-[1px] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 ${suite.borderClass} p-3 w-64 btn-press`}
            style={{
              animation: isOpen ? `slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.04}s forwards` : 'none',
              opacity: 0,
              transform: 'translateY(8px)',
            }}
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${suite.color} flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform flex-shrink-0`}>
              {suite.icon}
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="text-sm font-bold text-gray-900 truncate">{suite.name}</div>
              <div className="text-[11px] text-gray-500 font-medium">{suite.description}</div>
            </div>
            <ChevronRight size={14} strokeWidth={2.5} className="text-gray-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
          </button>
        ))}
        
        {/* Recent Documents */}
        <div className="bg-white rounded-2xl border-[1px] border-gray-200/60 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] p-3 w-64 animate-fade-in-scale">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
            <FolderOpen size={12} strokeWidth={2.5} className="text-gray-400" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Recent</span>
          </div>
          
          <div className="space-y-1.5">
            {loadingRecent ? (
              <div className="flex items-center gap-2 py-2">
                <Loader2 size={12} className="animate-spin text-gray-400" />
                <span className="text-[11px] text-gray-400 font-medium">Loading recent...</span>
              </div>
            ) : recentItems.length === 0 ? (
              <div className="py-2">
                <span className="text-[11px] text-gray-400 italic font-medium">No recent items</span>
              </div>
            ) : (
              recentItems.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => handleOpenItem(item.type, item.id)}
                  className={`flex items-center gap-2.5 w-full text-left py-2 px-2 rounded-xl hover:bg-gray-50 transition-all group border-[1px] border-transparent hover:${getBorderClassForType(item.type)} btn-press animate-slide-up`}
                  style={{ animationDelay: `${idx * 50}ms`, opacity: 0 }}
                >
                  {getIconForType(item.type)}
                  <span className="flex-1 text-xs font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">{item.title || 'Untitled'}</span>
                  <span className="text-[10px] text-gray-400 font-medium flex-shrink-0">{formatTime(item.updated_at)}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* The FAB Button - Clean, Premium, Intentional */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 group focus:outline-none btn-press"
      >
        <div className="flex items-center gap-2 transition-transform duration-300 group-hover:scale-105">
          {isOpen ? (
            <X size={16} strokeWidth={2.5} />
          ) : (
            <Briefcase size={16} strokeWidth={2.5} />
          )}
          <span className="text-sm font-bold tracking-wide">
            {isOpen ? 'Close' : 'Office'}
          </span>
        </div>
      </button>

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}