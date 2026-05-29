'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api, { API_BASE } from '@/lib/api';
import { Loader2, ArrowLeft, CheckCircle, XCircle, Info } from 'lucide-react';

interface QuizQuestion {
  id: number;
  question_text: string;
  image_url: string | null;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  option_e: string | null;
  correct_answer: string;
  explanation: string | null;
}

interface AnswerFeedback {
  question_id: number;
  selected_answer: string;
  correct_answer: string;
  is_correct: boolean;
}

export default function ReviewExamPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;
  
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, AnswerFeedback>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviewData = async () => {
      try {
        const [quizRes, resultsRes] = await Promise.all([
          api.get(`/quiz/${sessionId}`),
          api.get(`/quiz/${sessionId}/results`)
        ]);
        
        setQuestions(quizRes.data.questions);
        
        const ansMap: Record<number, AnswerFeedback> = {};
        resultsRes.data.answers.forEach((ans: AnswerFeedback) => {
          ansMap[ans.question_id] = ans;
        });
        setAnswers(ansMap);
      } catch (error) {
        router.push('/student/dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchReviewData();
  }, [sessionId, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700">
          <ArrowLeft className="w-5 h-5 text-gray-300" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Exam Review</h1>
          <p className="text-sm text-gray-400">Review your answers and explanations.</p>
        </div>
      </div>

      <div className="space-y-12">
        {questions.map((q, idx) => {
          const userAns = answers[q.id];
          const hasAnswered = !!userAns;
          
          const getOptionClass = (label: string) => {
            if (label === q.correct_answer) {
              return 'bg-emerald-500/20 border-emerald-500/50 text-emerald-100';
            }
            if (hasAnswered && userAns.selected_answer === label && !userAns.is_correct) {
              return 'bg-rose-500/20 border-rose-500/50 text-rose-100';
            }
            return 'bg-slate-800/50 border-slate-700 text-gray-400 opacity-50';
          };

          const options = [
            { label: 'A', text: q.option_a },
            { label: 'B', text: q.option_b },
            { label: 'C', text: q.option_c },
            { label: 'D', text: q.option_d },
            ...(q.option_e ? [{ label: 'E', text: q.option_e }] : []),
          ];

          return (
            <div key={q.id} className="glass-card p-8">
              <div className="flex justify-between items-start mb-6 border-b border-slate-800 pb-4">
                <span className="text-lg font-bold text-gray-300">Question {idx + 1}</span>
                {hasAnswered ? (
                  userAns.is_correct ? (
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-medium border border-emerald-500/20">
                      <CheckCircle className="w-4 h-4" /> Correct
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 text-sm font-medium border border-rose-500/20">
                      <XCircle className="w-4 h-4" /> Incorrect
                    </span>
                  )
                ) : (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-sm font-medium border border-amber-500/20">
                    <Info className="w-4 h-4" /> Unanswered
                  </span>
                )}
              </div>

              <div className="prose prose-invert max-w-none mb-8">
                <p className="text-white text-lg leading-relaxed whitespace-pre-wrap">{q.question_text}</p>
              </div>

              {q.image_url && (
                <div className="mb-8">
                  <img src={`${API_BASE}${q.image_url}`} alt="Clinical image" className="w-full max-h-80 object-contain rounded-xl bg-black/20" />
                </div>
              )}

              <div className="space-y-3 mb-8">
                {options.map((opt) => (
                  <div key={opt.label} className={`flex items-center gap-4 p-4 rounded-xl border ${getOptionClass(opt.label)}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-inner ${
                      opt.label === q.correct_answer ? 'bg-emerald-500 text-white' :
                      (hasAnswered && userAns.selected_answer === opt.label ? 'bg-rose-500 text-white' : 'bg-slate-700/50 text-gray-400')
                    }`}>
                      {opt.label}
                    </div>
                    <span className="text-base flex-1">{opt.text}</span>
                  </div>
                ))}
              </div>

              {q.explanation && (
                <div className="mt-8 bg-blue-500/5 border border-blue-500/20 rounded-2xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                  <h4 className="text-sm font-bold text-blue-400 flex items-center gap-2 mb-3">
                    <Info className="w-4 h-4" /> Explanation
                  </h4>
                  <p className="text-gray-300 text-sm leading-relaxed">{q.explanation}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
