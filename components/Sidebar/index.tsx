'use client';

import { useState, useEffect } from 'react';
import { 
  Home, Inbox, Send, FileText, Calendar, 
  Share2, Users, Sparkles,
  ChevronLeft, ChevronRight, Plus, AtSign,
  X, Menu
} from 'lucide-react';
import SpacesList from './SpacesList';
import UserChip from './UserChip';
import DeleteConfirmModal from './DeleteConfirmModal';

type PanelType = 'home' | 'inmemus' | 'outmemus' | 'drafts' | 'connections' | 'spaces' | 'confer' | 'calendar' | 'handles' | 'airshare' | 'docs' | 'slides' | 'sheets' | 'space-dashboard' | 'analytics' | 'notes' | 'profile';

interface SidebarProps {
  onNavigate: (panel: PanelType, spaceId?: string | null) => void;
  activePanel: PanelType;
  onOpenSpace: (spaceId: string) => void;
  onOpenCompose: () => void;
  isGuest: boolean;
  onSignIn: () => void;
  onOpenProfile: () => void;
  user: any;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ 
  onNavigate, activePanel, onOpenSpace, onOpenCompose, 
  isGuest, onSignIn, onOpenProfile, user,
  isMobileOpen = false,
  onMobileClose
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) {
        setCollapsed(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleDeleteRequest = (item: any) => {
    if (!item || !item.id) return;
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  const handleNavigate = (panel: PanelType, spaceId?: string | null) => {
    onNavigate(panel, spaceId);
    // Close mobile sidebar after navigation
    if (isMobile && onMobileClose) {
      onMobileClose();
    }
  };

  const navItems: { icon: any, label: string, panel: PanelType }[] = [
    { icon: Home, label: 'Home', panel: 'home' },
    { icon: Inbox, label: 'InMemus', panel: 'inmemus' },
    { icon: Send, label: 'OutMemus', panel: 'outmemus' },
    { icon: FileText, label: 'Drafts', panel: 'drafts' },
    { icon: Calendar, label: 'Calendar', panel: 'calendar' },
    { icon: Users, label: 'Connections', panel: 'connections' },
    { icon: AtSign, label: 'Handles', panel: 'handles' },
    { icon: Share2, label: 'AirShare', panel: 'airshare' },
  ];

  // Mobile overlay
  if (isMobile) {
    return (
      <>
        {/* Mobile Overlay */}
        {isMobileOpen && (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={onMobileClose}
          />
        )}
        
        {/* Mobile Sidebar */}
        <aside
          className={`fixed top-0 left-0 h-screen w-72 bg-white/95 backdrop-blur-xl border-r border-white/20 shadow-2xl transform transition-transform duration-300 ease-out z-50 lg:hidden ${
            isMobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Mobile Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/20 flex-shrink-0">
            <button onClick={() => handleNavigate('home')} className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition">
                <Sparkles size={16} className="text-white" />
              </div>
              <span className="font-['Playfair_Display'] text-xl font-semibold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                memu
              </span>
            </button>
            <button
              onClick={onMobileClose}
              className="p-2 rounded-lg hover:bg-white/50 transition text-gray-600"
            >
              <X size={20} />
            </button>
          </div>

          {/* Mobile Navigation */}
          <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar h-[calc(100vh-180px)]">
            {navItems.map((item) => {
              const isActive = activePanel === item.panel;
              return (
                <button
                  key={item.panel}
                  onClick={() => handleNavigate(item.panel)}
                  className={`relative flex items-center gap-3 w-full px-3 py-3 rounded-xl transition-all duration-200 group text-left ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-700 shadow-inner'
                      : 'text-gray-600 hover:bg-white/60 hover:text-gray-900'
                  }`}
                >
                  <item.icon size={20} className={isActive ? 'text-indigo-600' : 'text-gray-500'} />
                  <span className="text-base font-medium">{item.label}</span>
                </button>
              );
            })}

            {/* Spaces Section */}
            <div className="pt-4 mt-4 border-t border-white/20">
              <div className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Your Spaces
              </div>
              <SpacesList 
                onOpenSpace={(spaceId) => handleNavigate('space-dashboard', spaceId)}
                activePanel={activePanel}
                onDeleteRequest={handleDeleteRequest}
              />
              <button 
                onClick={() => handleNavigate('spaces')}
                className={`relative flex items-center gap-3 w-full px-3 py-3 rounded-xl transition-all duration-200 group text-left ${
                  activePanel === 'spaces'
                    ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-700'
                    : 'text-gray-600 hover:bg-white/60 hover:text-gray-900'
                }`}
              >
                <Plus size={20} className={activePanel === 'spaces' ? 'text-emerald-600' : 'text-gray-500'} />
                <span className="text-base font-medium">Discover Spaces</span>
              </button>
            </div>
          </div>

          {/* Mobile Bottom Section */}
          <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-white/20 space-y-3 bg-white/95 backdrop-blur-xl">
            <button
              onClick={() => {
                onOpenCompose();
                if (onMobileClose) onMobileClose();
              }}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
            >
              <Plus size={20} />
              <span className="text-base">New Memu</span>
            </button>
            
            <UserChip 
              user={user} 
              isGuest={isGuest} 
              onSignIn={onSignIn} 
              onOpenProfile={() => handleNavigate('profile')} 
            />
          </div>
        </aside>
      </>
    );
  }

  // Desktop Sidebar (existing code)
  return (
    <>
      <aside
        className={`relative hidden lg:flex flex-col h-screen bg-white/40 backdrop-blur-xl border-r border-white/20 shadow-xl transition-all duration-300 ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Header / Logo */}
        <div className="flex items-center justify-between p-4 border-b border-white/20 flex-shrink-0">
          {!collapsed ? (
            <button onClick={() => onNavigate('home')} className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition">
                <Sparkles size={16} className="text-white" />
              </div>
              <span className="font-['Playfair_Display'] text-xl font-semibold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                memu
              </span>
            </button>
          ) : (
            <div className="w-full flex justify-center">
              <button onClick={() => onNavigate('home')} className="group">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition">
                  <Sparkles size={16} className="text-white" />
                </div>
              </button>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg hover:bg-white/50 transition text-gray-600"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
          {navItems.map((item) => {
            const isActive = activePanel === item.panel;
            return (
              <button
                key={item.panel}
                onClick={() => onNavigate(item.panel)}
                className={`relative flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all duration-200 group text-left ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-700 shadow-inner'
                    : 'text-gray-600 hover:bg-white/60 hover:text-gray-900'
                }`}
              >
                <item.icon size={18} className={isActive ? 'text-indigo-600' : 'text-gray-500'} />
                {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                {collapsed && (
                  <div className="absolute left-16 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition whitespace-nowrap z-50 shadow-lg">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}

          {/* Spaces Section */}
          <div className="pt-4 mt-4 border-t border-white/20">
            {!collapsed && (
              <div className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Your Spaces
              </div>
            )}
            <SpacesList 
              onOpenSpace={onOpenSpace} 
              activePanel={activePanel}
              onDeleteRequest={handleDeleteRequest}
            />
            <button 
              onClick={() => onNavigate('spaces')}
              className={`relative flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all duration-200 group text-left ${
                activePanel === 'spaces'
                  ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-700'
                  : 'text-gray-600 hover:bg-white/60 hover:text-gray-900'
              }`}
            >
              <Plus size={18} className={activePanel === 'spaces' ? 'text-emerald-600' : 'text-gray-500'} />
              {!collapsed && <span className="text-sm font-medium">Discover Spaces</span>}
              {collapsed && (
                <div className="absolute left-16 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition whitespace-nowrap z-50 shadow-lg">
                  Discover Spaces
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Bottom Section: Compose & User Profile */}
        <div className="p-3 border-t border-white/20 space-y-3 flex-shrink-0">
          <button
            onClick={onOpenCompose}
            className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${
              collapsed ? 'px-0' : 'px-4'
            }`}
          >
            <Plus size={18} />
            {!collapsed && <span className="text-sm">New Memu</span>}
          </button>
          
          <UserChip 
            user={user} 
            isGuest={isGuest} 
            onSignIn={onSignIn} 
            onOpenProfile={onOpenProfile} 
          />
        </div>
      </aside>

      <DeleteConfirmModal 
        isOpen={showDeleteModal && itemToDelete !== null}
        onClose={() => { setShowDeleteModal(false); setItemToDelete(null); }}
        item={itemToDelete}
      />

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #d4d4d8; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #a1a1aa; }
      `}</style>
    </>
  );
}