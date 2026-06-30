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
    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

type PanelType = 'home' | 'dashboard' | 'inmemus' | 'outmemus' | 'drafts' | 'connections' | 'spaces' | 'confer' | 'calendar' | 'handles' | 'airshare' | 'docs' | 'slides' | 'sheets' | 'space-dashboard' | 'analytics' | 'notes' | 'profile';

export default function MemuApp() {
  const router = useRouter();
  useSwipeBack(true);
  const pathname = usePathname();
  const searchParams = useSearchParams();

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

  // Network status
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

  // Auth session
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

  // Sync panel from URL
  useEffect(() => {
    const panelParam = searchParams.get('panel') as PanelType | null;
    if (panelParam && isValidPanel(panelParam)) {
      setActivePanel(panelParam);
    }
  }, [searchParams]);

  // Custom event listeners
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

  // Onboarding tour
  useEffect(() => {
    const tourCompleted = localStorage.getItem('memu_tour_completed');
    if (!tourCompleted && session) {
      setTimeout(() => setShowTour(true), 1000);
    }
  }, [session]);

  const isValidPanel = (panel: string): panel is PanelType => {
    return [
      'home', 'dashboard', 'inmemus', 'outmemus', 'drafts',
      'connections', 'spaces', 'confer', 'calendar', 'handles',
      'airshare', 'docs', 'slides', 'sheets', 'space-dashboard',
      'analytics', 'notes', 'profile'
    ].includes(panel);
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

  const getPanelTitle = () => {
    switch (activePanel) {
      case 'home':
      case 'inmemus': return 'InMemus';
      case 'dashboard': return 'Dashboard';
      case 'outmemus': return 'OutMemus';
      case 'drafts': return 'Drafts';
      case 'connections': return 'Connections';
      case 'spaces': return 'Spaces';
      case 'space-dashboard': return 'Space';
      case 'handles': return 'Handles';
      case 'calendar': return 'Calendar';
      case 'confer': return 'Confer';
      case 'airshare': return 'AirShare';
      case 'docs': return 'Docs';
      case 'slides': return 'Slides';
      case 'sheets': return 'Sheets';
      case 'analytics': return 'Analytics';
      case 'notes': return 'Notes';
      case 'profile': return 'Profile';
      default: return 'InMemus';
    }
  };

  const renderPanel = useCallback(() => {
    switch (activePanel) {
      case 'home': return <InMemusPanel isGuest={!session} requireAuth={requireAuth} />;
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
        <div className="fixed top-0 left-0 right-0 bg-rose-600 text-white text-center py-1.5 text-xs font-medium z-50">
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

        <main className="flex-1 min-w-0 min-h-0 overflow-auto pb-28 md:pb-24 pt-0">
          {/* Desktop Header */}
          <div className="hidden lg:block sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-200/40 shadow-sm -mt-1">
            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-200/30 to-transparent" />
            <div className="px-6 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    if (window.history.length > 1) window.history.back();
                    else handleNavigate('home');
                  }}
                  className="p-1.5 rounded-lg hover:bg-gray-100/80 transition text-gray-400 hover:text-blue-600 group"
                  aria-label="Go back"
                >
                  <ChevronLeft size={18} strokeWidth={2} className="group-hover:-translate-x-0.5 transition-transform" />
                </button>

                <button
                  onClick={() => handleNavigate('home')}
                  className={`p-1.5 rounded-lg hover:bg-gray-100/80 transition group ${
                    activePanel === 'home' || activePanel === 'inmemus'
                      ? 'text-blue-600'
                      : 'text-gray-400 hover:text-blue-600'
                  }`}
                  aria-label="InMemus"
                  title="Go to InMemus"
                >
                  <Home size={18} strokeWidth={2} className="group-hover:scale-105 transition-transform" />
                </button>

                <div className="flex items-center gap-1.5 ml-2">
                  <button
                    onClick={() => handleNavigate('dashboard')}
                    className="flex items-center gap-1.5 text-[13px] px-2 py-1 rounded-lg hover:bg-gray-100/80 transition-all cursor-pointer group"
                    title="Go to Dashboard"
                  >
                    <span className="text-gray-400 font-medium group-hover:text-gray-600 transition-colors tracking-tight">
                      memu
                    </span>
                    <span className="text-gray-300 select-none">/</span>
                    <span className="text-sm font-semibold tracking-tight text-blue-600">
                      {getPanelTitle()}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <GlobalSearch dark={false} />
                <NotificationCenter dark={false} />
              </div>
            </div>
          </div>

          {/* Mobile Header */}
          <div className="lg:hidden sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-200/40 px-4 py-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMobileSidebarOpen(true)}
                  className="p-2 rounded-lg hover:bg-gray-100/80 transition text-gray-600"
                  aria-label="Open menu"
                >
                  <Menu size={20} strokeWidth={2} />
                </button>

                <button
                  onClick={() => handleNavigate('dashboard')}
                  className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-100/80 active:bg-gray-200/60 transition-all cursor-pointer group"
                  title="Go to Dashboard"
                >
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                    <Sparkles size={14} strokeWidth={2} className="text-white" />
                  </div>
                  <span className="font-sans text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors tracking-tight">
                    memu
                  </span>
                </button>

                <span className="text-gray-300 text-sm font-light ml-0.5 select-none">/</span>
                <span className="text-sm font-semibold tracking-tight text-blue-600">
                  {getPanelTitle()}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <GlobalSearch dark={false} />
                <NotificationCenter dark={false} />
              </div>
            </div>
          </div>

          {/* Guest Mode Banner */}
          {isGuest && (
            <div className="bg-gradient-to-r from-blue-600/90 via-indigo-600/90 to-purple-600/90 text-white px-4 py-3 text-center text-sm flex items-center justify-center gap-3 shadow-lg relative overflow-hidden border-b border-white/10">
              <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-transparent to-white/5 pointer-events-none" />
              <div className="relative z-10 flex items-center justify-center gap-2.5 flex-wrap">
                <Sparkles size={14} strokeWidth={2} className="text-blue-200" />
                <span className="font-light">You're exploring in Guest Mode.</span>
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="font-semibold underline underline-offset-2 hover:text-blue-200 transition-colors"
                >
                  Claim your @handle
                </button>
                <span className="font-light">to send memus and unlock everything.</span>
              </div>
            </div>
          )}

          {/* Panel Content */}
          <Suspense fallback={<PanelSkeleton />}>
            {renderPanel()}
          </Suspense>
        </main>

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

        {showTour && (
          <OnboardingTour onComplete={() => setShowTour(false)} />
        )}
      </div>
    </>
  );
}