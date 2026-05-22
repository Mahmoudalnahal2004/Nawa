'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { toast } from 'sonner';
import { User, Building2, GraduationCap, Save, Loader2, ArrowLeft, EyeOff } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [universities, setUniversities] = useState<any[]>([]);
  const [form, setForm] = useState({
    full_name: '',
    university: '',
    study_year: '' as string,
    is_anonymous: false,
  });

  useEffect(() => {
    Promise.all([
      api.get('/users/me'),
      api.get('/universities').catch(() => ({ data: [] }))
    ])
      .then(([profileRes, unisRes]) => {
        setForm({
          full_name: profileRes.data.full_name || '',
          university: profileRes.data.university || '',
          study_year: profileRes.data.study_year != null ? String(profileRes.data.study_year) : '',
          is_anonymous: profileRes.data.is_anonymous || false,
        });
        setUniversities(unisRes.data);
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
        university: form.university || undefined,
        study_year: form.study_year ? parseInt(form.study_year) : undefined,
        is_anonymous: form.is_anonymous,
      });
      toast.success('Profile saved!');
      // Reload the page to reflect any year change on the dashboard
      router.push('/student/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to save profile');
    } finally {
      setSaving(false);
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
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/student/dashboard')}
          className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">My Profile</h1>
          <p className="text-gray-400 text-sm mt-0.5">Update your details to personalise your study modules</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="glass-card p-8 space-y-6">
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

        {/* University */}
        <div>
          <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-400" /> University
          </label>
          <select
            value={form.university}
            onChange={e => handleChange('university', e.target.value)}
            className="select-field w-full"
          >
            <option value="">Select your university</option>
            {universities.map(uni => (
              <option key={uni.id} value={uni.name}>{uni.name}</option>
            ))}
          </select>
        </div>

        {/* Study Year */}
        <div>
          <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-emerald-400" /> Study Year
          </label>
          <p className="text-xs text-gray-500 mb-3">
            Your dashboard will show only the modules relevant to your year.
          </p>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map(y => (
              <button
                key={y}
                type="button"
                onClick={() => handleChange('study_year', String(y))}
                className={`py-3 rounded-xl text-sm font-bold transition-all ${
                  form.study_year === String(y)
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                    : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white'
                }`}
              >
                Y{y}
              </button>
            ))}
          </div>
          {form.study_year && (
            <button
              type="button"
              onClick={() => handleChange('study_year', '')}
              className="mt-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Clear selection (show all modules)
            </button>
          )}
        </div>

        {/* Anonymous Mode */}
        <div className="pt-2 border-t border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-semibold text-white flex items-center gap-2">
                <EyeOff className="w-4 h-4 text-purple-400" /> Anonymous Mode
              </label>
              <p className="text-xs text-gray-500 mt-1">Hide your name on leaderboards</p>
            </div>
            <button
              type="button"
              onClick={() => setForm(prev => ({ ...prev, is_anonymous: !prev.is_anonymous }))}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                form.is_anonymous ? 'bg-purple-500' : 'bg-white/10'
              }`}
            >
              <span className={`inline-block h-5 w-5 rounded-full bg-white transition-transform ${
                form.is_anonymous ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
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
    </div>
  );
}
