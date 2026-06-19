'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Home, Inbox, Plus, Layers, MoreHorizontal, X, 
  FileText, Users, Calendar, Video, Cloud, Mail,
  StickyNote, Presentation, Table, BarChart3,
  Sparkles, LogIn, User, AtSign
} from 'lucide-react';

type PanelType = 'home' | 'inmemus' | 'outmemus' | 'drafts' | 'connections' | 'spaces' | 'confer' | 'calendar' | 'handles' | 'airshare' | 'docs' | 'slides' | 'sheets' | 'space-dashboard' | 'analytics' | 'notes' | 'profile';

interface BottomNavProps {
  activePanel: PanelType;
  onNavigate: (panel: PanelType) => void;
  onOpenCompose: () => void;
  isGuest: boolean;
  onSignIn: () => void;
}

interface MoreMenuItem {
  id: PanelType;
  label: string;
  icon: React.ReactNode;
  color: string;
  section: string;
}

const moreMenuItems: MoreMenuItem[] = [
  { id: 'outmemus', label: 'Sent', icon: <Mail size={16} />, color: 'text-emerald-600 bg-emerald-50', section: 'Communication' },
  { id: 'drafts', label: 'Drafts', icon: <FileText size={16} />, color: 'text-amber-600 bg-amber-50', section: 'Communication' },
  { id: 'connections', label: 'Connections', icon: <Users size={16} />, color: 'text-blue-600 bg-blue-50', section: 'Communication' },
  { id: 'handles', label: 'Handles', icon: <AtSign size={16} />, color: 'text-indigo-600 bg-indigo-50', section: 'Communication' },
  { id: 'calendar', label: 'Calendar', icon: <Calendar size={16} />, color: 'text-rose-600 bg-rose-50', section: 'Productivity' },
  { id: 'confer', label: 'Confer', icon: <Video size={16} />, color: 'text-purple-600 bg-purple-50', section: 'Productivity' },
  { id: 'airshare', label: 'AirShare', icon: <Cloud size={16} />, color: 'text-cyan-600 bg-cyan-50', section: 'Productivity' },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={16} />, color: 'text-pink-600 bg-pink-50', section: 'Productivity' },
  { id: 'docs', label: 'Docs', icon: <FileText size={16} />, color: 'text-indigo-600 bg-indigo-50', section: 'Office' },
  { id: 'slides', label: 'Slides', icon: <Presentation size={16} />, color: 'text-emerald-600 bg-emerald-50', section: 'Office' },
  { id: 'sheets', label: 'Sheets', icon: <Table size={16} />, color: 'text-amber-600 bg-amber-50', section: 'Office' },
  { id: 'notes', label: 'Notes', icon: <StickyNote size={16} />, color: 'text-pink-600 bg-pink-50', section: 'Office' },
  { id: 'profile', label: 'Profile', icon: <User size={16} />, color: 'text-gray-600 bg-gray-50', section: 'Account' },
];

export default function BottomNav({ activePanel, onNavigate, onOpenCompose, isGuest, onSignIn }: BottomNavProps) {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    if (showMoreMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMoreMenu]);

  const isHomeActive = activePanel === 'home';
  const isInboxActive = ['inmemus', 'outmemus', 'drafts'].includes(activePanel);
  const isSpacesActive = ['spaces', 'space-dashboard'].includes(activePanel);
  const isMoreActive = !['home', 'inmemus', 'outmemus', 'drafts', 'spaces', 'space-dashboard'].includes(activePanel);

  const handleMoreItemClick = (panel: PanelType) => {
    onNavigate(panel);
    setShowMoreMenu(false);
  };

  const groupedItems = moreMenuItems.reduce((acc, item) => {
    if (!acc[item.section]) acc[item.section] = [];
    acc[item.section].push(item);
    return acc;
  }, {} as Record<string, MoreMenuItem[]>);

  return (
    <>
      {showMoreMenu && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setShowMoreMenu(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fadeIn" />
          <div 
            ref={menuRef}
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col animate-slide-up-from-bottom"
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>
            <div className="px-5 pb-3 flex items-center justify-between border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                  <Sparkles size={14} className="text-white" />
                </div>
                <h3 className="font-serif text-lg font-semibold text-gray-900">Explore</h3>
              </div>
              <button 
                onClick={() => setShowMoreMenu(false)}
                className="w-9 h-9 border border-gray-200 rounded-xl flex items-center justify-center hover:bg-gray-50 transition btn-press"
              >
                <X size={15} strokeWidth={2.5} />
              </button>
            </div>
            {isGuest && (
              <div className="mx-5 mt-4 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles size={14} className="text-indigo-600" />
                  <span className="text-xs font-bold text-indigo-900">Guest Mode</span>
                </div>
                <p className="text-[11px] text-indigo-700 mb-2">Sign in to unlock all features</p>
                <button 
                  onClick={() => { setShowMoreMenu(false); onSignIn(); }}
                  className="w-full py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-xs font-semibold btn-press flex items-center justify-center gap-1.5"
                >
                  <LogIn size={12} /> Sign In
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto px-5 py-4 custom-scroll">
              {Object.entries(groupedItems).map(([section, items]) => (
                <div key={section} className="mb-5 last:mb-0">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">
                    {section}
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {items.map((item) => {
                      const isActive = activePanel === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleMoreItemClick(item.id)}
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all btn-press ${
                            isActive ? 'bg-gradient-to-br from-indigo-50 to-purple-50 ring-1 ring-indigo-200' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color}`}>
                            {item.icon}
                          </div>
                          <span className={`text-[10px] font-semibold text-center leading-tight ${isActive ? 'text-indigo-700' : 'text-gray-700'}`}>
                            {item.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav 
        className={`fixed bottom-0 left-0 right-0 z-30 lg:hidden transition-transform duration-500 ease-out ${
          isVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="bg-white/80 backdrop-blur-xl border-t border-gray-200/60 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.08)]">
          <div className="flex items-center justify-around px-2 py-2">
            <button
              onClick={() => onNavigate('home')}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all btn-press min-w-[60px] ${isHomeActive ? 'text-indigo-600' : 'text-gray-500'}`}
            >
              <div className={`p-1.5 rounded-xl transition-all ${isHomeActive ? 'bg-indigo-50' : ''}`}>
                <Home size={20} strokeWidth={isHomeActive ? 2.5 : 2} />
              </div>
              <span className="text-[10px] font-semibold">Home</span>
            </button>

            <button
              onClick={() => onNavigate('inmemus')}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all btn-press min-w-[60px] ${isInboxActive ? 'text-indigo-600' : 'text-gray-500'}`}
            >
              <div className={`p-1.5 rounded-xl transition-all ${isInboxActive ? 'bg-indigo-50' : ''}`}>
                <Inbox size={20} strokeWidth={isInboxActive ? 2.5 : 2} />
              </div>
              <span className="text-[10px] font-semibold">Inbox</span>
            </button>

            <button
              onClick={onOpenCompose}
              className="relative -mt-6 btn-press"
              aria-label="Compose"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:-translate-y-0.5 transition-all">
                <Plus size={24} strokeWidth={2.5} className="text-white" />
              </div>
              <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-gray-700 whitespace-nowrap">
                Compose
              </span>
            </button>

            <button
              onClick={() => onNavigate('spaces')}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all btn-press min-w-[60px] ${isSpacesActive ? 'text-indigo-600' : 'text-gray-500'}`}
            >
              <div className={`p-1.5 rounded-xl transition-all ${isSpacesActive ? 'bg-indigo-50' : ''}`}>
                <Layers size={20} strokeWidth={isSpacesActive ? 2.5 : 2} />
              </div>
              <span className="text-[10px] font-semibold">Spaces</span>
            </button>

            <button
              onClick={() => setShowMoreMenu(true)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all btn-press min-w-[60px] ${isMoreActive ? 'text-indigo-600' : 'text-gray-500'}`}
            >
              <div className={`p-1.5 rounded-xl transition-all ${isMoreActive ? 'bg-indigo-50' : ''}`}>
                <MoreHorizontal size={20} strokeWidth={isMoreActive ? 2.5 : 2} />
              </div>
              <span className="text-[10px] font-semibold">More</span>
            </button>
          </div>
        </div>
      </nav>

      <style>{`
        @keyframes slide-up-from-bottom {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up-from-bottom {
          animation: slide-up-from-bottom 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #d4d4d4; border-radius: 10px; }
      `}</style>
    </>
  );
}