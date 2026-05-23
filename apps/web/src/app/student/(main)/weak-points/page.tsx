'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { toast } from 'sonner';
import { AlertTriangle, RotateCcw, Loader2, BookOpen } from 'lucide-react';

interface WeakPoint {
  question_id: number;
  question_text: string;
  category_name: string;
  times_incorrect: number;
  last_attempt: string;
}

export default function WeakPointsPage() {
  const router = useRouter();
  const [weakPoints, setWeakPoints] = useState<WeakPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingQuiz, setStartingQuiz] = useState(false);

  useEffect(() => { loadWeakPoints(); }, []);

  const loadWeakPoints = async () => {
    try {
      const { data } = await api.get('/analytics/weak-points');
      setWeakPoints(data);
    } catch {
      toast.error('Failed to load weak points');
    } finally {
      setLoading(false);
    }
  };

  const startWeakPointsQuiz = async () => {
    setStartingQuiz(true);
    try {
      const { data } = await api.post('/analytics/weak-points/quiz');
      router.push(`/student/quiz/session/${data.session_id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to start quiz');
      setStartingQuiz(false);
    }
  };

  // Group by category
  const grouped = weakPoints.reduce((acc, wp) => {
    if (!acc[wp.category_name]) acc[wp.category_name] = [];
    acc[wp.category_name].push(wp);
    return acc;
  }, {} as Record<string, WeakPoint[]>);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
            Weak Points
          </h1>
          <p className="text-gray-400 text-sm">{weakPoints.length} questions to review</p>
        </div>
        {weakPoints.length > 0 && (
          <button onClick={startWeakPointsQuiz} disabled={startingQuiz} className="btn-primary flex items-center gap-2 py-2.5 px-4 text-sm">
            {startingQuiz ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            Re-take Quiz
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-card p-6"><div className="skeleton h-4 w-full mb-2" /><div className="skeleton h-4 w-2/3" /></div>
          ))}
        </div>
      ) : weakPoints.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <BookOpen className="w-16 h-16 text-emerald-400 mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-semibold text-white mb-2">No Weak Points!</h3>
          <p className="text-gray-400">Great job! You've answered all questions correctly.</p>
          <button onClick={() => router.push('/student/dashboard')} className="btn-primary mt-6">
            Continue Studying
          </button>
        </div>
      ) : (
        Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="glass-card overflow-hidden animate-slide-up">
            <div className="px-5 py-3 bg-white/5 border-b border-white/5">
              <h3 className="text-sm font-semibold text-white">{category} <span className="text-gray-500">({items.length})</span></h3>
            </div>
            <div className="divide-y divide-white/5">
              {items.map((wp) => (
                <div key={wp.question_id} className="px-5 py-3 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-rose-400 text-xs font-bold">{wp.times_incorrect}×</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-300 line-clamp-2">{wp.question_text}</p>
                    <p className="text-xs text-gray-500 mt-1">Last attempt: {new Date(wp.last_attempt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
