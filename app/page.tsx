'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import dynamic from 'next/dynamic';
import Auth from '@/components/Auth';
import Sidebar from '@/components/Sidebar';
import ComposePanel from '@/components/ComposePanel';
import OfficeFAB from '@/components/OfficeFAB';
import BottomNav from '@/components/BottomNav';
import GlobalSearch from '@/components/search/GlobalSearch';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import SplashScreen from '@/components/SplashScreen';
import HomeDashboard from '@/components/HomeDashboard';
import DirectMemoInbox from '@/components/direct-memos/DirectMemoInbox';
import OnboardingTour from '@/components/OnboardingTour';
import { ChevronLeft, Home, Sparkles, Menu } from 'lucide-react';
import { useSwipeBack } from '@/hooks/useSwipeBack';

const InMemusPanel = dynamic(() => import('@/components/InMemusPanel'), { ssr: false, loading: () => <PanelSkeleton /> });
const OutMemusPanel = dynamic(() => import('@/components/OutMemusPanel'), { ssr: false, loading: () => <PanelSkeleton /> });
const DraftsPanel = dynamic(() => import('@/components/DraftsPanel'), { ssr: false, loading: () => <PanelSkeleton /> });
const ConnectionsPanel = dynamic(() => import('@/components/ConnectionsPanel'), { ssr: false, loading: () => <PanelSkeleton /> });
const HandlesPanel = dynamic(() => import('@/components/HandlesPanel'), { ssr: false, loading: () => <PanelSkeleton /> });
const CalendarPanel = dynamic(() => import('@/components/CalendarPanel'), { ssr: false, loading: () => <PanelSkeleton /> });
const ConferPanel = dynamic(() => import('@/components/ConferPanel'), { ssr: false, loading: () => <PanelSkeleton /> });
const AirSharePanel = dynamic(() => import('@/components/AirSharePanel'), { ssr: false, loading: () => <PanelSkeleton /> });
const DocsPanel = dynamic(() => import('@/components/docs/DocsPanel'), { ssr: false, loading: () => <PanelSkeleton /> });
const SlidesPanel = dynamic(() => import('@/components/slides/SlidesPanel'), { ssr: false, loading: () => <PanelSkeleton /> });
const SheetsPanel = dynamic(() => import('@/components/sheets/SheetsPanel'), { ssr: false, loading: () => <PanelSkeleton /> });
const SpacesPanel = dynamic(() => import('@/components/spaces/SpacesPanel'), { ssr: false, loading: () => <PanelSkeleton /> });
const SpaceView = dynamic(() => import('@/components/spaces/SpaceView'), { ssr: false, loading: () => <PanelSkeleton /> });
const AnalyticsPanel = dynamic(() => import('@/components/AnalyticsPanel'), { ssr: false, loading: () => <PanelSkeleton /> });
const NotesPanel = dynamic(() => import('@/components/office/NotesPanel'), { ssr: false, loading: () => <PanelSkeleton /> });
const ProfilePanel = dynamic(() => import('@/components/profile/ProfilePanel'), { ssr: false, loading: () => <PanelSkeleton /> });

const PanelSkeleton = () => (
  <div className="flex items-center justify-center h-full">
    <div className="w-8 h-8 border-2 border-[#4f46e5] border-t-transparent rounded-full animate-spin" />
  </div>
);

type PanelType = 'home' | 'dashboard' | 'inmemus' | 'outmemus' | 'drafts' | 'connections' | 'spaces' | 'confer' | 'calendar' | 'handles' | 'airshare' | 'docs' | 'slides' | 'sheets' | 'space-dashboard' | 'analytics' | 'notes' | 'profile';

export default function MemuApp() {
  const router = useRouter(); 
  useSwipeBack(true);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Default to 'home' which is now Inbox (InMemusPanel)
  const [activePanel, setActivePanel] = useState<PanelType>('home');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeToHandle, setComposeToHandle] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<any>(null);
  const [showSplash, setShowSplash] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [replyToMemuId, setReplyToMemuId] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDirectMemosOpen, setIsDirectMemosOpen] = useState(false);
  const [showTour, setShowTour] = useState(false);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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

  useEffect(() => {
    const panelParam = searchParams.get('panel') as PanelType | null;
    if (panelParam && isValidPanel(panelParam)) {
      setActivePanel(panelParam);
    }
  }, [searchParams]);

  useEffect(() => {
    const handleNavigateEvent = (e: CustomEvent) => {
      handleNavigate(e.detail.panel, e.detail.spaceId);
    };
    window.addEventListener('navigate', handleNavigateEvent as EventListener);
    return () => window.removeEventListener('navigate', handleNavigateEvent as EventListener);
  }, []);

  useEffect(() => {
    const handleOpenComposeEvent = () => {
      setIsComposeOpen(true);
    };
    window.addEventListener('openCompose', handleOpenComposeEvent as EventListener);
    return () => window.removeEventListener('openCompose', handleOpenComposeEvent as EventListener);
  }, []);

  useEffect(() => {
    const tourCompleted = localStorage.getItem('memu_tour_completed');
    if (!tourCompleted && session) {
      setTimeout(() => setShowTour(true), 1000);
    }
  }, [session]);

  const isValidPanel = (panel: string): panel is PanelType => {
    return ['home', 'dashboard', 'inmemus', 'outmemus', 'drafts', 'connections', 'spaces', 'confer', 'calendar', 'handles', 'airshare', 'docs', 'slides', 'sheets', 'space-dashboard', 'analytics', 'notes', 'profile'].includes(panel);
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
    setReplyToMemuId(null);
  }, []);

  const handleSendMemu = useCallback((memu: any) => {
    console.log('Memu sent:', memu);
    handleCloseCompose();
  }, [handleCloseCompose]);

  useEffect(() => {
    const handleReplyEvent = (e: CustomEvent) => {
      setReplyToMemuId(e.detail.memuId);
      handleOpenCompose();
    };
    window.addEventListener('replyToMemu', handleReplyEvent as EventListener);
    return () => window.removeEventListener('replyToMemu', handleReplyEvent as EventListener);
  }, [handleOpenCompose]);

  const renderPanel = useCallback(() => {
    switch (activePanel) {
      // 'home' is now Inbox (InMemusPanel) - inbox-first experience
      case 'home': return <InMemusPanel isGuest={!session} requireAuth={requireAuth} />;
      // 'dashboard' is the HomeDashboard - accessible via logo
      case 'dashboard': return <HomeDashboard onNavigate={handleNavigate} />;
      case 'inmemus': return <InMemusPanel isGuest={!session} requireAuth={requireAuth} />;
      case 'outmemus': return <OutMemusPanel isGuest={!session} requireAuth={requireAuth} />;
      case 'drafts': return <DraftsPanel isGuest={!session} requireAuth={requireAuth} onEditDraft={(draft) => handleOpenCompose(undefined, draft)} />;
      case 'connections': return <ConnectionsPanel isGuest={!session} requireAuth={requireAuth} />;
      case 'spaces': return <SpacesPanel />;
      case 'space-dashboard': return <SpaceView spaceId={searchParams.get('space') || undefined} />;
      case 'handles': return <HandlesPanel isGuest={!session} requireAuth={requireAuth} onComposeToHandle={(handle) => handleOpenCompose(handle)} />;
      case 'calendar': return <CalendarPanel isGuest={!session} requireAuth={requireAuth} />;
      case 'confer': return <ConferPanel />;
      case 'airshare': return <AirSharePanel isGuest={!session} requireAuth={requireAuth} />;
      case 'docs': return <DocsPanel />;
      case 'slides': return <SlidesPanel />;
      case 'sheets': return <SheetsPanel />;
      case 'analytics': return <AnalyticsPanel />;
      case 'notes': return <NotesPanel />;
      case 'profile': return <ProfilePanel user={session?.user} />;
      default: return <InMemusPanel isGuest={!session} requireAuth={requireAuth} />;
    }
  }, [activePanel, session, requireAuth, handleOpenCompose, searchParams, handleNavigate]);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  if (loading) {
    return <PanelSkeleton />;
  }

  const isGuest = !session;

  return (
    <>
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-red-500 text-white text-center py-1 text-xs z-50">
          You are offline. Some features may be unavailable.
        </div>
      )}
      <div className="flex h-screen overflow-hidden bg-memu-canvas">
        <Sidebar 
          onNavigate={handleNavigate} 
          activePanel={activePanel} 
          onOpenSpace={(spaceId) => handleNavigate('space-dashboard', spaceId)}
          onOpenCompose={() => handleOpenCompose()}
          onOpenDirectMemos={() => {
            requireAuth('direct-memos', () => setIsDirectMemosOpen(true));
          }}
          isGuest={isGuest}
          onSignIn={() => setShowAuthModal(true)}
          onOpenProfile={() => handleNavigate('profile')}
          user={session?.user || null}
          isMobileOpen={isMobileSidebarOpen}
          onMobileClose={() => setIsMobileSidebarOpen(false)}
        />
        

        <main className="flex-1 overflow-auto pb-28 md:pb-24 pt-2">
           {/* Mobile Header - FIXED: No blur, solid background, proper spacing */}
<div className="lg:hidden sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
  <div className="flex items-center justify-between relative">
    <div className="flex items-center gap-3">
      <button
        onClick={() => setIsMobileSidebarOpen(true)}
        className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-700"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>
      
      {/* Logo navigates to Dashboard */}
      <button 
        onClick={() => handleNavigate('dashboard')} 
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-all cursor-pointer group"
        title="Go to Dashboard"
      >
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow group-hover:scale-105 transition-transform">
          <Sparkles size={14} className="text-white" />
        </div>
        <span className="font-['Playfair_Display'] text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
          memu
        </span>
      </button>
    </div>
    <div className="flex items-center gap-1">
      <GlobalSearch />
      <NotificationCenter />
    </div>
  </div>
</div>       

    {/* Desktop Header - FIXED: No blur, solid background, proper spacing */}
<div className="hidden lg:block sticky top-0 z-40 bg-white border-b border-gray-200 px-6 py-2 shadow-sm">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <button
        onClick={() => { if (window.history.length > 1) window.history.back(); else handleNavigate('home'); }}
        className="p-1.5 rounded-full hover:bg-gray-100 transition text-gray-700 hover:text-indigo-600"
        aria-label="Go back"
      >
        <ChevronLeft size={18} />
      </button>
      
      {/* Home icon navigates to Inbox */}
      <button
        onClick={() => handleNavigate('home')}
        className="p-1.5 rounded-full hover:bg-gray-100 transition text-gray-700 hover:text-indigo-600"
        aria-label="Inbox"
        title="Go to Inbox"
      >
        <Home size={18} />
      </button>
      
      {/* Logo breadcrumb navigates to Dashboard */}
      <button
        onClick={() => handleNavigate('dashboard')}
        className="flex items-center gap-1.5 text-[13px] ml-1 px-2 py-1 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-all cursor-pointer group"
        title="Go to Dashboard"
      >
        <span className="text-gray-600 font-medium group-hover:text-indigo-600 transition-colors">memu</span>
        <span className="text-gray-400">/</span>
        <span className="heading-gradient font-medium capitalize">
          {activePanel === 'home' ? 'inbox' : activePanel === 'dashboard' ? 'dashboard' : activePanel.replace('-', ' ')}
        </span>
      </button>
    </div>
    <div className="flex items-center gap-2">
      <GlobalSearch />
      <NotificationCenter />
    </div>
  </div>
</div>     
 {isGuest && (
            <div className="bg-gradient-to-r from-indigo-600/90 to-cyan-600/90 backdrop-blur-md text-white px-4 py-2.5 text-center text-sm flex items-center justify-center gap-2 shadow-sm">
              <Sparkles size={14} />
              <span>You're exploring in Guest Mode.</span>
              <button onClick={() => setShowAuthModal(true)} className="font-semibold underline underline-offset-2 hover:text-cyan-200 transition">
                Claim your @handle
              </button>
              <span>to send memus and unlock everything.</span>
            </div>
          )}
          
          <Suspense fallback={<PanelSkeleton />}>
            {renderPanel()}
          </Suspense>
        </main>

        {/* OfficeFAB - Desktop Only */}
        <div className="hidden lg:block">
          <OfficeFAB 
            isGuest={isGuest}
            requireAuth={requireAuth}
            onOpenItem={(suiteId, itemId) => {
              if (suiteId === 'airshare') requireAuth('airshare', () => handleNavigate('airshare'));
              else if (suiteId === 'docs') requireAuth('docs', () => handleNavigate('docs'));
              else if (suiteId === 'slides') requireAuth('slides', () => handleNavigate('slides'));
              else if (suiteId === 'sheets') requireAuth('sheets', () => handleNavigate('sheets'));
              else if (suiteId === 'notes') requireAuth('notes', () => handleNavigate('notes'));
            }} 
          />
        </div>

        {/* BottomNav - Mobile Only */}
        <BottomNav 
          activePanel={activePanel}
          onNavigate={handleNavigate}
          onOpenCompose={() => handleOpenCompose()}
          isGuest={isGuest}
          onSignIn={() => setShowAuthModal(true)}
        />

        <ComposePanel
          isOpen={isComposeOpen}
          onClose={handleCloseCompose}
          onSend={handleSendMemu}
          prefilledTo={composeToHandle ? [composeToHandle] : undefined}
          editingDraft={editingDraft}
          replyToMemuId={replyToMemuId}
        />
      </div>

      {/* Direct Memos Slide-Over */}
      {isDirectMemosOpen && (
        <DirectMemoInbox onClose={() => setIsDirectMemosOpen(false)} />
      )}

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

      {/* Onboarding Tour */}
      {showTour && (
        <OnboardingTour onComplete={() => setShowTour(false)} />
      )}
    </>
  );
}