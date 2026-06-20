'use client';

import { useState, useEffect } from 'react';
import { Inbox, Search, Filter, Clock, CheckCircle, AlertCircle, Mail, Sparkles, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import SkeletonLoader from '@/components/SkeletonLoader';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

interface Memu {
  id: string;
  sender_id: string;
  subject: string;
  body: string;
  nature: string;
  status: string;
  created_at: string;
  sender?: {
    full_name: string;
    username: string;
    avatar_url: string;
  };
}

interface InMemusPanelProps {
  isGuest: boolean;
  requireAuth: (action: string, callback: () => void) => void;
}

const natureStyles: Record<string, string> = {
  fyi: 'bg-amber-100 text-amber-800 border-amber-200',
  decide: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  resolve: 'bg-rose-100 text-rose-800 border-rose-200',
  urgent: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

export default function InMemusPanel({ isGuest, requireAuth }: InMemusPanelProps) {
  const [memus, setMemus] = useState<Memu[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { showToast } = useToast();

  const fetchMemus = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setCurrentUser(user);

    const { data, error } = await supabase
      .from('memus')
      .select('*, sender:profiles!sender_id(full_name, username, avatar_url)')
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching memus:', error);
      if (!loading) showToast('Failed to refresh inbox', 'error');
    } else if (data) {
      setMemus(data as Memu[]);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchMemus();
  }, []);

  const { isRefreshing } = usePullToRefresh(fetchMemus);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (days === 1) return 'Yesterday';
    if (days < 7) return date.toLocaleDateString([], { weekday: 'long' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // 1. SKELETON LOADING STATE
  if (loading) {
    return (
      <div className="flex flex-col h-full bg-memu-canvas p-6 md:p-10 animate-fadeIn">
        <div className="mb-8 space-y-3">
          <SkeletonLoader width="w-48" height="h-8" rounded="rounded-xl" />
          <SkeletonLoader width="w-32" height="h-4" />
        </div>
        <div className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <SkeletonLoader width="w-12" height="h-12" circle />
              <div className="flex-1 space-y-3 py-1">
                <SkeletonLoader width="w-3/4" height="h-4" />
                <SkeletonLoader width="w-full" height="h-3" />
                <SkeletonLoader width="w-1/2" height="h-3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-memu-canvas animate-page-enter">
      
      {/* 2. SIMPLIFIED PURPLE PULL-TO-REFRESH SPINNER */}
      {isRefreshing && (
        <div className="flex justify-center py-4 animate-fadeIn">
          <div className="w-8 h-8 rounded-full border-4 border-gray-200 border-t-purple-600 animate-spin"></div>
        </div>
      )}

      {/* Header Section */}
      <div className="px-6 md:px-10 pt-8 pb-6">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-indigo-600">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
                <Inbox size={22} className="text-white" strokeWidth={2.5} />
              </div>
              <h1 className="font-serif text-2xl md:text-3xl font-bold text-gray-900">Inmemus</h1>
            </div>
            <p className="text-sm text-gray-500 font-medium">
              {memus.length} {memus.length === 1 ? 'message' : 'messages'} in your inbox
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm btn-press">
              <Search size={18} strokeWidth={2.5} />
            </button>
            <button className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm btn-press">
              <Filter size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Memus List */}
      <div className="flex-1 overflow-y-auto px-6 md:px-10 pb-24 custom-scroll">
        {memus.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center animate-fade-in-scale">
            <div className="w-20 h-20 rounded-3xl bg-indigo-50 flex items-center justify-center mb-4">
              <Sparkles size={32} className="text-indigo-400" />
            </div>
            <h3 className="font-serif text-xl font-bold text-gray-900 mb-2">Your inbox is empty</h3>
            <p className="text-sm text-gray-500 max-w-xs">
              When you receive memus, they will appear here with crystal clear progress tracking.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {memus.map((memu) => (
              <div 
                key={memu.id} 
                className="group bg-white rounded-2xl p-4 md:p-5 border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all cursor-pointer btn-press animate-slide-up"
              >
                <div className="flex gap-4">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-700 font-bold text-lg shadow-sm">
                      {memu.sender?.full_name?.charAt(0) || memu.sender?.username?.charAt(0) || '?'}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 truncate text-base">
                        {memu.sender?.full_name || memu.sender?.username || 'Unknown Sender'}
                      </h3>
                      <span className="text-xs text-gray-400 whitespace-nowrap flex items-center gap-1">
                        <Clock size={12} />
                        {formatDate(memu.created_at)}
                      </span>
                    </div>
                    
                    <p className="text-sm font-medium text-gray-800 mb-2 truncate">
                      {memu.subject || '(No subject)'}
                    </p>
                    
                    <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed">
                      {memu.body}
                    </p>

                    {/* Nature Badge */}
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${natureStyles[memu.nature] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                        {memu.nature === 'decide' && <CheckCircle size={10} strokeWidth={3} />}
                        {memu.nature === 'resolve' && <AlertCircle size={10} strokeWidth={3} />}
                        {memu.nature === 'urgent' && <Sparkles size={10} strokeWidth={3} />}
                        {memu.nature === 'fyi' && <Mail size={10} strokeWidth={3} />}
                        {memu.nature}
                      </span>
                      
                      {memu.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-100">
                          <Loader2 size={10} className="animate-spin" /> Pending
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .custom-scroll::-webkit-scrollbar { width: 6px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
}