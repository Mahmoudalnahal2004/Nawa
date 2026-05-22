'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';
import { toast } from 'sonner';
import { ArrowRight, CheckCircle, XCircle, Loader2, Trophy, RotateCcw, Home, ChevronRight, PenTool, StickyNote, Eraser, Save, Flag, Search, Clock } from 'lucide-react';

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
  const [mode, setMode] = useState<'practice' | 'exam'>('practice');
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Practice mode state
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
  const [allFeedback, setAllFeedback] = useState<AnswerFeedback[]>([]);
  
  // Exam mode state
  const [examAnswers, setExamAnswers] = useState<Record<number, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<number, boolean>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'flagged' | 'unanswered'>('all');
  
  const [submitting, setSubmitting] = useState(false);
  const [quizComplete, setQuizComplete] = useState(false);
  const [loading, setLoading] = useState(true);

  // Notes state
  const [notesPanelOpen, setNotesPanelOpen] = useState(false);
  const [currentNote, setCurrentNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [loadingNote, setLoadingNote] = useState(false);

  useEffect(() => { loadQuiz(); }, [sessionId]);

  useEffect(() => {
    if (questions.length > 0 && !quizComplete) {
      fetchNote();
      const marks = document.querySelectorAll('mark.transient-highlight');
      marks.forEach(m => {
        const parent = m.parentNode;
        if (parent) {
          parent.replaceChild(document.createTextNode(m.textContent || ''), m);
          parent.normalize();
        }
      });
    }
  }, [currentIndex, questions, quizComplete]);

  // Timer logic for exam mode
  useEffect(() => {
    if (mode === 'exam' && timeLeft !== null && timeLeft > 0 && !quizComplete) {
      const timer = setInterval(() => setTimeLeft(prev => (prev && prev > 0 ? prev - 1 : 0)), 1000);
      return () => clearInterval(timer);
    } else if (mode === 'exam' && timeLeft === 0 && !quizComplete) {
      submitExam(); // auto submit when time's up
    }
  }, [mode, timeLeft, quizComplete]);

  useEffect(() => {
    if (questions.length > 0 && mode === 'exam' && timeLeft === null) {
      setTimeLeft(questions.length * 60); // 1 minute per question
    }
  }, [questions, mode]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const fetchNote = async () => {
    setLoadingNote(true);
    try {
      const { data } = await api.get(`/notes/${questions[currentIndex].id}`);
      setCurrentNote(data.content);
    } catch (e: any) {
      if (e.response?.status === 404) {
        setCurrentNote('');
      }
    } finally {
      setLoadingNote(false);
    }
  };

  const saveNote = async () => {
    setSavingNote(true);
    try {
      await api.post('/notes', {
        question_id: questions[currentIndex].id,
        content: currentNote
      });
      toast.success('Note saved successfully');
    } catch {
      toast.error('Failed to save note');
    } finally {
      setSavingNote(false);
    }
  };

  const handleHighlight = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      toast.error('Select some text first to highlight');
      return;
    }
    const range = selection.getRangeAt(0);
    const mark = document.createElement('mark');
    mark.className = 'transient-highlight bg-yellow-500/30 text-yellow-200 rounded px-1';
    try {
      range.surroundContents(mark);
      selection.removeAllRanges();
    } catch(e) {
      toast.error('Please select text within a single paragraph');
    }
  };

  const clearHighlights = () => {
    const marks = document.querySelectorAll('mark.transient-highlight');
    marks.forEach(m => {
      const parent = m.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(m.textContent || ''), m);
        parent.normalize();
      }
    });
  };

  const loadQuiz = async () => {
    try {
      const { data } = await api.get(`/quiz/${sessionId}`);
      setQuestions(data.questions);
      setCategoryName(data.category_name);
      setMode(data.mode || 'practice');
    } catch {
      toast.error('Failed to load quiz');
      router.push('/student/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (answer: string) => {
    if (mode === 'exam') {
      setExamAnswers(prev => ({ ...prev, [questions[currentIndex].id]: answer }));
      return;
    }

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

  const submitExam = async () => {
    if (submitting) return;
    
    // Check for unanswered questions if time is not up
    const unansweredCount = questions.filter(q => !examAnswers[q.id]).length;
    if (timeLeft !== 0 && unansweredCount > 0) {
      if (!window.confirm(`You have ${unansweredCount} unanswered questions. Are you sure you want to submit?`)) {
        return;
      }
    }

    setSubmitting(true);
    try {
      const answersList = Object.entries(examAnswers).map(([qId, ans]) => ({
        question_id: parseInt(qId),
        selected_answer: ans
      }));
      await api.post(`/quiz/${sessionId}/batch_answer`, { answers: answersList });
      
      const { data } = await api.get(`/quiz/${sessionId}/results`);
      setAllFeedback(data.answers);
      setQuizComplete(true);
    } catch (e) {
      toast.error('Failed to submit exam');
    } finally {
      setSubmitting(false);
    }
  };

  const nextQuestion = () => {
    if (mode === 'exam' && currentIndex + 1 >= questions.length) {
      // Loop back to first unanswered or flagged if at end, else stay
      const nextIdx = questions.findIndex((q, idx) => idx > currentIndex && (!examAnswers[q.id] || flaggedQuestions[q.id]));
      if (nextIdx !== -1) {
        setCurrentIndex(nextIdx);
      } else {
        toast.info('You have reached the end. Review your answers or click Submit Exam.');
      }
      return;
    }

    if (currentIndex + 1 >= questions.length) {
      if (mode === 'practice') setQuizComplete(true);
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
      <div className="max-w-2xl mx-auto space-y-8 animate-fade-in py-8">
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
                <span className="text-sm text-gray-300 flex-1 line-clamp-1">Q{questions.findIndex(q => q.id === fb.question_id) + 1}: {questions.find(q => q.id === fb.question_id)?.question_text?.substring(0, 80)}...</span>
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

  const getOptionClass = (label: string, isExam: boolean, qId: number) => {
    if (isExam) {
      const isSelected = examAnswers[qId] === label;
      return isSelected ? 'bg-white/10 border border-white/30 text-white' : 'bg-white/5 border border-transparent text-gray-400 hover:bg-white/10';
    }

    if (!feedback) return selectedAnswer === label ? 'selected border-emerald-500/30 bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-gray-400';
    if (label === feedback.correct_answer) return 'bg-emerald-500 text-white border-emerald-500';
    if (label === feedback.selected_answer && !feedback.is_correct) return 'bg-rose-500 text-white border-rose-500';
    return 'opacity-50 bg-white/5 text-gray-500';
  };

  // EXAM MODE RENDER
  if (mode === 'exam') {
    const filteredQuestions = questions.map((q, idx) => ({ q, idx })).filter(({ q }) => {
      if (searchQuery && !q.question_text.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterMode === 'flagged' && !flaggedQuestions[q.id]) return false;
      if (filterMode === 'unanswered' && examAnswers[q.id]) return false;
      return true;
    });

    return (
      <div className="flex h-[calc(100vh-80px)] -mx-6 -mt-6 bg-slate-950 overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 border-r border-white/5 flex flex-col bg-slate-900 shrink-0">
          <div className="p-4 border-b border-white/5 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input type="text" placeholder="Search Questions..." 
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            {/* Filters */}
            <div className="flex gap-2">
              <button onClick={() => setFilterMode(filterMode === 'flagged' ? 'all' : 'flagged')} 
                className={`flex-1 py-1.5 text-xs font-medium rounded-full border transition-colors ${filterMode === 'flagged' ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-slate-800 border-slate-700 text-gray-400 hover:text-white hover:bg-slate-700'}`}>
                Flagged
              </button>
              <button onClick={() => setFilterMode(filterMode === 'unanswered' ? 'all' : 'unanswered')} 
                className={`flex-1 py-1.5 text-xs font-medium rounded-full border transition-colors ${filterMode === 'unanswered' ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-slate-800 border-slate-700 text-gray-400 hover:text-white hover:bg-slate-700'}`}>
                Unanswered
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {filteredQuestions.map(({ q, idx }) => (
              <button key={q.id} onClick={() => setCurrentIndex(idx)}
                className={`w-full text-left p-3 rounded-xl transition-all border ${currentIndex === idx ? 'bg-white text-slate-900 border-white shadow-lg shadow-white/10' : 'bg-slate-800/50 border-slate-700/50 text-gray-300 hover:bg-slate-800 hover:border-slate-600'}`}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className={`font-semibold text-sm ${currentIndex === idx ? 'text-slate-900' : 'text-gray-300'}`}>Question {idx + 1}</span>
                  <div className="flex gap-1.5">
                    {flaggedQuestions[q.id] && <Flag className={`w-3.5 h-3.5 ${currentIndex === idx ? 'text-amber-600' : 'text-amber-400'}`} />}
                    {examAnswers[q.id] && <CheckCircle className={`w-3.5 h-3.5 ${currentIndex === idx ? 'text-emerald-600' : 'text-emerald-400'}`} />}
                  </div>
                </div>
                <p className={`text-xs line-clamp-2 leading-relaxed ${currentIndex === idx ? 'text-slate-700' : 'text-gray-500'}`}>{q.question_text}</p>
              </button>
            ))}
            {filteredQuestions.length === 0 && (
               <div className="text-center p-4 text-sm text-gray-500">No questions match your filters.</div>
            )}
          </div>
          
          <div className="p-4 border-t border-white/5 bg-slate-900/50 backdrop-blur-md">
            <button onClick={submitExam} disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2">
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              Submit Exam
            </button>
          </div>
        </div>

        {/* Main Area */}
        <div className="flex-1 flex flex-col h-full relative">
          {/* Header */}
          <div className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-slate-900/50 backdrop-blur-md shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-gray-400 font-medium text-sm">Question {currentIndex + 1} of {questions.length}</span>
              <div className="h-4 w-px bg-white/10" />
              <span className="text-gray-500 text-sm truncate max-w-xs">{categoryName}</span>
            </div>
            <div className="flex items-center gap-6">
              <button onClick={() => setNotesPanelOpen(!notesPanelOpen)} className={`text-sm flex items-center gap-2 transition-colors font-medium ${notesPanelOpen ? 'text-blue-400' : 'text-gray-400 hover:text-white'}`}>
                <StickyNote className="w-4 h-4" /> {notesPanelOpen ? 'Close Notes' : 'Notes'}
              </button>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-sm font-medium shadow-inner ${timeLeft !== null && timeLeft < 300 ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-slate-800 text-gray-300 border border-slate-700'}`}>
                <Clock className="w-4 h-4" />
                {timeLeft !== null ? formatTime(timeLeft) : '00:00'}
              </div>
            </div>
          </div>

          {/* Question Content */}
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative">
            <div className="max-w-3xl mx-auto pb-12 animate-fade-in">
              {/* Toolbar */}
              <div className="flex justify-end mb-4 gap-2">
                <button onClick={handleHighlight} className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-gray-400 hover:text-yellow-400 transition-colors border border-slate-700 hover:border-slate-600" title="Highlight Selected Text">
                  <PenTool className="w-4 h-4" />
                </button>
                <button onClick={clearHighlights} className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-gray-400 hover:text-white transition-colors border border-slate-700 hover:border-slate-600" title="Clear Highlights">
                  <Eraser className="w-4 h-4" />
                </button>
              </div>

              {/* Question Text */}
              <div className="prose prose-invert max-w-none mb-8">
                <p className="text-slate-200 text-lg md:text-xl leading-relaxed whitespace-pre-wrap selection:bg-blue-500/30 selection:text-blue-100">{question.question_text}</p>
              </div>
              
              {question.image_url && (
                <div className="mb-8 rounded-2xl overflow-hidden border border-slate-800 bg-slate-900/50 p-2">
                  <img src={`${process.env.NEXT_PUBLIC_API_URL}${question.image_url}`} alt="Clinical image" className="max-w-full h-auto max-h-96 mx-auto object-contain rounded-xl" />
                </div>
              )}

              {/* Options */}
              <div className="space-y-3 mb-10">
                {options.map(opt => (
                  <button key={opt.label} onClick={() => submitAnswer(opt.label)} className={`w-full text-left p-4 rounded-xl transition-all flex gap-4 items-center group ${getOptionClass(opt.label, true, question.id)}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${examAnswers[question.id] === opt.label ? 'bg-white text-slate-900 shadow-md' : 'bg-slate-800 text-gray-400 group-hover:bg-slate-700 group-hover:text-gray-200'}`}>
                      {opt.label}
                    </div>
                    <span className={`text-base leading-relaxed ${examAnswers[question.id] === opt.label ? 'text-white font-medium' : 'text-gray-300'}`}>{opt.text}</span>
                  </button>
                ))}
              </div>

              {/* Action Bar */}
              <div className="flex justify-between items-center pt-6 border-t border-slate-800">
                <button onClick={() => setFlaggedQuestions(p => ({...p, [question.id]: !p[question.id]}))} className={`flex items-center gap-2 text-sm font-medium transition-colors px-4 py-2 rounded-lg ${flaggedQuestions[question.id] ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' : 'bg-slate-800 text-gray-400 hover:text-white hover:bg-slate-700'}`}>
                  <Flag className="w-4 h-4" /> {flaggedQuestions[question.id] ? 'Flagged for Review' : 'See Later'}
                </button>
                <button onClick={nextQuestion} className="btn-primary flex items-center gap-2 px-6 py-2.5 shadow-lg shadow-emerald-500/20">
                  {currentIndex + 1 >= questions.length ? 'Review Exam' : 'Next Question'} <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Notes Panel */}
              {notesPanelOpen && (
                <div className="mt-8 p-6 rounded-2xl bg-slate-800/50 border border-slate-700/50 animate-slide-up backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <StickyNote className="w-4 h-4 text-blue-400" /> My Notes
                    </h3>
                    {loadingNote && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
                  </div>
                  <textarea
                    value={currentNote}
                    onChange={(e) => setCurrentNote(e.target.value)}
                    placeholder="Type your personal notes for this question here. These are saved privately to your account."
                    className="w-full h-32 bg-slate-900 border border-slate-700 rounded-xl p-4 text-sm text-gray-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 resize-none mb-4"
                  />
                  <div className="flex justify-end">
                    <button onClick={saveNote} disabled={savingNote || loadingNote} className="btn-secondary flex items-center gap-2 bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20 hover:border-blue-500/30">
                      {savingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Note
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // PRACTICE MODE RENDER (Original layout)
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Progress bar */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-400">{categoryName}</span>
          <div className="flex items-center gap-4">
            <button onClick={() => setNotesPanelOpen(!notesPanelOpen)} className={`text-sm flex items-center gap-1.5 transition-colors ${notesPanelOpen ? 'text-blue-400' : 'text-gray-400 hover:text-white'}`}>
              <StickyNote className="w-4 h-4" /> {notesPanelOpen ? 'Close Notes' : 'Notes'}
            </button>
            <span className="text-sm font-medium text-white">Question {currentIndex + 1} of {questions.length}</span>
          </div>
        </div>
        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="glass-card p-8 animate-slide-up relative">
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <button onClick={handleHighlight} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-yellow-400 transition-colors" title="Highlight Selected Text">
            <PenTool className="w-4 h-4" />
          </button>
          <button onClick={clearHighlights} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="Clear Highlights">
            <Eraser className="w-4 h-4" />
          </button>
        </div>

        <div className="prose prose-invert max-w-none mb-6 mt-4">
          <p className="text-white text-lg leading-relaxed whitespace-pre-wrap selection:bg-emerald-500/30 selection:text-emerald-100">{question.question_text}</p>
        </div>

        {question.image_url && (
          <div className="mb-6">
            <img src={`${process.env.NEXT_PUBLIC_API_URL}${question.image_url}`} alt="Clinical image"
              className="w-full max-h-80 object-contain rounded-xl bg-black/20" />
          </div>
        )}

        <div className="space-y-3">
          {options.map((opt) => (
            <button
              key={opt.label}
              onClick={() => submitAnswer(opt.label)}
              disabled={!!feedback || submitting}
              className={`quiz-option w-full text-left flex gap-3 p-3 rounded-xl transition-all ${getOptionClass(opt.label, false, question.id)}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 transition-all ${
                feedback && opt.label === feedback.correct_answer ? 'bg-emerald-500 text-white' :
                feedback && opt.label === feedback.selected_answer && !feedback.is_correct ? 'bg-rose-500 text-white' :
                selectedAnswer === opt.label ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                'bg-white/5 text-gray-400'
              }`}>
                {feedback && opt.label === feedback.correct_answer ? <CheckCircle className="w-5 h-5" /> :
                 feedback && opt.label === feedback.selected_answer && !feedback.is_correct ? <XCircle className="w-5 h-5" /> :
                 opt.label}
              </div>
              <span className="text-sm text-gray-200 flex-1 mt-2.5">{opt.text}</span>
            </button>
          ))}
        </div>

        {feedback && (
          <div className="mt-6 animate-slide-up space-y-4">
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

            <button onClick={nextQuestion} className="btn-primary w-full flex items-center justify-center gap-2">
              {currentIndex + 1 >= questions.length ? 'View Results' : 'Next Question'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {notesPanelOpen && (
          <div className="mt-6 border-t border-white/10 pt-6 animate-slide-up">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-blue-400" /> My Notes
              </h3>
              {loadingNote && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
            </div>
            <textarea
              value={currentNote}
              onChange={(e) => setCurrentNote(e.target.value)}
              placeholder="Type your personal notes for this question here. These are saved privately to your account."
              className="w-full h-32 bg-black/20 border border-white/10 rounded-xl p-4 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 resize-none mb-3"
            />
            <div className="flex justify-end">
              <button onClick={saveNote} disabled={savingNote || loadingNote} className="btn-secondary flex items-center gap-2 bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20 hover:border-blue-500/30">
                {savingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Note
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
