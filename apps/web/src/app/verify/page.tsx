'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import { storeAuth } from '@/lib/auth';

function VerifyContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [targetPath, setTargetPath] = useState('/student/home');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('No verification token provided.');
      return;
    }

    const verifyToken = async () => {
      try {
        const res = await api.get(`/auth/verify?token=${token}`);
        const tokens = res.data;
        
        // Fetch user profile to log them in automatically
        const userRes = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        });
        const user = userRes.data;
        
        // Store auth details
        storeAuth(tokens.access_token, tokens.refresh_token, user);
        
        // Set target path based on user role
        if (user.role === 'admin') {
          setTargetPath('/admin/dashboard');
        } else {
          setTargetPath('/student/home');
        }
        
        setStatus('success');
      } catch (err: any) {
        const detail = err.response?.data?.detail;
        setStatus('error');
        setErrorMessage(detail || 'Verification failed. The token may be invalid or expired.');
      }
    };

    verifyToken();
  }, [token]);

  return (
    <div className="glass-card p-8 w-full max-w-md mx-4 animate-fade-in text-center">
      {status === 'loading' && (
        <div className="flex flex-col items-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 mb-6">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Verifying Email...</h2>
          <p className="text-gray-400">Please wait while we verify your email address.</p>
        </div>
      )}

      {status === 'success' && (
        <div className="flex flex-col items-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 mb-6">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Email Verified!</h2>
          <p className="text-gray-400 mb-8">
            Your email has been successfully verified. You are now logged in and ready to access Nawa.
          </p>
          <Link href={targetPath} className="btn-primary w-full inline-block">
            Go to Nawa
          </Link>
        </div>
      )}

      {status === 'error' && (
        <div className="flex flex-col items-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 text-red-500 mb-6">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Verification Failed</h2>
          <p className="text-gray-400 mb-8">
            {errorMessage}
          </p>
          <div className="flex gap-4 w-full">
            <Link href="/login" className="btn-secondary flex-1 inline-block text-center border border-white/10 text-white py-2 rounded-lg hover:bg-white/5 transition-colors">
              Back to Login
            </Link>
            <button onClick={() => window.location.href = 'mailto:support@nawa.com'} className="btn-primary flex-1">
              Contact Support
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerifyPage() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-950" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/5 rounded-full blur-3xl" />

      <div className="relative z-10 w-full flex justify-center">
        <Suspense fallback={
          <div className="glass-card p-8 w-full max-w-md mx-4 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500" />
          </div>
        }>
          <VerifyContent />
        </Suspense>
      </div>
    </div>
  );
}
