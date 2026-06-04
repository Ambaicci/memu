'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Menu, Inbox, Send, FileText, Users, Video, Calendar, User, Sparkles, 
  ChevronLeft, ChevronRight, X, LogIn, Edit2, Trash2, Check, Plus, MessageSquare
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import SidebarLogo from './SidebarLogo';
import ComposeButton from './ComposeButton';
import NavItem from './NavItem';
import NavSection from './NavSection';
import UserChip from './UserChip';
import DeleteConfirmModal from './DeleteConfirmModal';
import DirectMemoInbox from '@/components/direct-memos/DirectMemoInbox';

interface Space {
  id: string;
  name: string;
  color: string;
  role?: 'admin' | 'member';
  created_at: string;
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
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loadingSpaces, setLoadingSpaces] = useState(true);
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Direct Memos State
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [unreadMemoCount, setUnreadMemoCount] = useState(0);

  const { showToast } = useToast();

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    getUser();
  }, []);

  // Fetch unread memo count
  useEffect(() => {
    if (!currentUserId) return;
    const supabase = createClient();
    
    const fetchUnread = async () => {
      const { count, error } = await supabase
        .from('direct_memos')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', currentUserId)
        .eq('is_read', false);
        
      if (!error && count !== null) {
        setUnreadMemoCount(count);
      }
    };
    
    fetchUnread();
    
    // Listen for real-time updates on the direct_memos table
    const channel = supabase
      .channel('memo-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_memos' }, fetchUnread)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  // Fetch spaces from Supabase
  const fetchSpaces = useCallback(async () => {
    if (!currentUserId) {
      setLoadingSpaces(false);
      return;
    }

    setLoadingSpaces(true);
    const supabase = createClient();
    
    try {
      const { data: memberships, error: memError } = await supabase
        .from('space_members')
        .select('space_id, role')
        .eq('user_id', currentUserId);
      
      if (memError) throw memError;

      if (!memberships || memberships.length === 0) {
        setSpaces([]);
        setLoadingSpaces(false);
        return;
      }

      const spaceIds = memberships.map(m => m.space_id);
      const { data: spacesData, error: spacesError } = await supabase
        .from('spaces')
        .select('id, name, color, created_at')
        .in('id', spaceIds)
        .order('created_at', { ascending: false });
      
      if (spacesError) throw spacesError;

      const enriched: Space[] = (spacesData || []).map(space => ({
        ...space,
        role: memberships.find(m => m.space_id === space.id)?.role as 'admin' | 'member',
      }));
      setSpaces(enriched);
    } catch (err) {
      console.error('Unexpected sidebar error:', err);
      showToast('Failed to load spaces', 'error');
    } finally {
      setLoadingSpaces(false);
    }
  }, [currentUserId, showToast]);

  useEffect(() => {
    if (currentUserId) {
      fetchSpaces();
    }
  }, [fetchSpaces, currentUserId]);

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebar_collapsed', String(newState));
  };

  const handleRenameSpace = async (spaceId: string, newName: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('spaces')
      .update({ name: newName })
      .eq('id', spaceId);
    
    if (error) {
      showToast('Failed to rename space', 'error');
    } else {
      showToast('Space renamed', 'success');
      fetchSpaces();
    }
  };

  const handleDeleteSpace = async (space: Space) => {
    if (spaces.length === 1) {
      showToast('You must have at least one space. Create a new space before deleting this one.', 'error');
      return;
    }
    setSpaceToDelete(space);
  };

  const confirmDelete = async () => {
    if (!spaceToDelete) return;
    
    const supabase = createClient();
    const { error } = await supabase
      .from('spaces')
      .delete()
      .eq('id', spaceToDelete.id);
    
    if (error) {
      showToast('Failed to delete space', 'error');
    } else {
      showToast('Space deleted', 'success');
      fetchSpaces();
    }
    setSpaceToDelete(null);
  };

  const handleCreateSpace = async () => {
    if (!newSpaceName.trim() || !currentUserId) return;
    
    const supabase = createClient();
    
    try {
      const { data: newSpace, error: spaceError } = await supabase
        .from('spaces')
        .insert({
          name: newSpaceName.trim(),
          color: newSpaceColor,
          created_by: currentUserId,
        })
        .select()
        .single();
      
      if (spaceError) throw spaceError;

      const { error: memberError } = await supabase
        .from('space_members')
        .insert({
          space_id: newSpace.id,
          user_id: currentUserId,
          role: 'admin',
        });
      
      if (memberError) throw memberError;

      setNewSpaceName('');
      setNewSpaceColor('#8b5cf6');
      setShowCreateModal(false);
      fetchSpaces();
    } catch (err) {
      showToast('Failed to create space', 'error');
    }
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
    if (e.key === 'Enter') saveRename();
    else if (e.key === 'Escape') cancelRename();
  };

  const navItemClass = (panel: string) => `flex items-center gap-3 px-4 py-2.5 text-[13.5px] font-medium rounded-lg transition-all duration-200 cursor-pointer ${activePanel === panel ? 'bg-white/60 text-[#1a1a1a] shadow-sm' : 'text-[#686868] hover:bg-white/40 hover:text-[#1a1a1a]'}`;

  const renderSpacesList = (isMobile: boolean = false) => {
    if (loadingSpaces) return <div className="px-4 py-2 space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-8 bg-white/40 rounded-lg animate-pulse" />)}</div>;

    return (
      <>
        <div onClick={() => { onNavigate('spaces'); closeMobileMenu(); }} className="flex items-center gap-3 px-4 py-2 rounded-lg text-[13.5px] font-medium transition-all duration-200 cursor-pointer hover:bg-white/40 text-[#686868] hover:text-[#1a1a1a]">
          <Users size={16} className="opacity-70 flex-shrink-0" />
          {(!isCollapsed && !isMobile) || isMobile && <span>All Spaces</span>}
        </div>
        <div className="my-2 border-t border-[#e8e7e3]/30 mx-4"></div>
        {spaces.map((space) => (
          <div key={space.id} className="group relative flex items-center gap-3 px-4 py-2 rounded-lg text-[13.5px] font-medium transition-all duration-200 cursor-pointer hover:bg-white/40 text-[#686868] hover:text-[#1a1a1a]">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: space.color }} />
            {editingSpaceId === space.id ? (
              <div className="flex-1 flex items-center gap-1">
                <input type="text" value={editingName} onChange={(e) => setEditingName(e.target.value)} onKeyDown={handleKeyDown} className="flex-1 bg-white border border-[#4f46e5] rounded px-2 py-1 text-[13px] outline-none" autoFocus />
                <button onClick={saveRename} className="p-1 rounded hover:bg-green-100 text-green-600 transition"><Check size={14} /></button>
                <button onClick={cancelRename} className="p-1 rounded hover:bg-red-100 text-red-600 transition"><X size={14} /></button>
              </div>
            ) : (
              <>
                <span onClick={() => { onOpenSpace(space.id); closeMobileMenu(); }} className="flex-1">{space.name}</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                  <button onClick={(e) => { e.stopPropagation(); startRename(space); }} className="p-1 rounded hover:bg-white/60 transition" title="Rename"><Edit2 size={12} className="text-[#777]" /></button>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteSpace(space); }} className="p-1 rounded hover:bg-red-100 transition" title="Delete"><Trash2 size={12} className="text-[#777] hover:text-[#dc2626]" /></button>
                </div>
              </>
            )}
          </div>
        ))}
        <div onClick={() => setShowCreateModal(true)} className="flex items-center gap-3 px-4 py-2 rounded-lg text-[13.5px] font-medium transition-all duration-200 cursor-pointer hover:bg-white/40 text-[#8a8a8a] hover:text-[#4f46e5]">
          <Plus size={14} className="opacity-70 flex-shrink-0" />
          {(!isCollapsed && !isMobile) || isMobile && <span>New Space</span>}
        </div>
      </>
    );
  };

  const sidebarContent = (
    <>
      <div className="px-4 pt-8 pb-4 flex items-center justify-between gap-2 flex-shrink-0">
        {!isCollapsed ? (
          <div onClick={() => onNavigate('inmemus')} className="flex items-center gap-3 cursor-pointer group">
            <img src="/svg.logo.png" alt="memu" className="w-16 h-16 object-contain transition-transform duration-200 group-hover:scale-105" />
            <span className="font-['Playfair_Display'] text-[22px] font-medium tracking-tight bg-gradient-to-r from-[#1a1a1a] to-[#4f46e5] bg-clip-text text-transparent group-hover:from-[#4f46e5] group-hover:to-[#7c3aed] transition-all duration-200">memu</span>
          </div>
        ) : (
          <div onClick={() => onNavigate('inmemus')} className="w-full flex justify-center cursor-pointer group">
            <img src="/svg.logo.png" alt="memu" className="w-16 h-16 object-contain transition-transform duration-200 group-hover:scale-105" />
          </div>
        )}
        <button onClick={closeMobileMenu} className="lg:hidden p-2 rounded-lg hover:bg-white/30 absolute right-2 top-4"><X size={20} className="text-[#686868]" /></button>
      </div>
      {!isCollapsed && <ComposeButton onClick={onOpenCompose} />}
      {isCollapsed && (
        <button onClick={onOpenCompose} className="mx-2 mb-4 w-10 h-10 bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] text-white rounded-lg flex items-center justify-center hover:from-[#5b21b6] hover:to-[#6d28d9] transition-all duration-200 shadow-md hover:shadow-lg flex-shrink-0" title="Write a memu"><span className="text-lg">+</span></button>
      )}
      <div className="flex-1 overflow-y-auto px-3 pb-4 custom-scroll">
        <nav className="space-y-6">
          <NavSection title="Memus" colorBar="bg-[#4f46e5]" isCollapsed={isCollapsed}>
            <div className="space-y-0.5">
              <div onClick={() => { onNavigate('inmemus'); closeMobileMenu(); }} className={navItemClass('inmemus')}><Inbox size={16} className="opacity-70 flex-shrink-0" />{!isCollapsed && <span>In-memus</span>}</div>
              <div onClick={() => { onNavigate('outmemus'); closeMobileMenu(); }} className={navItemClass('outmemus')}><Send size={16} className="opacity-70 flex-shrink-0" />{!isCollapsed && <span>Out-memus</span>}</div>
              <div onClick={() => { onNavigate('drafts'); closeMobileMenu(); }} className={navItemClass('drafts')}><FileText size={16} className="opacity-70 flex-shrink-0" />{!isCollapsed && <span>Drafts</span>}</div>
            </div>
          </NavSection>
          <NavSection title="Communicate" colorBar="bg-[#059669]" isCollapsed={isCollapsed}>
            <div className="space-y-0.5">
              <div onClick={() => { onNavigate('connections'); closeMobileMenu(); }} className={navItemClass('connections')}><Sparkles size={16} className="opacity-70 flex-shrink-0" />{!isCollapsed && <span>Connections</span>}</div>
              <div onClick={() => { onNavigate('confer'); closeMobileMenu(); }} className={navItemClass('confer')}><Video size={16} className="opacity-70 flex-shrink-0" />{!isCollapsed && <span>Memu-Confer</span>}</div>
              <div onClick={() => { onNavigate('calendar'); closeMobileMenu(); }} className={navItemClass('calendar')}><Calendar size={16} className="opacity-70 flex-shrink-0" />{!isCollapsed && <span>Memu Calendar</span>}</div>
            </div>
          </NavSection>
          <NavSection title="Directory" colorBar="bg-[#d97706]" isCollapsed={isCollapsed}>
            <div className="space-y-0.5">
              <div onClick={() => { onNavigate('handles'); closeMobileMenu(); }} className={navItemClass('handles')}><User size={16} className="opacity-70 flex-shrink-0" />{!isCollapsed && <span>Handles</span>}</div>
            </div>
          </NavSection>
          <div>
            <div className="text-[11px] font-semibold tracking-wide text-[#8a8a8a] px-4 pb-2 uppercase flex items-center gap-2"><div className="w-1 h-4 bg-[#dc2626] rounded-full"></div>My Spaces</div>
            <div className="space-y-1">{renderSpacesList(false)}</div>
          </div>
        </nav>
      </div>

      {/* ============================================ */}
      {/* DIRECT MEMOS SECTION (Above User Profile)    */}
      {/* ============================================ */}
      {!isCollapsed && (
        <div className="px-3 pb-2 flex-shrink-0">
          <button
            onClick={() => setIsInboxOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/40 transition text-[#686868] hover:text-[#1a1a1a] group"
          >
            <div className="flex items-center gap-3">
              <MessageSquare size={16} className="opacity-70 flex-shrink-0 group-hover:text-[#4f46e5] transition" />
              <span className="text-[13.5px] font-medium">Direct Memos</span>
            </div>
            {unreadMemoCount > 0 && (
              <span className="bg-[#dc2626] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-sm">
                {unreadMemoCount > 9 ? '9+' : unreadMemoCount}
              </span>
            )}
          </button>
        </div>
      )}

      <div className="border-t border-[#e8e7e3]/50 p-4 mt-auto flex-shrink-0">
        <UserChip isGuest={isGuest} user={user} onSignIn={onSignIn} isCollapsed={isCollapsed} />
      </div>

      <style>{`.custom-scroll::-webkit-scrollbar { width: 3px; } .custom-scroll::-webkit-scrollbar-track { background: transparent; } .custom-scroll::-webkit-scrollbar-thumb { background: #d4d4d4; border-radius: 10px; } @media (max-width: 768px) { .custom-scroll::-webkit-scrollbar { width: 0; } }`}</style>
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-2xl w-[400px] max-w-[90%] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[18px] font-semibold text-[#0f0f0f] mb-4">Create New Space</h3>
            <div className="mb-4"><label className="block text-[12px] font-medium text-[#777] mb-1">Space Name</label><input type="text" value={newSpaceName} onChange={(e) => setNewSpaceName(e.target.value)} className="w-full px-4 py-2 border border-[#e8e7e3] rounded-xl focus:outline-none focus:border-[#4f46e5] text-[14px] transition" placeholder="e.g., Marketing Team" autoFocus onKeyDown={(e) => e.key === 'Enter' && handleCreateSpace()} /></div>
            <div className="mb-4"><label className="block text-[12px] font-medium text-[#777] mb-1">Space Color</label><div className="flex gap-2 flex-wrap">{colorOptions.map((color) => (<button key={color} onClick={() => setNewSpaceColor(color)} className={`w-8 h-8 rounded-full transition-all duration-200 ${newSpaceColor === color ? 'ring-2 ring-offset-2 ring-[#0f0f0f] scale-110' : 'hover:scale-105'}`} style={{ background: color }} />))}</div></div>
            <div className="flex gap-3 justify-end"><button onClick={() => setShowCreateModal(false)} className="px-4 py-2 rounded-lg text-[13px] text-[#777] hover:bg-[#f2f1ee] transition">Cancel</button><button onClick={handleCreateSpace} disabled={!newSpaceName.trim()} className="px-4 py-2 rounded-lg text-[13px] font-medium bg-gradient-to-r from-[#4f46e5] to-[#0891b2] text-white hover:shadow-lg transition disabled:opacity-50">Create Space</button></div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      <aside className={`hidden lg:flex h-screen bg-gradient-to-b from-[#fafaf8] to-[#f2f1ee] border-r border-[#e8e7e3]/60 flex-col shadow-sm transition-all duration-300 relative ${isCollapsed ? 'w-16' : 'w-64'}`}>{sidebarContent}</aside>
      <button onClick={toggleSidebar} className="hidden lg:flex fixed top-20 z-50 items-center justify-center w-6 h-6 rounded-full bg-white shadow-md border border-[#e8e7e3] hover:bg-[#f2f1ee] hover:border-[#4f46e5] transition-all duration-200" style={{ left: isCollapsed ? 'calc(4rem - 6px)' : 'calc(16rem - 6px)' }} title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>{isCollapsed ? <ChevronRight size={12} className="text-[#686868]" /> : <ChevronLeft size={12} className="text-[#686868]" />}</button>
      <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white/80 backdrop-blur-sm shadow-sm border border-[#e8e7e3] active:scale-95 transition-transform" aria-label="Open menu"><Menu size={20} className="text-[#1a1a1a]" /></button>
      {isMobileMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 lg:hidden animate-fadeIn" onClick={() => setIsMobileMenuOpen(false)} />
          <aside className="fixed left-0 top-0 w-72 h-full bg-gradient-to-b from-[#fafaf8] to-[#f2f1ee] shadow-xl z-50 lg:hidden animate-slideIn">
            <div className="flex flex-col h-full">
              <SidebarLogo onMobileClose={closeMobileMenu} />
              <ComposeButton onClick={onOpenCompose} />
              <div className="flex-1 overflow-y-auto px-3 pb-4">
                <nav className="space-y-6">
                  <NavSection title="Memus" colorBar="bg-[#4f46e5]" isCollapsed={false}>
                    <div className="space-y-0.5">
                      <div onClick={() => { onNavigate('inmemus'); closeMobileMenu(); }} className={navItemClass('inmemus')}><Inbox size={16} className="opacity-70" /> <span>In-memus</span></div>
                      <div onClick={() => { onNavigate('outmemus'); closeMobileMenu(); }} className={navItemClass('outmemus')}><Send size={16} className="opacity-70" /> <span>Out-memus</span></div>
                      <div onClick={() => { onNavigate('drafts'); closeMobileMenu(); }} className={navItemClass('drafts')}><FileText size={16} className="opacity-70" /> <span>Drafts</span></div>
                    </div>
                  </NavSection>
                  <NavSection title="Communicate" colorBar="bg-[#059669]" isCollapsed={false}>
                    <div className="space-y-0.5">
                      <div onClick={() => { onNavigate('connections'); closeMobileMenu(); }} className={navItemClass('connections')}><Sparkles size={16} className="opacity-70" /> <span>Connections</span></div>
                      <div onClick={() => { onNavigate('confer'); closeMobileMenu(); }} className={navItemClass('confer')}><Video size={16} className="opacity-70" /> <span>Memu-Confer</span></div>
                      <div onClick={() => { onNavigate('calendar'); closeMobileMenu(); }} className={navItemClass('calendar')}><Calendar size={16} className="opacity-70" /> <span>Memu Calendar</span></div>
                    </div>
                  </NavSection>
                  <NavSection title="Directory" colorBar="bg-[#d97706]" isCollapsed={false}>
                    <div className="space-y-0.5">
                      <div onClick={() => { onNavigate('handles'); closeMobileMenu(); }} className={navItemClass('handles')}><User size={16} className="opacity-70" /> <span>Handles</span></div>
                    </div>
                  </NavSection>
                  <div>
                    <div className="text-[11px] font-semibold tracking-wide text-[#8a8a8a] px-4 pb-2 uppercase flex items-center gap-2"><div className="w-1 h-4 bg-[#dc2626] rounded-full"></div>My Spaces</div>
                    <div className="space-y-1">{renderSpacesList(true)}</div>
                  </div>
                </nav>
              </div>
              
              {/* Mobile Direct Memos Button */}
              <div className="px-3 pb-2 flex-shrink-0 border-t border-[#e8e7e3]/50 pt-2">
                <button
                  onClick={() => { setIsInboxOpen(true); closeMobileMenu(); }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/40 transition text-[#686868] hover:text-[#1a1a1a]"
                >
                  <div className="flex items-center gap-3">
                    <MessageSquare size={16} className="opacity-70" />
                    <span className="text-[13.5px] font-medium">Direct Memos</span>
                  </div>
                  {unreadMemoCount > 0 && (
                    <span className="bg-[#dc2626] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                      {unreadMemoCount}
                    </span>
                  )}
                </button>
              </div>

              <div className="border-t border-[#e8e7e3]/50 p-4 mt-auto"><UserChip isGuest={isGuest} user={user} onSignIn={onSignIn} isCollapsed={false} /></div>
            </div>
          </aside>
        </>
      )}
      
      {spaceToDelete && <DeleteConfirmModal spaceName={spaceToDelete.name} onConfirm={confirmDelete} onCancel={() => setSpaceToDelete(null)} />}
      
      {/* Render the Direct Memo Inbox Slide-Over */}
      {isInboxOpen && <DirectMemoInbox onClose={() => setIsInboxOpen(false)} />}

      <style>{`@keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } .animate-slideIn { animation: slideIn 0.3s ease-out; } .animate-fadeIn { animation: fadeIn 0.2s ease-out; }`}</style>
    </>
  );
}