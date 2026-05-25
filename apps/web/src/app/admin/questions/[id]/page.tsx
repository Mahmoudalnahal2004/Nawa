'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { toast } from 'sonner';
import { ArrowLeft, Save, Loader2, Image as ImageIcon, ChevronDown, ChevronRight, Check } from 'lucide-react';

interface Category {
  id: number;
  name: string;
  parent_id: number | null;
  target_year?: number | null;
}

export default function EditQuestionPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [form, setForm] = useState({
    category_id: '',
    question_text: '',
    option_a: '', option_b: '', option_c: '', option_d: '', option_e: '',
    correct_answer: '',
    explanation: '',
    difficulty: 'medium',
    status: 'draft',
    image_url: '',
  });

  useEffect(() => {
    // Fetch categories and question data in parallel
    Promise.all([
      api.get('/categories').catch(() => ({ data: [] })),
      api.get(`/questions/${params.id}`).catch(() => {
        toast.error('Question not found');
        router.push('/admin/questions');
        return { data: null };
      })
    ]).then(([categoriesRes, questionRes]) => {
      setCategories(categoriesRes.data);
      if (questionRes.data) {
        const q = questionRes.data;
        setForm({
          category_id: q.category_id.toString(),
          question_text: q.question_text || '',
          option_a: q.option_a || '',
          option_b: q.option_b || '',
          option_c: q.option_c || '',
          option_d: q.option_d || '',
          option_e: q.option_e || '',
          correct_answer: q.correct_answer || '',
          explanation: q.explanation || '',
          difficulty: q.difficulty || 'medium',
          status: q.status || 'draft',
          image_url: q.image_url || '',
        });
      }
      setFetching(false);
    });
  }, [params.id, router]);

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
      await api.put(`/questions/${params.id}`, { ...form, category_id: parseInt(form.category_id), status: saveStatus });
      toast.success(saveStatus === 'published' ? 'Question published!' : 'Draft saved!');
      router.push('/admin/questions');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update question');
    } finally {
      setLoading(false);
    }
  };

  const optionLabels = ['A', 'B', 'C', 'D', 'E'];
  const optionFields = ['option_a', 'option_b', 'option_c', 'option_d', 'option_e'];

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center gap-4">
        <button onClick={() => router.push('/admin/questions')} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">Edit Question</h1>
          <p className="text-gray-400 text-sm">Modify the clinical question</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => handleSubmit('draft')} disabled={loading} className="btn-secondary flex items-center gap-2 py-2.5 px-4 text-sm">
            <Save className="w-4 h-4" /> Save Draft
          </button>
          <button onClick={() => handleSubmit('published')} disabled={loading} className="btn-primary flex items-center gap-2 py-2.5 px-4 text-sm">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Publish Update
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
              <div className="relative group">
                <img src={`${process.env.NEXT_PUBLIC_API_URL}${form.image_url}`} alt="Question" className="w-full rounded-xl max-h-64 object-contain bg-black/20" />
                <button onClick={() => handleChange('image_url', '')} className="absolute top-2 right-2 bg-rose-500 text-white p-1.5 rounded-lg text-xs opacity-0 group-hover:opacity-100 transition-opacity">Remove</button>
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
              <div className="relative">
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Category *</label>
                {(() => {
                  const [isCatOpen, setIsCatOpen] = useState(false);
                  const [expandedYears, setExpandedYears] = useState<Record<number, boolean>>({});
                  const [expandedMainCats, setExpandedMainCats] = useState<Record<number, boolean>>({});
                  const selectedCatName = categories.find(c => c.id.toString() === form.category_id)?.name || 'Select category';

                  const renderCategoryTree = (catsToRender: Category[]) => {
                    const mainCats = catsToRender.filter(c => c.parent_id === null).sort((a, b) => a.name.localeCompare(b.name));
                    return mainCats.map(mainCat => {
                      const subCats = categories.filter(sub => sub.parent_id === mainCat.id).sort((a, b) => a.name.localeCompare(b.name));
                      const isMainExpanded = expandedMainCats[mainCat.id];
                      return (
                        <div key={mainCat.id}>
                          <div className="flex items-stretch">
                            {subCats.length > 0 ? (
                              <div
                                className="pl-6 pr-2 flex items-center justify-center cursor-pointer hover:bg-white/5 text-gray-400"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedMainCats(prev => ({ ...prev, [mainCat.id]: !prev[mainCat.id] }));
                                }}
                              >
                                {isMainExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                              </div>
                            ) : (
                              <div className="pl-6 pr-2 w-11 flex items-center justify-center"></div>
                            )}
                            <div
                              className={`flex-1 pr-4 py-2 text-sm cursor-pointer transition-colors flex justify-between items-center ${form.category_id === mainCat.id.toString() ? 'text-emerald-400 bg-emerald-500/10' : 'text-gray-300 hover:bg-white/5'}`}
                              onClick={() => {
                                handleChange('category_id', mainCat.id.toString());
                                setIsCatOpen(false);
                              }}
                            >
                              {mainCat.name}
                              {form.category_id === mainCat.id.toString() && <Check className="w-3.5 h-3.5" />}
                            </div>
                          </div>
                          {isMainExpanded && subCats.length > 0 && (
                            <div className="mb-1 bg-black/10">
                              {subCats.map(subCat => (
                                <div
                                  key={subCat.id}
                                  className={`pl-14 pr-4 py-2 text-sm cursor-pointer transition-colors flex justify-between items-center ${form.category_id === subCat.id.toString() ? 'text-emerald-400 bg-emerald-500/10' : 'text-gray-400 hover:text-gray-300 hover:bg-white/5'}`}
                                  onClick={() => {
                                    handleChange('category_id', subCat.id.toString());
                                    setIsCatOpen(false);
                                  }}
                                >
                                  {subCat.name}
                                  {form.category_id === subCat.id.toString() && <Check className="w-3.5 h-3.5" />}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    });
                  };

                  return (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsCatOpen(!isCatOpen)}
                        className="select-field w-full flex justify-between items-center text-left"
                      >
                        <span className={!form.category_id ? "text-gray-500" : "text-white"}>{selectedCatName}</span>
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isCatOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isCatOpen && (
                        <div className="absolute z-50 mt-2 w-[115%] -left-[7.5%] max-h-80 overflow-y-auto bg-navy-900 border border-white/10 rounded-xl shadow-xl py-2 scrollbar-thin">
                          {[1, 2, 3, 4, 5].map(year => {
                            const yearCats = categories.filter(c => c.target_year === year);
                            if (yearCats.length === 0) return null;
                            const isExpanded = expandedYears[year];
                            return (
                              <div key={year} className="mb-1">
                                <div
                                  className="px-3 py-2 flex items-center gap-2 cursor-pointer hover:bg-white/5 text-emerald-400 font-semibold text-sm transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedYears(prev => ({ ...prev, [year]: !prev[year] }));
                                  }}
                                >
                                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                  Year {year}
                                </div>
                                {isExpanded && (
                                  <div className="mb-1">
                                    {renderCategoryTree(yearCats)}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {(() => {
                            const otherCats = categories.filter(c => !c.target_year);
                            if (otherCats.length === 0) return null;
                            return (
                              <div className="mb-1 mt-2 pt-2 border-t border-white/5">
                                <div className="px-3 py-2 flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                                  <div className="w-3.5 h-3.5" />
                                  Global / Other
                                </div>
                                <div>
                                  {renderCategoryTree(otherCats)}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  );
                })()}
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
