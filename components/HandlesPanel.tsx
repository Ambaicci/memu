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
}

interface HandlesPanelProps {
  isGuest?: boolean;
  requireAuth?: (action: string, callback: () => void) => void;
  onComposeToHandle?: (handle: any) => void;
}

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

    // Fetch saved handles from the 'handles' table
    const { data, error } = await supabase
      .from('handles')
      .select('id, username, full_name, avatar_url')
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
      // 1. Validate the handle via our API
      const res = await fetch('/api/handles/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: searchQuery }),
      });
      const data = await res.json();

      if (data.valid) {
        // 2. If valid, save it to the database
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
          if (error.code === '23505') { // Unique violation (already saved)
            setValidationType('error');
            setValidationMessage('You have already saved this handle.');
          } else {
            throw error;
          }
        } else {
          setValidationType('success');
          setValidationMessage(`@${data.user.username} saved successfully!`);
          setSearchQuery('');
          fetchHandles(); // Refresh list
          showToast('Handle saved!', 'success');
        }
      } else {
        // 3. If invalid, show error
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

  const getInitials = (name: string) => {
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="h-full overflow-y-auto p-6 md:p-10 max-w-4xl mx-auto">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-indigo-600 mb-2">
            <AtSign size={18} />
            <span className="text-xs font-medium uppercase tracking-wider">Network</span>
          </div>
          <h1 className="font-['Playfair_Display'] text-3xl md:text-4xl font-semibold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Handles
          </h1>
          <p className="text-gray-500 text-sm mt-2">Manage your Memu contacts. Add handles to invite them to spaces and send direct memus.</p>
        </div>

        {/* Add Handle Section */}
        <div className="bg-white/60 backdrop-blur-sm border border-gray-200 rounded-2xl p-6 mb-8 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <UserPlus size={16} className="text-indigo-500" /> Add New Handle
          </h2>
          
          <div className="flex gap-3">
            <div className="relative flex-1">
              <AtSign size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value.toLowerCase())}
                onKeyDown={handleKeyDown}
                placeholder="Enter handle (e.g., testuser95.memu)"
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition text-sm"
              />
            </div>
            <button
              onClick={handleAddHandle}
              disabled={isValidating || !searchQuery.trim()}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isValidating ? <Loader2 size={18} className="animate-spin" /> : <><UserPlus size={18} /> Add</>}
            </button>
          </div>

          {/* Validation Feedback */}
          {validationMessage && (
            <div className={`mt-3 flex items-center gap-2 text-sm p-3 rounded-lg ${
              validationType === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
            }`}>
              {validationType === 'success' ? <Check size={16} /> : <X size={16} />}
              {validationMessage}
            </div>
          )}
        </div>

        {/* Saved Handles List */}
        <div>
          <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Search size={16} className="text-gray-500" /> Your Contacts ({handles.length})
          </h2>
          
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={24} className="text-indigo-500 animate-spin" />
            </div>
          ) : handles.length === 0 ? (
            <div className="bg-white/50 backdrop-blur-sm border border-gray-200 rounded-2xl p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mx-auto mb-4">
                <User size={24} className="text-indigo-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-800 mb-1">No handles saved yet</h3>
              <p className="text-sm text-gray-500">Use the box above to add your first Memu contact.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {handles.map((handle) => (
                <div
                  key={handle.id}
                  className="group bg-white/60 backdrop-blur-sm border border-gray-200 rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
                >
                  <div className="flex items-center gap-4">
                    {handle.avatar_url ? (
                      <img src={handle.avatar_url} alt={handle.full_name} className="w-12 h-12 rounded-full object-cover border border-gray-200 shadow-sm" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-md">
                        {getInitials(handle.full_name || handle.username)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-gray-800 truncate">{handle.full_name || 'Unknown User'}</h3>
                      <p className="text-sm text-indigo-600 font-medium truncate">@{handle.username}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}