'use client';

import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import { Camera, Loader2, Save, User, Building2, Briefcase, AtSign, LogOut } from 'lucide-react';

interface ProfilePanelProps {
  user: any;
}

export default function ProfilePanel({ user }: ProfilePanelProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [username, setUsername] = useState(user?.user_metadata?.username || '');
  const [bio, setBio] = useState('');
  const [organization, setOrganization] = useState('');
  const [occupation, setOccupation] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(user?.user_metadata?.avatar_url || '');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (user?.id) {
      fetchProfile();
    }
  }, [user?.id]);

  const fetchProfile = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, username, bio, organization, occupation, avatar_url')
      .eq('id', user.id)
      .single();

    if (data) {
      setFullName(data.full_name || '');
      setUsername(data.username || '');
      setBio(data.bio || '');
      setOrganization(data.organization || '');
      setOccupation(data.occupation || '');
      setAvatarUrl(data.avatar_url || '');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const supabase = createClient();
    const fileExt = file.name.split('.').pop();
    const filePath = `avatars/${user.id}_${Date.now()}.${fileExt}`;

    try {
      // 1. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('airshare') 
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: urlData } = supabase.storage.from('airshare').getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;
      setAvatarUrl(publicUrl);

      // 3. Update Auth Metadata (so it shows in the sidebar immediately)
      await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
      
      showToast('Profile picture updated!', 'success');
    } catch (err: any) {
      console.error('Upload error:', err);
      showToast('Failed to upload image', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    const supabase = createClient();

    try {
      // Update profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          username: username,
          bio,
          organization,
          occupation,
          avatar_url: avatarUrl,
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Update Auth metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          username: username,
          avatar_url: avatarUrl,
        },
      });

      if (authError) throw authError;

      showToast('Profile saved successfully!', 'success');
      // Force a reload to update the sidebar globally
      window.location.reload(); 
    } catch (err: any) {
      console.error('Save error:', err);
      showToast(err.message || 'Failed to save profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.reload();
  };

  const initials = fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="h-full overflow-y-auto p-6 md:p-10 max-w-3xl mx-auto">
      <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-3xl shadow-xl p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <User className="text-indigo-500" /> Account Settings
        </h2>

        {/* Avatar Section */}
        <div className="flex flex-col items-center mb-8 pb-8 border-b border-gray-100">
          <div className="relative group">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                {initials}
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-600 shadow-md hover:bg-gray-50 hover:text-indigo-600 transition-all disabled:opacity-50"
            >
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
            </button>
            <input 
              ref={fileInputRef} 
              type="file" 
              accept="image/*" 
              onChange={handleImageUpload} 
              className="hidden" 
            />
          </div>
          <p className="text-sm text-gray-500 mt-3">Click the camera icon to upload a new profile picture</p>
        </div>

        {/* Form Fields */}
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block uppercase tracking-wider">Full Name</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block uppercase tracking-wider">Handle</label>
              <div className="relative">
                <AtSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition" />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block uppercase tracking-wider">Bio</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition resize-none" placeholder="Tell the world about yourself..." />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block uppercase tracking-wider">Organization</label>
              <div className="relative">
                <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={organization} onChange={(e) => setOrganization(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition" placeholder="e.g., Memu Inc." />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block uppercase tracking-wider">Occupation</label>
              <div className="relative">
                <Briefcase size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={occupation} onChange={(e) => setOccupation(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition" placeholder="e.g., Founder" />
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-cyan-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/25 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18} /> Save Changes</>}
            </button>
          </div>
        </div>

        {/* Sign Out Section */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
          >
            <LogOut size={16} /> Sign Out of Memu
          </button>
        </div>
      </div>
    </div>
  );
}

