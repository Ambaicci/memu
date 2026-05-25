'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Auth from '@/components/Auth';
import Sidebar from '@/components/Sidebar';
import InMemusPanel from '@/components/InMemusPanel';
import OutMemusPanel from '@/components/OutMemusPanel';
import DraftsPanel from '@/components/DraftsPanel';
import ConnectionsPanel from '@/components/ConnectionsPanel';
import HandlesPanel from '@/components/HandlesPanel';
import CalendarPanel from '@/components/CalendarPanel';
import ConferPanel from '@/components/ConferPanel';
import AirSharePanel from '@/components/AirSharePanel';
import DocsPanel from '@/components/docs/DocsPanel';
import SlidesPanel from '@/components/slides/SlidesPanel';
import SheetsPanel from '@/components/sheets/SheetsPanel';
import ComposePanel from '@/components/ComposePanel';
import OfficeFAB from '@/components/OfficeFAB';
import GlobalSearch from '@/components/search/GlobalSearch';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import SpacesPanel from '@/components/spaces/SpacesPanel';
import SpaceView from '@/components/spaces/SpaceView';

type PanelType = 'inmemus' | 'outmemus' | 'drafts' | 'connections' | 'spaces' | 'confer' | 'calendar' | 'handles' | 'airshare' | 'docs' | 'slides' | 'sheets' | 'space-dashboard';

// Demo spaces data
const demoSpaces = [
  { id: 'work', name: 'Work', description: 'Team collaboration', color: '#4f46e5', memberCount: 14, messageCount: 234, lastActive: '2 minutes ago' },
  { id: 'friends', name: 'Friends', description: 'Weekend plans', color: '#059669', memberCount: 6, messageCount: 89, lastActive: '1 hour ago' },
  { id: 'family', name: 'Family', description: 'Family coordination', color: '#d97706', memberCount: 8, messageCount: 45, lastActive: 'Yesterday' },
  { id: 'design', name: 'Design Squad', description: 'UI/UX discussions', color: '#dc2626', memberCount: 5, messageCount: 67, lastActive: '3 hours ago' },
];

export default function MemuApp() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [activePanel, setActivePanel] = useState<PanelType>('inmemus');
  const [directSpaceId, setDirectSpaceId] = useState<string | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeToHandle, setComposeToHandle] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<any>(null);
  const [spaces] = useState(demoSpaces);
  
  // Auth state
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  // Check auth status on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('memu_user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      if (user.isLoggedIn) {
        setSession(user);
      }
    }
    setLoading(false);

    const handleStorageChange = () => {
      const updatedUser = localStorage.getItem('memu_user');
      if (updatedUser) {
        const user = JSON.parse(updatedUser);
        setSession(user.isLoggedIn ? user : null);
      } else {
        setSession(null);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Sync URL with navigation state
  const updateUrl = useCallback((panel: PanelType, spaceId?: string | null) => {
    const params = new URLSearchParams();
    params.set('panel', panel);
    if (spaceId) {
      params.set('space', spaceId);
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [router, pathname]);

  // Handle navigation with history
  const handleNavigate = (panel: PanelType, spaceId?: string | null) => {
    setActivePanel(panel);
    setDirectSpaceId(spaceId || null);
    updateUrl(panel, spaceId);
  };

  // Handle browser back/forward
  useEffect(() => {
    const panelParam = searchParams.get('panel') as PanelType | null;
    const spaceParam = searchParams.get('space');
    if (panelParam && ['inmemus', 'outmemus', 'drafts', 'connections', 'spaces', 'confer', 'calendar', 'handles', 'airshare', 'docs', 'slides', 'sheets', 'space-dashboard'].includes(panelParam)) {
      setActivePanel(panelParam);
      setDirectSpaceId(spaceParam || null);
    }
  }, [searchParams]);

  // Handle custom navigation events from FAB
  useEffect(() => {
    const handleNavigateEvent = (e: CustomEvent) => {
      handleNavigate(e.detail.panel);
    };
    window.addEventListener('navigate', handleNavigateEvent as EventListener);
    return () => window.removeEventListener('navigate', handleNavigateEvent as EventListener);
  }, []);

  // Action guard for guest users
  const requireAuth = (action: string, callback: () => void) => {
    if (!session) {
      setPendingAction(action);
      setShowAuthModal(true);
    } else {
      callback();
    }
  };

  const handleOpenCompose = (prefilledHandle?: string, draft?: any) => {
    requireAuth('compose', () => {
      if (draft) {
        setEditingDraft(draft);
        setComposeToHandle(null);
      } else {
        setEditingDraft(null);
        setComposeToHandle(prefilledHandle || null);
      }
      setIsComposeOpen(true);
    });
  };

  const handleCloseCompose = () => {
    setIsComposeOpen(false);
    setComposeToHandle(null);
    setEditingDraft(null);
  };

  const handleSendMemu = (memu: any) => {
    console.log('Memu sent:', memu);
    alert(`✨ Memu sent to ${memu.to.join(', ')}`);
    handleCloseCompose();
  };

  const getCurrentSpace = () => {
    return spaces.find(s => s.id === directSpaceId);
  };

  const renderPanel = () => {
    switch (activePanel) {
      case 'inmemus':
        return <InMemusPanel isGuest={!session} requireAuth={requireAuth} />;
      case 'outmemus':
        return <OutMemusPanel isGuest={!session} requireAuth={requireAuth} />;
      case 'drafts':
        return <DraftsPanel isGuest={!session} requireAuth={requireAuth} onEditDraft={(draft) => handleOpenCompose(undefined, draft)} />;
      case 'connections':
        return <ConnectionsPanel isGuest={!session} requireAuth={requireAuth} />;
      case 'spaces':
        return <SpacesPanel />;
      case 'space-dashboard': {
        const currentSpace = getCurrentSpace();
        if (!currentSpace) {
          return <div className="flex items-center justify-center h-full">Space not found</div>;
        }
        return (
          <SpaceView 
            space={currentSpace}
            onBack={() => handleNavigate('spaces')}
            onUpdateSpace={(updated) => {
              console.log('Space updated:', updated);
            }}
          />
        );
      }
      case 'handles':
        return <HandlesPanel isGuest={!session} requireAuth={requireAuth} onComposeToHandle={(handle) => handleOpenCompose(handle)} />;
      case 'calendar':
        return <CalendarPanel isGuest={!session} requireAuth={requireAuth} />;
      case 'confer':
        return <ConferPanel isGuest={!session} requireAuth={requireAuth} />;
      case 'airshare':
        return <AirSharePanel isGuest={!session} requireAuth={requireAuth} />;
      case 'docs':
        return <DocsPanel />;
      case 'slides':
        return <SlidesPanel />;
      case 'sheets':
        return <SheetsPanel />;
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h1 className="font-['Playfair_Display'] text-3xl md:text-4xl mb-2">memu</h1>
              <p className="text-[#777] text-sm md:text-base">Coming soon</p>
            </div>
          </div>
        );
    }
  };

  const getPanelDisplayName = () => {
    switch (activePanel) {
      case 'inmemus': return 'In-memus';
      case 'outmemus': return 'Out-memus';
      case 'drafts': return 'Drafts';
      case 'connections': return 'Connections';
      case 'spaces': return 'Spaces';
      case 'space-dashboard': return getCurrentSpace()?.name || 'Space';
      case 'handles': return 'Handles';
      case 'confer': return 'Memu-Confer';
      case 'calendar': return 'Memu Calendar';
      case 'airshare': return 'AirShare';
      case 'docs': return 'memu Docs';
      case 'slides': return 'memu Slides';
      case 'sheets': return 'memu Sheets';
      default: return 'memu';
    }
  };

  // Show loading spinner
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#fafaf8]">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[#4f46e5] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#777]">Loading...</p>
        </div>
      </div>
    );
  }

  const isGuest = !session;

  return (
    <>
      <div className="flex h-screen overflow-hidden bg-[#fafaf8]">
        <Sidebar 
          onNavigate={handleNavigate} 
          activePanel={activePanel} 
          onOpenSpace={(spaceId) => handleNavigate('space-dashboard', spaceId)}
          onOpenCompose={() => handleOpenCompose()}
          isGuest={isGuest}
          onSignIn={() => setShowAuthModal(true)}
          user={session}
        />
        
        <main className="flex-1 overflow-auto pb-28 md:pb-24">
          {/* Mobile spacer */}
          <div className="lg:hidden h-14" />
          
          {/* Guest Banner */}
          {isGuest && (
            <div className="bg-gradient-to-r from-[#4f46e5] to-[#0891b2] text-white px-4 py-2 text-center text-sm">
              🎉 You're browsing in guest mode. 
              <button onClick={() => setShowAuthModal(true)} className="underline ml-2 font-medium">
                Sign in or create an account
              </button>
              to send memus and save your work.
            </div>
          )}
          
          {/* Top Toolbar */}
          <div className="sticky top-0 z-20 bg-[#fafaf8]/80 backdrop-blur-sm border-b border-[#e8e7e3] px-4 md:px-6 py-2">
            <div className="flex items-center justify-between">
              {/* Left side: Navigation buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (window.history.length > 1) {
                      window.history.back();
                    } else {
                      handleNavigate('inmemus');
                    }
                  }}
                  className="p-1.5 rounded-md hover:bg-[#e8e7e3] transition text-[#3a3a3a]"
                  title="Go back"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 18l-6-6 6-6" strokeLinecap="round"/>
                  </svg>
                </button>
                
                <button
                  onClick={() => handleNavigate('inmemus')}
                  className="p-1.5 rounded-md hover:bg-[#e8e7e3] transition text-[#3a3a3a]"
                  title="Go home"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2h-5v-8H7v8H5a2 2 0 0 1-2-2z"/>
                  </svg>
                </button>
                
                {/* Breadcrumb */}
                <div className="flex items-center gap-1.5 text-[11px] md:text-[13px] ml-2">
                  <span className="text-[#777]">memu</span>
                  <span className="text-[#aaa]">/</span>
                  <span className="font-medium text-[#0f0f0f]">{getPanelDisplayName()}</span>
                  {directSpaceId && activePanel !== 'space-dashboard' && (
                    <>
                      <span className="text-[#aaa]">/</span>
                      <span className="text-[#4f46e5]">@{directSpaceId}</span>
                    </>
                  )}
                </div>
              </div>
              
              {/* Right side: Search and Notifications */}
              <div className="flex items-center gap-2">
                <GlobalSearch />
                <NotificationCenter />
              </div>
            </div>
          </div>
          
          {/* Panel Content */}
          {renderPanel()}
        </main>

        {/* memu Office FAB */}
        <OfficeFAB 
          isGuest={isGuest}
          requireAuth={requireAuth}
          onOpenSuite={(suiteId) => {
            if (suiteId === 'airshare') {
              requireAuth('airshare', () => handleNavigate('airshare'));
            } else if (suiteId === 'docs') {
              requireAuth('docs', () => handleNavigate('docs'));
            } else if (suiteId === 'slides') {
              requireAuth('slides', () => handleNavigate('slides'));
            } else if (suiteId === 'sheets') {
              requireAuth('sheets', () => handleNavigate('sheets'));
            } else {
              alert(`${suiteId} suite coming soon! ✨`);
            }
          }} 
        />

        <ComposePanel
          isOpen={isComposeOpen}
          onClose={handleCloseCompose}
          onSend={handleSendMemu}
          prefilledTo={composeToHandle ? [composeToHandle] : undefined}
          editingDraft={editingDraft}
        />
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <Auth 
          onAuthSuccess={() => {
            setShowAuthModal(false);
            const savedUser = localStorage.getItem('memu_user');
            if (savedUser) {
              setSession(JSON.parse(savedUser));
            }
            window.location.reload();
          }} 
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </>
  );
}