'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import { Search, Plus, LayoutGrid, AlertCircle, Loader2, Lock } from 'lucide-react';

interface Board {
  id: string;
  name: string;
  description: string | null;
  color: string;
  is_private: boolean;
  created_at: string;
}

interface SpaceBoardsProps {
  spaceId: string;
  onOpenBoard: (boardId: string) => void;
}

export default function SpaceBoards({ spaceId, onOpenBoard }: SpaceBoardsProps) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { showToast } = useToast();

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getUser();
  }, []);

  // Fetch boards for this space
  const fetchBoards = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    setError(null);
    
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('boards')
        .select('id, name, description, color, is_private, created_at')
        .eq('space_id', spaceId)
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01') {
          setError('TABLE_MISSING');
          setLoading(false);
          return;
        }
        throw error;
      }

      setBoards(data || []);
       } catch (err: any) {
    console.error('Failed to fetch boards:', JSON.stringify(err, null, 2));
    const msg = err?.message || err?.toString() || 'Failed to load boards';
    setError(msg);
  } finally {
    setLoading(false);
  } }, [spaceId, currentUserId]);

  useEffect(() => {
    if (currentUserId) fetchBoards();
  }, [fetchBoards, currentUserId]);

  // Filter boards
  const filteredBoards = boards.filter(board =>
    board.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (board.description?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-[#4f46e5]" />
      </div>
    );
  }

  // Table not ready yet
  if (error === 'TABLE_MISSING') {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-6">
        <div className="w-16 h-16 rounded-full bg-[#f2f1ee] flex items-center justify-center mb-4">
          <LayoutGrid className="w-8 h-8 text-[#aaa]" />
        </div>
        <h3 className="text-lg font-medium text-[#0f0f0f] mb-2">Boards is coming soon</h3>
        <p className="text-sm text-[#777] max-w-md">
          The board management backend is being set up. You'll be able to create and collaborate on boards here shortly.
        </p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-6">
        <AlertCircle className="w-8 h-8 text-red-500 mb-3" />
        <p className="text-sm text-red-600 mb-4">{error}</p>
        <button onClick={fetchBoards} className="px-4 py-2 bg-[#4f46e5] text-white rounded-lg text-sm hover:bg-[#4338ca] transition">
          Retry
        </button>
      </div>
    );
  }

  // Empty state
  if (filteredBoards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-6">
        <LayoutGrid className="w-8 h-8 text-[#aaa] mb-3" />
        <p className="text-sm text-[#777] mb-4">
          {searchQuery ? 'No boards match your search' : 'No boards yet. Create one to organize your space.'}
        </p>
        <button
          onClick={() => showToast('Board creation coming in Phase 2', 'success')}
          className="flex items-center gap-2 px-4 py-2 bg-[#4f46e5] text-white rounded-lg text-sm hover:bg-[#4338ca] transition"
        >
          <Plus size={14} /> {searchQuery ? 'Clear Search' : 'Create Board'}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-xl font-semibold text-[#0f0f0f]">Boards ({filteredBoards.length})</h2>
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="flex-1 sm:w-64 flex items-center gap-2 bg-white border border-[#e8e7e3] rounded-lg px-3 py-2">
            <Search size={14} className="text-[#777]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search boards..."
              className="flex-1 text-[13px] outline-none bg-transparent"
            />
          </div>
          <button
            onClick={() => showToast('Board creation coming in Phase 2', 'success')}
            className="flex items-center gap-2 px-4 py-2 bg-[#0f0f0f] text-white rounded-lg text-sm hover:bg-[#2a2a2a] transition"
          >
            <Plus size={14} /> New Board
          </button>
        </div>
      </div>

      {/* Boards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBoards.map((board) => (
          <button
            key={board.id}
            onClick={() => onOpenBoard(board.id)}
            className="group bg-white border border-[#e8e7e3] rounded-xl p-5 text-left transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-[#d0cfc9]"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center shadow-sm"
                  style={{ backgroundColor: board.color + '15' }}
                >
                  <LayoutGrid size={18} style={{ color: board.color }} />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-[#0f0f0f] group-hover:text-[#4f46e5] transition">
                    {board.name}
                  </h3>
                  <p className="text-[11px] text-[#777]">
                    Created {new Date(board.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {board.is_private && (
                <Lock size={14} className="text-[#aaa] mt-1" />
              )}
            </div>
            
            <p className="text-[12px] text-[#777] line-clamp-2 mb-4">
              {board.description || 'No description'}
            </p>

            <div className="flex items-center justify-between pt-3 border-t border-[#f2f1ee]">
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#f2f1ee] text-[#777]">
                Board
              </span>
              <span className="text-[11px] text-[#4f46e5] font-medium group-hover:underline">
                Open →
              </span>
            </div>
          </button>
        ))}
      </div>

      <style>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}