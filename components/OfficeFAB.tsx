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
    icon: <FileText size={18} />,
    color: 'from-[#4f46e5] to-[#6366f1]',
    description: 'Create and edit documents',
  },
  {
    id: 'slides',
    name: 'memu Slides',
    icon: <Presentation size={18} />,
    color: 'from-[#059669] to-[#10b981]',
    description: 'Beautiful presentations',
  },
  {
    id: 'sheets',
    name: 'memu Sheets',
    icon: <Table size={18} />,
    color: 'from-[#d97706] to-[#f59e0b]',
    description: 'Spreadsheets & data',
  },
  {
    id: 'notes',
    name: 'memu Notes',
    icon: <StickyNote size={18} />,
    color: 'from-[#ec4899] to-[#f43f5e]',
    description: 'Quick thoughts & tasks',
  },
  {
    id: 'airshare',
    name: 'memu AirShare',
    icon: <Cloud size={18} />,
    color: 'from-[#0891b2] to-[#06b6d4]',
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
  const [isHovered, setIsHovered] = useState(false);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Get current user ID for fetching recent items
  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    getUser();
  }, []);

  // Fetch real recent items when menu opens
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
      // Fetch top 2 from each category
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

      // Sort all combined items by most recent
      items.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

      // Keep only the top 3
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
      case 'docs': return <FileText size={10} className="text-[#4f46e5]" />;
      case 'slides': return <Presentation size={10} className="text-[#059669]" />;
      case 'sheets': return <Table size={10} className="text-[#d97706]" />;
      case 'notes': return <StickyNote size={10} className="text-[#ec4899]" />;
      default: return <File size={10} className="text-[#aaa]" />;
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
    <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3" ref={menuRef}>
      {/* Label */}
      <div
        className={`transition-all duration-300 ${
          isHovered || isOpen
            ? 'opacity-100 translate-x-0'
            : 'opacity-0 translate-x-4 pointer-events-none'
        }`}
      >
        <div className="bg-white/95 backdrop-blur-md rounded-full px-4 py-2 shadow-lg border border-white/40">
          <span className="text-[13px] font-semibold bg-gradient-to-r from-[#4f46e5] via-[#7c3aed] to-[#0891b2] bg-clip-text text-transparent">
            memu.Office
          </span>
        </div>
      </div>

      {/* Menu Items */}
      <div
        className={`absolute bottom-16 right-0 mb-2 flex flex-col gap-2 transition-all duration-300 ease-out ${
          isOpen
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        {officeSuites.map((suite, index) => (
          <button
            key={suite.id}
            onClick={() => handleOpenItem(suite.id)}
            className={`group flex items-center gap-3 bg-white/95 backdrop-blur-sm border border-white/40 rounded-xl p-3 shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5 w-56 ${
              isOpen ? 'animate-slideUp' : ''
            }`}
            style={{
              animationDelay: `${index * 50}ms`,
              animationFillMode: 'both',
            }}
          >
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${suite.color} flex items-center justify-center text-white shadow-md`}>
              {suite.icon}
            </div>
            <div className="flex-1 text-left">
              <div className="text-[13px] font-medium text-[#1a1a1a]">{suite.name}</div>
              <div className="text-[10px] text-[#777]">{suite.description}</div>
            </div>
            <ChevronRight size={14} className="text-[#aaa] group-hover:text-[#4f46e5] transition-all group-hover:translate-x-0.5" />
          </button>
        ))}
        
        {/* REAL Recent Documents Section */}
        <div className="bg-white/95 backdrop-blur-sm border border-white/40 rounded-xl p-3 w-56 shadow-lg">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[#f2f1ee]">
            <FolderOpen size={12} className="text-[#777]" />
            <span className="text-[10px] font-medium text-[#777] uppercase tracking-wide">Recent</span>
          </div>
          
          <div className="space-y-1.5">
            {loadingRecent ? (
              <div className="flex items-center gap-2 py-1">
                <Loader2 size={10} className="animate-spin text-[#aaa]" />
                <span className="text-[11px] text-[#aaa]">Loading recent...</span>
              </div>
            ) : recentItems.length === 0 ? (
              <div className="py-1">
                <span className="text-[11px] text-[#aaa] italic">No recent items</span>
              </div>
            ) : (
              recentItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleOpenItem(item.type, item.id)}
                  className="flex items-center gap-2 text-[12px] text-[#3a3a3a] hover:text-[#4f46e5] transition w-full text-left py-1 group"
                >
                  {getIconForType(item.type)}
                  <span className="flex-1 truncate">{item.title || 'Untitled'}</span>
                  <span className="text-[9px] text-[#aaa] flex-shrink-0">{formatTime(item.updated_at)}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* FAB Button - Rich Gradient with Briefcase */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="w-auto h-12 px-5 rounded-xl shadow-xl flex items-center justify-center gap-2 transition-all duration-300 bg-gradient-to-r from-[#4f46e5] via-[#7c3aed] to-[#0891b2] hover:scale-105 hover:shadow-2xl hover:from-[#6366f1] hover:via-[#8b5cf6] hover:to-[#06b6d4]"
      >
        {isOpen ? (
          <X size={18} className="text-white" />
        ) : (
          <>
            <Briefcase size={16} className="text-white" />
            <span className="text-white text-[13px] font-semibold tracking-wide">Office</span>
          </>
        )}
      </button>

      {/* Pulse Ring */}
      {!isOpen && (
        <div className="absolute inset-0 rounded-xl animate-pulse-slow pointer-events-none">
          <div className="w-full h-full rounded-xl border-2 border-[#4f46e5] opacity-30" />
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-slow {
          0% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.15); opacity: 0.1; }
          100% { transform: scale(1.3); opacity: 0; }
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out forwards;
        }
        .animate-pulse-slow {
          animation: pulse-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  );
}