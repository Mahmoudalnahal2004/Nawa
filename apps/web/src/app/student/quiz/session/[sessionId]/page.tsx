'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';
import { toast } from 'sonner';
import { ArrowRight, ArrowLeft, CheckCircle, XCircle, Loader2, Trophy, RotateCcw, Home, ChevronRight, PenTool, StickyNote, Eraser, Save, Flag, Search, Clock, Menu, Bookmark } from 'lucide-react';

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
  const [quizName, setQuizName] = useState<string | null>(null);
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
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

  // Sync Practice Mode State
  useEffect(() => {
    if (questions.length > 0 && mode === 'practice') {
      const currentQ = questions[currentIndex];
      const existingFeedback = allFeedback.find(f => f.question_id === currentQ.id);
      if (existingFeedback) {
        setSelectedAnswer(existingFeedback.selected_answer);
        setFeedback(existingFeedback);
      } else {
        setSelectedAnswer(null);
        setFeedback(null);
      }
    }
  }, [currentIndex, questions, mode, allFeedback]);

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
      setQuizName(data.quiz_name || null);
      setMode(data.mode || 'practice');
      
      const restoredIndex = data.current_question_index || 0;
      setCurrentIndex(restoredIndex);

      if (data.mode === 'exam') {
        if (data.exam_answers) {
          const restoredAnswers: Record<number, string> = {};
          for (const [k, v] of Object.entries(data.exam_answers)) {
            restoredAnswers[parseInt(k)] = v as string;
          }
          setExamAnswers(restoredAnswers);
        }
        if (data.flagged_questions) {
          const restoredFlags: Record<number, boolean> = {};
          for (const [k, v] of Object.entries(data.flagged_questions)) {
            restoredFlags[parseInt(k)] = v as boolean;
          }
          setFlaggedQuestions(restoredFlags);
        }
      } else if (data.answers && data.answers.length > 0) {
        setAllFeedback(data.answers);
        // Check if the current question already has an answer
        const currentQ = data.questions[restoredIndex];
        const existingAnswer = data.answers.find((a: any) => a.question_id === currentQ?.id);
        if (existingAnswer) {
          setSelectedAnswer(existingAnswer.selected_answer);
          setFeedback(existingAnswer);
        }
      }
    } catch {
      toast.error('Failed to load quiz');
      router.push('/student/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async () => {
    try {
      const payload: any = {
        current_question_index: currentIndex
      };
      
      if (mode === 'exam') {
        payload.exam_answers = examAnswers;
        payload.flagged_questions = flaggedQuestions;
      }
      
      await api.post(`/quiz/${sessionId}/pause`, payload);
      toast.success('Quiz progress saved successfully');
      router.push('/student/history');
    } catch {
      toast.error('Failed to save quiz progress');
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
    
    const unansweredCount = questions.filter(q => (mode === 'exam' ? !examAnswers[q.id] : false)).length;
    if (mode === 'exam' && timeLeft !== 0 && unansweredCount > 0) {
      if (!window.confirm(`You have ${unansweredCount} unanswered questions. Are you sure you want to submit?`)) {
        return;
      }
    }

    setSubmitting(true);
    try {
      if (mode === 'exam') {
        const answersList = Object.entries(examAnswers).map(([qId, ans]) => ({
          question_id: parseInt(qId),
          selected_answer: ans
        }));
        await api.post(`/quiz/${sessionId}/batch_answer`, { answers: answersList });
      }
      
      await api.post(`/quiz/${sessionId}/submit`);
      router.push(`/student/quiz/summary/${sessionId}`);
    } catch (e) {
      toast.error('Failed to submit exam');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleBookmark = async () => {
    const qId = questions[currentIndex].id;
    const isCurrentlyFlagged = !!flaggedQuestions[qId];
    
    // Optimistic UI update
    setFlaggedQuestions(p => ({ ...p, [qId]: !isCurrentlyFlagged }));
    
    try {
      if (isCurrentlyFlagged) {
        await api.delete(`/bookmarks/${qId}`);
        toast.success('Removed from bookmarks');
      } else {
        await api.post(`/bookmarks/${qId}`);
        toast.success('Added to bookmarks');
      }
    } catch (err) {
      // Revert on error
      setFlaggedQuestions(p => ({ ...p, [qId]: isCurrentlyFlagged }));
      toast.error('Failed to update bookmark');
    }
  };

  const previousQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const nextQuestion = () => {
    if (mode === 'exam' && currentIndex + 1 >= questions.length) {
      const nextIdx = questions.findIndex((q, idx) => idx > currentIndex && (!examAnswers[q.id] || flaggedQuestions[q.id]));
      if (nextIdx !== -1) {
        setCurrentIndex(nextIdx);
      } else {
        toast.info('You have reached the end. Review your answers or click Submit Exam.');
      }
      return;
    }

    if (currentIndex + 1 >= questions.length) {
      submitExam();
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
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
  ].filter(opt => opt.text && opt.text.trim() !== '');

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

  const getSidebarItemStyles = (q: QuizQuestion, idx: number) => {
    const isActive = currentIndex === idx;
    const fb = mode === 'practice' ? allFeedback.find(f => f.question_id === q.id) : null;
    const isAnsweredExam = mode === 'exam' && !!examAnswers[q.id];

    if (fb) {
      if (fb.is_correct) {
        return {
          card: isActive ? 'bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/20' : 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20',
          title: isActive ? 'text-white' : 'text-emerald-400',
          desc: isActive ? 'text-emerald-50' : 'text-emerald-500/70',
          icon: isActive ? 'text-white' : 'text-emerald-400',
        };
      } else {
        return {
          card: isActive ? 'bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-500/20' : 'bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/20',
          title: isActive ? 'text-white' : 'text-rose-400',
          desc: isActive ? 'text-rose-50' : 'text-rose-500/70',
          icon: isActive ? 'text-white' : 'text-rose-400',
        };
      }
    }

    if (isAnsweredExam) {
      return {
        card: isActive ? 'bg-blue-500 text-white border-blue-400 shadow-lg shadow-blue-500/20' : 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20',
        title: isActive ? 'text-white' : 'text-blue-400',
        desc: isActive ? 'text-blue-50' : 'text-blue-500/70',
        icon: isActive ? 'text-white' : 'text-blue-400',
      };
    }

    // Default
    return {
      card: isActive ? 'bg-white text-slate-900 border-white shadow-lg shadow-white/10' : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600',
      title: isActive ? 'text-slate-900' : 'text-gray-300',
      desc: isActive ? 'text-slate-600' : 'text-gray-500',
      icon: isActive ? 'text-slate-400' : 'text-gray-400', 
    };
  };

  // UNIFIED RENDER
  const filteredQuestions = questions.map((q, idx) => ({ q, idx })).filter(({ q }) => {
    if (searchQuery && !q.question_text.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterMode === 'flagged' && !flaggedQuestions[q.id]) return false;
    if (filterMode === 'unanswered') {
      if (mode === 'exam' && examAnswers[q.id]) return false;
      if (mode === 'practice' && allFeedback.some(f => f.question_id === q.id)) return false;
    }
    return true;
  });

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* Sidebar */}
      <div className={`transition-all duration-300 flex flex-col bg-slate-900 shrink-0 overflow-hidden ${isSidebarOpen ? 'w-80 border-r border-white/5' : 'w-0 border-r-0'}`}>
        <div className="w-80 flex flex-col h-full">
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
          {filteredQuestions.map(({ q, idx }) => {
            const styles = getSidebarItemStyles(q, idx);
            return (
            <button key={q.id} onClick={() => setCurrentIndex(idx)}
              className={`w-full text-left p-3 rounded-xl transition-all border ${styles.card}`}>
              <div className="flex justify-between items-center mb-1.5">
                <span className={`font-semibold text-sm ${styles.title}`}>Question {idx + 1}</span>
                <div className="flex gap-1.5">
                  {flaggedQuestions[q.id] && <Bookmark className={`w-3.5 h-3.5 ${currentIndex === idx ? 'text-amber-600' : 'text-amber-500'}`} />}
                  {mode === 'exam' && examAnswers[q.id] && <CheckCircle className={`w-3.5 h-3.5 ${styles.icon}`} />}
                  {mode === 'practice' && (() => {
                    const fb = allFeedback.find(f => f.question_id === q.id);
                    if (!fb) return null;
                    return fb.is_correct 
                      ? <CheckCircle className={`w-3.5 h-3.5 ${styles.icon}`} />
                      : <XCircle className={`w-3.5 h-3.5 ${styles.icon}`} />
                  })()}
                </div>
              </div>
              <p className={`text-xs line-clamp-2 leading-relaxed ${styles.desc}`}>{q.question_text}</p>
            </button>
          )})}
          {filteredQuestions.length === 0 && (
             <div className="text-center p-4 text-sm text-gray-500">No questions match your filters.</div>
          )}
        </div>
      </div></div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col h-full relative">
        {/* Header */}
        <div className="h-16 border-b border-white/5 flex items-center justify-between px-4 lg:px-8 bg-slate-900/50 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 -ml-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-gray-400 font-medium text-sm ml-2">Question {currentIndex + 1} of {questions.length}</span>
            <div className="h-4 w-px bg-white/10" />
            <span className="text-gray-500 text-sm truncate max-w-xs">{quizName || categoryName}</span>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => setNotesPanelOpen(!notesPanelOpen)} className={`text-sm flex items-center gap-2 transition-colors font-medium ${notesPanelOpen ? 'text-blue-400' : 'text-gray-400 hover:text-white'}`}>
              <StickyNote className="w-4 h-4" /> {notesPanelOpen ? 'Close Notes' : 'Notes'}
            </button>
            {mode === 'exam' && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-sm font-medium shadow-inner ${timeLeft !== null && timeLeft < 300 ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-slate-800 text-gray-300 border border-slate-700'}`}>
                <Clock className="w-4 h-4" />
                {timeLeft !== null ? formatTime(timeLeft) : '00:00'}
              </div>
            )}
            <button onClick={handlePause} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white transition-colors border border-white/10 text-sm font-medium">
              <XCircle className="w-4 h-4" /> Save & Exit
            </button>
          </div>
        </div>

        {/* Question Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar relative">
          <div className="max-w-4xl mx-auto px-4 lg:px-8 pb-12 animate-fade-in">
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
            <div className="space-y-4 mb-4">
              {options.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => submitAnswer(opt.label)}
                  disabled={mode === 'practice' && (!!feedback || submitting)}
                  className={`w-full text-left p-4 rounded-xl transition-all flex gap-4 items-center group ${getOptionClass(opt.label, mode === 'exam', question.id)}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 transition-all ${
                    mode === 'exam' 
                    ? (examAnswers[question.id] === opt.label ? 'bg-white text-slate-900 shadow-md' : 'bg-slate-800 text-gray-400 group-hover:bg-slate-700 group-hover:text-gray-200')
                    : (feedback && opt.label === feedback.correct_answer ? 'bg-emerald-500 text-white' :
                       feedback && opt.label === feedback.selected_answer && !feedback.is_correct ? 'bg-rose-500 text-white' :
                       selectedAnswer === opt.label ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                       'bg-slate-800 text-gray-400 group-hover:bg-slate-700 group-hover:text-gray-200')
                  }`}>
                    {mode === 'practice' && feedback && opt.label === feedback.correct_answer ? <CheckCircle className="w-5 h-5" /> :
                     mode === 'practice' && feedback && opt.label === feedback.selected_answer && !feedback.is_correct ? <XCircle className="w-5 h-5" /> :
                     opt.label}
                  </div>
                  <span className={`text-base leading-relaxed ${
                    mode === 'exam' 
                    ? (examAnswers[question.id] === opt.label ? 'text-white font-medium' : 'text-gray-300')
                    : (mode === 'practice' && (feedback?.correct_answer === opt.label || (feedback?.selected_answer === opt.label && !feedback?.is_correct) || selectedAnswer === opt.label) ? 'text-white font-medium' : 'text-gray-300')
                  }`}>{opt.text}</span>
                </button>
              ))}
            </div>

            {/* Practice Mode Feedback Block */}
            {mode === 'practice' && feedback && (
              <div className="mt-6 animate-slide-up space-y-4 mb-4">
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
              </div>
            )}

            {/* Action Bar */}
            <div className="flex justify-between items-center mt-8 mb-4">
              <button onClick={toggleBookmark} className={`flex items-center gap-2 text-sm font-medium transition-colors px-4 py-2 rounded-lg ${flaggedQuestions[question.id] ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' : 'bg-slate-800 text-gray-400 hover:text-white hover:bg-slate-700'}`}>
                <Bookmark className="w-4 h-4" /> {flaggedQuestions[question.id] ? 'Bookmarked' : 'Bookmark Question'}
              </button>
              <div className="flex items-center gap-3">
                <button onClick={previousQuestion} disabled={currentIndex === 0} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all ${currentIndex === 0 ? 'bg-slate-800/50 text-gray-600 cursor-not-allowed' : 'bg-slate-800 text-gray-300 hover:bg-slate-700 hover:text-white'}`}>
                  <ArrowLeft className="w-4 h-4" /> Previous
                </button>
                <button onClick={currentIndex + 1 >= questions.length ? submitExam : nextQuestion} className="btn-primary flex items-center gap-2 px-6 py-2.5 shadow-lg shadow-emerald-500/20">
                  {currentIndex + 1 >= questions.length ? 'Submit' : 'Next Question'} <ArrowRight className="w-4 h-4" />
                </button>
              </div>
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
