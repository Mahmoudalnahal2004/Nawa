'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { User, Save, Loader2, Lock, KeyRound, Eye, EyeOff } from 'lucide-react';

export default function AdminProfilePage() {
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    api.get('/users/me')
      .then((res) => {
        setForm({
          full_name: res.data.full_name || '',
        });
      })
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/users/me/profile', {
        full_name: form.full_name || undefined,
      });
      
      await refreshProfile();
      
      toast.success('Profile saved!');
      window.location.reload();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForm.new_password) return;
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.new_password,
      });
      if (error) throw error;
      toast.success('Password changed successfully!');
      setPasswordForm({ current_password: '', new_password: '' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-fade-in">
      {/* Form */}
      <form onSubmit={handleSubmit} className="glass-card p-8 space-y-6 mt-4">
        {/* Full Name */}
        <div>
          <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-400" /> Full Name
          </label>
          <input
            type="text"
            value={form.full_name}
            onChange={e => handleChange('full_name', e.target.value)}
            placeholder="Your full name"
            className="input-field"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={saving}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>

      {/* Change Password */}
      <form onSubmit={handlePasswordSubmit} className="glass-card p-8 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
            <Lock className="w-5 h-5 text-blue-400" /> Change Password
          </h2>
          <p className="text-sm text-gray-400">Update your account security credentials.</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-gray-400" /> Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                required
                value={passwordForm.current_password}
                onChange={e => setPasswordForm(prev => ({ ...prev, current_password: e.target.value }))}
                placeholder="Enter your current password"
                className="input-field pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-white transition-colors"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-emerald-400" /> New Password
            </label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                required
                minLength={6}
                value={passwordForm.new_password}
                onChange={e => setPasswordForm(prev => ({ ...prev, new_password: e.target.value }))}
                placeholder="Enter your new password"
                className="input-field pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-white transition-colors"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={changingPassword || !passwordForm.current_password || !passwordForm.new_password}
          className="w-full bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 hover:text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {changingPassword ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}
