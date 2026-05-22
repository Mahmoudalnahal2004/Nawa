'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Loader2, TrendingUp, TrendingDown, Target, CheckCircle2, XCircle, Clock, BookOpen, Timer } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AnalyticsData {
  overall: {
    total_answered: number;
    correct_count: number;
    incorrect_count: number;
    accuracy_percentage: number;
  };
  categories: {
    category_id: number;
    category_name: string;
    category_icon: string;
    total_questions: number;
    answered_count: number;
    correct_count: number;
    accuracy_percentage: number;
  }[];
  recent_sessions: {
    session_id: string;
    category_name: string;
    mode: string;
    total_questions: number;
    score_percentage: number;
    created_at: string;
  }[];
}

export default function HistoryDashboard() {
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const res = await api.get('/analytics/me');
      setData(res.data);
    } catch (err) {
      toast.error('Failed to load history and analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  // Calculate Strongest/Weakest modules (minimum 3 questions answered to count)
  const activeCategories = data.categories.filter(c => c.answered_count >= 3).sort((a, b) => b.accuracy_percentage - a.accuracy_percentage);
  const strongest = activeCategories.slice(0, 3);
  const weakest = [...activeCategories].reverse().slice(0, 3);

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">History & Analytics</h1>
      </div>

      {/* Top Level Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-6 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mb-3">
            <Target className="w-6 h-6 text-blue-400" />
          </div>
          <p className="text-sm text-gray-400 mb-1">Total Answered</p>
          <p className="text-3xl font-bold text-white">{data.overall.total_answered}</p>
        </div>
        <div className="glass-card p-6 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mb-3">
            <TrendingUp className="w-6 h-6 text-emerald-400" />
          </div>
          <p className="text-sm text-gray-400 mb-1">Overall Accuracy</p>
          <p className="text-3xl font-bold text-emerald-400">{data.overall.accuracy_percentage}%</p>
        </div>
        <div className="glass-card p-6 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          </div>
          <p className="text-sm text-gray-400 mb-1">Correct Answers</p>
          <p className="text-3xl font-bold text-white">{data.overall.correct_count}</p>
        </div>
        <div className="glass-card p-6 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center mb-3">
            <XCircle className="w-6 h-6 text-rose-400" />
          </div>
          <p className="text-sm text-gray-400 mb-1">Incorrect Answers</p>
          <p className="text-3xl font-bold text-white">{data.overall.incorrect_count}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Strongest Modules */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-emerald-400" /> Strongest Modules
          </h2>
          {strongest.length === 0 ? (
            <p className="text-gray-500 text-sm italic">Answer more questions to see your strongest modules.</p>
          ) : (
            <div className="space-y-4">
              {strongest.map(cat => (
                <div key={cat.category_id} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-white font-medium">{cat.category_icon} {cat.category_name}</span>
                    <span className="text-emerald-400 font-bold">{cat.accuracy_percentage}%</span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${cat.accuracy_percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Weakest Modules */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
            <TrendingDown className="w-5 h-5 text-rose-400" /> Weakest Modules
          </h2>
          {weakest.length === 0 ? (
            <p className="text-gray-500 text-sm italic">Answer more questions to see your weakest modules.</p>
          ) : (
            <div className="space-y-4">
              {weakest.map(cat => (
                <div key={cat.category_id} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-white font-medium">{cat.category_icon} {cat.category_name}</span>
                    <span className="text-rose-400 font-bold">{cat.accuracy_percentage}%</span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: `${cat.accuracy_percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Sessions Table */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
          <Clock className="w-5 h-5 text-blue-400" /> Recent Quiz Sessions
        </h2>
        {data.recent_sessions.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-500 mb-4">You haven't taken any quizzes recently.</p>
            <button onClick={() => router.push('/student/dashboard')} className="btn-primary">Study Now</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Module</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Mode</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Questions</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Score</th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.recent_sessions.map((session) => (
                  <tr key={session.session_id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-4 text-sm text-gray-300">
                      {new Date(session.created_at).toLocaleDateString()} {new Date(session.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </td>
                    <td className="py-4 px-4 text-sm font-medium text-white">{session.category_name}</td>
                    <td className="py-4 px-4 text-sm">
                      {session.mode === 'practice' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
                          <BookOpen className="w-3 h-3" /> Practice
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-semibold border border-purple-500/20">
                          <Timer className="w-3 h-3" /> Exam
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-400">{session.total_questions} Qs</td>
                    <td className="py-4 px-4 text-sm font-bold">
                      <span className={session.score_percentage >= 70 ? 'text-emerald-400' : session.score_percentage >= 50 ? 'text-amber-400' : 'text-rose-400'}>
                        {session.score_percentage}%
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button onClick={() => router.push(`/student/quiz/session/${session.session_id}`)} className="text-xs font-semibold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-lg transition-colors">
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
