'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Loader2, CheckCircle, ChevronRight, Layers, Layout, ShieldAlert } from 'lucide-react';

interface Category {
  id: number;
  name: string;
  icon: string;
  target_year?: number | null;
  question_count: number;
  children?: Category[];
}

type QuizMode = 'Unused' | 'Incorrect' | 'Bookmarked' | 'All';

export default function QuizGeneratorPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedMode, setSelectedMode] = useState<QuizMode>('Unused');
  const [selectedBlocks, setSelectedBlocks] = useState<number[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<number[]>([]);
  const [availableCounts, setAvailableCounts] = useState<Record<number, number>>({});
  
  const [questionCount, setQuestionCount] = useState<number>(40);
  const [quizMode, setQuizMode] = useState<'practice' | 'exam'>('exam');
  const [quizName, setQuizName] = useState<string>('');
  const [generating, setGenerating] = useState(false);

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
      let filteredCategories = catRes.data;
      
      if (studyYear) {
        filteredCategories = catRes.data.filter((c: Category) => !c.target_year || c.target_year === studyYear);
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
        // Deselecting block should also deselect its topics
        const block = categories.find(c => c.id === blockId);
        if (block && block.children) {
          const childIds = block.children.map(c => c.id);
          setSelectedTopics(curr => curr.filter(id => !childIds.includes(id)));
        }
        return prev.filter(id => id !== blockId);
      } else {
        return [...prev, blockId];
      }
    });
  };

  const toggleTopic = (topicId: number) => {
    setSelectedTopics(prev => 
      prev.includes(topicId) ? prev.filter(id => id !== topicId) : [...prev, topicId]
    );
  };

  const handleGenerate = async () => {
    if (selectedTopics.length === 0) return;
    
    setGenerating(true);
    try {
      const { data } = await api.post('/quiz/generate', {
        category_ids: selectedTopics,
        question_count: questionCount,
        mode: selectedMode,
        quiz_mode: quizMode,
        quiz_name: quizName.trim() || undefined
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
        <p className="text-gray-400">Create a personalized exam by selecting specific modes, blocks, and topics.</p>
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
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Layout className="w-5 h-5 text-emerald-400" /> 2. Select Blocks
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map(block => {
              const isSelected = selectedBlocks.includes(block.id);
              return (
                <button
                  key={block.id}
                  onClick={() => toggleBlock(block.id)}
                  className={`relative flex flex-col rounded-2xl border-2 text-left transition-all overflow-hidden h-48 group ${
                    isSelected 
                      ? 'border-indigo-500 shadow-xl shadow-indigo-500/20 ring-1 ring-indigo-500' 
                      : 'border-transparent bg-slate-800/50 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex-1 w-full relative flex items-center justify-center bg-white/5 overflow-hidden">
                    {block.icon?.startsWith('/') ? (
                      <img src={`http://localhost:8000${block.icon}`} alt={block.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
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
                      {block.children?.reduce((sum, child) => sum + (availableCounts[child.id] || 0), 0) || 0}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 3: Topics */}
        {selectedBlocks.length > 0 && (
          <div className="glass-card p-6 animate-slide-up">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-purple-400" /> 3. Select Topics
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              {categories.filter(c => selectedBlocks.includes(c.id)).map(block => (
                <div key={block.id} className="space-y-3">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b border-white/10 pb-2">{block.name}</h3>
                  <div className="space-y-2">
                    {block.children?.map(topic => {
                      const count = availableCounts[topic.id] || 0;
                      return (
                        <label key={topic.id} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${selectedTopics.includes(topic.id) ? 'bg-purple-500/10 border-purple-500/30' : 'bg-white/5 border-transparent hover:bg-white/10'}`}>
                          <div className="flex items-center gap-3">
                            <input 
                              type="checkbox" 
                              checked={selectedTopics.includes(topic.id)}
                              onChange={() => toggleTopic(topic.id)}
                              className="w-4 h-4 rounded border-gray-600 text-purple-500 focus:ring-purple-500/20 bg-slate-800"
                            />
                            <span className={selectedTopics.includes(topic.id) ? 'text-white font-medium' : 'text-gray-300'}>{topic.name}</span>
                          </div>
                          <span className={`text-xs font-mono px-2 py-1 rounded-md ${count > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-gray-500'}`}>
                            {count} Qs
                          </span>
                        </label>
                      );
                    })}
                    {(!block.children || block.children.length === 0) && (
                      <p className="text-sm text-gray-500 italic">No sub-topics available.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 4: Quiz Settings */}
        {selectedTopics.length > 0 && (
          <div className="glass-card p-6 animate-slide-up flex flex-col md:flex-row gap-6 items-center justify-between">
             <div>
                <h2 className="text-lg font-semibold text-white mb-2">4. Settings</h2>
                <p className="text-sm text-gray-400">Total available questions from selected topics: <span className="font-mono text-emerald-400 font-bold">{totalAvailable}</span></p>
             </div>
             <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-medium text-gray-400 mb-1">Quiz Name (Optional)</label>
                  <input 
                    type="text" 
                    value={quizName} 
                    onChange={e => setQuizName(e.target.value)}
                    placeholder="e.g. Midterm Prep"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50"
                  />
                </div>
                <div className="w-24 shrink-0">
                  <label className="block text-xs font-medium text-gray-400 mb-1">Count</label>
                  <input 
                    type="number" 
                    value={questionCount} 
                    onChange={e => setQuestionCount(parseInt(e.target.value) || 1)}
                    min={1} 
                    max={totalAvailable || 100}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50"
                  />
                </div>
                <div className="w-48 shrink-0">
                  <label className="block text-xs font-medium text-gray-400 mb-1">Mode</label>
                  <div className="flex flex-row gap-2">
                    <button
                      onClick={() => setQuizMode('practice')}
                      className={`flex-1 py-2 px-3 rounded-xl border text-sm text-center font-medium transition-all ${
                        quizMode === 'practice'
                          ? 'bg-blue-500/10 border-blue-500/50 text-blue-400 shadow-lg shadow-blue-500/10'
                          : 'bg-slate-800 border-white/5 text-gray-500 hover:bg-slate-800/80 grayscale opacity-70'
                      }`}
                    >
                      Practice
                    </button>
                    <button
                      onClick={() => setQuizMode('exam')}
                      className={`flex-1 py-2 px-3 rounded-xl border text-sm text-center font-medium transition-all ${
                        quizMode === 'exam'
                          ? 'bg-rose-500/10 border-rose-500/50 text-rose-400 shadow-lg shadow-rose-500/10'
                          : 'bg-slate-800 border-white/5 text-gray-500 hover:bg-slate-800/80 grayscale opacity-70'
                      }`}
                    >
                      Exam
                    </button>
                  </div>
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
