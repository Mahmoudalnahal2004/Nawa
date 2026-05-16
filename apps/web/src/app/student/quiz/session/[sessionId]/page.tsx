'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';
import { toast } from 'sonner';
import { ArrowRight, CheckCircle, XCircle, Loader2, Trophy, RotateCcw, Home, ChevronRight } from 'lucide-react';

interface QuizQuestion {
  id: number;
  question_text: string;
  image_url: string | null;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  option_e: string | null;
}

interface AnswerFeedback {
  question_id: number;
  selected_answer: string;
  correct_answer: string;
  is_correct: boolean;
  explanation: string | null;
}

export default function QuizSessionPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [categoryName, setCategoryName] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [allFeedback, setAllFeedback] = useState<AnswerFeedback[]>([]);
  const [quizComplete, setQuizComplete] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadQuiz(); }, [sessionId]);

  const loadQuiz = async () => {
    try {
      const { data } = await api.get(`/quiz/${sessionId}`);
      setQuestions(data.questions);
      setCategoryName(data.category_name);
    } catch {
      toast.error('Failed to load quiz');
      router.push('/student/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (answer: string) => {
    if (feedback) return; // Already answered
    setSelectedAnswer(answer);
    setSubmitting(true);
    try {
      const { data } = await api.post(`/quiz/${sessionId}/answer`, {
        question_id: questions[currentIndex].id,
        selected_answer: answer,
      });
      setFeedback(data);
      setAllFeedback(prev => [...prev, data]);
    } catch {
      toast.error('Failed to submit answer');
    } finally {
      setSubmitting(false);
    }
  };

  const nextQuestion = () => {
    if (currentIndex + 1 >= questions.length) {
      setQuizComplete(true);
    } else {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setFeedback(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  // Results screen
  if (quizComplete) {
    const correct = allFeedback.filter(f => f.is_correct).length;
    const total = questions.length;
    const percentage = Math.round((correct / total) * 100);

    return (
      <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
        <div className="glass-card p-10 text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30">
            <Trophy className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Quiz Complete!</h1>
          <p className="text-gray-400 mb-8">{categoryName}</p>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-3xl font-bold text-white">{correct}</p>
              <p className="text-xs text-emerald-400">Correct</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-3xl font-bold text-white">{total - correct}</p>
              <p className="text-xs text-rose-400">Incorrect</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <p className={`text-3xl font-bold ${percentage >= 70 ? 'text-emerald-400' : percentage >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                {percentage}%
              </p>
              <p className="text-xs text-gray-400">Score</p>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button onClick={() => router.push('/student/dashboard')} className="btn-secondary flex items-center gap-2">
              <Home className="w-4 h-4" /> Modules
            </button>
            <button onClick={() => router.push('/student/weak-points')} className="btn-primary flex items-center gap-2">
              Review Weak Points <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Answer Review */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Answer Review</h3>
          <div className="space-y-2">
            {allFeedback.map((fb, i) => (
              <div key={i} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl ${fb.is_correct ? 'bg-emerald-500/5' : 'bg-rose-500/5'}`}>
                {fb.is_correct ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" /> : <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                <span className="text-sm text-gray-300 flex-1 line-clamp-1">Q{i + 1}: {questions[i]?.question_text?.substring(0, 80)}...</span>
                <span className={`text-xs font-medium ${fb.is_correct ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {fb.selected_answer} {fb.is_correct ? '✓' : `→ ${fb.correct_answer}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const question = questions[currentIndex];
  const options = [
    { label: 'A', text: question.option_a },
    { label: 'B', text: question.option_b },
    { label: 'C', text: question.option_c },
    { label: 'D', text: question.option_d },
    ...(question.option_e ? [{ label: 'E', text: question.option_e }] : []),
  ];

  const getOptionClass = (label: string) => {
    if (!feedback) return selectedAnswer === label ? 'selected' : '';
    if (label === feedback.correct_answer) return 'correct';
    if (label === feedback.selected_answer && !feedback.is_correct) return 'incorrect';
    return 'opacity-50';
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Progress bar */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-400">{categoryName}</span>
          <span className="text-sm font-medium text-white">Question {currentIndex + 1} of {questions.length}</span>
        </div>
        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="glass-card p-8 animate-slide-up">
        <div className="prose prose-invert max-w-none mb-6">
          <p className="text-white text-lg leading-relaxed whitespace-pre-wrap">{question.question_text}</p>
        </div>

        {question.image_url && (
          <div className="mb-6">
            <img src={`${process.env.NEXT_PUBLIC_API_URL}${question.image_url}`} alt="Clinical image"
              className="w-full max-h-80 object-contain rounded-xl bg-black/20" />
          </div>
        )}

        {/* Options */}
        <div className="space-y-3">
          {options.map((opt) => (
            <button
              key={opt.label}
              onClick={() => submitAnswer(opt.label)}
              disabled={!!feedback || submitting}
              className={`quiz-option w-full text-left ${getOptionClass(opt.label)}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 transition-all
                ${feedback
                  ? opt.label === feedback.correct_answer
                    ? 'bg-emerald-500 text-white'
                    : opt.label === feedback.selected_answer && !feedback.is_correct
                    ? 'bg-rose-500 text-white'
                    : 'bg-white/5 text-gray-500'
                  : selectedAnswer === opt.label
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-white/5 text-gray-400'
                }`}>
                {feedback && opt.label === feedback.correct_answer ? (
                  <CheckCircle className="w-5 h-5" />
                ) : feedback && opt.label === feedback.selected_answer && !feedback.is_correct ? (
                  <XCircle className="w-5 h-5" />
                ) : opt.label}
              </div>
              <span className="text-sm text-gray-200 flex-1">{opt.text}</span>
            </button>
          ))}
        </div>

        {/* Explanation */}
        {feedback && (
          <div className="mt-6 animate-slide-up">
            <div className={`rounded-xl p-5 ${feedback.is_correct ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-rose-500/10 border border-rose-500/20'}`}>
              <div className="flex items-center gap-2 mb-2">
                {feedback.is_correct ? (
                  <><CheckCircle className="w-5 h-5 text-emerald-400" /><span className="text-emerald-400 font-semibold">Correct!</span></>
                ) : (
                  <><XCircle className="w-5 h-5 text-rose-400" /><span className="text-rose-400 font-semibold">Incorrect — Answer: {feedback.correct_answer}</span></>
                )}
              </div>
              {feedback.explanation && (
                <p className="text-gray-300 text-sm leading-relaxed">{feedback.explanation}</p>
              )}
            </div>

            <button onClick={nextQuestion} className="btn-primary w-full mt-4 flex items-center justify-center gap-2">
              {currentIndex + 1 >= questions.length ? 'View Results' : 'Next Question'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
