'use client';

import { useState } from 'react';
import { 
  Inbox, Send, FileText, Calendar, 
  Share2, Users, Layers, Video, MessageSquare,
  ChevronLeft, ChevronRight, Plus, AtSign, X, LayoutGrid
} from 'lucide-react';
import SpacesList from './SpacesList';
import UserChip from './UserChip';
import DeleteConfirmModal from './DeleteConfirmModal';

// Added 'dashboard' to PanelType
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
  onNavigate, activePanel, onOpenSpace, onOpenCompose, onOpenDirectMemos,
  isGuest, onSignIn, onOpenProfile, user,
  isMobileOpen = false,
  onMobileClose
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);

  const handleDeleteRequest = (item: any) => {
    if (!item || !item.id) return;
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  const handleNavigate = (panel: PanelType, spaceId?: string | null) => {
    onNavigate(panel, spaceId);
    if (onMobileClose) onMobileClose();
  };

  const communicationItems = [
    { icon: Inbox, label: 'InMemus', panel: 'inmemus' as PanelType },
    { icon: Send, label: 'OutMemus', panel: 'outmemus' as PanelType },
    { icon: FileText, label: 'Drafts', panel: 'drafts' as PanelType },
    { icon: MessageSquare, label: 'Direct Memos', action: 'direct-memos' },
  ];

  const collaborationItems = [
    { icon: Video, label: 'memu-Confer', panel: 'confer' as PanelType },
    { icon: Calendar, label: 'Calendar', panel: 'calendar' as PanelType },
    { icon: Users, label: 'Connections', panel: 'connections' as PanelType },
    { icon: Share2, label: 'AirShare', panel: 'airshare' as PanelType },
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
        className={`group relative flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all duration-200 text-left ${
          isActive
            ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 shadow-sm'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }`}
      >
        {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-r-full" />}
        <item.icon size={18} className={`transition-colors ${isActive ? 'text-indigo-600' : 'text-gray-500 group-hover:text-gray-700'}`} />
        <span className={`text-sm font-medium truncate transition-all duration-300 ${collapsed ? 'lg:opacity-0 lg:w-0' : 'opacity-100'}`}>
          {item.label}
        </span>
      </button>
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={onMobileClose}
        />
      )}
      
      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static top-0 left-0 h-screen bg-white/90 backdrop-blur-xl border-r border-gray-200/60 shadow-xl z-50 flex flex-col transition-all duration-300 ease-out ${
          isMobileOpen ? 'translate-x-0 pointer-events-auto' : '-translate-x-full lg:translate-x-0 pointer-events-none lg:pointer-events-auto'
        } ${collapsed ? 'lg:w-20' : 'lg:w-72'}`}
      >
        {/* THE ARTISTIC FLOATING COLLAPSE BUTTON */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex absolute -right-3 top-24 z-[60] w-6 h-6 bg-white border border-gray-200 rounded-full items-center justify-center shadow-md hover:scale-110 hover:border-indigo-300 hover:text-indigo-600 transition-all duration-300 text-gray-500"
          title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {collapsed ? <ChevronRight size={14} strokeWidth={3} /> : <ChevronLeft size={14} strokeWidth={3} />}
        </button>

        {/* 1. Header with ACTUAL LOGO - FIXED: Now navigates to dashboard */}
        <div className="flex-shrink-0 flex items-center justify-center lg:justify-start px-5 py-6 border-b border-gray-100/80">
          <button 
            onClick={() => handleNavigate('dashboard')} 
            className="flex items-center gap-3 group"
            title="Go to Dashboard"
          >
            {/* YOUR LOGO */}
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-300 bg-white">
              <img 
                src="/svg.logo.png" 
                alt="memu" 
                className="w-full h-full object-cover"
              />
            </div>
            
            <span className={`font-['Playfair_Display'] text-xl font-semibold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent transition-all duration-300 ${collapsed ? 'lg:opacity-0 lg:w-0' : 'opacity-100'}`}>
              memu
            </span>
          </button>
          
          {/* Mobile Close Button */}
          <button
            onClick={onMobileClose}
            className="lg:hidden absolute right-4 p-2 rounded-lg hover:bg-gray-100 text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* 2. New Memu Button */}
        <div className="flex-shrink-0 px-4 py-4">
          <button
            onClick={() => {
              onOpenCompose();
              if (onMobileClose) onMobileClose();
            }}
            className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 ${
              collapsed ? 'lg:px-0' : 'px-4'
            }`}
          >
            <Plus size={18} />
            <span className={`text-sm font-medium transition-all duration-300 ${collapsed ? 'lg:opacity-0 lg:w-0' : 'opacity-100'}`}>New Memu</span>
          </button>
        </div>

        {/* 3. Scrollable Navigation Area */}
        <div className={`flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar ${collapsed ? 'lg:px-2' : ''}`}>
          {/* Communication */}
          <div className="mb-6">
            {!collapsed && (
              <p className="px-3 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Communication</p>
            )}
            <div className="space-y-1">
              {communicationItems.map(renderNavItem)}
            </div>
          </div>

          {/* Collaboration */}
          <div className="mb-6">
            {!collapsed && (
              <p className="px-3 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Collaboration</p>
            )}
            <div className="space-y-1">
              {collaborationItems.map(renderNavItem)}
            </div>
          </div>

          {/* My Spaces */}
          <div className="pt-2 border-t border-gray-100/80">
            {!collapsed && (
              <p className="px-3 mb-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">My Spaces</p>
            )}
            
            {/* All Spaces Button */}
            <button 
              onClick={() => handleNavigate('spaces')}
              className={`group relative flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all duration-200 text-left mb-3 ${
                activePanel === 'spaces'
                  ? 'bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {activePanel === 'spaces' && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-emerald-500 rounded-r-full" />}
              <LayoutGrid size={18} className={activePanel === 'spaces' ? 'text-emerald-600' : 'text-gray-500 group-hover:text-gray-700'} />
              <span className={`text-sm font-medium truncate transition-all duration-300 ${collapsed ? 'lg:opacity-0 lg:w-0' : 'opacity-100'}`}>All Spaces</span>
            </button>

            {/* THE MICROSCREEN */}
            <SpacesList 
              onOpenSpace={(spaceId) => handleNavigate('space-dashboard', spaceId)}
              activePanel={activePanel}
              onDeleteRequest={handleDeleteRequest}
              maxItems={2}
            />
          </div>
        </div>

        {/* 4. Footer */}
        <div className="flex-shrink-0 border-t border-gray-100/80 p-4 bg-white/60 backdrop-blur-md space-y-3">
          {/* Handles Button */}
          <button
            onClick={() => handleNavigate('handles')}
            className={`group relative flex items-center gap-3 w-full px-3 py-2 rounded-xl transition-all duration-200 text-left ${
              activePanel === 'handles'
                ? 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 shadow-sm'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            {activePanel === 'handles' && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-amber-500 rounded-r-full" />}
            <AtSign size={18} className={activePanel === 'handles' ? 'text-amber-600' : 'text-gray-500 group-hover:text-gray-700'} />
            <span className={`text-sm font-medium truncate transition-all duration-300 ${collapsed ? 'lg:opacity-0 lg:w-0' : 'opacity-100'}`}>Handles</span>
          </button>

          {/* User Avatar / Chip */}
          <UserChip 
            user={user} 
            isGuest={isGuest} 
            onSignIn={onSignIn} 
            onOpenProfile={() => handleNavigate('profile')} 
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
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #d1d5db; }
      `}</style>
    </>
  );
}