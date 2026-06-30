'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  X, Mail, Lock, User, AtSign, Sparkles,
  Eye, EyeOff, ArrowRight, ArrowLeft, Check,
  Loader2, Building2, Briefcase, Camera,
  Shield, Zap, LogIn, UserPlus
} from 'lucide-react';

interface AuthProps {
  onAuthSuccess: () => void;
  onClose: () => void;
}

export default function Auth({ onAuthSuccess, onClose }: AuthProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [step, setStep] = useState(1);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [suggestedHandles, setSuggestedHandles] = useState<string[]>([]);
  const [loadingHandles, setLoadingHandles] = useState(false);

  const [bio, setBio] = useState('');
  const [organization, setOrganization] = useState('');
  const [occupation, setOccupation] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (mode === 'signup' && step === 2 && fullName && suggestedHandles.length === 0) {
      fetchHandles();
    }
  }, [mode, step, fullName]);

  const fetchHandles = async () => {
    setLoadingHandles(true);
    try {
      const res = await fetch('/api/auth/suggest-handles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName }),
      });
      const data = await res.json();
      if (data.handles) {
        setSuggestedHandles(data.handles);
        setUsername(data.handles[0]);
      }
    } catch (err) {
      console.error('Failed to fetch handles', err);
    } finally {
      setLoadingHandles(false);
    }
  };

  const switchMode = (newMode: 'signin' | 'signup') => {
    setMode(newMode);
    setStep(1);
    setError('');
    setSuggestedHandles([]);
    setUsername('');
  };

  const handleNext = () => {
    setError('');
    if (step === 1) {
      if (!fullName || !email || !password) {
        setError('Please fill in all fields.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!username || !username.endsWith('.memu')) {
        setError('Please select or enter a valid handle.');
        return;
      }
      setStep(3);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const supabase = createClient();

      if (mode === 'signin') {
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
        if (loginError) throw loginError;
        onAuthSuccess();
      } else {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            fullName,
            username,
            bio,
            organization,
            occupation,
            avatarUrl,
          }),
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
        if (loginError) throw loginError;

        onAuthSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Simple step indicator
  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-3 mb-5">
      {[1, 2, 3].map((s) => (
        <div key={s} className="flex items-center gap-3">
          <div
            className={`flex items-center justify-center w-7 h-7 rounded-full border-2 text-xs font-medium ${
              s === step
                ? 'border-blue-500 bg-blue-500 text-white'
                : s < step
                ? 'border-blue-500 bg-blue-50 text-blue-600'
                : 'border-gray-200 text-gray-400'
            }`}
          >
            {s < step ? <Check size={12} strokeWidth={2.5} /> : s}
          </div>
          {s < 3 && (
            <div className={`w-6 h-px ${s < step ? 'bg-blue-500' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );

  const getStepTitle = () => {
    if (mode === 'signin') return 'Welcome Back';
    switch (step) {
      case 1: return 'Create Your Account';
      case 2: return 'Claim Your Identity';
      case 3: return 'Complete Your Profile';
      default: return '';
    }
  };

  const getStepSubtitle = () => {
    if (mode === 'signin') return 'Sign in to continue your memu journey';
    switch (step) {
      case 1: return 'Start your post-email workspace';
      case 2: return 'Your unique identity on MEMU';
      case 3: return 'Tell the community a bit about yourself';
      default: return '';
    }
  };

  // If the modal is broken, this minimal version will help us debug
  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          width: '100%',
          maxWidth: '440px',
          margin: '0 16px',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition"
          style={{
            position: 'absolute',
            right: '16px',
            top: '16px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            zIndex: 10,
            padding: '6px',
            borderRadius: '50%',
          }}
        >
          <X size={20} strokeWidth={2} />
        </button>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ padding: '24px', overflowY: 'auto' }}>
          {/* Header */}
          <div className="text-center mb-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 mb-3">
              <Sparkles size={12} strokeWidth={2.5} className="text-blue-500" />
              <span className="text-[10px] font-semibold text-blue-700 tracking-wider uppercase">
                {mode === 'signin' ? 'Sign In' : 'Join MEMU'}
              </span>
            </div>

            <h2 className="text-xl font-bold text-gray-900">{getStepTitle()}</h2>
            <p className="text-gray-500 text-sm mt-1">{getStepSubtitle()}</p>

            {mode === 'signup' && (
              <div className="mt-2 flex items-center justify-center gap-2 text-xs text-gray-400">
                <span>Step {step} of 3</span>
                <span className="w-px h-3 bg-gray-200" />
                <span className="text-blue-500">
                  {step === 1 ? 'Basic Info' : step === 2 ? 'Handle' : 'Profile'}
                </span>
              </div>
            )}
          </div>

          {mode === 'signup' && renderStepIndicator()}

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* SIGN IN */}
            {mode === 'signin' && (
              <div className="space-y-3">
                <div>
                  <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition text-[15px]"
                    required
                  />
                </div>

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition text-[15px]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
                  </button>
                </div>

                {error && (
                  <div className="text-rose-600 text-sm bg-rose-50 p-3 rounded-xl text-center border border-rose-100">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-blue-600 text-white rounded-xl font-medium text-[15px] hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : 'Sign In'}
                </button>
              </div>
            )}

            {/* SIGN UP STEP 1 */}
            {mode === 'signup' && step === 1 && (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition text-[15px]"
                  required
                />

                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition text-[15px]"
                  required
                />

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password (min 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition text-[15px]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
                  </button>
                </div>

                {error && (
                  <div className="text-rose-600 text-sm bg-rose-50 p-3 rounded-xl text-center border border-rose-100">
                    {error}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleNext}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-blue-600 text-white rounded-xl font-medium text-[15px] hover:bg-blue-700 transition"
                >
                  Continue <ArrowRight size={18} strokeWidth={2} />
                </button>
              </div>
            )}

            {/* SIGN UP STEP 2 */}
            {mode === 'signup' && step === 2 && (
              <div className="space-y-3">
                {loadingHandles ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Loader2 size={28} className="text-blue-500 animate-spin mb-2" />
                    <p className="text-sm text-gray-500">Finding unique handles...</p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-gray-500 text-center">Choose your unique identity on MEMU</p>

                    <div className="space-y-1.5">
                      {suggestedHandles.map((handle) => (
                        <button
                          key={handle}
                          type="button"
                          onClick={() => setUsername(handle)}
                          className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition ${
                            username === handle
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <span className="flex items-center gap-2 text-[15px] font-medium text-gray-800">
                            <AtSign size={16} strokeWidth={2} className={username === handle ? 'text-blue-500' : 'text-gray-400'} />
                            {handle}
                          </span>
                          {username === handle && <Check size={18} strokeWidth={2.5} className="text-blue-500" />}
                        </button>
                      ))}
                    </div>

                    <div className="pt-1">
                      <label className="text-xs text-gray-500 block mb-1">Or create your own handle</label>
                      <div className="relative flex items-center">
                        <span className="absolute left-3 text-gray-400 text-sm font-medium">@</span>
                        <input
                          type="text"
                          placeholder="yourhandle"
                          value={username.replace('.memu', '')}
                          onChange={(e) =>
                            setUsername(
                              e.target.value
                                .toLowerCase()
                                .replace(/[^a-z0-9]/g, '')
                                .slice(0, 30) + '.memu'
                            )
                          }
                          className="w-full pl-8 pr-16 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition text-[15px]"
                        />
                        <span className="absolute right-3 text-gray-400 text-sm font-medium">.memu</span>
                      </div>
                    </div>

                    {error && (
                      <div className="text-rose-600 text-sm bg-rose-50 p-3 rounded-xl text-center border border-rose-100">
                        {error}
                      </div>
                    )}

                    <div className="flex gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => setStep(step - 1)}
                        className="flex-1 flex items-center justify-center gap-2 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition"
                      >
                        <ArrowLeft size={16} strokeWidth={2} /> Back
                      </button>
                      <button
                        type="button"
                        onClick={handleNext}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition"
                      >
                        Continue <ArrowRight size={16} strokeWidth={2} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* SIGN UP STEP 3 */}
            {mode === 'signup' && step === 3 && (
              <div className="space-y-3">
                <textarea
                  placeholder="Write a short bio..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition resize-none text-[15px]"
                />

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Organization"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition text-[14px]"
                  />
                  <input
                    type="text"
                    placeholder="Occupation"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition text-[14px]"
                  />
                </div>

                <input
                  type="url"
                  placeholder="Profile picture URL (optional)"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition text-[14px]"
                />

                {error && (
                  <div className="text-rose-600 text-sm bg-rose-50 p-3 rounded-xl text-center border border-rose-100">
                    {error}
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setStep(step - 1)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition"
                  >
                    <ArrowLeft size={16} strokeWidth={2} /> Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : 'Create Account'}
                  </button>
                </div>
              </div>
            )}

            {/* MODE TOGGLE */}
            <div className="text-center pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                {mode === 'signin' ? "Don't have an account? " : "Already have an account? "}
                <button
                  type="button"
                  onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
                  className="text-blue-600 font-semibold hover:text-blue-700 hover:underline transition"
                >
                  {mode === 'signin' ? 'Sign Up' : 'Sign In'}
                </button>
              </p>
            </div>

            {/* Trust Signals */}
            {mode === 'signin' && (
              <div className="flex items-center justify-center gap-4 text-[10px] text-gray-400">
                <div className="flex items-center gap-1">
                  <Shield size={12} strokeWidth={2} className="text-blue-400" />
                  Encrypted
                </div>
                <span className="w-px h-3 bg-gray-200" />
                <div className="flex items-center gap-1">
                  <Zap size={12} strokeWidth={2} className="text-blue-400" />
                  Secure
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}