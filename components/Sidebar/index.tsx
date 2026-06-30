'use client';

import { useState, useEffect } from 'react';
import {
  Inbox,
  Send,
  FileText,
  Calendar,
  Users,
  Layers,
  Video,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Plus,
  AtSign,
  X,
  LayoutGrid,
  BarChart3,
  Sparkles,
  LogIn,
  ChevronRight as ChevronRightIcon,
} from 'lucide-react';
import SpacesList from './SpacesList';
import DeleteConfirmModal from './DeleteConfirmModal';

type PanelType = 'home' | 'dashboard' | 'inmemus' | 'outmemus' | 'drafts' | 'connections' | 'spaces' | 'confer' | 'calendar' | 'handles' | 'airshare' | 'docs' | 'slides' | 'sheets' | 'space-dashboard' | 'analytics' | 'notes' | 'profile';

interface SidebarProps {
  onNavigate: (panel: PanelType, spaceId?: string | null) => void;
  activePanel: PanelType;
  onOpenSpace: (spaceId: string) => void;
  onOpenCompose: () => void;
  onOpenDirectMemos: () => void;
  isGuest: boolean;
  onSignIn: () => void;
  onOpenProfile: () => void;
  user: any;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({
  onNavigate,
  activePanel,
  onOpenSpace,
  onOpenCompose,
  onOpenDirectMemos,
  isGuest,
  onSignIn,
  onOpenProfile,
  user,
  isMobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  
  //  New: State to force avatar refresh when profile updates
  const [avatarRefreshKey, setAvatarRefreshKey] = useState(0);

  // 🚀 New: Listen for profile updates to refresh the avatar instantly
  useEffect(() => {
    const handleProfileUpdate = () => {
      setAvatarRefreshKey(prev => prev + 1);
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
  }, []);

  const handleDeleteRequest = (item: any) => {
    if (!item || !item.id) return;
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  const handleNavigate = (panel: PanelType, spaceId?: string | null) => {
    onNavigate(panel, spaceId);
    if (onMobileClose) onMobileClose();
  };

  const primaryItems = [
    { icon: Inbox, label: 'InMemus', panel: 'inmemus' as PanelType },
    { icon: Send, label: 'OutMemus', panel: 'outmemus' as PanelType },
    { icon: FileText, label: 'Drafts', panel: 'drafts' as PanelType },
    { icon: MessageSquare, label: 'Direct Memos', action: 'direct-memos' },
  ];

  const collaborationItems = [
    { icon: Users, label: 'Connections', panel: 'connections' as PanelType },
    { icon: Layers, label: 'Spaces', panel: 'spaces' as PanelType },
    { icon: Video, label: 'Confer', panel: 'confer' as PanelType },
    { icon: Calendar, label: 'Calendar', panel: 'calendar' as PanelType },
    { icon: BarChart3, label: 'Analytics', panel: 'analytics' as PanelType },
  ];

  const renderNavItem = (item: any) => {
    const isActive = 'panel' in item && activePanel === item.panel;
    const isAction = 'action' in item;

    return (
      <button
        key={item.label}
        onClick={() => {
          if (isAction) {
            if (item.action === 'direct-memos') {
              onOpenDirectMemos();
              if (onMobileClose) onMobileClose();
            }
          } else {
            handleNavigate(item.panel);
          }
        }}
        className={`
          group relative flex items-center gap-3 w-full px-3 py-2.5 rounded-xl
          transition-all duration-200 text-left
          ${isActive
            ? 'bg-blue-50/70 text-blue-700 shadow-sm'
            : 'text-gray-600 hover:bg-gray-50/70 hover:text-gray-900'
          }
        `}
      >
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-r-full shadow-sm shadow-blue-500/30" />
        )}
        <item.icon
          size={18}
          strokeWidth={isActive ? 2.2 : 1.8}
          className={`transition-all duration-200 ${
            isActive 
              ? 'text-blue-600' 
              : 'text-gray-400 group-hover:text-gray-600'
          }`}
        />
        <span className={`
          text-sm font-medium tracking-tight truncate transition-all duration-300
          ${isActive ? 'text-gray-900' : 'text-gray-600 group-hover:text-gray-900'}
          ${collapsed ? 'lg:opacity-0 lg:w-0' : 'opacity-100'}
        `}>
          {item.label}
        </span>
      </button>
    );
  };

  const getUserInitials = () => {
    if (!user) return 'G';
    const name = user.user_metadata?.full_name || user.email || 'User';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={`
          fixed lg:static top-0 left-0 h-screen
          bg-white/90 backdrop-blur-xl border-r border-gray-200/40 shadow-sm
          z-50 flex flex-col transition-all duration-300 ease-out
          ${isMobileOpen ? 'translate-x-0 pointer-events-auto' : '-translate-x-full lg:translate-x-0 pointer-events-none lg:pointer-events-auto'}
          ${collapsed ? 'lg:w-20' : 'lg:w-64'}
        `}
      >
        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="
            hidden lg:flex absolute -right-3 top-24 z-[60]
            w-6 h-6 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full
            items-center justify-center shadow-sm
            hover:scale-105 hover:border-blue-300 hover:text-blue-600
            transition-all duration-300 text-gray-400
          "
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight size={14} strokeWidth={2.5} /> : <ChevronLeft size={14} strokeWidth={2.5} />}
        </button>

        {/* ===== SIDEBAR HEADER ===== */}
        <div className="flex-shrink-0 flex items-center justify-center lg:justify-start px-4 py-3.5 border-b border-gray-100/60">
          <button
            onClick={() => handleNavigate('dashboard')}
            className="flex items-center gap-3 group"
            title="Go to Dashboard"
          >
            <img
              src="/svg.logo.png"
              alt="MEMU Logo"
              className="w-9 h-9 rounded-xl object-contain group-hover:scale-105 transition-transform duration-300"
            />
            <span className={`
              text-xl font-semibold tracking-tight text-gray-900
              transition-all duration-300
              ${collapsed ? 'lg:opacity-0 lg:w-0' : 'opacity-100'}
            `}>
              memu
            </span>
          </button>

          {/* Mobile Close */}
          <button
            onClick={onMobileClose}
            className="lg:hidden absolute right-4 p-2 rounded-lg hover:bg-gray-100 text-gray-500"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        {/* ===== COMPOSE BUTTON ===== */}
        <div className="flex-shrink-0 px-3 py-3">
          <button
            onClick={() => {
              onOpenCompose();
              if (onMobileClose) onMobileClose();
            }}
            className={`
              relative flex items-center justify-center gap-2 w-full py-2.5 rounded-xl
              bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium
              shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300
              overflow-hidden group
            `}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-white/0 via-white/10 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <Plus size={18} strokeWidth={2.5} className="flex-shrink-0 relative z-10" />
            <span className={`
              text-sm font-medium whitespace-nowrap transition-all duration-300 relative z-10
              ${collapsed ? 'lg:opacity-0 lg:w-0 lg:overflow-hidden' : 'opacity-100'}
            `}>
              New Memu
            </span>
          </button>
        </div>

        {/* ===== NAVIGATION ===== */}
        <div className={`
          flex-1 overflow-y-auto px-3 pb-4
          ${collapsed ? 'lg:px-1' : ''}
          scrollbar-hidden
        `}>
          {/* Main Section */}
          <div className="mb-4">
            {!collapsed && (
              <p className="px-3 mb-2 text-[11px] font-bold text-blue-600 tracking-widest uppercase">
                Main
              </p>
            )}
            <div className="space-y-0.5">
              {primaryItems.map(renderNavItem)}
            </div>
          </div>

          {/* Collaboration Section */}
          <div className="mb-4">
            {!collapsed && (
              <p className="px-3 mb-2 text-[11px] font-bold text-purple-600 tracking-widest uppercase">
                Collaboration
              </p>
            )}
            <div className="space-y-0.5">
              {collaborationItems.map(renderNavItem)}
            </div>
          </div>

          {/* Handles & Spaces */}
          <div className="pt-4 border-t border-gray-100/60">
            <button
              onClick={() => handleNavigate('handles')}
              className={`
                group relative flex items-center gap-3 w-full px-3 py-2.5 rounded-xl
                transition-all duration-200 text-left
                ${activePanel === 'handles'
                  ? 'bg-blue-50/70 text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50/70 hover:text-gray-900'
                }
              `}
            >
              {activePanel === 'handles' && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-r-full shadow-sm shadow-blue-500/30" />
              )}
              <AtSign
                size={18}
                strokeWidth={activePanel === 'handles' ? 2.2 : 1.8}
                className={`transition-all duration-200 ${
                  activePanel === 'handles' 
                    ? 'text-blue-600' 
                    : 'text-gray-400 group-hover:text-gray-600'
                }`}
              />
              <span className={`
                text-sm font-medium tracking-tight truncate transition-all duration-300
                ${activePanel === 'handles' ? 'text-gray-900' : 'text-gray-600 group-hover:text-gray-900'}
                ${collapsed ? 'lg:opacity-0 lg:w-0' : 'opacity-100'}
              `}>
                Handles
              </span>
            </button>

            {!collapsed && (
              <div className="px-3 mt-4 mb-2">
                <p className="text-[11px] font-bold text-emerald-600 tracking-widest uppercase">
                  Spaces
                </p>
              </div>
            )}

            <button
              onClick={() => handleNavigate('spaces')}
              className={`
                group relative flex items-center gap-3 w-full px-3 py-2.5 rounded-xl
                transition-all duration-200 text-left
                ${activePanel === 'spaces' || activePanel === 'space-dashboard'
                  ? 'bg-blue-50/70 text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50/70 hover:text-gray-900'
                }
              `}
            >
              {(activePanel === 'spaces' || activePanel === 'space-dashboard') && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-r-full shadow-sm shadow-blue-500/30" />
              )}
              <LayoutGrid
                size={18}
                strokeWidth={(activePanel === 'spaces' || activePanel === 'space-dashboard') ? 2.2 : 1.8}
                className={`transition-all duration-200 ${
                  (activePanel === 'spaces' || activePanel === 'space-dashboard')
                    ? 'text-blue-600' 
                    : 'text-gray-400 group-hover:text-gray-600'
                }`}
              />
              <span className={`
                text-sm font-medium tracking-tight truncate transition-all duration-300
                ${(activePanel === 'spaces' || activePanel === 'space-dashboard') ? 'text-gray-900' : 'text-gray-600 group-hover:text-gray-900'}
                ${collapsed ? 'lg:opacity-0 lg:w-0' : 'opacity-100'}
              `}>
                All Spaces
              </span>
            </button>

            <SpacesList
              onOpenSpace={(spaceId) => handleNavigate('space-dashboard', spaceId)}
              activePanel={activePanel}
              onDeleteRequest={handleDeleteRequest}
              maxItems={collapsed ? 1 : 2}
            />
          </div>
        </div>

        {/* ===== FOOTER ===== */}
        <div className="flex-shrink-0 border-t border-gray-100/60 p-3 bg-white/50 backdrop-blur-sm space-y-2">
          {isGuest ? (
            <button
              onClick={onSignIn}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-blue-50/80 hover:bg-blue-100/80 transition-all btn-press text-blue-700 group"
            >
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                <LogIn size={16} strokeWidth={2} className="text-blue-600" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-semibold text-gray-900">Guest Mode</div>
                <div className="text-[10px] text-gray-500 font-medium">Sign in to unlock</div>
              </div>
              <ChevronRightIcon size={14} strokeWidth={2.5} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
            </button>
          ) : (
            <button
              onClick={onOpenProfile}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50/80 transition-all group btn-press"
            >
              {/*  Updated Avatar Section with Refresh Key */}
              <div key={avatarRefreshKey} className="flex-shrink-0">
                {user?.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt="Profile"
                    className="w-8 h-8 rounded-full object-cover border border-gray-200 group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold group-hover:scale-105 transition-transform">
                    {getUserInitials()}
                  </div>
                )}
              </div>
              
              <div className="flex-1 text-left min-w-0">
                <div className="text-sm font-semibold text-gray-900 truncate">
                  {user?.user_metadata?.full_name || user?.email || 'User'}
                </div>
                <div className="text-[10px] text-gray-500 truncate">
                  {user?.email || 'No email'}
                </div>
              </div>
              <ChevronRightIcon size={14} strokeWidth={2.5} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
            </button>
          )}
        </div>
      </aside>

      <DeleteConfirmModal
        isOpen={showDeleteModal && itemToDelete !== null}
        onClose={() => { setShowDeleteModal(false); setItemToDelete(null); }}
        item={itemToDelete}
      />

      {/* ===== GLOBAL STYLES: HIDE SCROLLBAR ===== */}
      <style>{`
        /* Hide scrollbar for Chrome, Safari and Opera */
        .scrollbar-hidden::-webkit-scrollbar {
          display: none;
        }
        /* Hide scrollbar for IE, Edge and Firefox */
        .scrollbar-hidden {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
      `}</style>
    </>
  );
}