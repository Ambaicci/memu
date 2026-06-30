'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import { 
  User, Search, Plus, MessageSquare, Trash2, Loader2, 
  AtSign, X, Users, Sparkles
} from 'lucide-react';

interface ContactProfile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface Contact {
  id: string;
  contact_user_id: string;
  profiles: ContactProfile | ContactProfile[];
}

interface ContactsPanelProps {
  isGuest?: boolean;
  requireAuth?: (action: string, callback: () => void) => void;
  onComposeToHandle?: (handle: string) => void;
}

export default function ContactsPanel({ isGuest, requireAuth, onComposeToHandle }: ContactsPanelProps = {}) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ContactProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { showToast } = useToast();

  // Helper to extract profile from contact
  const getProfile = (contact: Contact): ContactProfile | null => {
    if (Array.isArray(contact.profiles)) {
      return contact.profiles[0] || null;
    }
    return contact.profiles;
  };

  // 1. Get current user
  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getUser();
  }, []);

  // 2. Fetch contacts on mount
  useEffect(() => {
    if (currentUserId && !isGuest) {
      fetchContacts();
    } else if (isGuest) {
      setLoading(false);
    }
  }, [currentUserId, isGuest]);

  // 3. Global Search (Debounced)
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const fetchUsers = async () => {
      setSearching(true);
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .or(`username.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`)
        .limit(8);

      if (!error && data) {
        // Filter out self and already saved contacts
        const savedIds = contacts.map(c => c.contact_user_id);
        const filtered = data.filter(u => 
          u.id !== currentUserId && !savedIds.includes(u.id)
        );
        setSearchResults(filtered);
      }
      setSearching(false);
    };

    const timer = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, currentUserId, contacts]);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from('contacts')
        .select('id, contact_user_id, profiles(id, username, full_name, avatar_url)')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Sort alphabetically by name
      const sorted = (data || []).sort((a: any, b: any) => {
        const aProfile = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles;
        const bProfile = Array.isArray(b.profiles) ? b.profiles[0] : b.profiles;
        const aName = aProfile?.full_name || aProfile?.username || '';
        const bName = bProfile?.full_name || bProfile?.username || '';
        return aName.localeCompare(bName);
      });
      
      setContacts(sorted);
    } catch (err) {
      console.error('Error fetching contacts:', err);
      showToast('Failed to load contacts', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async (user: ContactProfile) => {
    if (!currentUserId) return;
    setAddingId(user.id);
    
    try {
      const supabase = createClient();
      const { error } = await supabase.from('contacts').insert({
        user_id: currentUserId,
        contact_user_id: user.id
      });

      if (error) throw error;

      showToast(`Added ${user.full_name || user.username} to contacts!`, 'success');
      setSearchQuery('');
      setSearchResults([]);
      fetchContacts();
    } catch (err: any) {
      console.error('Add contact error:', err);
      showToast(err.message || 'Failed to add contact', 'error');
    } finally {
      setAddingId(null);
    }
  };

  const handleRemoveContact = async (contactId: string, name: string) => {
    if (!confirm(`Remove ${name} from your contacts?`)) return;
    
    try {
      const supabase = createClient();
      const { error } = await supabase.from('contacts').delete().eq('id', contactId);
      if (error) throw error;

      showToast('Contact removed', 'success');
      fetchContacts();
    } catch (err) {
      console.error('Remove contact error:', err);
      showToast('Failed to remove contact', 'error');
    }
  };

  const handleMessage = (username: string) => {
    if (onComposeToHandle) {
      onComposeToHandle(username);
    } else {
      showToast(`Opening chat with @${username}.memu...`, 'success');
    }
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (isGuest) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-memu-canvas px-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center mx-auto mb-4 shadow-sm border border-gray-100">
            <Users size={32} strokeWidth={1.5} className="text-emerald-500" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Sign in to view contacts</h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            Manage your personal network and send memus to your saved contacts.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-memu-canvas">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl animate-pulse" />
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 relative z-10" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-memu-canvas overflow-y-auto pb-24 custom-scroll">
      {/* Header */}
      <div className="px-6 md:px-10 pt-8 pb-4 w-full">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center shadow-sm">
                <Users size={20} strokeWidth={2} className="text-white" />
              </div>
              <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Contacts</h1>
            </div>
            <p className="text-sm text-gray-500 font-medium">
              {contacts.length} {contacts.length === 1 ? 'contact' : 'contacts'} saved
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full max-w-2xl">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search global handles to add..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition shadow-sm"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 px-6 md:px-10 pb-10 w-full max-w-4xl">
        
        {/* 1. Search Results Section */}
        {searchQuery.length >= 2 && (
          <div className="mb-8 animate-fadeIn">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 px-1">
              {searching ? 'Searching...' : 'Search Results'}
            </h3>
            
            {searching ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              </div>
            ) : searchResults.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {searchResults.map((user) => (
                  <div 
                    key={user.id} 
                    className="flex items-center gap-4 p-4 bg-white border border-gray-200/60 rounded-2xl hover:shadow-md hover:border-emerald-200 transition-all"
                  >
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover border border-gray-100" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-sm font-bold">
                        {getInitials(user.full_name || user.username)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{user.full_name || user.username}</p>
                      <p className="text-xs text-gray-500 truncate">@{user.username}.memu</p>
                    </div>
                    <button
                      onClick={() => handleAddContact(user)}
                      disabled={addingId === user.id}
                      className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-semibold hover:bg-emerald-100 transition-all disabled:opacity-50 shrink-0"
                    >
                      {addingId === user.id ? <Loader2 size={12} className="animate-spin" /> : <Plus size={14} />}
                      Add
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-white rounded-2xl border border-gray-200/60">
                <p className="text-sm text-gray-500">No users found matching "{searchQuery}"</p>
              </div>
            )}
          </div>
        )}

        {/* 2. Saved Contacts Section */}
        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 px-1">
            Your Network
          </h3>
          
          {contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-gray-200/60">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center mb-4">
                <Users size={24} className="text-emerald-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No contacts yet</h3>
              <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
                Use the search bar above to find people on Memu and add them to your personal network.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {contacts.map((contact) => {
                const profile = getProfile(contact);
                if (!profile) return null;
                
                return (
                  <div 
                    key={contact.id} 
                    className="group flex items-center gap-4 p-4 bg-white border border-gray-200/60 rounded-2xl hover:shadow-md hover:border-emerald-200 transition-all"
                  >
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover border border-gray-100" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
                        {getInitials(profile.full_name || profile.username)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{profile.full_name || profile.username}</p>
                      <p className="text-xs text-gray-500 truncate">@{profile.username}.memu</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleMessage(profile.username)}
                        className="p-2 rounded-xl hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-all"
                        title="Send Memu"
                      >
                        <MessageSquare size={16} />
                      </button>
                      <button
                        onClick={() => handleRemoveContact(contact.id, profile.full_name || profile.username)}
                        className="p-2 rounded-xl hover:bg-rose-50 text-gray-400 hover:text-rose-600 transition-all"
                        title="Remove"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.25s ease-out; }
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #d4d4d4; border-radius: 10px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  );
}