'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  X, Mail, Lock, User, AtSign, Sparkles, Eye, EyeOff, 
  ArrowRight, ArrowLeft, Check, Loader2, Building2, Briefcase, Camera 
} from 'lucide-react';

interface AuthProps {
  onAuthSuccess: () => void;
  onClose: () => void;
}

export default function Auth({ onAuthSuccess, onClose }: AuthProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [step, setStep] = useState(1); // 1: Basic, 2: Handle, 3: Profile (Only for signup)
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState(''); // Will store the full handle (e.g., "ambaicci.memu")
  const [suggestedHandles, setSuggestedHandles] = useState<string[]>([]);
  const [loadingHandles, setLoadingHandles] = useState(false);
  
  const [bio, setBio] = useState('');
  const [organization, setOrganization] = useState('');
  const [occupation, setOccupation] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Fetch suggested handles when moving to step 2 of signup
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
        setUsername(data.handles[0]); // Auto-select the first one
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
        // --- SIGN IN FLOW ---
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
        if (loginError) throw loginError;
        onAuthSuccess();
      } else {
        // --- SIGN UP FLOW ---
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            fullName,
            username, // Sends the full "username.memu"
            bio,
            organization,
            occupation,
            avatarUrl,
          }),
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        // Log them in immediately after successful signup
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

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3].map((s) => (
        <div 
          key={s} 
          className={`h-1.5 rounded-full transition-all duration-300 ${
            s === step ? 'w-8 bg-gradient-to-r from-indigo-500 to-cyan-500' : 
            s < step ? 'w-4 bg-indigo-500' : 'w-4 bg-gray-200'
          }`} 
        />
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg relative overflow-hidden animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-4 top-4 p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 z-10 transition">
          <X size={20} />
        </button>
        
        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/20">
              <Sparkles size={28} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              {mode === 'signin' && 'Welcome back'}
              {mode === 'signup' && step === 1 && 'Create your account'}
              {mode === 'signup' && step === 2 && 'Choose your handle'}
              {mode === 'signup' && step === 3 && 'Complete your profile'}
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              {mode === 'signin' && 'Sign in to continue your memu journey'}
              {mode === 'signup' && step === 1 && 'Start your post-email workspace'}
              {mode === 'signup' && step === 2 && 'This is your unique identity on Memu'}
              {mode === 'signup' && step === 3 && 'Tell the community a bit about yourself'}
            </p>
          </div>

          {mode === 'signup' && renderStepIndicator()}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* ================= SIGN IN FORM ================= */}
            {mode === 'signin' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition" required />
                </div>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            {/* ================= SIGN UP STEP 1 ================= */}
            {mode === 'signup' && step === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" placeholder="Full name" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition" required />
                </div>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition" required />
                </div>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type={showPassword ? 'text' : 'password'} placeholder="Password (min 6 chars)" value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            {/* ================= SIGN UP STEP 2 ================= */}
            {mode === 'signup' && step === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                {loadingHandles ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Loader2 size={32} className="text-indigo-500 animate-spin mb-3" />
                    <p className="text-sm text-gray-500">Finding unique handles for you...</p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-gray-500 text-center mb-2">We generated some unique options for you. Pick one or type your own:</p>
                    <div className="grid grid-cols-1 gap-2">
                      {suggestedHandles.map((handle) => (
                        <button
                          key={handle}
                          type="button"
                          onClick={() => setUsername(handle)}
                          className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                            username === handle 
                              ? 'border-indigo-500 bg-indigo-50 shadow-sm' 
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                        >
                          <span className="font-medium text-gray-800 flex items-center gap-2">
                            <AtSign size={16} className="text-indigo-500" />
                            {handle}
                          </span>
                          {username === handle && <Check size={18} className="text-indigo-600" />}
                        </button>
                      ))}
                    </div>
                    <div className="relative pt-2">
                      <label className="text-xs text-gray-500 mb-1 block">Or type a custom handle:</label>
                      <div className="relative flex items-center">
                        <span className="absolute left-3 text-gray-400 text-sm font-medium">@</span>
                        <input 
                          type="text" 
                          placeholder="customhandle" 
                          value={username.replace('.memu', '')} 
                          onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') + '.memu')} 
                          className="w-full pl-7 pr-14 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition text-sm" 
                        />
                        <span className="absolute right-3 text-gray-400 text-sm font-medium">.memu</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ================= SIGN UP STEP 3 ================= */}
            {mode === 'signup' && step === 3 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="relative">
                  <textarea 
                    placeholder="Write a short bio..." 
                    value={bio} 
                    onChange={e => setBio(e.target.value)} 
                    rows={3}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition resize-none" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Organization" value={organization} onChange={e => setOrganization(e.target.value)} className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition text-sm" />
                  </div>
                  <div className="relative">
                    <Briefcase size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Occupation" value={occupation} onChange={e => setOccupation(e.target.value)} className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition text-sm" />
                  </div>
                </div>
                <div className="relative">
                  <Camera size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="url" 
                    placeholder="Profile picture URL (optional)" 
                    value={avatarUrl} 
                    onChange={e => setAvatarUrl(e.target.value)} 
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition text-sm" 
                  />
                </div>
              </div>
            )}

            {error && <div className="text-red-500 text-sm bg-red-50 p-3 rounded-xl text-center border border-red-100">{error}</div>}

            {/* Navigation Buttons */}
            <div className="flex gap-3 pt-2">
              {mode === 'signup' && step > 1 && (
                <button 
                  type="button" 
                  onClick={() => setStep(step - 1)} 
                  className="flex-1 flex items-center justify-center gap-2 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition"
                >
                  <ArrowLeft size={16} /> Back
                </button>
              )}
              
              {mode === 'signup' && step < 3 ? (
                <button 
                  type="button" 
                  onClick={handleNext} 
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-indigo-500 to-cyan-500 text-white rounded-xl font-medium hover:opacity-90 transition shadow-lg shadow-indigo-500/20"
                >
                  Continue <ArrowRight size={16} />
                </button>
              ) : (
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-indigo-500 to-cyan-500 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition shadow-lg shadow-indigo-500/20"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : (mode === 'signin' ? 'Sign In' : 'Create Account')}
                </button>
              )}
            </div>

            {/* Mode Toggle Footer */}
            <div className="text-center pt-4 border-t border-gray-100 mt-6">
              <p className="text-sm text-gray-500">
                {mode === 'signin' ? "Don't have an account? " : "Already have an account? "}
                <button 
                  type="button" 
                  onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')} 
                  className="text-indigo-600 font-semibold hover:text-indigo-700 hover:underline transition"
                >
                  {mode === 'signin' ? 'Sign Up' : 'Sign In'}
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}