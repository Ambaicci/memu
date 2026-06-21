'use client';

import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import { triggerHaptic } from '@/lib/haptics';
import { 
  Camera, Loader2, Save, User, Building2, Briefcase, AtSign, LogOut, 
  Bell, Shield, Eye, Palette, AlertTriangle, Trash2, Lock, Mail, 
  Globe, Users, CheckCircle, X, ChevronRight
} from 'lucide-react';

interface ProfilePanelProps {
  user: any;
}

type TabType = 'profile' | 'account' | 'notifications' | 'privacy' | 'appearance' | 'danger';

export default function ProfilePanel({ user }: ProfilePanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Profile State
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [username, setUsername] = useState(user?.user_metadata?.username || '');
  const [bio, setBio] = useState('');
  const [organization, setOrganization] = useState('');
  const [occupation, setOccupation] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(user?.user_metadata?.avatar_url || '');
  
  // Account State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  
  // Notification State
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [memuNotifications, setMemuNotifications] = useState(true);
  const [broadcastNotifications, setBroadcastNotifications] = useState(true);
  
  // Privacy State
  const [whoCanSend, setWhoCanSend] = useState<'everyone' | 'connections' | 'nobody'>('everyone');
  const [showReadReceipts, setShowReadReceipts] = useState(true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [profileVisibility, setProfileVisibility] = useState<'public' | 'private'>('public');
  
  // Appearance State
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');
  
  // Danger Zone State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  
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
      const { error: uploadError } = await supabase.storage
        .from('airshare') 
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('airshare').getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;
      setAvatarUrl(publicUrl);

      await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
      
      triggerHaptic('success');
      showToast('Profile picture updated!', 'success');
    } catch (err: any) {
      console.error('Upload error:', err);
      triggerHaptic('error');
      showToast('Failed to upload image', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    triggerHaptic('medium');
    setLoading(true);
    const supabase = createClient();

    try {
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

      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          username: username,
          avatar_url: avatarUrl,
        },
      });

      if (authError) throw authError;

      triggerHaptic('success');
      showToast('Profile saved successfully!', 'success');
      window.location.reload(); 
    } catch (err: any) {
      console.error('Save error:', err);
      triggerHaptic('error');
      showToast(err.message || 'Failed to save profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      triggerHaptic('error');
      showToast('Passwords do not match', 'error');
      return;
    }
    if (newPassword.length < 8) {
      triggerHaptic('error');
      showToast('Password must be at least 8 characters', 'error');
      return;
    }

    triggerHaptic('medium');
    setLoading(true);
    const supabase = createClient();

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      triggerHaptic('success');
      showToast('Password updated successfully!', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Password change error:', err);
      triggerHaptic('error');
      showToast(err.message || 'Failed to change password', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    triggerHaptic('success');
    showToast('Notification preferences saved!', 'success');
    // TODO: Save to database
  };

  const handleSavePrivacy = async () => {
    triggerHaptic('success');
    showToast('Privacy settings saved!', 'success');
    // TODO: Save to database
  };

  const handleSaveAppearance = async () => {
    triggerHaptic('success');
    showToast('Appearance settings saved!', 'success');
    // TODO: Save to database and apply theme
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      triggerHaptic('error');
      showToast('Please type DELETE to confirm', 'error');
      return;
    }

    triggerHaptic('error');
    setLoading(true);
    const supabase = createClient();

    try {
      // TODO: Implement actual account deletion
      // This is a placeholder - you'll need to implement proper deletion logic
      showToast('Account deletion is not yet implemented', 'error');
      setShowDeleteConfirm(false);
      setDeleteConfirmText('');
    } catch (err: any) {
      console.error('Delete error:', err);
      triggerHaptic('error');
      showToast(err.message || 'Failed to delete account', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    triggerHaptic('medium');
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.reload();
  };

  const initials = fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  const tabs = [
    { id: 'profile' as TabType, label: 'Profile', icon: User },
    { id: 'account' as TabType, label: 'Account', icon: Shield },
    { id: 'notifications' as TabType, label: 'Notifications', icon: Bell },
    { id: 'privacy' as TabType, label: 'Privacy', icon: Eye },
    { id: 'appearance' as TabType, label: 'Appearance', icon: Palette },
    { id: 'danger' as TabType, label: 'Danger Zone', icon: AlertTriangle },
  ];

  return (
    <div className="h-full overflow-y-auto bg-memu-canvas">
      <div className="max-w-4xl mx-auto p-6 md:p-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-sm text-gray-500">Manage your account settings and preferences</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 custom-scroll">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  triggerHaptic('light');
                  setActiveTab(tab.id);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all btn-press ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                <Icon size={16} strokeWidth={2.5} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-3xl shadow-xl p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <User className="text-indigo-500" /> Profile Information
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
                    onClick={() => {
                      triggerHaptic('light');
                      fileInputRef.current?.click();
                    }}
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
                      <input 
                        type="text" 
                        value={fullName} 
                        onChange={(e) => setFullName(e.target.value)} 
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block uppercase tracking-wider">Handle</label>
                    <div className="relative">
                      <AtSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        type="text" 
                        value={username} 
                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} 
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition" 
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1.5 block uppercase tracking-wider">Bio</label>
                  <textarea 
                    value={bio} 
                    onChange={(e) => setBio(e.target.value)} 
                    rows={3} 
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition resize-none" 
                    placeholder="Tell the world about yourself..." 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block uppercase tracking-wider">Organization</label>
                    <div className="relative">
                      <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        type="text" 
                        value={organization} 
                        onChange={(e) => setOrganization(e.target.value)} 
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition" 
                        placeholder="e.g., Memu Inc." 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block uppercase tracking-wider">Occupation</label>
                    <div className="relative">
                      <Briefcase size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        type="text" 
                        value={occupation} 
                        onChange={(e) => setOccupation(e.target.value)} 
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition" 
                        placeholder="e.g., Founder" 
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    onClick={handleSaveProfile}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-cyan-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/25 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed btn-press"
                  >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18} /> Save Changes</>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ACCOUNT TAB */}
          {activeTab === 'account' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Shield className="text-indigo-500" /> Account Security
              </h2>

              <div className="space-y-8">
                {/* Email Section */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Mail size={20} className="text-gray-600" /> Email Address
                  </h3>
                  <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{email}</p>
                      <p className="text-xs text-gray-500 mt-1">Your primary email address</p>
                    </div>
                    <button className="px-4 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all btn-press">
                      Change
                    </button>
                  </div>
                </div>

                {/* Password Section */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Lock size={20} className="text-gray-600" /> Change Password
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1.5 block uppercase tracking-wider">Current Password</label>
                      <input 
                        type="password" 
                        value={currentPassword} 
                        onChange={(e) => setCurrentPassword(e.target.value)} 
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition" 
                        placeholder="Enter current password"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1.5 block uppercase tracking-wider">New Password</label>
                      <input 
                        type="password" 
                        value={newPassword} 
                        onChange={(e) => setNewPassword(e.target.value)} 
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition" 
                        placeholder="Enter new password (min 8 characters)"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1.5 block uppercase tracking-wider">Confirm New Password</label>
                      <input 
                        type="password" 
                        value={confirmPassword} 
                        onChange={(e) => setConfirmPassword(e.target.value)} 
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition" 
                        placeholder="Confirm new password"
                      />
                    </div>
                    <div className="pt-2">
                      <button
                        onClick={handleChangePassword}
                        disabled={loading || !currentPassword || !newPassword || !confirmPassword}
                        className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-cyan-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/25 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed btn-press"
                      >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : 'Update Password'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sign Out */}
                <div className="pt-6 border-t border-gray-100">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors btn-press"
                  >
                    <LogOut size={16} /> Sign Out of Memu
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* NOTIFICATIONS TAB */}
          {activeTab === 'notifications' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Bell className="text-indigo-500" /> Notification Preferences
              </h2>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Communication Channels</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <Mail size={20} className="text-gray-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Email Notifications</p>
                          <p className="text-xs text-gray-500">Receive notifications via email</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          triggerHaptic('light');
                          setEmailNotifications(!emailNotifications);
                        }}
                        className={`relative w-12 h-6 rounded-full transition-colors ${emailNotifications ? 'bg-indigo-600' : 'bg-gray-300'}`}
                      >
                        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${emailNotifications ? 'translate-x-6' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <Bell size={20} className="text-gray-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Push Notifications</p>
                          <p className="text-xs text-gray-500">Receive push notifications on your device</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          triggerHaptic('light');
                          setPushNotifications(!pushNotifications);
                        }}
                        className={`relative w-12 h-6 rounded-full transition-colors ${pushNotifications ? 'bg-indigo-600' : 'bg-gray-300'}`}
                      >
                        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${pushNotifications ? 'translate-x-6' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Types</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="text-sm font-medium text-gray-900">New Memus</p>
                        <p className="text-xs text-gray-500">When someone sends you a memu</p>
                      </div>
                      <button
                        onClick={() => {
                          triggerHaptic('light');
                          setMemuNotifications(!memuNotifications);
                        }}
                        className={`relative w-12 h-6 rounded-full transition-colors ${memuNotifications ? 'bg-indigo-600' : 'bg-gray-300'}`}
                      >
                        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${memuNotifications ? 'translate-x-6' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Broadcasts</p>
                        <p className="text-xs text-gray-500">When you receive a broadcast message</p>
                      </div>
                      <button
                        onClick={() => {
                          triggerHaptic('light');
                          setBroadcastNotifications(!broadcastNotifications);
                        }}
                        className={`relative w-12 h-6 rounded-full transition-colors ${broadcastNotifications ? 'bg-indigo-600' : 'bg-gray-300'}`}
                      >
                        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${broadcastNotifications ? 'translate-x-6' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    onClick={handleSaveNotifications}
                    className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-cyan-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/25 hover:-translate-y-0.5 transition-all btn-press"
                  >
                    Save Preferences
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PRIVACY TAB */}
          {activeTab === 'privacy' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Eye className="text-indigo-500" /> Privacy Settings
              </h2>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Who Can Contact You</h3>
                  <div className="space-y-2">
                    {[
                      { value: 'everyone', label: 'Everyone', desc: 'Anyone can send you memus' },
                      { value: 'connections', label: 'Connections Only', desc: 'Only people you\'ve connected with' },
                      { value: 'nobody', label: 'Nobody', desc: 'Block all incoming memus' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          triggerHaptic('light');
                          setWhoCanSend(option.value as any);
                        }}
                        className={`w-full flex items-center justify-between p-4 rounded-xl transition-all btn-press ${
                          whoCanSend === option.value
                            ? 'bg-indigo-50 border-2 border-indigo-500'
                            : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                        }`}
                      >
                        <div className="text-left">
                          <p className="text-sm font-medium text-gray-900">{option.label}</p>
                          <p className="text-xs text-gray-500">{option.desc}</p>
                        </div>
                        {whoCanSend === option.value && <CheckCircle size={20} className="text-indigo-600" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Visibility</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Read Receipts</p>
                        <p className="text-xs text-gray-500">Show when you've read a memu</p>
                      </div>
                      <button
                        onClick={() => {
                          triggerHaptic('light');
                          setShowReadReceipts(!showReadReceipts);
                        }}
                        className={`relative w-12 h-6 rounded-full transition-colors ${showReadReceipts ? 'bg-indigo-600' : 'bg-gray-300'}`}
                      >
                        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${showReadReceipts ? 'translate-x-6' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Online Status</p>
                        <p className="text-xs text-gray-500">Show when you're online</p>
                      </div>
                      <button
                        onClick={() => {
                          triggerHaptic('light');
                          setShowOnlineStatus(!showOnlineStatus);
                        }}
                        className={`relative w-12 h-6 rounded-full transition-colors ${showOnlineStatus ? 'bg-indigo-600' : 'bg-gray-300'}`}
                      >
                        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${showOnlineStatus ? 'translate-x-6' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Profile Visibility</p>
                        <p className="text-xs text-gray-500">Who can see your profile</p>
                      </div>
                      <select
                        value={profileVisibility}
                        onChange={(e) => {
                          triggerHaptic('light');
                          setProfileVisibility(e.target.value as any);
                        }}
                        className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="public">Public</option>
                        <option value="private">Private</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    onClick={handleSavePrivacy}
                    className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-cyan-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/25 hover:-translate-y-0.5 transition-all btn-press"
                  >
                    Save Settings
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* APPEARANCE TAB */}
          {activeTab === 'appearance' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Palette className="text-indigo-500" /> Appearance
              </h2>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Theme</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'light', label: 'Light', icon: '☀️' },
                      { value: 'dark', label: 'Dark', icon: '🌙' },
                      { value: 'system', label: 'System', icon: '💻' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          triggerHaptic('light');
                          setTheme(option.value as any);
                        }}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all btn-press ${
                          theme === option.value
                            ? 'bg-indigo-50 border-2 border-indigo-500'
                            : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                        }`}
                      >
                        <span className="text-2xl">{option.icon}</span>
                        <span className="text-sm font-medium text-gray-900">{option.label}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-3 text-center">
                    {theme === 'dark' ? 'Dark mode coming soon!' : theme === 'system' ? 'Will match your device settings' : 'Currently using light theme'}
                  </p>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    onClick={handleSaveAppearance}
                    className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-cyan-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/25 hover:-translate-y-0.5 transition-all btn-press"
                  >
                    Save Appearance
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* DANGER ZONE TAB */}
          {activeTab === 'danger' && (
            <div>
              <h2 className="text-2xl font-bold text-rose-600 mb-6 flex items-center gap-2">
                <AlertTriangle className="text-rose-600" /> Danger Zone
              </h2>

              <div className="space-y-6">
                <div className="bg-rose-50 border-2 border-rose-200 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-rose-900 mb-2">Delete Account</h3>
                  <p className="text-sm text-rose-700 mb-4">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                  
                  {!showDeleteConfirm ? (
                    <button
                      onClick={() => {
                        triggerHaptic('error');
                        setShowDeleteConfirm(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg font-semibold hover:bg-rose-700 transition-all btn-press"
                    >
                      <Trash2 size={16} /> Delete My Account
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm font-medium text-rose-900">
                        Type <strong>DELETE</strong> to confirm:
                      </p>
                      <input
                        type="text"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border-2 border-rose-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 outline-none transition"
                        placeholder="Type DELETE"
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            setShowDeleteConfirm(false);
                            setDeleteConfirmText('');
                          }}
                          className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-all btn-press"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleDeleteAccount}
                          disabled={deleteConfirmText !== 'DELETE' || loading}
                          className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg font-semibold hover:bg-rose-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed btn-press"
                        >
                          {loading ? <Loader2 size={16} className="animate-spin" /> : <><Trash2 size={16} /> Permanently Delete</>}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .custom-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
}