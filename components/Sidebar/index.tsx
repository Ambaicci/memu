'use client';

import { useState } from 'react';
import { 
  Menu, Inbox, Send, FileText, Users, Video, Calendar, User, Sparkles, 
  ChevronLeft, ChevronRight, X, LogIn, Edit2, Trash2, Check, Plus
} from 'lucide-react';
import SidebarLogo from './SidebarLogo';
import ComposeButton from './ComposeButton';
import NavItem from './NavItem';
import NavSection from './NavSection';
import UserChip from './UserChip';
import DeleteConfirmModal from './DeleteConfirmModal';

interface Space {
  id: string;
  name: string;
  color: string;
  unread?: number;
}

interface SidebarProps {
  onNavigate: (panel: 'inmemus' | 'outmemus' | 'drafts' | 'connections' | 'spaces' | 'confer' | 'calendar' | 'handles') => void;
  activePanel: string;
  onOpenSpace: (spaceId: string) => void;
  onOpenCompose: () => void;
  isGuest: boolean;
  onSignIn: () => void;
  user?: any;
}

const defaultSpaces: Space[] = [
  { id: 'work', name: 'Work', color: '#4f46e5', unread: 0 },
  { id: 'friends', name: 'Friends', color: '#059669', unread: 4 },
  { id: 'family', name: 'Family', color: '#d97706', unread: 0 },
  { id: 'design', name: 'Design Squad', color: '#dc2626', unread: 0 },
];

const colorOptions = ['#4f46e5', '#059669', '#d97706', '#dc2626', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export default function Sidebar({ 
  onNavigate, 
  activePanel, 
  onOpenSpace, 
  onOpenCompose, 
  isGuest, 
  onSignIn, 
  user 
}: SidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [spaces, setSpaces] = useState<Space[]>(defaultSpaces);
  const [spaceToDelete, setSpaceToDelete] = useState<Space | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar_collapsed');
    return saved === 'true';
  });
  const [editingSpaceId, setEditingSpaceId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [newSpaceColor, setNewSpaceColor] = useState('#8b5cf6');

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebar_collapsed', String(newState));
  };

  const handleRenameSpace = (spaceId: string, newName: string) => {
    setSpaces(spaces.map(space => 
      space.id === spaceId ? { ...space, name: newName } : space
    ));
  };

  const handleDeleteSpace = (space: Space) => {
    if (spaces.length === 1) {
      alert('You must have at least one space. Create a new space before deleting this one.');
      return;
    }
    setSpaceToDelete(space);
  };

  const confirmDelete = () => {
    if (spaceToDelete) {
      const newSpaces = spaces.filter(s => s.id !== spaceToDelete.id);
      setSpaces(newSpaces);
      setSpaceToDelete(null);
    }
  };

  const handleCreateSpace = () => {
    if (!newSpaceName.trim()) return;
    const newSpace: Space = {
      id: newSpaceName.toLowerCase().replace(/\s/g, '_') + Date.now(),
      name: newSpaceName.trim(),
      color: newSpaceColor,
      unread: 0,
    };
    setSpaces([...spaces, newSpace]);
    setNewSpaceName('');
    setNewSpaceColor('#8b5cf6');
    setShowCreateModal(false);
  };

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const startRename = (space: Space) => {
    setEditingSpaceId(space.id);
    setEditingName(space.name);
  };

  const saveRename = () => {
    if (editingSpaceId && editingName.trim()) {
      handleRenameSpace(editingSpaceId, editingName.trim());
    }
    setEditingSpaceId(null);
    setEditingName('');
  };

  const cancelRename = () => {
    setEditingSpaceId(null);
    setEditingName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveRename();
    } else if (e.key === 'Escape') {
      cancelRename();
    }
  };

  const navItemClass = (panel: string) => {
    return `flex items-center gap-3 px-4 py-2.5 text-[13.5px] font-medium rounded-lg transition-all duration-200 cursor-pointer ${
      activePanel === panel
        ? 'bg-white/60 text-[#1a1a1a] shadow-sm'
        : 'text-[#686868] hover:bg-white/40 hover:text-[#1a1a1a]'
    }`;
  };

  const sidebarContent = (
    <>
      {/* Header with Logo */}
      <div className="px-4 pt-8 pb-4 flex items-center justify-between gap-2 flex-shrink-0">
        {!isCollapsed ? (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] rounded-xl flex items-center justify-center shadow-sm">
              <div className="w-3.5 h-3.5 border border-white/80 rounded-full" />
            </div>
            <span className="font-['Playfair_Display'] text-[22px] font-medium tracking-tight bg-gradient-to-r from-[#1a1a1a] to-[#4f46e5] bg-clip-text text-transparent">
              memu
            </span>
          </div>
        ) : (
          <div className="w-full flex justify-center">
            <div className="w-8 h-8 bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] rounded-xl flex items-center justify-center shadow-sm">
              <div className="w-3.5 h-3.5 border border-white/80 rounded-full" />
            </div>
          </div>
        )}
        <button 
          onClick={closeMobileMenu}
          className="lg:hidden p-2 rounded-lg hover:bg-white/30 absolute right-2 top-4"
        >
          <X size={20} className="text-[#686868]" />
        </button>
      </div>

      {/* Compose Button */}
      {!isCollapsed && <ComposeButton onClick={onOpenCompose} />}
      {isCollapsed && (
        <button
          onClick={onOpenCompose}
          className="mx-2 mb-4 w-10 h-10 bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] text-white rounded-lg flex items-center justify-center hover:from-[#5b21b6] hover:to-[#6d28d9] transition-all duration-200 shadow-md hover:shadow-lg flex-shrink-0"
          title="Write a memu"
        >
          <span className="text-lg">+</span>
        </button>
      )}

      {/* Scrollable Navigation Area */}
      <div className="flex-1 overflow-y-auto px-3 pb-4 custom-scroll">
        <nav className="space-y-6">
          {/* MEMUS Section */}
          <NavSection title="Memus" colorBar="bg-[#4f46e5]" isCollapsed={isCollapsed}>
            <div className="space-y-0.5">
              <div onClick={() => { onNavigate('inmemus'); closeMobileMenu(); }} className={navItemClass('inmemus')}>
                <Inbox size={16} className="opacity-70 flex-shrink-0" /> 
                {!isCollapsed && <span>In-memus</span>}
                {!isCollapsed && <span className="ml-auto text-[11px] font-medium bg-white/60 px-2 py-0.5 rounded-full">7</span>}
              </div>
              
              <div onClick={() => { onNavigate('outmemus'); closeMobileMenu(); }} className={navItemClass('outmemus')}>
                <Send size={16} className="opacity-70 flex-shrink-0" /> 
                {!isCollapsed && <span>Out-memus</span>}
              </div>
              
              <div onClick={() => { onNavigate('drafts'); closeMobileMenu(); }} className={navItemClass('drafts')}>
                <FileText size={16} className="opacity-70 flex-shrink-0" /> 
                {!isCollapsed && <span>Drafts</span>}
                {!isCollapsed && <span className="ml-auto text-[11px] font-medium bg-white/60 px-2 py-0.5 rounded-full">3</span>}
              </div>
            </div>
          </NavSection>

          {/* COMMUNICATE Section */}
          <NavSection title="Communicate" colorBar="bg-[#059669]" isCollapsed={isCollapsed}>
            <div className="space-y-0.5">
              <div onClick={() => { onNavigate('connections'); closeMobileMenu(); }} className={navItemClass('connections')}>
                <Sparkles size={16} className="opacity-70 flex-shrink-0" /> 
                {!isCollapsed && <span>Connections</span>}
                {!isCollapsed && <span className="ml-auto text-[11px] font-medium bg-[#e8e7e3] text-[#1a1a1a] px-2 py-0.5 rounded-full">3</span>}
              </div>
              
              <div onClick={() => { onNavigate('confer'); closeMobileMenu(); }} className={navItemClass('confer')}>
                <Video size={16} className="opacity-70 flex-shrink-0" /> 
                {!isCollapsed && <span>Memu-Confer</span>}
              </div>
              
              <div onClick={() => { onNavigate('calendar'); closeMobileMenu(); }} className={navItemClass('calendar')}>
                <Calendar size={16} className="opacity-70 flex-shrink-0" /> 
                {!isCollapsed && <span>Memu Calendar</span>}
              </div>
            </div>
          </NavSection>

          {/* DIRECTORY Section */}
          <NavSection title="Directory" colorBar="bg-[#d97706]" isCollapsed={isCollapsed}>
            <div className="space-y-0.5">
              <div onClick={() => { onNavigate('handles'); closeMobileMenu(); }} className={navItemClass('handles')}>
                <User size={16} className="opacity-70 flex-shrink-0" /> 
                {!isCollapsed && <span>Handles</span>}
              </div>
            </div>
          </NavSection>

          {/* MY SPACES Section */}
          <div>
            <div className="text-[11px] font-semibold tracking-wide text-[#8a8a8a] px-4 pb-2 uppercase flex items-center gap-2">
              <div className="w-1 h-4 bg-[#dc2626] rounded-full"></div>
              My Spaces
            </div>
            <div className="space-y-1">
              {/* All Spaces Button */}
              <div 
                onClick={() => { onNavigate('spaces'); closeMobileMenu(); }}
                className="flex items-center gap-3 px-4 py-2 rounded-lg text-[13.5px] font-medium transition-all duration-200 cursor-pointer hover:bg-white/40 text-[#686868] hover:text-[#1a1a1a]"
              >
                <Users size={16} className="opacity-70 flex-shrink-0" />
                {!isCollapsed && <span>All Spaces</span>}
              </div>

              {/* Divider */}
              <div className="my-2 border-t border-[#e8e7e3]/30 mx-4"></div>

              {/* Individual Spaces */}
              {spaces.map((space) => (
                <div key={space.id} className="group relative flex items-center gap-3 px-4 py-2 rounded-lg text-[13.5px] font-medium transition-all duration-200 cursor-pointer hover:bg-white/40 text-[#686868] hover:text-[#1a1a1a]">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: space.color }} />
                  
                  {editingSpaceId === space.id ? (
                    <div className="flex-1 flex items-center gap-1">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="flex-1 bg-white border border-[#4f46e5] rounded px-2 py-1 text-[13px] outline-none"
                        autoFocus
                      />
                      <button onClick={saveRename} className="p-1 rounded hover:bg-green-100 text-green-600 transition">
                        <Check size={14} />
                      </button>
                      <button onClick={cancelRename} className="p-1 rounded hover:bg-red-100 text-red-600 transition">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span 
                        onClick={() => { onOpenSpace(space.id); closeMobileMenu(); }}
                        className="flex-1"
                      >
                        {space.name}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startRename(space);
                          }}
                          className="p-1 rounded hover:bg-white/60 transition"
                          title="Rename"
                        >
                          <Edit2 size={12} className="text-[#777]" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSpace(space);
                          }}
                          className="p-1 rounded hover:bg-red-100 transition"
                          title="Delete"
                        >
                          <Trash2 size={12} className="text-[#777] hover:text-[#dc2626]" />
                        </button>
                      </div>
                    </>
                  )}
                  
                  {space.unread && space.unread > 0 && !editingSpaceId && (
                    <span className="text-[10px] font-medium bg-[#4f46e5] text-white px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                      {space.unread}
                    </span>
                  )}
                </div>
              ))}
              
              {/* Add New Space Button */}
              <div 
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-3 px-4 py-2 rounded-lg text-[13.5px] font-medium transition-all duration-200 cursor-pointer hover:bg-white/40 text-[#8a8a8a] hover:text-[#4f46e5]"
              >
                <Plus size={14} className="opacity-70 flex-shrink-0" />
                {!isCollapsed && <span>New Space</span>}
              </div>
            </div>
          </div>
        </nav>
      </div>

      <div className="border-t border-[#e8e7e3]/50 p-4 mt-auto flex-shrink-0">
        <UserChip isGuest={isGuest} user={user} onSignIn={onSignIn} isCollapsed={isCollapsed} />
      </div>

      <style>{`
        .custom-scroll::-webkit-scrollbar {
          width: 3px;
        }
        .custom-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background: #d4d4d4;
          border-radius: 10px;
        }
        .custom-scroll::-webkit-scrollbar-thumb:hover {
          background: #aaa;
        }
        
        @media (max-width: 768px) {
          .custom-scroll::-webkit-scrollbar {
            width: 0;
          }
        }
      `}</style>

      {/* Create Space Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-2xl w-[400px] max-w-[90%] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[18px] font-semibold text-[#0f0f0f] mb-4">Create New Space</h3>
            <div className="mb-4">
              <label className="block text-[12px] font-medium text-[#777] mb-1">Space Name</label>
              <input
                type="text"
                value={newSpaceName}
                onChange={(e) => setNewSpaceName(e.target.value)}
                className="w-full px-4 py-2 border border-[#e8e7e3] rounded-xl focus:outline-none focus:border-[#4f46e5] text-[14px] transition"
                placeholder="e.g., Marketing Team"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreateSpace()}
              />
            </div>
            <div className="mb-4">
              <label className="block text-[12px] font-medium text-[#777] mb-1">Space Color</label>
              <div className="flex gap-2 flex-wrap">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewSpaceColor(color)}
                    className={`w-8 h-8 rounded-full transition-all duration-200 ${
                      newSpaceColor === color ? 'ring-2 ring-offset-2 ring-[#0f0f0f] scale-110' : 'hover:scale-105'
                    }`}
                    style={{ background: color }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-lg text-[13px] text-[#777] hover:bg-[#f2f1ee] transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSpace}
                disabled={!newSpaceName.trim()}
                className="px-4 py-2 rounded-lg text-[13px] font-medium bg-gradient-to-r from-[#4f46e5] to-[#0891b2] text-white hover:shadow-lg transition disabled:opacity-50"
              >
                Create Space
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex h-screen bg-gradient-to-b from-[#fafaf8] to-[#f2f1ee] border-r border-[#e8e7e3]/60 flex-col shadow-sm transition-all duration-300 relative ${isCollapsed ? 'w-16' : 'w-64'}`}>
        {sidebarContent}
      </aside>

      {/* Floating Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="hidden lg:flex fixed top-20 z-50 items-center justify-center w-6 h-6 rounded-full bg-white shadow-md border border-[#e8e7e3] hover:bg-[#f2f1ee] hover:border-[#4f46e5] transition-all duration-200"
        style={{ left: isCollapsed ? 'calc(4rem - 6px)' : 'calc(16rem - 6px)' }}
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? <ChevronRight size={12} className="text-[#686868]" /> : <ChevronLeft size={12} className="text-[#686868]" />}
      </button>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white/80 backdrop-blur-sm shadow-sm border border-[#e8e7e3] active:scale-95 transition-transform"
        aria-label="Open menu"
      >
        <Menu size={20} className="text-[#1a1a1a]" />
      </button>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/40 z-40 lg:hidden animate-fadeIn"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="fixed left-0 top-0 w-72 h-full bg-gradient-to-b from-[#fafaf8] to-[#f2f1ee] shadow-xl z-50 lg:hidden animate-slideIn">
            {/* Mobile version - simplified but with same functionality */}
            <div className="flex flex-col h-full">
              <SidebarLogo onMobileClose={closeMobileMenu} />
              <ComposeButton onClick={onOpenCompose} />
              <div className="flex-1 overflow-y-auto px-3 pb-4">
                <nav className="space-y-6">
                  <NavSection title="Memus" colorBar="bg-[#4f46e5]" isCollapsed={false}>
                    <div className="space-y-0.5">
                      <div onClick={() => { onNavigate('inmemus'); closeMobileMenu(); }} className={navItemClass('inmemus')}>
                        <Inbox size={16} className="opacity-70" /> <span>In-memus</span>
                        <span className="ml-auto text-[11px] font-medium bg-white/60 px-2 py-0.5 rounded-full">7</span>
                      </div>
                      <div onClick={() => { onNavigate('outmemus'); closeMobileMenu(); }} className={navItemClass('outmemus')}>
                        <Send size={16} className="opacity-70" /> <span>Out-memus</span>
                      </div>
                      <div onClick={() => { onNavigate('drafts'); closeMobileMenu(); }} className={navItemClass('drafts')}>
                        <FileText size={16} className="opacity-70" /> <span>Drafts</span>
                        <span className="ml-auto text-[11px] font-medium bg-white/60 px-2 py-0.5 rounded-full">3</span>
                      </div>
                    </div>
                  </NavSection>

                  <NavSection title="Communicate" colorBar="bg-[#059669]" isCollapsed={false}>
                    <div className="space-y-0.5">
                      <div onClick={() => { onNavigate('connections'); closeMobileMenu(); }} className={navItemClass('connections')}>
                        <Sparkles size={16} className="opacity-70" /> <span>Connections</span>
                        <span className="ml-auto text-[11px] font-medium bg-[#e8e7e3] text-[#1a1a1a] px-2 py-0.5 rounded-full">3</span>
                      </div>
                      <div onClick={() => { onNavigate('confer'); closeMobileMenu(); }} className={navItemClass('confer')}>
                        <Video size={16} className="opacity-70" /> <span>Memu-Confer</span>
                      </div>
                      <div onClick={() => { onNavigate('calendar'); closeMobileMenu(); }} className={navItemClass('calendar')}>
                        <Calendar size={16} className="opacity-70" /> <span>Memu Calendar</span>
                      </div>
                    </div>
                  </NavSection>

                  <NavSection title="Directory" colorBar="bg-[#d97706]" isCollapsed={false}>
                    <div className="space-y-0.5">
                      <div onClick={() => { onNavigate('handles'); closeMobileMenu(); }} className={navItemClass('handles')}>
                        <User size={16} className="opacity-70" /> <span>Handles</span>
                      </div>
                    </div>
                  </NavSection>

                  <div>
                    <div className="text-[11px] font-semibold tracking-wide text-[#8a8a8a] px-4 pb-2 uppercase flex items-center gap-2">
                      <div className="w-1 h-4 bg-[#dc2626] rounded-full"></div>
                      My Spaces
                    </div>
                    <div className="space-y-1">
                      <div 
                        onClick={() => { onNavigate('spaces'); closeMobileMenu(); }}
                        className="flex items-center gap-3 px-4 py-2 rounded-lg text-[13.5px] font-medium transition-all duration-200 cursor-pointer hover:bg-white/40 text-[#686868] hover:text-[#1a1a1a]"
                      >
                        <Users size={16} className="opacity-70" />
                        <span>All Spaces</span>
                      </div>
                      <div className="my-2 border-t border-[#e8e7e3]/30 mx-4"></div>
                      {spaces.map((space) => (
                        <div key={space.id} className="flex items-center gap-3 px-4 py-2 rounded-lg text-[13.5px] font-medium transition-all duration-200 cursor-pointer hover:bg-white/40 text-[#686868] hover:text-[#1a1a1a] group">
                          <div className="w-2 h-2 rounded-full" style={{ background: space.color }} />
                          <span 
                            onClick={() => { onOpenSpace(space.id); closeMobileMenu(); }}
                            className="flex-1"
                          >
                            {space.name}
                          </span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                startRename(space);
                              }}
                              className="p-1 rounded hover:bg-white/60 transition"
                            >
                              <Edit2 size={12} className="text-[#777]" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSpace(space);
                              }}
                              className="p-1 rounded hover:bg-red-100 transition"
                            >
                              <Trash2 size={12} className="text-[#777] hover:text-[#dc2626]" />
                            </button>
                          </div>
                          {space.unread && space.unread > 0 && (
                            <span className="text-[10px] font-medium bg-[#4f46e5] text-white px-1.5 py-0.5 rounded-full">
                              {space.unread}
                            </span>
                          )}
                        </div>
                      ))}
                      <div 
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-3 px-4 py-2 rounded-lg text-[13.5px] font-medium transition-all duration-200 cursor-pointer hover:bg-white/40 text-[#8a8a8a] hover:text-[#4f46e5]"
                      >
                        <Plus size={14} className="opacity-70" />
                        <span>New Space</span>
                      </div>
                    </div>
                  </div>
                </nav>
              </div>
              <div className="border-t border-[#e8e7e3]/50 p-4 mt-auto">
                <UserChip isGuest={isGuest} user={user} onSignIn={onSignIn} isCollapsed={false} />
              </div>
            </div>
          </aside>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {spaceToDelete && (
        <DeleteConfirmModal
          spaceName={spaceToDelete.name}
          onConfirm={confirmDelete}
          onCancel={() => setSpaceToDelete(null)}
        />
      )}

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </>
  );
}