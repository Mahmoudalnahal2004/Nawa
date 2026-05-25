'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { toast } from 'sonner';
import { ArrowLeft, Save, Upload as UploadIcon, Loader2, Bold, Italic, Image as ImageIcon } from 'lucide-react';

interface Category {
  id: number;
  name: string;
  parent_id: number | null;
}

export default function NewQuestionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    category_id: searchParams.get('categoryId') || '',
    question_text: '',
    option_a: '', option_b: '', option_c: '', option_d: '', option_e: '',
    correct_answer: '',
    explanation: '',
    difficulty: 'medium',
    status: 'draft',
    image_url: '',
  });

  useEffect(() => {
    api.get('/categories').then(({ data }) => setCategories(data)).catch(() => {});
  }, []);

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data } = await api.post('/questions/upload-image', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      handleChange('image_url', data.url);
      toast.success('Image uploaded');
    } catch {
      toast.error('Failed to upload image');
    }
  };

  const handleSubmit = async (saveStatus: string) => {
    if (!form.question_text || !form.correct_answer || !form.category_id) {
      toast.error('Please fill in required fields');
      return;
    }
    setLoading(true);
    try {
      await api.post('/questions', { ...form, category_id: parseInt(form.category_id), status: saveStatus });
      toast.success(saveStatus === 'published' ? 'Question published!' : 'Draft saved!');
      router.push('/admin/questions');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create question');
    } finally {
      setLoading(false);
    }
  };

  const optionLabels = ['A', 'B', 'C', 'D', 'E'];
  const optionFields = ['option_a', 'option_b', 'option_c', 'option_d', 'option_e'];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <button onClick={() => router.push('/admin/questions')} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">New Question</h1>
          <p className="text-gray-400 text-sm">Create a clinical question</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => handleSubmit('draft')} disabled={loading} className="btn-secondary flex items-center gap-2 py-2.5 px-4 text-sm">
            <Save className="w-4 h-4" /> Save Draft
          </button>
          <button onClick={() => handleSubmit('published')} disabled={loading} className="btn-primary flex items-center gap-2 py-2.5 px-4 text-sm">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Publish
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main editor */}
        <div className="lg:col-span-2 space-y-6">
          {/* Question text */}
          <div className="glass-card p-6">
            <label className="block text-sm font-semibold text-white mb-3">Question Text *</label>
            <textarea
              value={form.question_text}
              onChange={(e) => handleChange('question_text', e.target.value)}
              placeholder="Enter the clinical question or case scenario..."
              className="input-field min-h-[150px] resize-y"
              rows={6}
            />
          </div>

          {/* Image */}
          <div className="glass-card p-6">
            <label className="block text-sm font-semibold text-white mb-3">Medical Image (Optional)</label>
            {form.image_url ? (
              <div className="relative">
                <img src={`${process.env.NEXT_PUBLIC_API_URL}${form.image_url}`} alt="Question" className="w-full rounded-xl max-h-64 object-contain bg-black/20" />
                <button onClick={() => handleChange('image_url', '')} className="absolute top-2 right-2 bg-rose-500 text-white p-1.5 rounded-lg text-xs">Remove</button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-3 border-2 border-dashed border-white/10 rounded-xl p-8 cursor-pointer hover:border-emerald-500/30 transition-colors">
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                <ImageIcon className="w-8 h-8 text-gray-500" />
                <span className="text-gray-400 text-sm">Upload X-ray, ECG, or clinical image</span>
              </label>
            )}
          </div>

          {/* Options */}
          <div className="glass-card p-6">
            <label className="block text-sm font-semibold text-white mb-4">Answer Options *</label>
            <div className="space-y-3">
              {optionLabels.map((label, i) => (
                <div key={label} className="flex items-start gap-3">
                  <button
                    onClick={() => handleChange('correct_answer', label)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 transition-all
                      ${form.correct_answer === label
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
                      }`}
                  >
                    {label}
                  </button>
                  <input
                    value={(form as any)[optionFields[i]]}
                    onChange={(e) => handleChange(optionFields[i], e.target.value)}
                    placeholder={`Option ${label}${i < 2 ? ' (required)' : ''}`}
                    className="input-field flex-1"
                    required={i < 2}
                  />
                </div>
              ))}
              <p className="text-xs text-gray-500 mt-2">Click a letter to mark it as the correct answer</p>
            </div>
          </div>

          {/* Explanation */}
          <div className="glass-card p-6">
            <label className="block text-sm font-semibold text-white mb-3">Explanation</label>
            <textarea
              value={form.explanation}
              onChange={(e) => handleChange('explanation', e.target.value)}
              placeholder="Explain why the correct answer is right and why others are wrong..."
              className="input-field min-h-[120px] resize-y"
              rows={4}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-white mb-4">Settings</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Category *</label>
                <select value={form.category_id} onChange={(e) => handleChange('category_id', e.target.value)} className="select-field">
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Difficulty</label>
                <div className="flex gap-2">
                  {['easy', 'medium', 'hard'].map((d) => (
                    <button key={d} onClick={() => handleChange('difficulty', d)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-all
                        ${form.difficulty === d
                          ? d === 'easy' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : d === 'hard' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                        }`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
