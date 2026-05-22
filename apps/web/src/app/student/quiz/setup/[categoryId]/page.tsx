'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';
import { toast } from 'sonner';
import { ArrowLeft, Play, Minus, Plus, Loader2, BookOpen, Timer } from 'lucide-react';

export default function QuizSetupPage() {
  const router = useRouter();
  const params = useParams();
  const categoryId = params.categoryId as string;
  const [category, setCategory] = useState<any>(null);
  const [numQuestions, setNumQuestions] = useState(10);
  const [maxQuestions, setMaxQuestions] = useState(0);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'practice' | 'exam'>('practice');

  useEffect(() => {
    loadCategory();
  }, [categoryId]);

  const loadCategory = async () => {
    try {
      const { data } = await api.get('/analytics/by-category');
      const cat = data.find((c: any) => c.category_id === parseInt(categoryId));
      if (cat) {
        setCategory(cat);
        setMaxQuestions(cat.total_questions);
        setNumQuestions(Math.min(10, cat.total_questions));
      }
    } catch {
      toast.error('Failed to load category');
    }
  };

  const startQuiz = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/quiz/start', {
        category_id: parseInt(categoryId),
        num_questions: numQuestions,
        mode: mode,
      });
      router.push(`/student/quiz/session/${data.session_id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to start quiz');
      setLoading(false);
    }
  };

  if (!category) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-8 animate-fade-in">
      <button onClick={() => router.push('/student/dashboard')} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to Modules
      </button>

      <div className="glass-card p-8 text-center">
        <div className="text-5xl mb-4">{category.category_icon}</div>
        <h1 className="text-2xl font-bold text-white mb-2">{category.category_name}</h1>
        <p className="text-gray-400">{category.total_questions} questions available</p>
      </div>

      <div className="glass-card p-8">
        <h2 className="text-lg font-semibold text-white mb-6 text-center">How many questions?</h2>

        <div className="flex items-center justify-center gap-6 mb-8">
          <button
            onClick={() => setNumQuestions(n => Math.max(1, n - 5))}
            className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          >
            <Minus className="w-5 h-5" />
          </button>

          <div className="relative">
            <input
              type="number"
              value={numQuestions}
              onChange={(e) => setNumQuestions(Math.max(1, Math.min(maxQuestions, parseInt(e.target.value) || 1)))}
              className="w-28 h-20 bg-white/5 border border-white/10 rounded-2xl text-center text-4xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              min={1}
              max={maxQuestions}
            />
          </div>

          <button
            onClick={() => setNumQuestions(n => Math.min(maxQuestions, n + 5))}
            className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Quick select */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {[5, 10, 20, 30, 50].filter(n => n <= maxQuestions).map((n) => (
            <button key={n} onClick={() => setNumQuestions(n)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all
                ${numQuestions === n
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
                }`}>
              {n}
            </button>
          ))}
        </div>

        {/* Mode Selection */}
        <div className="mb-8 space-y-4">
          <button 
            onClick={() => setMode('practice')}
            className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-start gap-4 ${
              mode === 'practice' 
                ? 'bg-emerald-500/10 border-emerald-500/50 text-white shadow-lg shadow-emerald-500/10' 
                : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10 hover:text-gray-300'
            }`}
          >
            <div className={`p-2 rounded-lg shrink-0 ${mode === 'practice' ? 'bg-emerald-500/20' : 'bg-white/10'}`}>
              <BookOpen className={`w-6 h-6 ${mode === 'practice' ? 'text-emerald-400' : 'text-gray-400'}`} />
            </div>
            <div>
              <p className="font-bold text-base mb-1">Practice Mode</p>
              <p className="text-sm opacity-80">Immediate feedback, correct answers highlighted instantly, and explanations provided after each question.</p>
            </div>
          </button>

          <button 
            onClick={() => setMode('exam')}
            className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-start gap-4 ${
              mode === 'exam' 
                ? 'bg-purple-500/10 border-purple-500/50 text-white shadow-lg shadow-purple-500/10' 
                : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10 hover:text-gray-300'
            }`}
          >
            <div className={`p-2 rounded-lg shrink-0 ${mode === 'exam' ? 'bg-purple-500/20' : 'bg-white/10'}`}>
              <Timer className={`w-6 h-6 ${mode === 'exam' ? 'text-purple-400' : 'text-gray-400'}`} />
            </div>
            <div>
              <p className="font-bold text-base mb-1">Exam Mode</p>
              <p className="text-sm opacity-80">Simulated test environment. No feedback until the end. Review your answers and explanations after submitting.</p>
            </div>
          </button>
        </div>

        <button onClick={startQuiz} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 text-lg py-4">
          {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
            <>
              <Play className="w-5 h-5" /> Start Quiz
            </>
          )}
        </button>
      </div>
    </div>
  );
}
