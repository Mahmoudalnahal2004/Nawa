'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Eye, EyeOff, Stethoscope, ArrowRight, Loader2, Mail, Check } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { syncProfile, refreshProfile } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [university, setUniversity] = useState('');
  const [studyYear, setStudyYear] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [universities, setUniversities] = useState<{id: number, name: string}[]>([]);

  useEffect(() => {
    setPassword('');
    setConfirmPassword('');
  }, [isLogin]);

  useEffect(() => {
    if (!isLogin && universities.length === 0) {
      api.get('/universities').then(res => setUniversities(res.data)).catch(console.error);
    }
  }, [isLogin, universities.length]);

  const passwordCriteria = {
    minChar: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  };

  const metCount = Object.values(passwordCriteria).filter(Boolean).length;

  const getStrengthLabelAndColor = () => {
    if (password.length === 0) return { label: '', color: 'bg-transparent', textClass: 'text-gray-500', pct: 0 };
    switch (metCount) {
      case 1:
        return { label: 'Very Weak', color: 'bg-rose-500', textClass: 'text-rose-400', pct: 20 };
      case 2:
        return { label: 'Weak', color: 'bg-orange-500', textClass: 'text-orange-400', pct: 40 };
      case 3:
        return { label: 'Medium', color: 'bg-amber-500', textClass: 'text-amber-400', pct: 60 };
      case 4:
        return { label: 'Good', color: 'bg-blue-500', textClass: 'text-blue-400', pct: 80 };
      case 5:
        return { label: 'Strong', color: 'bg-emerald-500', textClass: 'text-emerald-400', pct: 100 };
      default:
        return { label: 'Too Weak', color: 'bg-rose-500', textClass: 'text-rose-400', pct: 10 };
    }
  };

  const strength = getStrengthLabelAndColor();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // Sign in via Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          toast.error(error.message || 'Invalid email or password');
          setLoading(false);
          return;
        }

        if (data.session) {
          // Sync profile to ensure user exists locally
          try {
            const profile = await refreshProfile();
            if (!profile) {
              toast.error('Failed to sync profile with server. Please check your backend connection/settings.');
              setLoading(false);
              return;
            }
            toast.success('Welcome back!');
            if (profile.role === 'admin') router.push('/admin/dashboard');
            else router.push('/student/home');
          } catch (syncErr) {
            console.error('Failed to sync profile on login:', syncErr);
            toast.error('Failed to link your local profile. Please try again.');
            setLoading(false);
          }
        }
      } else {
        if (password !== confirmPassword) {
          toast.error('Passwords do not match');
          setLoading(false);
          return;
        }
        if (metCount < 5) {
          toast.error('Please meet all password strength requirements');
          setLoading(false);
          return;
        }

        // Sign up via Supabase Auth
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              university: university || null,
              study_year: studyYear ? parseInt(studyYear) : null,
            },
          },
        });

        if (error) {
          toast.error(error.message || 'Signup failed');
          setLoading(false);
          return;
        }

        if (data.session) {
          // If auto-logged in, sync profile directly
          try {
            await syncProfile(
              fullName,
              university || undefined,
              studyYear ? parseInt(studyYear) : undefined
            );
            toast.success('Account created! Welcome to Nawa.');
            router.push('/student/home');
          } catch (syncErr) {
            console.error('Failed to sync profile on registration:', syncErr);
            toast.error('Account created, but failed to sync local profile.');
            setLoading(false);
          }
        } else {
          // If confirmation email is required
          toast.success('Account created! Please check your email to verify.');
          setIsRegistered(true);
        }
      }
    } catch (err: any) {
      const message = err.message || 'Something went wrong';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-950" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/5 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-md mx-4 animate-fade-in">
        {/* Logo */}
        <Link href="/" className="block text-center mb-8 hover:opacity-90 transition-opacity">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/25 mb-4">
            <Stethoscope className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Nawa</h1>
          <p className="text-gray-400 mt-1">Medical Question Bank</p>
        </Link>

        {/* Card */}
        <div className="glass-card p-8">
          {isRegistered ? (
            <div className="text-center animate-fade-in py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 mb-6">
                <Mail className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Check Your Email</h2>
              <p className="text-gray-400 mb-6 leading-relaxed">
                We sent a verification link to your email. You must click it to activate your account before logging in.
              </p>
              <button
                onClick={() => {
                  setIsRegistered(false);
                  setIsLogin(true);
                }}
                className="btn-primary w-full"
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="flex mb-6 bg-white/5 rounded-xl p-1">
                <button
                  onClick={() => setIsLogin(true)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isLogin ? 'bg-emerald-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setIsLogin(false)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    !isLogin ? 'bg-emerald-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Register
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div className="animate-slide-up space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">Full Name</label>
                      <input
                        id="full-name-input"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Dr. Ahmed Hassan"
                        className="input-field"
                        required={!isLogin}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">University (Optional)</label>
                        <select
                          value={university}
                          onChange={(e) => setUniversity(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 appearance-none"
                        >
                          <option value="">Select University...</option>
                          {universities.map(u => (
                            <option key={u.id} value={u.name}>{u.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Study Year</label>
                        <select
                          value={studyYear}
                          onChange={(e) => setStudyYear(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 appearance-none"
                        >
                          <option value="">Select Year...</option>
                          {[1, 2, 3, 4, 5].map(y => (
                            <option key={y} value={y}>Year {y}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
                  <input
                    id="email-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@medical.edu"
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      id="password-input"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="input-field pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {!isLogin && password.length > 0 && (
                    <div className="animate-fade-in space-y-2 mt-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400">Password Strength:</span>
                        <span className={`font-semibold transition-all duration-300 ${strength.textClass}`}>{strength.label}</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-950/60 border border-slate-800/40 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${strength.color}`} 
                          style={{ width: `${strength.pct}%` }}
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 pt-1 text-[11px] text-left">
                        <div className="flex items-center gap-1.5">
                          {passwordCriteria.minChar ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-600 mx-1 shrink-0" />
                          )}
                          <span className={passwordCriteria.minChar ? 'text-emerald-400/80 transition-all' : 'text-gray-500'}>Min. 8 characters</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {passwordCriteria.hasUpper ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-600 mx-1 shrink-0" />
                          )}
                          <span className={passwordCriteria.hasUpper ? 'text-emerald-400/80 transition-all' : 'text-gray-500'}>One uppercase (A-Z)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {passwordCriteria.hasLower ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-600 mx-1 shrink-0" />
                          )}
                          <span className={passwordCriteria.hasLower ? 'text-emerald-400/80 transition-all' : 'text-gray-500'}>One lowercase (a-z)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {passwordCriteria.hasNumber ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-600 mx-1 shrink-0" />
                          )}
                          <span className={passwordCriteria.hasNumber ? 'text-emerald-400/80 transition-all' : 'text-gray-500'}>One number (0-9)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {passwordCriteria.hasSpecial ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-600 mx-1 shrink-0" />
                          )}
                          <span className={passwordCriteria.hasSpecial ? 'text-emerald-400/80 transition-all' : 'text-gray-500'}>One special char</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {!isLogin && (
                  <div className="animate-slide-up">
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Confirm Password</label>
                    <div className="relative">
                      <input
                        id="confirm-password-input"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="input-field pr-12"
                        required={!isLogin}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                )}

                <button
                  id="submit-button"
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2 mt-6"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      {isLogin ? 'Sign In' : 'Create Account'}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {!isLogin && (
                <p className="text-xs text-gray-500 text-center mt-4">
                  By creating an account, you agree to our Terms of Service.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
