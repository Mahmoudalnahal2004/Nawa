'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';
import { Loader2, Trophy, ArrowRight, Home, CheckCircle, XCircle, HelpCircle } from 'lucide-react';

interface QuizResultSummary {
  session_id: string;
  total_questions: number;
  correct_count: number;
  incorrect_count: number;
  score_percentage: number;
}

export default function QuizSummaryPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [results, setResults] = useState<QuizResultSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const { data } = await api.get(`/quiz/${sessionId}/results`);
        setResults(data);
      } catch (error) {
        router.push('/student/dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [sessionId, router]);

  if (loading || !results) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  const unanswered = results.total_questions - (results.correct_count + results.incorrect_count);
  const strokeDasharray = 2 * Math.PI * 60; // r=60
  const strokeDashoffset = strokeDasharray - (strokeDasharray * results.score_percentage) / 100;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in py-12">
      <div className="glass-card p-12 text-center relative overflow-hidden">
        {/* Background ambient light */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mx-auto mb-8 shadow-lg shadow-emerald-500/30 relative z-10">
          <Trophy className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-white mb-4 relative z-10">Exam Submitted</h1>
        <p className="text-gray-400 mb-12 relative z-10">Here is how you performed.</p>

        {/* Circular Progress */}
        <div className="flex justify-center mb-12 relative z-10">
          <div className="relative w-48 h-48">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">
              <circle
                className="text-slate-800"
                strokeWidth="12"
                stroke="currentColor"
                fill="transparent"
                r="60"
                cx="70"
                cy="70"
              />
              <circle
                className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-all duration-1000 ease-out"
                strokeWidth="12"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r="60"
                cx="70"
                cy="70"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-white">{results.score_percentage}%</span>
              <span className="text-sm text-gray-400 mt-1">Score</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-12 relative z-10">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md hover:bg-white/10 transition-colors">
            <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
            <p className="text-4xl font-bold text-white mb-1">{results.correct_count}</p>
            <p className="text-sm text-emerald-400 font-medium">Correct</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md hover:bg-white/10 transition-colors">
            <XCircle className="w-8 h-8 text-rose-400 mx-auto mb-3" />
            <p className="text-4xl font-bold text-white mb-1">{results.incorrect_count}</p>
            <p className="text-sm text-rose-400 font-medium">Incorrect</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md hover:bg-white/10 transition-colors">
            <HelpCircle className="w-8 h-8 text-amber-400 mx-auto mb-3" />
            <p className="text-4xl font-bold text-white mb-1">{unanswered}</p>
            <p className="text-sm text-amber-400 font-medium">Unanswered</p>
          </div>
        </div>

        <div className="flex gap-4 justify-center relative z-10">
          <button onClick={() => router.push('/student/dashboard')} className="btn-secondary px-8 py-3 flex items-center gap-2">
            <Home className="w-5 h-5" /> Back to Modules
          </button>
          <button onClick={() => router.push(`/student/history/review/${sessionId}`)} className="btn-primary px-8 py-3 flex items-center gap-2">
            Review Exam <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
