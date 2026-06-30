'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import { 
  AtSign, Plus, X, User, Building, Loader2, Edit2, 
  Users, Search, MessageSquare, Trash2, Settings, Crown, ArrowRight, ArrowLeft
} from 'lucide-react';

// --- Types ---
interface Handle {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  organization: string | null;
  is_primary: boolean;
}

interface MainProfile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string;
}

interface ContactProfile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface Contact {
  id: string;
  contact_user_id: string;
  profiles: ContactProfile;
}

interface HandlesPanelProps {
  isGuest?: boolean;
  requireAuth?: (action: string, callback: () => void) => void;
  onComposeToHandle?: (handle: string) => void;
}

export default function HandlesPanel({ isGuest, requireAuth, onComposeToHandle }: HandlesPanelProps = {}) {
  const router = useRouter();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // --- URL-Synced Tab State ---
  // Read the 'tab' query param from the URL on load
  const getInitialTab = () => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('tab') === 'contacts' ? 'contacts' : 'handles';
    }
    return 'handles';
  };

  const [activeTab, setActiveTab] = useState<'handles' | 'contacts'>(getInitialTab());
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [mainProfile, setMainProfile] = useState<MainProfile | null>(null);
  
  // --- State: Handles (Identities) ---
  const [handles, setHandles] = useState<Handle[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newHandle, setNewHandle] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newBio, setNewBio] = useState('');
  const [newOrganization, setNewOrganization] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editOrganization, setEditOrganization] = useState('');

  // --- State: Contacts (Network) ---
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ContactProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  const { showToast } = useToast();

  // --- Effects ---
  useEffect(() => {
    if (!isGuest) {
      const getUser = async () => {
        try {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            setCurrentUserId(user.id);
            const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            if (profileData) setMainProfile(profileData);
            
            await Promise.all([
              fetchHandles(user.id),
              fetchContacts(user.id)
            ]);
          }
        } catch (err) {
          console.error("Auth error:", err);
        } finally {
          setLoading(false); 
        }
      };
      getUser();
    } else {
      setLoading(false);
    }
  }, [isGuest]);

  // Smooth Scroll to Top when switching tabs
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeTab]);

  // --- THE MAGIC: URL-Synced Navigation ---
  const handleTabChange = (tab: 'handles' | 'contacts') => {
    setActiveTab(tab);
    if (tab === 'contacts') {
      // Push to browser history so the Back button works!
      router.push('/?panel=handles&tab=contacts', { scroll: false });
    } else {
      router.push('/?panel=handles', { scroll: false });
    }
  };

  // Global Search for Contacts
  useEffect(() => {
    if (searchQuery.length < 2 || activeTab !== 'contacts') {
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
  }, [searchQuery, currentUserId, contacts, activeTab]);

  // --- HANDLES FUNCTIONS ---
  const fetchHandles = async (userId: string) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from('handles').select('*').eq('user_id', userId).order('created_at', { ascending: true });
      if (error) throw error;
      setHandles(data || []);
    } catch (err) { console.error('Error fetching handles:', err); }
  };

  const handleAddHandle = async () => {
    if (!newHandle.trim()) return;
    setSaving(true);
    try {
      const supabase = createClient();
      let formattedHandle = newHandle.trim().replace(/^@/, '').toLowerCase();
      if (!formattedHandle.endsWith('.memu')) formattedHandle += '.memu';

      const { error } = await supabase.from('handles').insert({
        user_id: currentUserId,
        username: formattedHandle,
        full_name: newFullName.trim() || null,
        bio: newBio.trim() || null,
        organization: newOrganization.trim() || null,
        is_primary: handles.length === 0,
      });

      if (error) throw error;
      showToast('Handle created!', 'success');
      setNewHandle(''); setNewFullName(''); setNewBio(''); setNewOrganization('');
      setShowAddModal(false);
      if (currentUserId) fetchHandles(currentUserId);
    } catch (err: any) {
      showToast(err.message || 'Failed to create handle', 'error');
    } finally { setSaving(false); }
  };

  const handleSetPrimary = async (id: string) => {
    const supabase = createClient();
    await supabase.from('handles').update({ is_primary: false }).neq('id', id);
    await supabase.from('handles').update({ is_primary: true }).eq('id', id);
    if (currentUserId) fetchHandles(currentUserId);
    showToast('Primary handle updated', 'success');
  };

  const handleDeleteHandle = async (id: string) => {
    if (!confirm('Delete this handle?')) return;
    const supabase = createClient();
    await supabase.from('handles').delete().eq('id', id);
    if (currentUserId) fetchHandles(currentUserId);
    showToast('Handle deleted', 'success');
  };

  const handleStartEdit = (handle: Handle) => {
    setEditingId(handle.id);
    setEditName(handle.full_name || '');
    setEditBio(handle.bio || '');
    setEditOrganization(handle.organization || '');
  };

  const handleSaveEdit = async (id: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.from('handles').update({
        full_name: editName.trim() || null,
        bio: editBio.trim() || null,
        organization: editOrganization.trim() || null,
      }).eq('id', id);

      if (error) throw error;
      showToast('Handle updated', 'success');
      setEditingId(null);
      if (currentUserId) fetchHandles(currentUserId);
    } catch (err: any) {
      showToast(err.message || 'Failed to update handle', 'error');
    }
  };

  // --- CONTACTS FUNCTIONS ---
  const fetchContacts = async (userId: string) => {
    try {
      const supabase = createClient();
      const { data: contactData, error: contactError } = await supabase.from('contacts').select('id, contact_user_id').eq('user_id', userId);
      if (contactError) throw contactError;
      if (!contactData || contactData.length === 0) { setContacts([]); return; }

      const userIds = contactData.map(c => c.contact_user_id);
      const { data: profilesData, error: profilesError } = await supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', userIds);
      if (profilesError) throw profilesError;

      const profileMap = new Map(profilesData.map(p => [p.id, p]));
      const merged = contactData.map(c => ({
        id: c.id,
        contact_user_id: c.contact_user_id,
        profiles: profileMap.get(c.contact_user_id) || { id: c.contact_user_id, username: 'Unknown', full_name: null, avatar_url: null }
      }));

      setContacts(merged.sort((a, b) => (a.profiles.full_name || a.profiles.username).localeCompare(b.profiles.full_name || b.profiles.username)));
    } catch (err) { console.error('Error fetching contacts:', err); }
  };

  const handleAddContact = async (user: ContactProfile) => {
    if (!currentUserId) return;
    setAddingId(user.id);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('contacts').insert({ user_id: currentUserId, contact_user_id: user.id });
      if (error) throw error;
      showToast(`Added ${user.full_name || user.username}!`, 'success');
      setSearchQuery('');
      if (currentUserId) fetchContacts(currentUserId);
    } catch (err: any) {
      showToast(err.message || 'Failed to add contact', 'error');
    } finally { setAddingId(null); }
  };

  const handleRemoveContact = async (contactId: string, name: string) => {
    if (!confirm(`Remove ${name}?`)) return;
    try {
      const supabase = createClient();
      await supabase.from('contacts').delete().eq('id', contactId);
      if (currentUserId) fetchContacts(currentUserId);
      showToast('Contact removed', 'success');
    } catch (err) { showToast('Failed to remove contact', 'error'); }
  };

  const handleMessage = (username: string) => {
    if (onComposeToHandle) onComposeToHandle(username);
    else showToast(`Opening chat with @${username}.memu...`, 'success');
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (isGuest) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-memu-canvas px-4">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center mx-auto mb-4">
          <AtSign size={32} className="text-blue-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Sign in to manage Handles</h3>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-memu-canvas">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-memu-canvas overflow-hidden">
      {/* Header - Fixed Stacking */}
      <div className="px-6 md:px-10 pt-8 pb-4 w-full shrink-0 bg-memu-canvas z-10">
        <div className="flex items-center justify-between flex-nowrap gap-4 mb-6">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-sm shrink-0">
                <AtSign size={20} className="text-white" />
              </div>
              <h1 className="text-2xl font-semibold text-gray-900 tracking-tight truncate">Handles</h1>
            </div>
            <p className="text-sm text-gray-500 font-medium mt-1">Manage identities & network</p>
          </div>

          {activeTab === 'handles' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all shrink-0"
            >
              <Plus size={16} /> <span className="hidden sm:inline">New Handle</span>
            </button>
          )}
        </div>

        {/* Tabs with Smooth Underline */}
        <div className="relative flex items-center gap-1 p-1 bg-gray-100 rounded-xl w-fit">
          <button 
            onClick={() => handleTabChange('handles')}
            className={`relative z-10 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
              activeTab === 'handles' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <AtSign size={16} /> My Handles
          </button>
          <button 
            onClick={() => handleTabChange('contacts')}
            className={`relative z-10 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
              activeTab === 'contacts' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users size={16} /> Contacts
          </button>
          
          {/* Animated Sliding Background */}
          <div 
            className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-sm transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${
              activeTab === 'handles' ? 'left-1' : 'left-[calc(50%+2px)]'
            }`} 
          />
        </div>
      </div>

      {/* Scrollable Content Area with Ref */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto custom-scroll px-6 md:px-10 pb-10 w-full">
        <div className="max-w-4xl mx-auto">
        
          {/* ================= TAB 1: MY HANDLES ================= */}
          {activeTab === 'handles' && (
            <div key="handles-tab" className="animate-slide-up-fade space-y-6">
              
              {/* MAIN PROFILE SYNC */}
              {mainProfile && (
                <div className="relative p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/60 rounded-2xl group hover:shadow-md transition-shadow">
                  <div className="absolute top-4 right-4">
                    <span className="flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-white px-2 py-1 rounded-full border border-blue-200 shadow-sm">
                      <Crown size={10} /> MAIN ACCOUNT
                    </span>
                  </div>
                  <div className="flex items-start gap-4 pr-24">
                    {mainProfile.avatar_url ? (
                      <img src={mainProfile.avatar_url} className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm" />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-lg font-bold shadow-sm">
                        {getInitials(mainProfile.full_name || mainProfile.username)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold text-gray-900 truncate">{mainProfile.full_name || mainProfile.username}</h3>
                      <p className="text-sm font-medium text-blue-600 break-all">@{mainProfile.username}.memu</p>
                      <p className="text-xs text-gray-500 truncate mt-1">{mainProfile.email}</p>
                      
                      <button 
                        onClick={() => router.push('/?panel=profile', { scroll: false })}
                        className="mt-3 flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors group-hover:gap-2"
                      >
                        <Settings size={12} /> Manage in Profile <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* EXTRA HANDLES GRID */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Additional Identities</h3>
                {handles.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
                    <AtSign size={24} className="text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No additional handles yet.</p>
                    <button onClick={() => setShowAddModal(true)} className="mt-4 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                      + Create a new persona
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {handles.map((handle) => (
                      <div key={handle.id} className={`relative p-5 bg-white border rounded-2xl ${handle.is_primary ? 'border-blue-300/60 shadow-md' : 'border-gray-200/60'} hover:shadow-lg transition-all`}>
                        {handle.is_primary && <span className="absolute top-3 right-3 text-[9px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold border border-blue-200/60">PRIMARY</span>}
                        <div className="flex items-start gap-4">
                          {handle.avatar_url ? (
                            <img src={handle.avatar_url} className="w-12 h-12 rounded-full object-cover border border-gray-200" />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-sm font-bold">
                              {getInitials(handle.full_name || handle.username)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-gray-900 truncate">{handle.full_name || handle.username}</h3>
                            <p className="text-xs font-medium text-blue-600 break-all">@{handle.username}</p>
                            {editingId === handle.id ? (
                              <div className="space-y-2 mt-2">
                                <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" className="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded text-xs" />
                                <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} placeholder="Bio" rows={2} className="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded text-xs resize-none" />
                                <div className="flex gap-2">
                                  <button onClick={() => handleSaveEdit(handle.id)} className="px-2 py-1 bg-blue-600 text-white rounded text-[10px] font-bold">Save</button>
                                  <button onClick={() => setEditingId(null)} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-[10px] font-bold">Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <div className="mt-1 space-y-0.5">
                                {handle.bio && <p className="text-xs text-gray-500 truncate">{handle.bio}</p>}
                                {handle.organization && <p className="text-xs text-gray-500 truncate flex items-center gap-1"><Building size={10} />{handle.organization}</p>}
                              </div>
                            )}
                          </div>
                          {editingId !== handle.id && (
                            <div className="flex flex-col gap-1 shrink-0">
                              <button onClick={() => handleStartEdit(handle)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600"><Edit2 size={12} /></button>
                              {!handle.is_primary && <button onClick={() => handleSetPrimary(handle.id)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600 text-[9px] font-bold">Set Primary</button>}
                              <button onClick={() => handleDeleteHandle(handle.id)} className="p-1.5 rounded hover:bg-rose-50 text-gray-400 hover:text-rose-600"><X size={12} /></button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= TAB 2: CONTACTS ================= */}
          {activeTab === 'contacts' && (
            <div key="contacts-tab" className="animate-slide-up-fade space-y-6">
              
              {/* Internal Back Button for extra UX */}
              <button 
                onClick={() => handleTabChange('handles')}
                className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-blue-600 transition-colors"
              >
                <ArrowLeft size={16} /> Back to My Handles
              </button>

              <div className="relative w-full">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search global handles to add..."
                  className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition shadow-sm"
                />
              </div>

              {searchQuery.length >= 2 && (
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Search Results</h3>
                  {searching ? (
                    <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-blue-600" /></div>
                  ) : searchResults.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {searchResults.map((user) => (
                        <div key={user.id} className="flex items-center gap-3 p-3 bg-white border border-gray-200/60 rounded-xl hover:shadow-sm transition-shadow">
                          {user.avatar_url ? <img src={user.avatar_url} className="w-10 h-10 rounded-full object-cover" /> : <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold">{getInitials(user.full_name || user.username)}</div>}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate">{user.full_name || user.username}</p>
                            <p className="text-xs text-gray-500 truncate">@{user.username}.memu</p>
                          </div>
                          <button onClick={() => handleAddContact(user)} disabled={addingId === user.id} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 disabled:opacity-50 shrink-0 transition-colors">
                            {addingId === user.id ? <Loader2 size={10} className="animate-spin" /> : <Plus size={12} />}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-4 text-sm text-gray-500">No users found.</p>
                  )}
                </div>
              )}

              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Your Network ({contacts.length})</h3>
                {contacts.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
                    <Users size={24} className="text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No contacts saved yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {contacts.map((contact) => (
                      <div key={contact.id} className="group flex items-center gap-3 p-3 bg-white border border-gray-200/60 rounded-xl hover:shadow-md transition-all">
                        {contact.profiles.avatar_url ? <img src={contact.profiles.avatar_url} className="w-10 h-10 rounded-full object-cover" /> : <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">{getInitials(contact.profiles.full_name || contact.profiles.username)}</div>}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{contact.profiles.full_name || contact.profiles.username}</p>
                          <p className="text-xs text-gray-500 truncate">@{contact.profiles.username}.memu</p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button onClick={() => handleMessage(contact.profiles.username)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600"><MessageSquare size={14} /></button>
                          <button onClick={() => handleRemoveContact(contact.id, contact.profiles.full_name || contact.profiles.username)} className="p-1.5 rounded-lg hover:bg-rose-50 text-gray-400 hover:text-rose-600"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Handle Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in-fast" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl w-[480px] max-w-[90%] p-6 shadow-2xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-semibold text-gray-900">Create a Handle</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Handle</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">@</span>
                  <input value={newHandle} onChange={(e) => setNewHandle(e.target.value)} placeholder="yourhandle" className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none" />
                  <span className="text-sm text-gray-400">.memu</span>
                </div>
              </div>
              <input value={newFullName} onChange={(e) => setNewFullName(e.target.value)} placeholder="Full Name" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none" />
              <textarea value={newBio} onChange={(e) => setNewBio(e.target.value)} placeholder="Bio" rows={3} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none resize-none" />
              <input value={newOrganization} onChange={(e) => setNewOrganization(e.target.value)} placeholder="Organization" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none" />
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold">Cancel</button>
              <button onClick={handleAddHandle} disabled={saving || !newHandle.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
                {saving ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up-fade {
          animation: slideUpFade 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes fadeInFast { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in-fast { animation: fadeInFast 0.2s ease-out; }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-scale-in { animation: scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #d4d4d4; border-radius: 10px; }
      `}</style>
    </div>
  );
}