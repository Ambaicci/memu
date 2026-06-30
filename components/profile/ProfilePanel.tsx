'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import {
  User,
  Mail,
  Building,
  AtSign,
  Camera,
  Loader2,
  Save,
  LogOut,
  Shield,
  Bell,
  Lock,
  Globe,
  MapPin,
  Sparkles,
  Edit3,
  ArrowRight,
  Verified,
  ChevronRight,
  AlertTriangle,
  Trash2,
  X,
  Eye,
  EyeOff,
  Palette
} from 'lucide-react';

interface ProfilePanelProps {
  user: any;
}

interface ProfileData {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string;
  bio: string | null;
  organization: string | null;
  website: string | null;
  location: string | null;
  created_at?: string;
}

export default function ProfilePanel({ user }: ProfilePanelProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<ProfileData>>({});
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [imageError, setImageError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [deleting, setDeleting] = useState(false);
  
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [showAppearanceModal, setShowAppearanceModal] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      showToast('Failed to load profile', 'error');
    } else {
      setProfile(data);
      setEditData(data || {});
    }
    setLoading(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be less than 5MB', 'error');
      return;
    }

    setUploadingAvatar(true);
    const supabase = createClient();

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      const { error: authError } = await supabase.auth.updateUser({
        data: { avatar_url: urlData.publicUrl },
      });

      if (authError) {
        console.warn('Auth metadata update failed:', authError);
      }

      showToast('Avatar updated successfully!', 'success');

      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err) {
      console.error('Avatar upload error:', err);
      showToast('Failed to upload avatar', 'error');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .from('profiles')
      .update({
        full_name: editData.full_name || null,
        bio: editData.bio || null,
        organization: editData.organization || null,
        website: editData.website || null,
        location: editData.location || null,
      })
      .eq('id', user.id)
      .select();

    if (error) {
      console.error('Profile update failed:', error);
      showToast(`Failed to update: ${error.message}`, 'error');
    } else {
      setProfile((prev) => prev ? { ...prev, ...editData } : null);
      setIsEditing(false);
      showToast('Profile updated successfully!', 'success');
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    if (newPassword.length < 8) {
      showToast('Password must be at least 8 characters', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    setChangingPassword(true);
    const supabase = createClient();

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) throw error;

      showToast('Password changed successfully!', 'success');
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Password change error:', err);
      showToast(err.message || 'Failed to change password', 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmationText !== 'DELETE') {
      showToast('Please type "DELETE" to confirm', 'error');
      return;
    }

    setDeleting(true);
    const supabase = createClient();

    try {
      await supabase.from('handles').delete().eq('user_id', user.id);
      await supabase.from('profiles').delete().eq('id', user.id);
      await supabase.from('memus').delete().or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`);

      const { error } = await supabase.auth.admin.deleteUser(user.id);

      if (error) {
        console.error('Error deleting user:', error);
        showToast('Failed to delete account. Please contact support.', 'error');
        setDeleting(false);
        return;
      }

      showToast('Account deleted successfully', 'success');
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (err) {
      console.error('Delete account error:', err);
      showToast('Failed to delete account. Please try again.', 'error');
      setDeleting(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-memu-canvas">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-xl animate-pulse" />
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 relative z-10" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-memu-canvas">
        <div className="text-center">
          <p className="text-gray-500">No profile data found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-memu-canvas overflow-y-auto pb-24 custom-scroll">
      {/* Header */}
      <div className="px-6 md:px-10 pt-6 pb-2 w-full">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-sm">
              <User size={20} strokeWidth={2} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Profile</h1>
              <p className="text-sm text-gray-500 font-medium">Manage your personal information</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition shadow-sm hover:shadow-md"
              >
                <Edit3 size={16} strokeWidth={2} />
                Edit Profile
              </button>
            ) : (
              <>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition shadow-sm disabled:opacity-50"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} strokeWidth={2} />}
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditData(profile);
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Profile Content */}
      <div className="flex-1 px-6 md:px-10 pb-10 w-full max-w-3xl">
        {/* Main Profile Card */}
        <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-6 md:p-8 mb-6">
          {/* Avatar Section - OPTIMIZED */}
          <div className="flex items-center gap-6 mb-6">
            <div className="relative group">
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 p-0.5 shadow-md overflow-hidden">
                {profile.avatar_url && !imageError ? (
                  <Image
                    src={profile.avatar_url}
                    alt={profile.full_name || profile.username}
                    fill
                    sizes="80px"
                    quality={85}
                    priority
                    className="object-cover rounded-full border-2 border-white"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold">
                    {getInitials(profile.full_name || profile.username)}
                  </div>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute bottom-0 right-0 p-1.5 bg-blue-600 rounded-full text-white shadow-md hover:bg-blue-700 transition-all hover:scale-105 disabled:opacity-50 border-2 border-white"
                title="Change avatar"
              >
                {uploadingAvatar ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Camera size={12} strokeWidth={2.5} />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-gray-900 truncate">
                {profile.full_name || profile.username}
              </h2>
              <div className="flex items-center gap-2">
                <AtSign size={14} className="text-blue-600" />
                <span className="text-sm font-medium text-blue-700">{profile.username}</span>
                {profile.created_at && (
                  <span className="text-xs text-gray-400 ml-2">
                    · Joined {formatDate(profile.created_at)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Profile Info */}
          <div className="space-y-3">
            {/* Email */}
            <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200/60">
              <Mail size={16} className="text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-700 flex-1">{profile.email}</span>
              <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 px-2 py-0.5 bg-emerald-50 rounded-full border border-emerald-200/60">
                <Verified size={10} />
                Verified
              </span>
            </div>

            {isEditing ? (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={editData.full_name || ''}
                    onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                    placeholder="Your full name"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Bio</label>
                  <textarea
                    value={editData.bio || ''}
                    onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                    placeholder="Tell people about yourself..."
                    rows={3}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Organization</label>
                    <input
                      type="text"
                      value={editData.organization || ''}
                      onChange={(e) => setEditData({ ...editData, organization: e.target.value })}
                      placeholder="Your company"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Location</label>
                    <input
                      type="text"
                      value={editData.location || ''}
                      onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                      placeholder="City, Country"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Website</label>
                  <input
                    type="url"
                    value={editData.website || ''}
                    onChange={(e) => setEditData({ ...editData, website: e.target.value })}
                    placeholder="https://yourwebsite.com"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {profile.full_name && (
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200/60">
                    <User size={16} className="text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{profile.full_name}</span>
                  </div>
                )}

                {profile.bio && (
                  <div className="px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200/60">
                    <p className="text-sm text-gray-600">{profile.bio}</p>
                  </div>
                )}

                {profile.organization && (
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200/60">
                    <Building size={16} className="text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{profile.organization}</span>
                  </div>
                )}

                {profile.website && (
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200/60">
                    <Globe size={16} className="text-gray-400 flex-shrink-0" />
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                    >
                      {profile.website.replace(/^https?:\/\//, '')}
                      <ArrowRight size={12} />
                    </a>
                  </div>
                )}

                {profile.location && (
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200/60">
                    <MapPin size={16} className="text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{profile.location}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Account Settings */}
        <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-6 md:p-8 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-sm">
              <Shield size={18} strokeWidth={2} className="text-white" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 tracking-tight">Account Settings</h3>
              <p className="text-xs text-gray-500">Manage your account preferences</p>
            </div>
          </div>

          <div className="space-y-2">
            <button className="group w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-blue-50 rounded-xl border border-gray-200/60 hover:border-blue-300/60 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center flex-shrink-0">
                  <Shield size={16} className="text-purple-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900">Privacy</p>
                  <p className="text-xs text-gray-500">Manage your privacy settings</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
            </button>

            <button className="group w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-blue-50 rounded-xl border border-gray-200/60 hover:border-blue-300/60 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center flex-shrink-0">
                  <Bell size={16} className="text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900">Notifications</p>
                  <p className="text-xs text-gray-500">Configure notification preferences</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
            </button>

            <button 
              onClick={() => setShowPasswordModal(true)}
              className="group w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-blue-50 rounded-xl border border-gray-200/60 hover:border-blue-300/60 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center flex-shrink-0">
                  <Lock size={16} className="text-emerald-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900">Security</p>
                  <p className="text-xs text-gray-500">Password and authentication</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
            </button>

            <div className="pt-3 border-t border-gray-200/60">
              {!showSignOutConfirm ? (
                <button
                  onClick={() => setShowSignOutConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl border border-rose-200/60 transition-all text-sm font-medium"
                >
                  <LogOut size={16} strokeWidth={2} />
                  Sign Out
                </button>
              ) : (
                <div className="flex items-center gap-3 p-3 bg-rose-50 rounded-xl border border-rose-200/60">
                  <p className="text-sm text-rose-700 flex-1">Are you sure you want to sign out?</p>
                  <button
                    onClick={handleSignOut}
                    className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-medium hover:bg-rose-700 transition"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setShowSignOutConfirm(false)}
                    className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-300 transition"
                  >
                    No
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-2xl border-2 border-rose-200/60 shadow-sm p-6 md:p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-100 to-red-100 flex items-center justify-center shadow-sm">
              <AlertTriangle size={18} className="text-rose-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-rose-700 tracking-tight">Danger Zone</h3>
              <p className="text-xs text-gray-500">Irreversible actions — proceed with caution</p>
            </div>
          </div>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl border border-rose-200/60 transition-all text-sm font-medium"
            >
              <Trash2 size={16} strokeWidth={2} />
              Delete Account
            </button>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-rose-50 rounded-xl border border-rose-200/60">
                <p className="text-sm text-rose-800 font-medium mb-2">
                  ⚠️ This action is permanent and cannot be undone.
                </p>
                <ul className="text-xs text-rose-700 space-y-1 list-disc pl-4">
                  <li>All your memus will be permanently deleted</li>
                  <li>All your handles will be released</li>
                  <li>Your profile and all associated data will be removed</li>
                  <li>You will lose access to all spaces you're a member of</li>
                </ul>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Type <span className="font-bold text-rose-600">DELETE</span> to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmationText}
                  onChange={(e) => setDeleteConfirmationText(e.target.value)}
                  placeholder="Type DELETE here"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition"
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting || deleteConfirmationText !== 'DELETE'}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} strokeWidth={2} />}
                  {deleting ? 'Deleting...' : 'Permanently Delete Account'}
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmationText('');
                  }}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
          onClick={() => setShowPasswordModal(false)}
          style={{ minWidth: '100vw', minHeight: '100vh' }}
        >
          <div 
            className="bg-white rounded-2xl p-6 shadow-2xl border border-gray-200 animate-fade-in-scale"
            onClick={(e) => e.stopPropagation()}
            style={{ minWidth: '400px', width: '100%', maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm flex-shrink-0">
                  <Lock size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Change Password</h3>
                  <p className="text-xs text-gray-500">Update your account password</p>
                </div>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition flex-shrink-0"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full px-4 py-3 pr-10 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                  >
                    {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full px-4 py-3 pr-10 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full px-4 py-3 pr-10 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleChangePassword}
                  disabled={changingPassword}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-medium hover:from-emerald-700 hover:to-teal-700 transition disabled:opacity-50 shadow-sm whitespace-nowrap"
                >
                  {changingPassword ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} strokeWidth={2} />}
                  {changingPassword ? 'Changing...' : 'Change Password'}
                </button>
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition whitespace-nowrap"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #d4d4d4; border-radius: 10px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in-scale { animation: fadeInScale 0.2s ease-out; }
      `}</style>
    </div>
  );
}