'use client';

import { useState, useEffect } from 'react';
import { 
  User, Mail, AtSign, Calendar, Edit2, Save, X, 
  Camera, Lock, Bell, Moon, Globe, LogOut, Trash2,
  CheckCircle, AlertCircle, Sun, Monitor, Download
} from 'lucide-react';

interface ProfilePanelProps {
  user: any;
  onClose?: () => void;
  onUpdate?: () => void;
}

export default function ProfilePanel({ user, onClose, onUpdate }: ProfilePanelProps) {
  const [profile, setProfile] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editHandle, setEditHandle] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'profile' | 'settings' | 'danger'>('profile');
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    mention: true,
  });

  // Load profile from localStorage
  useEffect(() => {
    if (user) {
      setProfile(user);
      setEditName(user.name || '');
      setEditBio(user.bio || '');
      setEditHandle(user.handle || '');
      setAvatarPreview(user.avatar || null);
    }
  }, [user]);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = () => {
    setIsLoading(true);
    setErrorMessage('');
    
    try {
      const updatedUser = {
        ...profile,
        name: editName,
        bio: editBio,
        handle: editHandle,
        avatar: avatarPreview,
      };
      
      localStorage.setItem('memu_user', JSON.stringify(updatedUser));
      setProfile(updatedUser);
      setSuccessMessage('Profile updated successfully!');
      setIsEditing(false);
      onUpdate?.();
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setErrorMessage('Failed to update profile');
    }
    
    setIsLoading(false);
  };

  const handleSignOut = () => {
    localStorage.removeItem('memu_user');
    window.location.reload();
  };

  const handleOpenExport = () => {
    window.dispatchEvent(new CustomEvent('openExport'));
    onClose?.();
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-full bg-white rounded-2xl p-8">
        <div className="w-8 h-8 border-2 border-[#4f46e5] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#fafaf8] to-[#f2f1ee] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="border-b border-[#e8e7e3] bg-white/80 backdrop-blur-sm px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User size={20} className="text-[#4f46e5]" />
            <h1 className="text-[18px] font-medium text-[#0f0f0f]">Profile</h1>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#f2f1ee] transition">
            <X size={18} />
          </button>
        </div>
        <p className="body-small mt-1">Manage your account and preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#e8e7e3] bg-white px-6">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 text-[13px] font-medium transition ${
            activeTab === 'profile'
              ? 'text-[#4f46e5] border-b-2 border-[#4f46e5]'
              : 'text-[#777] hover:text-[#0f0f0f]'
          }`}
        >
          Profile
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 text-[13px] font-medium transition ${
            activeTab === 'settings'
              ? 'text-[#4f46e5] border-b-2 border-[#4f46e5]'
              : 'text-[#777] hover:text-[#0f0f0f]'
          }`}
        >
          Settings
        </button>
        <button
          onClick={() => setActiveTab('danger')}
          className={`px-4 py-2 text-[13px] font-medium transition ${
            activeTab === 'danger'
              ? 'text-[#dc2626] border-b-2 border-[#dc2626]'
              : 'text-[#777] hover:text-[#0f0f0f]'
          }`}
        >
          Account
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'profile' && (
          <div className="max-w-2xl mx-auto">
            {/* Avatar Section */}
            <div className="bg-white rounded-2xl border border-[#e8e7e3] p-6 mb-6">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] flex items-center justify-center overflow-hidden">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User size={32} className="text-white" />
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 p-1.5 bg-[#0f0f0f] rounded-full cursor-pointer hover:bg-[#2a2a2a] transition">
                    <Camera size={14} className="text-white" />
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                  </label>
                </div>
                <div>
                  <h3 className="text-[16px] font-medium text-[#0f0f0f]">{profile.name}</h3>
                  <p className="body-small mt-0.5">{profile.handle}</p>
                </div>
              </div>
            </div>

            {/* Profile Form */}
            <div className="bg-white rounded-2xl border border-[#e8e7e3] p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[16px] font-medium text-[#0f0f0f]">Profile Information</h3>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1.5 text-[12px] text-[#4f46e5] hover:underline"
                  >
                    <Edit2 size={12} />
                    Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="text-[12px] text-[#777] hover:text-[#0f0f0f]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 text-[12px] text-[#059669] hover:underline"
                    >
                      <Save size={12} />
                      Save
                    </button>
                  </div>
                )}
              </div>

              {successMessage && (
                <div className="mb-4 p-3 bg-[#d1fae5] text-[#059669] rounded-lg text-[12px] flex items-center gap-2">
                  <CheckCircle size={14} />
                  {successMessage}
                </div>
              )}

              {errorMessage && (
                <div className="mb-4 p-3 bg-[#fee2e2] text-[#dc2626] rounded-lg text-[12px] flex items-center gap-2">
                  <AlertCircle size={14} />
                  {errorMessage}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-[12px] font-medium text-[#777] mb-1">Full Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-4 py-2 border border-[#e8e7e3] rounded-xl focus:outline-none focus:border-[#4f46e5]"
                    />
                  ) : (
                    <p className="text-[14px] text-[#0f0f0f]">{profile.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[#777] mb-1">Handle</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editHandle}
                      onChange={(e) => setEditHandle(e.target.value)}
                      className="w-full px-4 py-2 border border-[#e8e7e3] rounded-xl focus:outline-none focus:border-[#4f46e5]"
                    />
                  ) : (
                    <p className="text-[14px] text-[#4f46e5]">{profile.handle}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[#777] mb-1">Email</label>
                  <p className="text-[14px] text-[#0f0f0f]">{profile.email}</p>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[#777] mb-1">Bio</label>
                  {isEditing ? (
                    <textarea
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 border border-[#e8e7e3] rounded-xl focus:outline-none focus:border-[#4f46e5] resize-none"
                      placeholder="Tell us about yourself..."
                    />
                  ) : (
                    <p className="text-[13px] text-[#777]">{profile.bio || 'No bio yet'}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl border border-[#e8e7e3] p-6 space-y-6">
              <div>
                <h3 className="text-[16px] font-medium text-[#0f0f0f] mb-4">Notifications</h3>
                <div className="space-y-3">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Mail size={16} className="text-[#777]" />
                      <span className="text-[13px] text-[#0f0f0f]">Email notifications</span>
                    </div>
                    <button
                      onClick={() => setNotifications({ ...notifications, email: !notifications.email })}
                      className={`w-10 h-5 rounded-full transition ${
                        notifications.email ? 'bg-[#4f46e5]' : 'bg-[#e8e7e3]'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${notifications.email ? 'translate-x-5' : 'translate-x-0.5'} mt-0.5`} />
                    </button>
                  </label>
                  
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Bell size={16} className="text-[#777]" />
                      <span className="text-[13px] text-[#0f0f0f]">Push notifications</span>
                    </div>
                    <button
                      onClick={() => setNotifications({ ...notifications, push: !notifications.push })}
                      className={`w-10 h-5 rounded-full transition ${
                        notifications.push ? 'bg-[#4f46e5]' : 'bg-[#e8e7e3]'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${notifications.push ? 'translate-x-5' : 'translate-x-0.5'} mt-0.5`} />
                    </button>
                  </label>
                  
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-3">
                      <AtSign size={16} className="text-[#777]" />
                      <span className="text-[13px] text-[#0f0f0f]">Mention notifications</span>
                    </div>
                    <button
                      onClick={() => setNotifications({ ...notifications, mention: !notifications.mention })}
                      className={`w-10 h-5 rounded-full transition ${
                        notifications.mention ? 'bg-[#4f46e5]' : 'bg-[#e8e7e3]'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${notifications.mention ? 'translate-x-5' : 'translate-x-0.5'} mt-0.5`} />
                    </button>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-[#e8e7e3]">
                <h3 className="text-[16px] font-medium text-[#0f0f0f] mb-4">Appearance</h3>
                <div className="flex gap-3">
                  <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border border-[#e8e7e3] hover:border-[#4f46e5] transition">
                    <Sun size={16} />
                    Light
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border border-[#e8e7e3] hover:border-[#4f46e5] transition">
                    <Moon size={16} />
                    Dark
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border border-[#e8e7e3] hover:border-[#4f46e5] transition">
                    <Monitor size={16} />
                    System
                  </button>
                </div>
              </div>

              {/* Export Data Button */}
              <div className="pt-4 border-t border-[#e8e7e3]">
                <button
                  onClick={handleOpenExport}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-[#e8e7e3] hover:bg-[#f2f1ee] transition"
                >
                  <div className="flex items-center gap-3">
                    <Download size={16} className="text-[#777]" />
                    <span className="text-[13px] text-[#0f0f0f]">Export Data</span>
                  </div>
                  <span className="text-[11px] text-[#aaa]">→</span>
                </button>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    setSuccessMessage('Settings saved!');
                    setTimeout(() => setSuccessMessage(''), 3000);
                  }}
                  disabled={isLoading}
                  className="w-full py-2.5 bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] text-white rounded-xl text-[13px] font-medium hover:from-[#5b21b6] hover:to-[#6d28d9] transition"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'danger' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl border border-[#e8e7e3] p-6">
              <h3 className="text-[16px] font-medium text-[#0f0f0f] mb-4">Account Management</h3>
              
              <div className="space-y-4">
                <button className="w-full flex items-center justify-between p-3 rounded-xl border border-[#e8e7e3] hover:bg-[#f2f1ee] transition">
                  <div className="flex items-center gap-3">
                    <Lock size={16} className="text-[#777]" />
                    <span className="text-[13px] text-[#0f0f0f]">Change Password</span>
                  </div>
                  <span className="text-[11px] text-[#aaa]">→</span>
                </button>
                
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-[#e8e7e3] hover:bg-[#f2f1ee] transition"
                >
                  <div className="flex items-center gap-3">
                    <LogOut size={16} className="text-[#777]" />
                    <span className="text-[13px] text-[#0f0f0f]">Sign Out</span>
                  </div>
                  <span className="text-[11px] text-[#aaa]">→</span>
                </button>
                
                <button className="w-full flex items-center justify-between p-3 rounded-xl border border-[#fee2e2] bg-[#fef2f2] hover:bg-[#fee2e2] transition">
                  <div className="flex items-center gap-3">
                    <Trash2 size={16} className="text-[#dc2626]" />
                    <span className="text-[13px] text-[#dc2626]">Delete Account</span>
                  </div>
                  <span className="text-[11px] text-[#dc2626]">→</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}