'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Loader2, TrendingUp, TrendingDown, Target, CheckCircle2, XCircle, Clock, BookOpen, Timer, Edit2, Trash2, ShieldAlert, Bookmark, NotepadText } from 'lucide-react';
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
    strongest_subcategory?: string;
    weakest_subcategory?: string;
  }[];
  recent_sessions: {
    session_id: string;
    category_name: string;
    mode: string;
    total_questions: number;
    score_percentage: number;
    quiz_name?: string;
    status: string;
    target_year?: number;
  }[];
}

export default function HistoryDashboard() {
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [bookmarksCount, setBookmarksCount] = useState(0);
  const [notesCount, setNotesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [renameState, setRenameState] = useState<{isOpen: boolean; sessionId: string; currentName: string; newName: string; saving: boolean}>({
    isOpen: false, sessionId: '', currentName: '', newName: '', saving: false
  });
  const [deleteState, setDeleteState] = useState<{isOpen: boolean; sessionId: string; deleting: boolean}>({
    isOpen: false, sessionId: '', deleting: false
  });

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const [res, bookmarksRes, notesRes] = await Promise.all([
        api.get('/analytics/me'),
        api.get('/bookmarks?page_size=1'),
        api.get('/notes?limit=1')
      ]);
      setData(res.data);
      setBookmarksCount(bookmarksRes.data.total);
      setNotesCount(notesRes.data.total);
    } catch (err) {
      toast.error('Failed to load history and analytics');
    } finally {
      setLoading(false);
    }
  };

  const openRenameModal = (sessionId: string, currentName: string) => {
    setRenameState({
      isOpen: true,
      sessionId,
      currentName,
      newName: currentName,
      saving: false
    });
  };

  const closeRenameModal = () => {
    setRenameState(p => ({ ...p, isOpen: false }));
  };

  const submitRename = async () => {
    const { sessionId, currentName, newName } = renameState;
    if (!newName || newName.trim() === '' || newName.trim() === currentName) {
      closeRenameModal();
      return;
    }
    
    setRenameState(p => ({ ...p, saving: true }));
    try {
      await api.patch(`/quiz/${sessionId}/rename`, { quiz_name: newName.trim() });
      toast.success('Quiz renamed successfully');
      loadAnalytics();
      closeRenameModal();
    } catch {
      toast.error('Failed to rename quiz');
      setRenameState(p => ({ ...p, saving: false }));
    }
  };

  const openDeleteModal = (sessionId: string) => {
    setDeleteState({ isOpen: true, sessionId, deleting: false });
  };

  const closeDeleteModal = () => {
    setDeleteState(p => ({ ...p, isOpen: false }));
  };

  const submitDelete = async () => {
    const { sessionId } = deleteState;
    setDeleteState(p => ({ ...p, deleting: true }));
    try {
      await api.delete(`/quiz/${sessionId}`);
      toast.success('Quiz deleted successfully');
      loadAnalytics();
      closeDeleteModal();
    } catch {
      toast.error('Failed to delete quiz');
      setDeleteState(p => ({ ...p, deleting: false }));
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

  // Calculate Strongest/Weakest modules (minimum 1 question answered to count)
  const activeCategories = data.categories.filter(c => c.answered_count >= 1).sort((a, b) => b.accuracy_percentage - a.accuracy_percentage);
  
  let strongest: typeof activeCategories = [];
  let weakest: typeof activeCategories = [];

  if (activeCategories.length > 0) {
    const halfIndex = Math.ceil(activeCategories.length / 2);
    strongest = activeCategories.slice(0, Math.min(3, halfIndex));
    const remaining = activeCategories.slice(strongest.length);
    weakest = [...remaining].reverse().slice(0, 3);
  }

  // Group sessions by target_year
  const groupedSessions = data.recent_sessions.reduce((acc, session) => {
    const year = session.target_year ? `Year ${session.target_year}` : 'Other Sessions';
    if (!acc[year]) acc[year] = [];
    acc[year].push(session);
    return acc;
  }, {} as Record<string, typeof data.recent_sessions>);

  // Sort groups: Year N first, Other Sessions last
  const sortedYearGroups = Object.keys(groupedSessions).sort((a, b) => {
    if (a === 'Other Sessions') return 1;
    if (b === 'Other Sessions') return -1;
    return b.localeCompare(a);
  });

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Bookmarked Questions Card */}
        <div className="glass-card p-6 flex flex-col justify-between bg-gradient-to-br from-slate-900 to-amber-950/20 border border-amber-500/10">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-2">
              <Bookmark className="w-5 h-5 text-amber-400" /> Bookmarked Questions
            </h2>
            <p className="text-sm text-gray-400">Review your saved questions and study them like flashcards. <span className="text-amber-400 font-bold ml-1 border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 rounded-md">({bookmarksCount} saved)</span></p>
          </div>
          <button 
            onClick={() => router.push('/student/bookmarks')} 
            className="w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-500/30 border border-amber-400/30"
          >
            Review Bookmarks
          </button>
        </div>

        {/* Incorrect Answers Card */}
        <div className="glass-card p-6 flex flex-col justify-between bg-gradient-to-br from-slate-900 to-rose-950/20 border border-rose-500/10">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-2">
              <XCircle className="w-5 h-5 text-rose-400" /> Incorrect Answers
            </h2>
            <p className="text-sm text-gray-400">Review questions you've answered incorrectly. <span className="text-rose-400 font-bold ml-1 border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 rounded-md">({data.overall.incorrect_count || 0} questions)</span></p>
          </div>
          <button 
            onClick={() => router.push('/student/incorrect')} 
            className="w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-500/30 border border-rose-400/30"
          >
            Review Incorrect Answers
          </button>
        </div>

        {/* My Notes Card */}
        <div className="glass-card p-6 flex flex-col justify-between bg-gradient-to-br from-slate-900 to-blue-950/20 border border-blue-500/10">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-2">
              <NotepadText className="w-5 h-5 text-blue-400" /> My Notes
            </h2>
            <p className="text-sm text-gray-400">Review and search all the notes you've taken on questions. <span className="text-blue-400 font-bold ml-1 border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 rounded-md">({notesCount} saved)</span></p>
          </div>
          <button 
            onClick={() => router.push('/student/notes')} 
            className="w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/30 border border-blue-400/30"
          >
            Review Notes
          </button>
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
                <div key={cat.category_id}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm font-medium text-gray-200 flex flex-col">
                      <span className="flex items-center gap-1.5">{cat.category_icon} {cat.category_name}</span>
                      {cat.strongest_subcategory && <span className="text-xs text-emerald-400/80 mt-0.5 ml-6">Best Topic: {cat.strongest_subcategory}</span>}
                    </span>
                    <span className="text-sm font-bold text-emerald-400">{cat.accuracy_percentage}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${cat.accuracy_percentage}%` }}></div>
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
                <div key={cat.category_id}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm font-medium text-gray-200 flex flex-col">
                      <span className="flex items-center gap-1.5">{cat.category_icon} {cat.category_name}</span>
                      {cat.weakest_subcategory && <span className="text-xs text-rose-400/80 mt-0.5 ml-6">Needs Work: {cat.weakest_subcategory}</span>}
                    </span>
                    <span className="text-sm font-bold text-rose-400">{cat.accuracy_percentage}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: `${cat.accuracy_percentage}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quiz Sessions History Table */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
          <Clock className="w-5 h-5 text-blue-400" /> Quiz Sessions History
        </h2>
        {data.recent_sessions.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-500 mb-4">You haven't taken any quizzes recently.</p>
            <button onClick={() => router.push('/student/dashboard')} className="btn-primary">Study Now</button>
          </div>
        ) : (
          <div className="space-y-10">
            {sortedYearGroups.map((year) => (
              <div key={year} className="space-y-4">
                <h3 className="text-md font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 inline-block px-4 py-1.5 rounded-lg shadow-sm">
                  {year}
                </h3>
                <div className="overflow-x-auto bg-slate-900/50 rounded-xl border border-white/5">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 bg-slate-800/50">
                        <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                        <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Quiz Name</th>
                        <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Mode</th>
                        <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Questions</th>
                        <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Score</th>
                        <th className="py-3 px-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {groupedSessions[year].map((session) => (
                        <tr key={session.session_id} className="hover:bg-white/5 transition-colors">
                          <td className="py-4 px-4 text-sm text-gray-300 whitespace-nowrap">
                            {new Date(session.created_at).toLocaleDateString()} {new Date(session.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </td>
                          <td className="py-4 px-4 text-sm font-medium text-white">{session.quiz_name || session.category_name}</td>
                          <td className="py-4 px-4 text-sm whitespace-nowrap">
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
                          <td className="py-4 px-4 text-sm text-gray-400 whitespace-nowrap">{session.total_questions} Qs</td>
                          <td className="py-4 px-4 text-sm font-bold whitespace-nowrap">
                            <span className={session.score_percentage >= 70 ? 'text-emerald-400' : session.score_percentage >= 50 ? 'text-amber-400' : 'text-rose-400'}>
                              {session.score_percentage}%
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {session.status === 'in_progress' ? (
                                <button onClick={() => router.push(`/student/quiz/session/${session.session_id}`)} className="text-xs font-semibold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded-lg transition-colors">
                                  Resume
                                </button>
                              ) : (
                                <button onClick={() => router.push(`/student/history/review/${session.session_id}`)} className="text-xs font-semibold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-lg transition-colors">
                                  Review
                                </button>
                              )}
                              <button onClick={() => openRenameModal(session.session_id, session.quiz_name || session.category_name)} className="p-1.5 text-gray-400 hover:text-amber-400 bg-white/5 hover:bg-amber-500/10 rounded-lg transition-colors" title="Rename Quiz">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => openDeleteModal(session.session_id)} className="p-1.5 text-gray-400 hover:text-rose-400 bg-white/5 hover:bg-rose-500/10 rounded-lg transition-colors" title="Delete Quiz">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rename Modal */}
      {renameState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-slide-up relative mx-4">
            <h3 className="text-xl font-bold text-white mb-2">Rename Quiz</h3>
            <p className="text-sm text-gray-400 mb-6">Enter a new name for this quiz session.</p>
            
            <input 
              type="text" 
              autoFocus
              value={renameState.newName} 
              onChange={e => {
                const val = e.target.value;
                setRenameState(p => ({ ...p, newName: val }));
              }}
              placeholder="e.g. Midterm Prep"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 mb-6"
              onKeyDown={e => {
                if (e.key === 'Enter') submitRename();
                if (e.key === 'Escape') closeRenameModal();
              }}
            />
            
            <div className="flex justify-end gap-3">
              <button 
                onClick={closeRenameModal}
                className="px-5 py-2.5 rounded-xl font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors border border-transparent"
              >
                Cancel
              </button>
              <button 
                onClick={submitRename}
                disabled={renameState.saving}
                className="px-5 py-2.5 rounded-xl font-medium text-amber-950 bg-amber-400 hover:bg-amber-300 transition-colors shadow-lg shadow-amber-500/20 flex items-center gap-2 disabled:opacity-50"
              >
                {renameState.saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit2 className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-slide-up relative mx-4">
            <div className="flex items-center gap-3 mb-2 text-rose-500">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="text-xl font-bold text-white">Delete Quiz</h3>
            </div>
            <p className="text-sm text-gray-400 mb-6 leading-relaxed">
              Are you sure you want to delete this quiz? Your progress for these questions will be completely reset and this action cannot be undone.
            </p>
            
            <div className="flex justify-end gap-3">
              <button 
                onClick={closeDeleteModal}
                className="px-5 py-2.5 rounded-xl font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors border border-transparent"
              >
                Cancel
              </button>
              <button 
                onClick={submitDelete}
                disabled={deleteState.deleting}
                className="px-5 py-2.5 rounded-xl font-medium text-white bg-rose-500 hover:bg-rose-400 transition-colors shadow-lg shadow-rose-500/20 flex items-center gap-2 disabled:opacity-50"
              >
                {deleteState.deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete Quiz
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
