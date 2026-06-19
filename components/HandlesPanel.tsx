'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import { UserPlus, Search, Loader2, AtSign, Check, X, User } from 'lucide-react';

interface SavedHandle {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  contact_id?: string;
}

interface HandlesPanelProps {
  isGuest?: boolean;
  requireAuth?: (action: string, callback: () => void) => void;
  onComposeToHandle?: (handle: any) => void;
}

const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 65%, 65%)`;
};

const getBorderClass = (color: string) => {
  const match = color.match(/hsl\((\d+)/);
  if (!match) return 'border-gray-200/60';
  
  const hue = parseInt(match[1]);
  
  if (hue >= 0 && hue < 30) return 'border-rose-200/60';
  if (hue >= 30 && hue < 60) return 'border-amber-200/60';
  if (hue >= 60 && hue < 90) return 'border-yellow-200/60';
  if (hue >= 90 && hue < 150) return 'border-emerald-200/60';
  if (hue >= 150 && hue < 210) return 'border-cyan-200/60';
  if (hue >= 210 && hue < 270) return 'border-blue-200/60';
  if (hue >= 270 && hue < 330) return 'border-purple-200/60';
  return 'border-pink-200/60';
};

const getInitials = (name: string) => {
  return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
};

export default function HandlesPanel({ isGuest, requireAuth, onComposeToHandle }: HandlesPanelProps = {}) {
  const [handles, setHandles] = useState<SavedHandle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [validationType, setValidationType] = useState<'success' | 'error' | null>(null);

  const { showToast } = useToast();

  useEffect(() => {
    fetchHandles();
  }, []);

  const fetchHandles = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('handles')
      .select('id, username, full_name, avatar_url, contact_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching handles:', error);
    } else {
      setHandles(data || []);
    }
    setLoading(false);
  };

  const handleAddHandle = async () => {
    if (!searchQuery.trim()) return;

    setIsValidating(true);
    setValidationMessage('');
    setValidationType(null);

    try {
      const res = await fetch('/api/handles/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: searchQuery }),
      });
      const data = await res.json();

      if (data.valid) {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        const { error } = await supabase
          .from('handles')
          .insert({
            user_id: user?.id,
            contact_id: data.user.id,
            username: data.user.username,
            full_name: data.user.full_name,
            avatar_url: data.user.avatar_url,
          });

        if (error) {
          if (error.code === '23505') {
            setValidationType('error');
            setValidationMessage('You have already saved this handle.');
          } else {
            throw error;
          }
        } else {
          setValidationType('success');
          setValidationMessage(`@${data.user.username} saved successfully!`);
          setSearchQuery('');
          fetchHandles();
          showToast('Handle saved!', 'success');
        }
      } else {
        setValidationType('error');
        setValidationMessage(data.message || 'Invalid handle.');
      }
    } catch (err: any) {
      console.error('Add handle error:', err);
      setValidationType('error');
      setValidationMessage('An error occurred. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddHandle();
    }
  };

  return (
    <div className="flex flex-col h-full bg-memu-canvas overflow-y-auto animate-page-enter">
      {/* Header Section */}
      <div className="px-6 md:px-10 pt-8 pb-6">
        <div className="space-y-2 mb-6">
          <div className="flex items-center gap-3 text-indigo-600">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
              <AtSign size={22} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="text-sm font-bold uppercase tracking-wider">Contacts</span>
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-semibold text-gray-900 leading-tight">Handles</h1>
          <p className="text-sm text-gray-500 max-w-md">
            Manage your Memu contacts. Add handles to invite them to spaces and send direct memus.
          </p>
        </div>

        {/* Add Handle Section */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2 uppercase tracking-wider">
            <UserPlus size={16} strokeWidth={2.5} className="text-indigo-600" /> Add New Handle
          </h2>
          
          <div className="flex gap-3">
            <div className="relative flex-1">
              <AtSign size={18} strokeWidth={2.5} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value.toLowerCase())}
                onKeyDown={handleKeyDown}
                placeholder="Enter handle (e.g., testuser95.memu)"
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition text-sm font-medium"
              />
            </div>
            <button
              onClick={handleAddHandle}
              disabled={isValidating || !searchQuery.trim()}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg btn-press"
            >
              {isValidating ? <Loader2 size={18} strokeWidth={2.5} className="animate-spin" /> : <><UserPlus size={18} strokeWidth={2.5} /> Add</>}
            </button>
          </div>

          {/* Validation Feedback */}
          {validationMessage && (
            <div className={`mt-4 flex items-center gap-2 text-sm p-3 rounded-xl font-medium animate-fade-in-scale ${
              validationType === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
              {validationType === 'success' ? <Check size={16} strokeWidth={2.5} /> : <X size={16} strokeWidth={2.5} />}
              {validationMessage}
            </div>
          )}
        </div>
      </div>

      {/* Saved Handles List */}
      <div className="flex-1 px-6 md:px-10 pb-10">
        <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2 uppercase tracking-wider">
          <Search size={16} strokeWidth={2.5} className="text-gray-400" /> Your Contacts ({handles.length})
        </h2>
        
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : handles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in-scale">
            <div className="relative w-32 h-32 mb-8">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-3xl blur-2xl animate-pulse"></div>
              <div className="relative bg-white rounded-3xl w-32 h-32 flex items-center justify-center shadow-xl border border-gray-200">
                <User size={48} className="text-indigo-500" strokeWidth={2} />
              </div>
            </div>
            <h3 className="font-serif text-xl font-semibold text-gray-900 mb-3">No handles saved yet</h3>
            <p className="text-gray-500 text-sm max-w-md">
              Use the box above to add your first Memu contact.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {handles.map((handle, idx) => {
              const color = stringToColor(handle.contact_id || handle.username);
              const borderClass = getBorderClass(color);
              
              return (
                <div
                  key={handle.id}
                  className={`group relative bg-white rounded-2xl border-[1px] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 ${borderClass} p-4 animate-slide-up btn-press`}
                  style={{ animationDelay: `${idx * 60}ms`, opacity: 0 }}
                >
                  <div className="flex items-center gap-3">
                    {handle.avatar_url ? (
                      <img 
                        src={handle.avatar_url} 
                        alt={handle.full_name} 
                        className="w-10 h-10 rounded-xl object-cover border border-gray-200 shadow-sm flex-shrink-0 transition-transform group-hover:scale-105" 
                      />
                    ) : (
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0 transition-transform group-hover:scale-105"
                        style={{ background: `linear-gradient(135deg, ${color}, ${color}dd)` }}
                      >
                        {getInitials(handle.full_name || handle.username)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                        {handle.full_name || 'Unknown User'}
                      </h3>
                      <p className="text-[11px] text-indigo-600 font-semibold truncate">@{handle.username}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}