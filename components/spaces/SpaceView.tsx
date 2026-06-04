'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import SpaceHeader from './SpaceHeader';
import SpaceChat from './SpaceChat';
import SpaceFiles from './SpaceFiles';
import SpaceCalls from './SpaceCalls';
import SpaceTasks from './SpaceTasks';
import SpaceBoards from './SpaceBoards';
import SpaceMembers from './SpaceMembers';
import SpaceMemus from './SpaceMemus';
import BoardView from '../boards/BoardView';

type ToolType = 'chat' | 'memus' | 'files' | 'calls' | 'tasks' | 'boards' | 'members';

export default function SpaceView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Sync state with URL params to avoid Next.js hydration/render race conditions
  const [urlParams, setUrlParams] = useState({
    spaceId: '',
    tool: 'chat' as ToolType,
    boardId: '',
  });

  const [space, setSpace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState({ status: 'initializing' });

  // 1. Sync URL → State
  useEffect(() => {
    const spaceId = searchParams.get('space') || '';
    const tool = (searchParams.get('tool') as ToolType) || 'chat';
    const boardId = searchParams.get('board') || '';
    setUrlParams({ spaceId, tool, boardId });
    console.log('🔗 SpaceView URL synced:', { spaceId, tool, boardId });
  }, [searchParams]);

  // 2. Fetch Space Data
  useEffect(() => {
    const { spaceId } = urlParams;
    if (!spaceId) {
      setDebugInfo({ status: 'no-space-id-in-url' });
      setLoading(false);
      return;
    }

    const fetchSpace = async () => {
      setLoading(true);
      const supabase = createClient();
      
      console.log('📡 Fetching space:', spaceId);
      
      const { data, error } = await supabase
        .from('spaces')
        .select('*')
        .eq('id', spaceId)
        .single();

      console.log('📦 Space response:', { data, error });
      
      if (error || !data) {
        setDebugInfo({ status: 'fetch-failed', error: error?.message || 'No data' });
      } else {
        setSpace(data);
        setDebugInfo({ status: 'loaded' });
      }
      setLoading(false);
    };

    fetchSpace();
  }, [urlParams.spaceId]); // Only refetch when spaceId actually changes

  // 3. Navigation Handlers
  const handleToolChange = (newTool: ToolType) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tool', newTool);
    if (newTool !== 'boards') params.delete('board');
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleOpenBoard = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tool', 'boards');
    params.set('board', id);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleCloseBoard = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('board');
    router.push(`?${params.toString()}`, { scroll: false });
  };

  // --- Debug Panel ---
  const DebugPanel = () => (
    <div className="fixed bottom-4 right-4 z-50 bg-black/90 text-green-400 p-4 rounded-lg text-xs font-mono max-w-md border border-green-500/30">
      <div className="font-bold mb-2">🔍 DEBUG: SpaceView</div>
      <div>URL spaceId: {urlParams.spaceId || 'MISSING'}</div>
      <div>Status: {debugInfo.status}</div>
      <div>Has Space: {space ? 'YES' : 'NO'}</div>
      <div>Tool: {urlParams.tool}</div>
      <div>Board: {urlParams.boardId || 'none'}</div>
    </div>
  );

  // --- Render States ---
  if (loading) {
    return (
      <>
        <DebugPanel />
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4f46e5]" />
        </div>
      </>
    );
  }

  if (!space || debugInfo.status === 'fetch-failed') {
    return (
      <>
        <DebugPanel />
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <h2 className="text-xl font-medium text-[#0f0f0f] mb-2">Unable to load space</h2>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-left max-w-md text-sm">
            <p className="font-mono text-red-700">{debugInfo.error || 'Space data is null'}</p>
            <p className="mt-2 text-xs text-red-600">Check URL: <code>?space=UUID</code> must be present</p>
          </div>
          <button onClick={() => router.push('/?panel=spaces')} className="px-4 py-2 bg-[#4f46e5] text-white rounded-lg text-sm hover:bg-[#4338ca] transition">
            Back to Spaces
          </button>
        </div>
      </>
    );
  }

  if (urlParams.boardId && urlParams.tool === 'boards') {
    return (
      <>
        <DebugPanel />
        <BoardView boardId={urlParams.boardId} spaceId={urlParams.spaceId} onBack={handleCloseBoard} />
      </>
    );
  }

  const renderToolContent = () => {
    switch (urlParams.tool) {
      case 'chat': return <SpaceChat spaceId={urlParams.spaceId} />;
      case 'memus': return <SpaceMemus spaceId={urlParams.spaceId} />;
      case 'files': return <SpaceFiles spaceId={urlParams.spaceId} />;
      case 'calls': return <SpaceCalls spaceId={urlParams.spaceId} />;
      case 'tasks': return <SpaceTasks spaceId={urlParams.spaceId} />;
      case 'boards': return <SpaceBoards spaceId={urlParams.spaceId} onOpenBoard={handleOpenBoard} />;
      case 'members': return <SpaceMembers spaceId={urlParams.spaceId} />;
      default: return <SpaceChat spaceId={urlParams.spaceId} />;
    }
  };

  return (
    <>
      <DebugPanel />
      <div className="flex flex-col h-full bg-[#fafaf8]">
        <SpaceHeader
          spaceName={space.name}
          spaceColor={space.color}
          memberCount={space.memberCount || 0}
          activeTool={urlParams.tool}
          onBack={() => router.push('/?panel=spaces')}
          onToolChange={handleToolChange}
        />
        <div className="flex-1 overflow-y-auto p-6">
          {renderToolContent()}
        </div>
      </div>
    </>
  );
}