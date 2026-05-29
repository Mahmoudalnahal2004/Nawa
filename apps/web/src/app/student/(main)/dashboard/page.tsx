'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Loader2, CheckCircle, ChevronRight, ChevronDown, Layers, Layout, ShieldAlert, LayoutGrid, List } from 'lucide-react';

interface Category {
  id: number;
  name: string;
  icon: string;
  target_year?: number | null;
  question_count: number;
  is_active?: boolean;
  children?: Category[];
}

type QuizMode = 'Unused' | 'Incorrect' | 'Bookmarked' | 'All';

export default function QuizGeneratorPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const [selectedMode, setSelectedMode] = useState<QuizMode>('Unused');
  const [selectedBlocks, setSelectedBlocks] = useState<number[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<number[]>([]);
  const [availableCounts, setAvailableCounts] = useState<Record<number, number>>({});
  const [questionCount, setQuestionCount] = useState<number | string>(10);
  const [quizMode, setQuizMode] = useState<'practice' | 'exam'>('exam');
  const [timePerQuestion, setTimePerQuestion] = useState<number>(60);
  const [quizName, setQuizName] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<number[]>([]);

  const toggleExpand = (categoryId: number) => {
    setExpandedCategories(prev => prev.includes(categoryId) ? prev.filter(id => id !== categoryId) : [...prev, categoryId]);
  };

  const getCategoryTotalCount = (cat: Category): number => {
    let count = availableCounts[cat.id] || 0;
    if (cat.children) {
      cat.children.forEach(c => { count += getCategoryTotalCount(c); });
    }
    return count;
  };

  const getDescendantIds = (cat: Category): number[] => {
    let ids: number[] = [cat.id];
    if (cat.children) {
      cat.children.forEach(c => { ids = ids.concat(getDescendantIds(c)); });
    }
    return ids;
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchAvailability(selectedMode);
  }, [selectedMode]);

  const fetchData = async () => {
    try {
      const [userRes, catRes] = await Promise.all([
        api.get('/users/me'),
        api.get('/categories/tree')
      ]);
      
      const studyYear = userRes.data.study_year;
      
      const filterActive = (cats: Category[]): Category[] => {
        return cats
          .filter(c => c.is_active !== false)
          .map(c => ({
            ...c,
            children: c.children ? filterActive(c.children) : undefined
          }));
      };

      let filteredCategories = filterActive(catRes.data);
      
      if (studyYear) {
        filteredCategories = filteredCategories.filter((c: Category) => !c.target_year || c.target_year === studyYear);
      }
      
      setCategories(filteredCategories);
    } catch {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailability = async (mode: QuizMode) => {
    try {
      const { data } = await api.post('/quiz/availability', { mode });
      setAvailableCounts(data);
    } catch {
      toast.error('Failed to load question availability');
    }
  };

  const toggleBlock = (blockId: number) => {
    setSelectedBlocks(prev => {
      const isSelected = prev.includes(blockId);
      if (isSelected) {
        const block = categories.find(c => c.id === blockId);
        if (block) {
          const allIds = getDescendantIds(block);
          setSelectedTopics(curr => curr.filter(id => !allIds.includes(id)));
        }
        return prev.filter(id => id !== blockId);
      } else {
        return [...prev, blockId];
      }
    });
  };

  const toggleTopic = (topic: Category) => {
    const allIds = getDescendantIds(topic);
    setSelectedTopics(prev => {
      const isSelected = prev.includes(topic.id);
      if (isSelected) {
        return prev.filter(id => !allIds.includes(id));
      } else {
        const toAdd = allIds.filter(id => !prev.includes(id));
        return [...prev, ...toAdd];
      }
    });
  };

  const renderTopicItem = (topic: Category, depth: number = 0) => {
    const count = getCategoryTotalCount(topic);
    const isDisabled = count === 0;
    const hasChildren = topic.children && topic.children.length > 0;
    const isExpanded = expandedCategories.includes(topic.id);
    
    return (
      <div key={topic.id} className="space-y-2 mt-2">
        <div className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${isDisabled ? 'opacity-40 bg-white/5 border-transparent' : selectedTopics.includes(topic.id) ? 'bg-purple-500/10 border-purple-500/30' : 'bg-white/5 border-transparent hover:bg-white/10'} ${depth > 0 ? 'ml-6' : ''}`}>
          <div className="flex items-center gap-2 flex-1">
            {hasChildren ? (
              <button 
                onClick={(e) => { e.preventDefault(); toggleExpand(topic.id); }}
                className="p-1 rounded hover:bg-white/10 text-gray-400 transition-colors"
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            ) : (
              <div className="w-6" />
            )}
            <label className={`flex-1 flex items-center gap-3 cursor-pointer ${isDisabled ? 'cursor-not-allowed' : ''}`}>
              <input 
                type="checkbox" 
                disabled={isDisabled}
                checked={selectedTopics.includes(topic.id)}
                onChange={() => toggleTopic(topic)}
                className="w-4 h-4 rounded border-gray-600 text-purple-500 focus:ring-purple-500/20 bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <span className={selectedTopics.includes(topic.id) ? 'text-white font-medium' : 'text-gray-300'}>{topic.name}</span>
            </label>
          </div>
          <span className={`text-xs font-mono px-2 py-1 rounded-md ${count > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-gray-500'}`}>
            {count} Qs
          </span>
        </div>
        {hasChildren && isExpanded && (
          <div className="space-y-2">
            {topic.children!.map(child => renderTopicItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const handleGenerate = async () => {
    if (selectedTopics.length === 0) return;
    
    let finalCount = typeof questionCount === 'string' ? parseInt(questionCount, 10) : questionCount;
    if (isNaN(finalCount) || finalCount < 1) finalCount = 1;
    if (totalAvailable > 0 && finalCount > totalAvailable) {
      toast.error(`Cannot generate quiz: you requested ${finalCount} questions, but only ${totalAvailable} are available.`);
      return;
    }

    setGenerating(true);
    try {
      const { data } = await api.post('/quiz/generate', {
        category_ids: selectedTopics,
        question_count: finalCount,
        mode: selectedMode,
        quiz_mode: quizMode,
        quiz_name: quizName.trim() || undefined,
        time_per_question: timePerQuestion
      });
      router.push(`/student/quiz/session/${data.session_id}`);
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Failed to generate quiz');
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  const modes: QuizMode[] = ['Unused', 'Incorrect', 'Bookmarked', 'All'];

  // Total available questions based on selected topics
  const totalAvailable = selectedTopics.reduce((sum, id) => sum + (availableCounts[id] || 0), 0);

  return (
    <div className="max-w-5xl mx-auto pb-32 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Custom Quiz Generator</h1>
        <p className="text-gray-400">Create a personalized exam by selecting specific modes, modules, and topics.</p>
      </div>

      <div className="space-y-8">
        {/* Section 1: Modes */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-400" /> 1. Select Question Pool
          </h2>
          <div className="flex flex-wrap gap-3">
            {modes.map(mode => (
              <button
                key={mode}
                onClick={() => setSelectedMode(mode)}
                className={`px-6 py-2.5 rounded-full font-medium transition-all ${
                  selectedMode === mode 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Section 2: Blocks */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Layout className="w-5 h-5 text-emerald-400" /> 2. Select Modules
            </h2>
            <div className="flex items-center bg-white/5 rounded-full p-1 border border-white/10">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-full transition-colors ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-gray-400 hover:text-white'}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-full transition-colors ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-gray-400 hover:text-white'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map(block => {
                const totalCount = getCategoryTotalCount(block);
                const isSelected = selectedBlocks.includes(block.id);
                const isDisabled = totalCount === 0;
                return (
                  <button
                    key={block.id}
                    onClick={() => !isDisabled && toggleBlock(block.id)}
                    disabled={isDisabled}
                    className={`relative flex flex-col rounded-2xl border-2 text-left transition-all overflow-hidden h-48 group ${
                      isDisabled
                        ? 'opacity-30 cursor-not-allowed border-transparent bg-slate-900 grayscale'
                        : isSelected 
                          ? 'border-indigo-500 shadow-xl shadow-indigo-500/20 ring-1 ring-indigo-500' 
                          : 'border-transparent bg-slate-800/50 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex-1 w-full relative flex items-center justify-center bg-white/5 overflow-hidden">
                      {block.icon?.startsWith('/') ? (
                        <img src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${block.icon}`} alt={block.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      ) : (
                        <div className="text-6xl drop-shadow-xl transition-transform duration-500 group-hover:scale-110">{block.icon}</div>
                      )}
                      {isSelected && (
                        <div className="absolute top-3 right-3 bg-indigo-500 text-white rounded-full shadow-lg">
                          <CheckCircle className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <div className={`w-full px-4 py-3 flex items-center justify-between transition-colors ${isSelected ? 'bg-indigo-950 text-white' : 'bg-slate-900 text-gray-300'}`}>
                      <h3 className="font-bold truncate text-[15px] flex-1 pr-2">{block.name}</h3>
                      <div className={`text-xs font-bold px-2.5 py-1 rounded-full ${isSelected ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-700 text-gray-400'}`}>
                        {totalCount}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
              {categories.map(block => {
                const totalCount = getCategoryTotalCount(block);
                const isSelected = selectedBlocks.includes(block.id);
                const isDisabled = totalCount === 0;
                return (
                  <label key={block.id} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${isDisabled ? 'opacity-40 cursor-not-allowed bg-white/5 border-transparent' : isSelected ? 'bg-indigo-500/10 border-indigo-500/30 cursor-pointer' : 'bg-white/5 border-transparent hover:bg-white/10 cursor-pointer'}`}>
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        disabled={isDisabled}
                        checked={isSelected}
                        onChange={() => toggleBlock(block.id)}
                        className="w-4 h-4 rounded border-gray-600 text-indigo-500 focus:ring-indigo-500/20 bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <span className={isSelected ? 'text-white font-medium' : 'text-gray-300'}>{block.name}</span>
                    </div>
                    <span className={`text-xs font-mono px-2 py-1 rounded-md ${totalCount > 0 ? 'bg-indigo-500/20 text-indigo-300' : 'bg-white/5 text-gray-500'}`}>
                      {totalCount}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Section 3: Topics */}
        {selectedBlocks.length > 0 && (
          <div className="glass-card p-6 animate-slide-up">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-purple-400" /> 3. Select Topics
            </h2>
            <div className={selectedBlocks.length === 1 ? "w-full" : "grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6"}>
              {categories.filter(c => selectedBlocks.includes(c.id)).map(block => (
                <div key={block.id} className="space-y-3">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b border-white/10 pb-2">{block.name}</h3>
                  <div className={selectedBlocks.length === 1 ? "grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2" : "space-y-2"}>
                    {block.children?.map(topic => renderTopicItem(topic, 0))}
                    {(!block.children || block.children.length === 0) && (
                      <p className="text-sm text-gray-500 italic col-span-full">No sub-topics available.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 4: Quiz Settings */}
        {selectedTopics.length > 0 && (
          <div className="glass-card p-6 animate-slide-up flex flex-col gap-6">
             <div>
                <h2 className="text-lg font-semibold text-white mb-2">4. Settings</h2>
             </div>
             
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-4">
                  <label className="block text-xs font-medium text-gray-400 mb-1">Quiz Name (Optional)</label>
                  <input 
                    type="text" 
                    value={quizName} 
                    onChange={e => setQuizName(e.target.value)}
                    placeholder="e.g. Midterm Prep"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50"
                  />
                </div>
                
                <div className="lg:col-span-5">
                  <label className="block text-xs font-medium text-gray-400 mb-1">Count</label>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <input 
                        type="number" 
                        value={questionCount} 
                        onChange={e => {
                          const val = e.target.value;
                          if (val === '') {
                            setQuestionCount('');
                          } else {
                            setQuestionCount(parseInt(val, 10) || 1);
                          }
                        }}
                        onBlur={() => {
                          let finalCount = typeof questionCount === 'string' ? parseInt(questionCount, 10) : questionCount;
                          if (isNaN(finalCount) || finalCount < 1) finalCount = 1;
                          setQuestionCount(finalCount);
                        }}
                        min={1} 
                        max={totalAvailable || 100}
                        className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50"
                      />
                      <span className="text-sm font-medium text-blue-400">Max {totalAvailable} Qs.</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button onClick={() => setQuestionCount(Math.min(10, totalAvailable))} className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-colors whitespace-nowrap">Small (10 Qs.)</button>
                      <button onClick={() => setQuestionCount(Math.min(20, totalAvailable))} className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-colors whitespace-nowrap">Medium (20 Qs.)</button>
                      <button onClick={() => setQuestionCount(Math.min(50, totalAvailable))} className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-colors whitespace-nowrap">Large (50 Qs.)</button>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-3">
                  <label className="block text-xs font-medium text-gray-400 mb-1">Mode</label>
                  <div className="flex flex-row p-1 bg-slate-900 border border-slate-700 rounded-lg h-[44px]">
                    <button
                      onClick={() => setQuizMode('practice')}
                      className={`flex-1 rounded-md text-sm text-center font-medium transition-all ${
                        quizMode === 'practice'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Practice
                    </button>
                    <button
                      onClick={() => setQuizMode('exam')}
                      className={`flex-1 rounded-md text-sm text-center font-medium transition-all ${
                        quizMode === 'exam'
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Exam
                    </button>
                  </div>
                  {quizMode === 'exam' && (
                    <div className="mt-4 animate-fade-in">
                      <label className="block text-xs font-medium text-gray-400 mb-1">Time per question</label>
                      <div className="flex flex-row p-1 bg-slate-900 border border-slate-700 rounded-lg h-[44px]">
                        {[30, 60, 90, 120].map((t) => (
                          <button
                            key={t}
                            onClick={() => setTimePerQuestion(t)}
                            className={`flex-1 rounded-md text-xs text-center font-medium transition-all ${
                              timePerQuestion === t
                                ? 'bg-slate-700 text-white shadow-sm border border-slate-600'
                                : 'text-gray-400 hover:text-white'
                            }`}
                          >
                            {t}s
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
             </div>
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-3">
        {selectedTopics.length === 0 && (
          <div className="bg-slate-900 border border-rose-500/20 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <p className="text-rose-400 text-sm font-medium">Select at least one topic</p>
          </div>
        )}
        {selectedTopics.length > 0 && totalAvailable === 0 && (
          <div className="bg-slate-900 border border-amber-500/20 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <p className="text-amber-400 text-sm font-medium">No questions available</p>
          </div>
        )}
        <button 
          onClick={handleGenerate}
          disabled={selectedTopics.length === 0 || generating || totalAvailable === 0}
          className={`px-8 py-4 rounded-2xl font-bold flex items-center gap-2 shadow-xl transition-all hover:scale-105 active:scale-95 ${
            selectedTopics.length === 0 || totalAvailable === 0
              ? 'bg-slate-800 border border-slate-700 text-gray-500 cursor-not-allowed opacity-90' 
              : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-emerald-500/30 border border-emerald-400/30'
          }`}
        >
          {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Generate Quiz'}
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
