'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Search, Filter, ChevronLeft, ChevronRight, Eye, Trash2, Upload, Pencil } from 'lucide-react';
import { BulkImportModal } from '@/components/admin/BulkImportModal';

interface Question {
  id: number;
  question_text: string;
  category_name: string;
  difficulty: string;
  status: string;
  created_at: string;
}

export default function QuestionsPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const pageSize = 15;

  useEffect(() => { loadQuestions(); }, [page, statusFilter]);

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const params: any = { page, page_size: pageSize };
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      const { data } = await api.get('/questions', { params });
      setQuestions(data.questions);
      setTotal(data.total);
    } catch (err) {
      toast.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadQuestions();
  };

  const togglePublish = async (id: number) => {
    try {
      await api.patch(`/questions/${id}/publish`);
      toast.success('Status updated');
      loadQuestions();
    } catch { toast.error('Failed to update status'); }
  };

  const deleteQuestion = async (id: number) => {
    if (!confirm('Delete this question?')) return;
    try {
      await api.delete(`/questions/${id}`);
      toast.success('Question deleted');
      loadQuestions();
    } catch { toast.error('Failed to delete'); }
  };

  const totalPages = Math.ceil(total / pageSize);

  const getDifficultyColor = (d: string) => {
    if (d === 'easy') return 'badge-emerald';
    if (d === 'hard') return 'badge-rose';
    return 'badge-amber';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Questions</h1>
          <p className="text-gray-400 text-sm">{total} total questions</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setIsImportModalOpen(true)} className="btn-secondary flex items-center gap-2 py-2.5 px-4 text-sm">
            <Upload className="w-4 h-4" /> Import
          </button>
          <button onClick={() => router.push('/admin/questions/new')} className="btn-primary flex items-center gap-2 py-2.5 px-4 text-sm">
            <Plus className="w-4 h-4" /> New Question
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search questions..." className="input-field pl-10 py-2.5" />
        </form>
        <div className="flex gap-2">
          {['', 'draft', 'published'].map((s) => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                statusFilter === s ? 'bg-emerald-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}>
              {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Question</th>
                <th>Category</th>
                <th>Difficulty</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td><div className="skeleton h-4 w-64" /></td>
                    <td><div className="skeleton h-4 w-24" /></td>
                    <td><div className="skeleton h-4 w-16" /></td>
                    <td><div className="skeleton h-4 w-20" /></td>
                    <td><div className="skeleton h-4 w-24" /></td>
                  </tr>
                ))
              ) : questions.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-500">No questions found</td></tr>
              ) : (
                questions.map((q) => (
                  <tr key={q.id}>
                    <td className="max-w-md">
                      <p className="text-white line-clamp-2 text-sm" dangerouslySetInnerHTML={{ __html: q.question_text.substring(0, 120) + (q.question_text.length > 120 ? '...' : '') }} />
                    </td>
                    <td><span className="text-gray-300 text-sm">{q.category_name || '—'}</span></td>
                    <td><span className={getDifficultyColor(q.difficulty)}>{q.difficulty}</span></td>
                    <td>
                      <button onClick={() => togglePublish(q.id)}
                        className={q.status === 'published' ? 'badge-emerald cursor-pointer' : 'badge-amber cursor-pointer'}>
                        {q.status}
                      </button>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button onClick={() => router.push(`/admin/questions/${q.id}`)} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteQuestion(q.id)} className="p-1.5 rounded-lg hover:bg-rose-500/10 text-gray-400 hover:text-rose-400 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <p className="text-sm text-gray-400">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary py-1.5 px-3 text-sm disabled:opacity-30">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary py-1.5 px-3 text-sm disabled:opacity-30">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <BulkImportModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        onSuccess={() => { setPage(1); loadQuestions(); }} 
      />
    </div>
  );
}
