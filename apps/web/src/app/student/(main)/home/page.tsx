'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Loader2, Flame, Target, AlertTriangle, BookOpen, Clock, ChevronRight, LayoutDashboard, History, CheckCircle2, XCircle, Trophy, Send } from 'lucide-react';

export default function StudentHomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);
  const [recentQuizzes, setRecentQuizzes] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [userRes, analyticsRes] = await Promise.all([
        api.get('/users/me'),
        api.get('/analytics/me')
      ]);
      setUser(userRes.data);
      setProgress(analyticsRes.data.overall);
      setRecentQuizzes(analyticsRes.data.recent_sessions || []);
    } catch (e) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const accuracy = progress?.accuracy_percentage || 0;
  const firstName = user?.full_name?.split(' ')[0] || 'Doctor';

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in p-6">
      {/* Hero Welcome Section */}
      <div className="relative glass-card p-8 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">
              Welcome back, <span className="gradient-text">{firstName}</span>!
            </h1>
            <p className="text-gray-400 text-lg">
              Ready to crush your exams today? Let's keep that momentum going.
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-2xl border border-white/5 shadow-lg">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-400">Overall Rank</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-white">{progress?.rank ? `#${progress.rank}` : '-'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-2xl border border-white/5 shadow-lg">
              <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <Flame className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-400">Current Streak</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-white">{user?.current_streak || 0}</span>
                  <span className="text-sm font-medium text-orange-400">Days</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button 
          onClick={() => router.push('/student/dashboard')}
          className="relative group overflow-hidden rounded-2xl p-6 border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all text-left flex items-start gap-5"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <LayoutDashboard className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white mb-1">Create Custom Quiz</h3>
            <p className="text-sm text-gray-400 line-clamp-2">Generate a personalized exam tailored to your specific modules and topics.</p>
          </div>
          <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
        </button>

        <button 
          onClick={() => router.push('/student/weak-points')}
          className="relative group overflow-hidden rounded-2xl p-6 border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 transition-all text-left flex items-start gap-5"
        >
          <div className="w-12 h-12 rounded-xl bg-rose-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <AlertTriangle className="w-6 h-6 text-rose-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white mb-1">Review Weak Points</h3>
            <p className="text-sm text-gray-400 line-clamp-2">Focus on the questions you've struggled with to maximize your score improvements.</p>
          </div>
          <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-rose-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
        </button>
      </div>

      {/* Progress Metrics Row */}
      <h2 className="text-lg font-bold text-white mt-8 mb-4">Your Progress Overview</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-5 border-l-2 border-l-indigo-500">
          <div className="flex items-center gap-2 text-indigo-400 mb-2">
            <BookOpen className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Total Questions</span>
          </div>
          <p className="text-2xl font-bold text-white">{progress?.total_answered || 0}</p>
        </div>
        
        <div className="glass-card p-5 border-l-2 border-l-emerald-500">
          <div className="flex items-center gap-2 text-emerald-400 mb-2">
            <Target className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Overall Accuracy</span>
          </div>
          <div className="flex items-end gap-2">
            <p className="text-2xl font-bold text-white">{accuracy}%</p>
            <div className="w-full bg-slate-800 rounded-full h-1.5 mb-2">
              <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${accuracy}%` }} />
            </div>
          </div>
        </div>

        <div className="glass-card p-5 border-l-2 border-l-green-500">
          <div className="flex items-center gap-2 text-green-400 mb-2">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Correct Answers</span>
          </div>
          <p className="text-2xl font-bold text-white">{progress?.correct_count || 0}</p>
        </div>

        <div className="glass-card p-5 border-l-2 border-l-rose-500">
          <div className="flex items-center gap-2 text-rose-400 mb-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Weak Points</span>
          </div>
          <p className="text-2xl font-bold text-white">{progress?.weak_points_count || 0}</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Recent Activity</h2>
          <button onClick={() => router.push('/student/history')} className="text-sm text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1">
            View All <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        
        <div className="glass-card overflow-hidden">
          {recentQuizzes.length === 0 ? (
            <div className="p-8 text-center">
              <History className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">You haven't taken any quizzes recently.</p>
              <button onClick={() => router.push('/student/dashboard')} className="mt-4 text-emerald-400 font-medium hover:underline">
                Start your first quiz
              </button>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {recentQuizzes.slice(0, 3).map((quiz) => {
                const total = quiz.total_questions || 0;
                const score = Math.round(quiz.score_percentage || 0);
                
                return (
                  <div key={quiz.session_id} className="p-5 flex items-center justify-between hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-white/10">
                        {score >= 80 ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        ) : score >= 50 ? (
                          <Target className="w-5 h-5 text-yellow-400" />
                        ) : (
                          <XCircle className="w-5 h-5 text-rose-400" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">{quiz.quiz_name || quiz.category_name || `Quiz Session #${quiz.session_id.substring(0, 8)}`}</h4>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(quiz.created_at).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>{total} Questions</span>
                          <span>•</span>
                          <span className="capitalize">{quiz.mode} Mode</span>
                          <span>•</span>
                          <span className={`font-medium ${quiz.status === 'in_progress' ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {quiz.status === 'in_progress' ? 'In Progress' : 'Completed'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xl font-bold ${score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-yellow-400' : 'text-rose-400'}`}>
                        {score}%
                      </div>
                      <div className="text-xs text-gray-500">Score</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Telegram Support Button */}
      <a 
        href="https://t.me/+201002429528" 
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 bg-[#0088cc] hover:bg-[#0077b5] text-white p-4 rounded-full shadow-lg shadow-[#0088cc]/30 transition-all hover:scale-110 z-50 flex items-center justify-center group"
      >
        <Send className="w-6 h-6 shrink-0" />
        <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs group-hover:pl-2 group-hover:pr-1 transition-all duration-300 ease-in-out font-medium">
          Contact Us
        </span>
      </a>
    </div>
  );
}
