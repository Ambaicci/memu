'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { 
  Plus, Loader2, Users, MessageSquare, 
  LayoutGrid, ChevronRight, Search, Filter, Layers
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
      const enrichedSpaces = await Promise.all(
        (data || []).map(async (space) => {
          const { count } = await supabase
            .from('space_members')
            .select('*', { count: 'exact', head: true })
            .eq('space_id', space.id);
            
          return {
            id: space.id,
            name: space.name,
            color: space.color || '#4F46E5',
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
      .insert({ name, color: '#4F46E5', created_by: user.id })
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
      <div className="min-h-screen bg-memu-canvas flex items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-memu-purple blur-2xl opacity-20 animate-pulse"></div>
          <Loader2 className="w-10 h-10 animate-spin text-memu-purple relative" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-memu-canvas animate-page-enter">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-memu-purple/5 via-transparent to-memu-blue/5"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-memu-purple/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-memu-blue/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        
        <div className="max-w-7xl mx-auto px-6 pt-16 pb-12 relative">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-12">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-memu-purple">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-memu-purple to-memu-blue flex items-center justify-center shadow-lg">
                  <Layers size={20} className="text-white" />
                </div>
                <span className="text-sm font-semibold uppercase tracking-wider">Your Workspace</span>
              </div>
              
              <h1 className="font-serif text-3xl md:text-4xl font-semibold text-memu-ink leading-tight">
                Welcome back
              </h1>
              <p className="text-memu-ink-3 text-sm max-w-md">
                Collaborate, create, and communicate — all in one place.
              </p>
            </div>
            
            <button
              onClick={createNewSpace}
              className="group flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-memu-purple to-memu-blue text-white rounded-2xl text-sm font-semibold shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 btn-press"
            >
              <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
              New Space
            </button>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-memu-ink-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search spaces..."
                className="w-full pl-12 pr-4 py-4 bg-memu-surface/80 backdrop-blur-xl border border-memu-surface-2 rounded-2xl text-sm text-memu-ink outline-none focus:ring-2 focus:ring-memu-purple/20 focus:border-memu-purple/40 transition-all placeholder:text-memu-ink-4"
              />
            </div>
            <button className="flex items-center gap-2 px-6 py-4 bg-memu-surface/80 backdrop-blur-xl border border-memu-surface-2 rounded-2xl text-sm font-medium text-memu-ink-2 hover:bg-memu-surface hover:border-memu-ink-4 transition-all btn-press">
              <Filter size={16} /> Filter
            </button>
          </div>
        </div>
      </div>

      {/* Spaces Grid */}
      <div className="max-w-7xl mx-auto px-6 pb-16">
        {filteredSpaces.length === 0 ? (
          <div className="text-center py-24 animate-fade-in-scale">
            <div className="relative w-32 h-32 mx-auto mb-8">
              <div className="absolute inset-0 bg-gradient-to-br from-memu-purple/20 to-memu-blue/20 rounded-3xl blur-2xl animate-pulse"></div>
              <div className="relative bg-memu-surface rounded-3xl w-32 h-32 flex items-center justify-center shadow-xl border border-memu-surface-2">
                <LayoutGrid size={48} className="text-memu-purple" />
              </div>
            </div>
            <h3 className="font-serif text-xl font-semibold text-memu-ink mb-3">No spaces yet</h3>
            <p className="text-memu-ink-3 text-sm mb-8 max-w-md mx-auto">
              Create your first space to start collaborating with your team.
            </p>
            <button
              onClick={createNewSpace}
              className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-memu-purple to-memu-blue text-white rounded-2xl text-sm font-semibold shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 btn-press"
            >
              <Plus size={18} /> Create Space
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSpaces.map((space, idx) => (
              <div
                key={space.id}
                onClick={() => router.push(`/?panel=space-dashboard&space=${space.id}`)}
                className="group cursor-pointer bg-memu-surface rounded-3xl p-6 shadow-sm border border-memu-surface-2 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 animate-slide-up btn-press"
                style={{ animationDelay: `${idx * 80}ms`, opacity: 0 }}
              >
                <div className="flex items-start justify-between mb-5">
                  <div
                    className="w-14 h-14 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300"
                    style={{ 
                      background: `linear-gradient(135deg, ${space.color}, ${space.color}dd)`,
                      boxShadow: `0 10px 30px -10px ${space.color}60`
                    }}
                  />
                  <ChevronRight size={20} className="text-memu-ink-4 group-hover:text-memu-purple group-hover:translate-x-1 transition-all duration-300" />
                </div>
                
                <h3 className="font-serif text-lg font-semibold text-memu-ink mb-2 group-hover:text-memu-purple transition-colors duration-300">
                  {space.name}
                </h3>
                
                <div className="flex items-center gap-4 text-xs text-memu-ink-3">
                  <span className="flex items-center gap-2">
                    <Users size={14} className="text-memu-ink-4" /> 
                    <span className="font-medium">{space.member_count}</span> members
                  </span>
                  <span className="flex items-center gap-2">
                    <MessageSquare size={14} className="text-memu-ink-4" /> 
                    <span className="font-medium">0</span> messages
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