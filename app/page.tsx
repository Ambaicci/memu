'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import dynamic from 'next/dynamic';
import Auth from '@/components/Auth';
import Sidebar from '@/components/Sidebar';
import ComposePanel from '@/components/ComposePanel';
import OfficeFAB from '@/components/OfficeFAB';
import GlobalSearch from '@/components/search/GlobalSearch';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import SplashScreen from '@/components/SplashScreen';

// ==========================================
// PERFORMANCE FIX: Lazy Load Heavy Panels
// ==========================================
const InMemusPanel = dynamic(() => import('@/components/InMemusPanel'), { ssr: false });
const OutMemusPanel = dynamic(() => import('@/components/OutMemusPanel'), { ssr: false });
const DraftsPanel = dynamic(() => import('@/components/DraftsPanel'), { ssr: false });
const ConnectionsPanel = dynamic(() => import('@/components/ConnectionsPanel'), { ssr: false });
const HandlesPanel = dynamic(() => import('@/components/HandlesPanel'), { ssr: false });
const CalendarPanel = dynamic(() => import('@/components/CalendarPanel'), { ssr: false });
const ConferPanel = dynamic(() => import('@/components/ConferPanel'), { ssr: false });
const AirSharePanel = dynamic(() => import('@/components/AirSharePanel'), { ssr: false });
const DocsPanel = dynamic(() => import('@/components/docs/DocsPanel'), { ssr: false });
const SlidesPanel = dynamic(() => import('@/components/slides/SlidesPanel'), { ssr: false });
const SheetsPanel = dynamic(() => import('@/components/sheets/SheetsPanel'), { ssr: false });
const SpacesPanel = dynamic(() => import('@/components/spaces/SpacesPanel'), { ssr: false });
const SpaceView = dynamic(() => import('@/components/spaces/SpaceView'), { ssr: false });
const AnalyticsPanel = dynamic(() => import('@/components/AnalyticsPanel'), { ssr: false });
const NotesPanel = dynamic(() => import('@/components/office/NotesPanel'), { ssr: false });

const LoadingSkeleton = () => (
  <div className="flex items-center justify-center h-full">
    <div className="w-8 h-8 border-2 border-[#4f46e5] border-t-transparent rounded-full animate-spin" />
  </div>
);

type PanelType = 'inmemus' | 'outmemus' | 'drafts' | 'connections' | 'spaces' | 'confer' | 'calendar' | 'handles' | 'airshare' | 'docs' | 'slides' | 'sheets' | 'space-dashboard' | 'analytics' | 'notes';

export default function MemuApp() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [activePanel, setActivePanel] = useState<PanelType>('inmemus');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeToHandle, setComposeToHandle] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<any>(null);
  const [showSplash, setShowSplash] = useState(true);
  
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  // Initialize auth
  useEffect(() => {
    const getSession = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
    };
    getSession();

    const supabase = createClient();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // Sync UI from URL params
  useEffect(() => {
    const panelParam = searchParams.get('panel') as PanelType | null;
    if (panelParam && isValidPanel(panelParam)) {
      setActivePanel(panelParam);
    }
  }, [searchParams]);

  // Listen for custom navigate events
  useEffect(() => {
    const handleNavigateEvent = (e: CustomEvent) => {
      handleNavigate(e.detail.panel, e.detail.spaceId);
    };
    window.addEventListener('navigate', handleNavigateEvent as EventListener);
    return () => window.removeEventListener('navigate', handleNavigateEvent as EventListener);
  }, []);

  // Listen for open compose event
  useEffect(() => {
    const handleOpenComposeEvent = () => {
      setIsComposeOpen(true);
    };
    window.addEventListener('openCompose', handleOpenComposeEvent as EventListener);
    return () => window.removeEventListener('openCompose', handleOpenComposeEvent as EventListener);
  }, []);

  const isValidPanel = (panel: string): panel is PanelType => {
    return ['inmemus', 'outmemus', 'drafts', 'connections', 'spaces', 'confer', 'calendar', 'handles', 'airshare', 'docs', 'slides', 'sheets', 'space-dashboard', 'analytics', 'notes'].includes(panel);
  };

  const updateUrl = useCallback((panel: PanelType, spaceId?: string | null) => {
    const params = new URLSearchParams();
    params.set('panel', panel);
    if (spaceId) params.set('space', spaceId);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [router, pathname]);

  const handleNavigate = useCallback((panel: PanelType, spaceId?: string | null) => {
    setActivePanel(panel);
    updateUrl(panel, spaceId);
  }, [updateUrl]);

  const requireAuth = useCallback((action: string, callback: () => void) => {
    if (!session) {
      setPendingAction(action);
      setShowAuthModal(true);
    } else {
      callback();
    }
  }, [session]);

  const handleOpenCompose = useCallback((prefilledHandle?: string, draft?: any) => {
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
  }, [requireAuth]);

  const handleCloseCompose = useCallback(() => {
    setIsComposeOpen(false);
    setComposeToHandle(null);
    setEditingDraft(null);
  }, []);

  const handleSendMemu = useCallback((memu: any) => {
    console.log('Memu sent:', memu);
    handleCloseCompose();
  }, [handleCloseCompose]);

  const renderPanel = useCallback(() => {
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
      case 'space-dashboard':
        return <SpaceView />;
      case 'handles':
        return <HandlesPanel isGuest={!session} requireAuth={requireAuth} onComposeToHandle={(handle) => handleOpenCompose(handle)} />;
      case 'calendar':
        return <CalendarPanel isGuest={!session} requireAuth={requireAuth} />;
      case 'confer':
        return <ConferPanel />;
      case 'airshare':
        return <AirSharePanel />;
      case 'docs':
        return <DocsPanel />;
      case 'slides':
        return <SlidesPanel />;
      case 'sheets':
        return <SheetsPanel />;
      case 'analytics':
        return <AnalyticsPanel />;
      case 'notes':
        return <NotesPanel />;
      default:
        return <InMemusPanel isGuest={!session} requireAuth={requireAuth} />;
    }
  }, [activePanel, session, requireAuth, handleOpenCompose]);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

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
          user={session?.user || null}
        />
        
        <main className="flex-1 overflow-auto pb-28 md:pb-24">
          <div className="lg:hidden h-14" />
          
          {isGuest && (
            <div className="bg-gradient-to-r from-[#4f46e5] to-[#0891b2] text-white px-4 py-2 text-center text-sm">
               You're browsing in guest mode. 
              <button onClick={() => setShowAuthModal(true)} className="underline ml-2 font-medium">
                Sign in or create an account
              </button>
              to send memus and save your work.
            </div>
          )}
          
          <div className="sticky top-0 z-20 bg-[#fafaf8]/80 backdrop-blur-sm border-b border-[#e8e7e3] px-4 md:px-6 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { if (window.history.length > 1) window.history.back(); else handleNavigate('inmemus'); }}
                  className="p-1.5 rounded-md hover:bg-[#e8e7e3] transition text-[#3a3a3a]"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" strokeLinecap="round"/></svg>
                </button>
                <button onClick={() => handleNavigate('inmemus')} className="p-1.5 rounded-md hover:bg-[#e8e7e3] transition text-[#3a3a3a]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2h-5v-8H7v8H5a2 2 0 0 1-2-2z"/></svg>
                </button>
                <div className="flex items-center gap-1.5 text-[11px] md:text-[13px] ml-2">
                  <span className="text-[#777]">memu</span>
                  <span className="text-[#aaa]">/</span>
                  <span className="font-medium text-[#0f0f0f] capitalize">{activePanel.replace('-', ' ')}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <GlobalSearch />
                <NotificationCenter />
              </div>
            </div>
          </div>
          
          <Suspense fallback={<LoadingSkeleton />}>
            {renderPanel()}
          </Suspense>
        </main>

        <OfficeFAB 
          isGuest={isGuest}
          requireAuth={requireAuth}
          onOpenItem={(suiteId, itemId) => {
            if (suiteId === 'airshare') requireAuth('airshare', () => handleNavigate('airshare'));
            else if (suiteId === 'docs') requireAuth('docs', () => handleNavigate('docs'));
            else if (suiteId === 'slides') requireAuth('slides', () => handleNavigate('slides'));
            else if (suiteId === 'sheets') requireAuth('sheets', () => handleNavigate('sheets'));
            else if (suiteId === 'notes') requireAuth('notes', () => handleNavigate('notes'));
            // Note: itemId is captured here for future use (e.g., opening a specific file directly)
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

      {showAuthModal && (
        <Auth 
          onAuthSuccess={async () => {
            setShowAuthModal(false);
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
          }} 
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </>
  );
}