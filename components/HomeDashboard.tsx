'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { 
  Plus, Loader2, Sparkles, Users, MessageSquare, 
  LayoutGrid, ChevronRight, Search, Filter
} from 'lucide-react';

interface Space {
  id: string;
  name: string;
  color: string;
  member_count: number;
  last_active?: string;
}

export default function HomeDashboard() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const { showToast } = useToast();

  useEffect(() => {
    fetchSpaces();
  }, []);

  const fetchSpaces = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Fetch spaces the user is a member of
    const { data: memberships, error: memError } = await supabase
      .from('space_members')
      .select('space_id')
      .eq('user_id', user.id);

    if (memError || !memberships || memberships.length === 0) {
      setSpaces([]);
      setLoading(false);
      return;
    }

    const spaceIds = memberships.map(m => m.space_id);

    const { data, error } = await supabase
      .from('spaces')
      .select('id, name, color')
      .in('id', spaceIds);

    if (error) {
      console.error('Error fetching spaces:', error);
      showToast('Failed to load spaces', 'error');
    } else {
      // Get member counts for each space
      const enrichedSpaces = await Promise.all(
        (data || []).map(async (space) => {
          const { count } = await supabase
            .from('space_members')
            .select('*', { count: 'exact', head: true })
            .eq('space_id', space.id);
            
          return {
            id: space.id,
            name: space.name,
            color: space.color || '#4f46e5',
            member_count: count || 0,
          };
        })
      );
      setSpaces(enrichedSpaces);
    }
    setLoading(false);
  };

  const createNewSpace = async () => {
    const name = prompt('What should your new space be called?');
    if (!name) return;
    
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('spaces')
      .insert({ name, color: '#4f46e5', created_by: user.id })
      .select()
      .single();

    if (error) {
      showToast('Failed to create space', 'error');
    } else {
      await supabase.from('space_members').insert({
        space_id: data.id,
        user_id: user.id,
        role: 'owner'
      });
      showToast(`✨ "${name}" space created!`, 'success');
      fetchSpaces();
    }
  };

  const filteredSpaces = spaces.filter(space =>
    space.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#fafaf8] to-white flex items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-indigo-500 blur-xl opacity-20 animate-pulse"></div>
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 relative" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fafaf8] via-white to-[#fafaf8]">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/30 via-purple-50/20 to-pink-50/30 blur-3xl"></div>
        <div className="max-w-6xl mx-auto px-6 pt-12 pb-8 relative">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-indigo-600">
                <Sparkles size={18} />
                <span className="text-xs font-medium uppercase tracking-wider">Your workspace</span>
              </div>
              <h1 className="font-['Playfair_Display'] text-4xl md:text-5xl font-semibold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Welcome back
              </h1>
              <p className="text-gray-500 text-sm">Collaborate, create, and communicate — all in one place.</p>
            </div>
            <button
              onClick={createNewSpace}
              className="group flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
            >
              <Plus size={16} className="group-hover:rotate-90 transition-transform" />
              New Space
            </button>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search spaces..."
                className="w-full pl-9 pr-4 py-2.5 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-white transition-all">
              <Filter size={14} /> Filter
            </button>
          </div>
        </div>
      </div>

      {/* Spaces Grid */}
      <div className="max-w-6xl mx-auto px-6 pb-12">
        {filteredSpaces.length === 0 ? (
          <div className="text-center py-20 animate-in zoom-in-95 duration-500">
            <div className="relative w-28 h-28 mx-auto mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl blur-2xl animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl w-28 h-28 flex items-center justify-center shadow-inner">
                <LayoutGrid size={40} className="text-indigo-400" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No spaces yet</h3>
            <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
              Create your first space to start collaborating with your team.
            </p>
            <button
              onClick={createNewSpace}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-all"
            >
              <Plus size={16} /> Create Space
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredSpaces.map((space, idx) => (
              <div
                key={space.id}
                onClick={() => router.push(`/?panel=space-dashboard&space=${space.id}`)}
                className="group cursor-pointer bg-white/60 backdrop-blur-sm border border-gray-200 rounded-2xl p-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 animate-in fade-in slide-in-from-bottom-3"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-xl shadow-sm"
                    style={{ background: space.color }}
                  />
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-1 group-hover:text-indigo-600 transition-colors">
                  {space.name}
                </h3>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Users size={12} /> {space.member_count} members
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare size={12} /> 0 messages
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}