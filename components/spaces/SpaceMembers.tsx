'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import { 
  Users, 
  Shield, 
  User, 
  Trash2, 
  Plus, 
  Mail, 
  Loader2, 
  AlertCircle,
  MoreHorizontal
} from 'lucide-react';

interface Member {
  user_id: string;
  role: 'admin' | 'member';
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  initials: string;
}

interface SpaceMembersProps {
  spaceId: string;
}

export default function SpaceMembers({ spaceId }: SpaceMembersProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const { showToast } = useToast();

  // Get current user & admin status
  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        // Check if user is admin in this space
        const { data: membership } = await supabase
          .from('space_members')
          .select('role')
          .eq('space_id', spaceId)
          .eq('user_id', user.id)
          .single();
        
        if (membership) setIsAdmin(membership.role === 'admin');
      }
    };
    getUser();
  }, [spaceId]);

  // Fetch members
  const fetchMembers = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    setError(null);
    
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('space_members')
        .select('user_id, role, profiles(full_name, username, avatar_url)')
        .eq('space_id', spaceId)
        .order('role', { ascending: false }); // Admins first

      if (error) {
        console.error('Fetch members error:', error);
        // Handle schema mismatch gracefully
        if (error.code === '42P01' || error.code === 'PGRST116') {
          setError('TABLE_MISSING');
          setLoading(false);
          return;
        }
        throw error;
      }

      // Transform data
      const transformed: Member[] = (data || []).map((item: any) => {
        const profile = item.profiles;
        const name = profile?.full_name || profile?.username || 'Unknown User';
        return {
          user_id: item.user_id,
          role: item.role,
          full_name: profile?.full_name,
          username: profile?.username,
          avatar_url: profile?.avatar_url,
          initials: name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
        };
      });

      setMembers(transformed);
    } catch (err: any) {
      console.error('Failed to fetch members:', err);
      setError(err.message || 'Failed to load members');
    } finally {
      setLoading(false);
    }
  }, [spaceId, currentUserId]);

  useEffect(() => {
    if (currentUserId) fetchMembers();
  }, [fetchMembers, currentUserId]);

  // Remove member (Admin only)
  const handleRemoveMember = async (userId: string) => {
    if (userId === currentUserId) {
      showToast("You can't remove yourself", 'error');
      return;
    }
    
    if (!confirm('Remove this member from the space?')) return;
    
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('space_members')
        .delete()
        .eq('space_id', spaceId)
        .eq('user_id', userId);
      
      if (error) throw error;
      
      showToast('Member removed', 'success');
      fetchMembers();
    } catch (err) {
      showToast('Failed to remove member', 'error');
    }
  };

  // Invite member (Placeholder for Phase 2)
  const handleInvite = () => {
    showToast('Invite flow coming in Phase 2', 'success');
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-[#4f46e5]" />
      </div>
    );
  }

  // Table missing state
  if (error === 'TABLE_MISSING') {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-6">
        <div className="w-16 h-16 rounded-full bg-[#f2f1ee] flex items-center justify-center mb-4">
          <Users className="w-8 h-8 text-[#aaa]" />
        </div>
        <h3 className="text-lg font-medium text-[#0f0f0f] mb-2">Members is coming soon</h3>
        <p className="text-sm text-[#777] max-w-md">
          The member management system is being set up. You'll be able to invite and manage team members here shortly.
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
        <button onClick={fetchMembers} className="px-4 py-2 bg-[#4f46e5] text-white rounded-lg text-sm hover:bg-[#4338ca] transition">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-[#0f0f0f]">Members ({members.length})</h2>
        {isAdmin && (
          <button
            onClick={handleInvite}
            className="flex items-center gap-2 px-4 py-2 bg-[#0f0f0f] text-white rounded-lg text-sm hover:bg-[#2a2a2a] transition"
          >
            <Plus size={14} /> Invite People
          </button>
        )}
      </div>

      {/* Member List */}
      <div className="bg-white border border-[#e8e7e3] rounded-xl overflow-hidden">
        {members.map((member, index) => (
          <div
            key={member.user_id}
            className={`flex items-center justify-between p-4 ${index !== 0 ? 'border-t border-[#f2f1ee]' : ''}`}
          >
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-[#e8e7e3] flex items-center justify-center text-[13px] font-medium text-[#4f46e5] overflow-hidden flex-shrink-0">
                {member.avatar_url ? (
                  <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  member.initials
                )}
              </div>
              
              {/* Info */}
              <div>
                <p className="text-[14px] font-medium text-[#0f0f0f]">
                  {member.full_name || 'Unnamed User'}
                  {member.user_id === currentUserId && <span className="text-[11px] text-[#777] ml-2">(You)</span>}
                </p>
                <p className="text-[12px] text-[#777]">@{member.username}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Role Badge */}
              <span className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full ${
                member.role === 'admin' ? 'bg-[#ede9fe] text-[#7c3aed]' : 'bg-[#f2f1ee] text-[#777]'
              }`}>
                {member.role === 'admin' ? <Shield size={12} /> : <User size={12} />}
                {member.role}
              </span>

              {/* Admin Actions */}
              {isAdmin && member.user_id !== currentUserId && (
                <button
                  onClick={() => handleRemoveMember(member.user_id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-[#aaa] hover:text-red-600 transition opacity-0 group-hover:opacity-100"
                  title="Remove Member"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}