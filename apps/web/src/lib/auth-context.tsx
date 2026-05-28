'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from './supabase';
import api from './api';
import { User } from './auth';
import { Loader2 } from 'lucide-react';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  syncProfile: (fullName: string, university?: string, studyYear?: number) => Promise<User>;
  refreshProfile: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Helper to fetch user details from backend
  const fetchBackendUser = async (): Promise<User | null> => {
    try {
      const res = await api.get('/auth/me');
      const backendUser = res.data;
      setUser(backendUser);
      localStorage.setItem('user', JSON.stringify(backendUser));
      // For legacy components checking access_token
      const sessionRes = await supabase.auth.getSession();
      if (sessionRes.data.session?.access_token) {
        localStorage.setItem('access_token', sessionRes.data.session.access_token);
      }
      return backendUser;
    } catch (err) {
      console.error('Failed to fetch backend profile, attempting JIT sync:', err);
      try {
        const sessionRes = await supabase.auth.getSession();
        const session = sessionRes.data.session;
        if (session) {
          const meta = session.user.user_metadata || {};
          const syncedUser = await syncProfile(
            meta.full_name || session.user.email?.split('@')[0] || 'User',
            meta.university || undefined,
            meta.study_year ? Number(meta.study_year) : undefined
          );
          return syncedUser;
        }
      } catch (syncErr) {
        console.error('Failed JIT profile sync:', syncErr);
      }
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('access_token');
      return null;
    }
  };

  const refreshProfile = async (): Promise<User | null> => {
    return fetchBackendUser();
  };

  // Sync profile endpoint
  const syncProfile = async (fullName: string, university?: string, studyYear?: number): Promise<User> => {
    try {
      const res = await api.post('/auth/sync-profile', {
        full_name: fullName,
        university: university || null,
        study_year: studyYear || null,
      });
      const backendUser = res.data;
      setUser(backendUser);
      localStorage.setItem('user', JSON.stringify(backendUser));
      const sessionRes = await supabase.auth.getSession();
      if (sessionRes.data.session?.access_token) {
        localStorage.setItem('access_token', sessionRes.data.session.access_token);
      }
      return backendUser;
    } catch (err) {
      console.error('Failed to sync profile with backend:', err);
      throw err;
    }
  };

  // Sign out helper
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error during Supabase signout:', err);
    } finally {
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('access_token');
      router.push('/login');
    }
  };

  // Subscribe to auth state changes
  useEffect(() => {
    let mounted = true;

    async function initSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          if (mounted) {
            localStorage.setItem('access_token', session.access_token);
            await fetchBackendUser();
          }
        } else {
          if (mounted) {
            setUser(null);
            localStorage.removeItem('user');
            localStorage.removeItem('access_token');
          }
        }
      } catch (err) {
        console.error('Error initializing session:', err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session) {
          localStorage.setItem('access_token', session.access_token);
          await fetchBackendUser();
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        localStorage.removeItem('user');
        localStorage.removeItem('access_token');
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Centralized Route Guarding
  useEffect(() => {
    if (loading) return;

    const publicPaths = ['/login', '/register', '/', '/verify'];
    const isPublic = publicPaths.includes(pathname);
    const isAdminPath = pathname.startsWith('/admin');
    const isStudentPath = pathname.startsWith('/student');

    if (!user) {
      // Redirect to login if accessing protected path
      if (isAdminPath || isStudentPath) {
        router.replace('/login');
      }
    } else {
      // User is logged in
      if (pathname === '/login' || pathname === '/register') {
        if (user.role === 'admin') {
          router.replace('/admin/dashboard');
        } else {
          router.replace('/student/home');
        }
      } else if (isAdminPath && user.role !== 'admin') {
        // Prevent student accessing admin paths
        router.replace('/student/home');
      } else if (isStudentPath && user.role !== 'student' && user.role !== 'admin') {
        // Prevent invalid roles accessing student paths
        router.replace('/login');
      }
    }
  }, [user, loading, pathname, router]);

  // Loading spinner on protected page transitions
  const isProtectedPath = pathname.startsWith('/admin') || pathname.startsWith('/student');
  if (loading && isProtectedPath) {
    return (
      <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
        <p className="text-gray-400 text-sm">Loading your session...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut: handleSignOut, syncProfile, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
