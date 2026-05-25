'use client';

import { useState } from 'react';
import { Eye, EyeOff, Upload, User, AtSign, Lock, CheckCircle, Sparkles, X, Mail } from 'lucide-react';

interface AuthProps {
  onAuthSuccess: () => void;
  onClose?: () => void;
}

export default function Auth({ onAuthSuccess, onClose }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState<'credentials' | 'handles'>('credentials');
  
  // Form fields
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [suggestedHandles, setSuggestedHandles] = useState<string[]>([]);
  const [selectedHandle, setSelectedHandle] = useState('');
  const [customHandle, setCustomHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Generate handles ending with .memu
  const updateSuggestedHandles = (name: string) => {
    if (name && name.length >= 2) {
      const base = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (base) {
        const random1 = Math.floor(Math.random() * 900) + 100;
        const random2 = Math.floor(Math.random() * 90) + 10;
        const handles = [
          `@${base}.memu`,
          `@${base}_${random1}.memu`,
          `@${base}${random2}.memu`,
        ];
        setSuggestedHandles(handles);
        setSelectedHandle(handles[0]);
      }
    } else {
      setSuggestedHandles([]);
    }
  };

  const handleNameChange = (name: string) => {
    setFullName(name);
    updateSuggestedHandles(name);
  };

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

  const handleSignUp = () => {
    console.log('Starting signup...');
    
    if (!email) {
      setError('Please enter your email');
      return;
    }
    if (!fullName) {
      setError('Please enter your full name');
      return;
    }
    if (!selectedHandle && !customHandle) {
      setError('Please choose a handle');
      return;
    }
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    let finalHandle = customHandle || selectedHandle;
    if (!finalHandle.endsWith('.memu')) {
      finalHandle = finalHandle + '.memu';
    }
    if (!finalHandle.startsWith('@')) {
      finalHandle = '@' + finalHandle;
    }
    
    // Store in localStorage
    const userData = {
      id: Date.now().toString(),
      email: email,
      name: fullName,
      handle: finalHandle,
      avatar: avatarPreview,
      password: password,
      isLoggedIn: true,
    };
    
    localStorage.setItem('memu_user', JSON.stringify(userData));
    
    setSuccessMessage('Account created successfully! Redirecting...');
    
    setTimeout(() => {
      onAuthSuccess();
      setLoading(false);
    }, 1500);
  };

  const handleSignIn = () => {
    if (!email) {
      setError('Please enter your email');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    const savedUser = localStorage.getItem('memu_user');
    
    if (savedUser) {
      const user = JSON.parse(savedUser);
      if (user.email === email && user.password === password) {
        user.isLoggedIn = true;
        localStorage.setItem('memu_user', JSON.stringify(user));
        onAuthSuccess();
      } else {
        setError('Invalid email or password');
      }
    } else {
      setError('No account found. Please sign up first.');
    }
    
    setLoading(false);
  };

  // Sign In Screen
  if (isLogin) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/20 transition">
            <X size={18} className="text-white" />
          </button>
          
          <div className="bg-gradient-to-r from-[#4f46e5] to-[#0891b2] px-6 py-6 text-center">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <div className="w-6 h-6 border-2 border-white rounded-full" />
            </div>
            <h2 className="text-xl font-semibold text-white">Welcome back</h2>
            <p className="text-white/80 text-xs mt-1">Sign in to your memu account</p>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-[#777] mb-1">Email Address</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#aaa]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 border border-[#e8e7e3] rounded-xl focus:outline-none focus:border-[#4f46e5] transition text-[14px]"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#777] mb-1">Password</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#aaa]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 border border-[#e8e7e3] rounded-xl focus:outline-none focus:border-[#4f46e5] transition text-[14px]"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#aaa] hover:text-[#777]"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 text-[11px] p-2.5 rounded-xl">
                  {error}
                </div>
              )}

              {successMessage && (
                <div className="bg-green-50 text-green-600 text-[11px] p-2.5 rounded-xl">
                  {successMessage}
                </div>
              )}

              <button
                onClick={handleSignIn}
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#4f46e5] to-[#0891b2] text-white rounded-xl py-2.5 font-medium hover:shadow-lg transition disabled:opacity-50 text-[14px]"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </div>

            <div className="text-center mt-5">
              <button
                onClick={() => {
                  setIsLogin(false);
                  setStep('credentials');
                  setError(null);
                  setSuccessMessage(null);
                  setEmail('');
                  setPassword('');
                  setConfirmPassword('');
                  setFullName('');
                }}
                className="text-[12px] text-[#4f46e5] hover:underline"
              >
                Don't have an account? Sign Up
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Sign Up - Credentials Screen
  if (step === 'credentials') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/20 transition z-10">
            <X size={18} className="text-white" />
          </button>
          
          <div className="bg-gradient-to-r from-[#4f46e5] to-[#0891b2] px-6 py-6 text-center">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <div className="w-6 h-6 border-2 border-white rounded-full" />
            </div>
            <h2 className="text-xl font-semibold text-white">Create your account</h2>
            <p className="text-white/80 text-xs mt-1">Join the future of communication</p>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              {/* Avatar */}
              <div className="flex justify-center mb-2">
                <label className="cursor-pointer group">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#f2f1ee] to-[#e8e7e3] flex items-center justify-center overflow-hidden border-2 border-[#e8e7e3] group-hover:border-[#4f46e5] transition">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <User size={28} className="text-[#aaa]" />
                      )}
                    </div>
                    <div className="absolute bottom-0 right-0 bg-[#4f46e5] rounded-full p-1 shadow-md">
                      <Upload size={10} className="text-white" />
                    </div>
                  </div>
                  <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                </label>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-[12px] font-medium text-[#777] mb-1">Full Name</label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#aaa]" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 border border-[#e8e7e3] rounded-xl focus:outline-none focus:border-[#4f46e5] transition text-[14px]"
                    placeholder="John Mark"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-[12px] font-medium text-[#777] mb-1">Email Address</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#aaa]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 border border-[#e8e7e3] rounded-xl focus:outline-none focus:border-[#4f46e5] transition text-[14px]"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-[12px] font-medium text-[#777] mb-1">Password</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#aaa]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 border border-[#e8e7e3] rounded-xl focus:outline-none focus:border-[#4f46e5] transition text-[14px]"
                    placeholder="Create a strong password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#aaa] hover:text-[#777]"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <p className="text-[9px] text-[#aaa] mt-1">Use at least 8 characters</p>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-[12px] font-medium text-[#777] mb-1">Confirm Password</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#aaa]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 border border-[#e8e7e3] rounded-xl focus:outline-none focus:border-[#4f46e5] transition text-[14px]"
                    placeholder="Confirm your password"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 text-[11px] p-2.5 rounded-xl">
                  {error}
                </div>
              )}

              <button
                onClick={() => setStep('handles')}
                disabled={!email || !fullName || !password || password !== confirmPassword || password.length < 8}
                className="w-full bg-gradient-to-r from-[#4f46e5] to-[#0891b2] text-white rounded-xl py-2.5 font-medium hover:shadow-lg transition disabled:opacity-50 text-[14px]"
              >
                Continue to Choose Handle
              </button>
            </div>

            <div className="text-center mt-5">
              <button
                onClick={() => setIsLogin(true)}
                className="text-[12px] text-[#4f46e5] hover:underline"
              >
                Already have an account? Sign In
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Sign Up - Handles Screen
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/20 transition">
          <X size={18} className="text-white" />
        </button>
        
        <div className="bg-gradient-to-r from-[#4f46e5] to-[#0891b2] px-6 py-5 text-center">
          <Sparkles size={24} className="text-white mx-auto mb-2" />
          <h2 className="text-lg font-semibold text-white">Choose Your Handle</h2>
          <p className="text-white/80 text-xs">This is how people find you</p>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            {suggestedHandles.length > 0 && (
              <div>
                <label className="block text-[12px] font-medium text-[#777] mb-2">Suggested for you</label>
                <div className="space-y-2">
                  {suggestedHandles.map((handle) => (
                    <button
                      key={handle}
                      onClick={() => {
                        setSelectedHandle(handle);
                        setCustomHandle('');
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl border transition ${
                        selectedHandle === handle && !customHandle
                          ? 'border-[#4f46e5] bg-[#ede9fe]'
                          : 'border-[#e8e7e3] hover:border-[#d0cfc9]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <AtSign size={14} className="text-[#777]" />
                        <span className="font-medium text-[14px]">{handle}</span>
                        {selectedHandle === handle && !customHandle && (
                          <CheckCircle size={14} className="ml-auto text-[#4f46e5]" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-[12px] font-medium text-[#777] mb-1">Or create custom</label>
              <div className="relative">
                <AtSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#aaa]" />
                <input
                  type="text"
                  value={customHandle}
                  onChange={(e) => {
                    setCustomHandle(e.target.value);
                    setSelectedHandle('');
                  }}
                  className="w-full pl-9 pr-3 py-2.5 border border-[#e8e7e3] rounded-xl focus:outline-none focus:border-[#4f46e5] transition text-[14px]"
                  placeholder="@yourhandle.memu"
                />
              </div>
              <p className="text-[9px] text-[#aaa] mt-1">Your handle will automatically end with .memu</p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-[11px] p-2.5 rounded-xl">
                {error}
              </div>
            )}

            <button
              onClick={handleSignUp}
              disabled={loading || (!selectedHandle && !customHandle)}
              className="w-full bg-gradient-to-r from-[#4f46e5] to-[#0891b2] text-white rounded-xl py-2.5 font-medium hover:shadow-lg transition disabled:opacity-50 text-[14px]"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}