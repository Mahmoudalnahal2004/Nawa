'use client';

import { Fragment, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Search, Filter, ChevronLeft, ChevronRight, ChevronDown, Eye, Trash2, Upload, Pencil } from 'lucide-react';
import { BulkImportModal } from '@/components/admin/BulkImportModal';
import { PdfImportPreviewModal } from '@/components/admin/PdfImportPreviewModal';

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
  const searchParams = useSearchParams();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [parsedQuestions, setParsedQuestions] = useState<any[]>([]);
  const [expandedMainCats, setExpandedMainCats] = useState<Record<string, boolean>>({});
  const [expandedSubCats, setExpandedSubCats] = useState<Record<string, boolean>>({});
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});
  const pageSize = 15;

  const toggleMainCat = (mainCat: string) => {
    setExpandedMainCats(prev => ({ ...prev, [mainCat]: !prev[mainCat] }));
  };

  const toggleSubCat = (mainCat: string, subCat: string) => {
    const key = `${mainCat}-${subCat}`;
    setExpandedSubCats(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleTopic = (mainCat: string, subCat: string, topic: string) => {
    const key = `${mainCat}-${subCat}-${topic}`;
    setExpandedTopics(prev => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    if (searchParams.get('importCategoryId')) {
      setIsImportModalOpen(true);
    }
  }, [searchParams]);

  useEffect(() => { loadQuestions(); }, [page, statusFilter, yearFilter]);

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const params: any = { page, page_size: pageSize };
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      if (yearFilter && yearFilter !== 'All') params.target_year = yearFilter;
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

  const handleBulkStatus = async (questionIds: number[], status: string) => {
    if (!questionIds.length) return;
    try {
      await api.patch('/questions/bulk/status', { question_ids: questionIds, status });
      toast.success(`Questions marked as ${status}`);
      loadQuestions();
    } catch {
      toast.error('Failed to update status');
    }
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
          <select
            value={yearFilter}
            onChange={(e) => { setYearFilter(e.target.value); setPage(1); }}
            className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-emerald-500 text-sm"
          >
            <option value="All">All Years</option>
            <option value="Global">Global (No Year)</option>
            {[1, 2, 3, 4, 5].map(y => (
              <option key={y} value={y}>Year {y}</option>
            ))}
          </select>
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
                <th className="w-1/2">Question</th>
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
                    <td><div className="skeleton h-4 w-16" /></td>
                    <td><div className="skeleton h-4 w-20" /></td>
                    <td><div className="skeleton h-4 w-24" /></td>
                  </tr>
                ))
              ) : questions.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-12 text-gray-500">No questions found</td></tr>
              ) : (
                Object.entries(
                  questions.reduce((acc, q) => {
                    const catParts = q.category_name ? q.category_name.split(' - ') : ['Uncategorized'];
                    const mainCat = catParts[0].trim();
                    const subCat = catParts.length > 1 ? catParts[1].trim() : 'General';
                    const topic = catParts.length > 2 ? catParts.slice(2).join(' - ').trim() : 'General';
                    
                    if (!acc[mainCat]) acc[mainCat] = {};
                    if (!acc[mainCat][subCat]) acc[mainCat][subCat] = {};
                    if (!acc[mainCat][subCat][topic]) acc[mainCat][subCat][topic] = [];
                    acc[mainCat][subCat][topic].push(q);
                    
                    return acc;
                  }, {} as Record<string, Record<string, Record<string, Question[]>>>)
                ).map(([mainCat, subCats]) => {
                  const isMainExpanded = expandedMainCats[mainCat];
                  return (
                    <Fragment key={mainCat}>
                      <tr className="bg-slate-800/50 cursor-pointer hover:bg-slate-800/70 transition-colors group/main" onClick={() => toggleMainCat(mainCat)}>
                        <td colSpan={4} className="font-bold text-emerald-400 py-3 border-l-4 border-emerald-500 select-none">
                          <div className="flex items-center justify-between pr-4">
                            <div className="flex items-center gap-2">
                              {isMainExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              {mainCat}
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover/main:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => handleBulkStatus(Object.values(subCats).flatMap(t => Object.values(t).flat()).map(q => q.id), 'published')} className="text-xs px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/40 transition-colors">Publish All</button>
                              <button onClick={() => handleBulkStatus(Object.values(subCats).flatMap(t => Object.values(t).flat()).map(q => q.id), 'draft')} className="text-xs px-2 py-1 rounded bg-amber-500/20 text-amber-400 hover:bg-amber-500/40 transition-colors">Draft All</button>
                            </div>
                          </div>
                        </td>
                      </tr>
                      {isMainExpanded && Object.entries(subCats).map(([subCat, topics]) => {
                        const isSubExpanded = expandedSubCats[`${mainCat}-${subCat}`];
                        return (
                          <Fragment key={`${mainCat}-${subCat}`}>
                            {subCat !== 'General' && (
                              <tr className="bg-slate-800/20 cursor-pointer hover:bg-slate-800/40 transition-colors group/sub" onClick={() => toggleSubCat(mainCat, subCat)}>
                                <td colSpan={4} className="font-semibold text-gray-300 py-2 pl-8 border-l-4 border-emerald-500/40 select-none">
                                  <div className="flex items-center justify-between pr-4">
                                    <div className="flex items-center gap-2">
                                      {isSubExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                      {subCat}
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover/sub:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                      <button onClick={() => handleBulkStatus(Object.values(topics).flat().map(q => q.id), 'published')} className="text-xs px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/40 transition-colors">Publish</button>
                                      <button onClick={() => handleBulkStatus(Object.values(topics).flat().map(q => q.id), 'draft')} className="text-xs px-2 py-1 rounded bg-amber-500/20 text-amber-400 hover:bg-amber-500/40 transition-colors">Draft</button>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                            {(isSubExpanded || subCat === 'General') && Object.entries(topics).map(([topic, qs]) => {
                              const isTopicExpanded = expandedTopics[`${mainCat}-${subCat}-${topic}`];
                              return (
                                <Fragment key={`${mainCat}-${subCat}-${topic}`}>
                                  {topic !== 'General' && (
                                    <tr className="bg-slate-800/10 cursor-pointer hover:bg-slate-800/30 transition-colors group/topic" onClick={() => toggleTopic(mainCat, subCat, topic)}>
                                      <td colSpan={4} className="font-medium text-gray-400 py-2 pl-12 border-l-4 border-emerald-500/20 select-none">
                                        <div className="flex items-center justify-between pr-4">
                                          <div className="flex items-center gap-2">
                                            {isTopicExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                            {topic}
                                          </div>
                                          <div className="flex items-center gap-2 opacity-0 group-hover/topic:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                            <button onClick={() => handleBulkStatus(qs.map(q => q.id), 'published')} className="text-xs px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/40 transition-colors">Publish</button>
                                            <button onClick={() => handleBulkStatus(qs.map(q => q.id), 'draft')} className="text-xs px-2 py-1 rounded bg-amber-500/20 text-amber-400 hover:bg-amber-500/40 transition-colors">Draft</button>
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                  {(isTopicExpanded || topic === 'General') && qs.map((q) => (
                                    <tr key={q.id}>
                                      <td className={`max-w-md ${topic !== 'General' ? 'pl-16' : subCat !== 'General' ? 'pl-12' : 'pl-8'}`}>
                                        <p className="text-white line-clamp-2 text-sm" dangerouslySetInnerHTML={{ __html: q.question_text.substring(0, 120) + (q.question_text.length > 120 ? '...' : '') }} />
                                      </td>
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
                                  ))}
                                </Fragment>
                              );
                            })}
                          </Fragment>
                        );
                      })}
                    </Fragment>
                  );
                })
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
        categoryId={searchParams.get('importCategoryId') ? Number(searchParams.get('importCategoryId')) : undefined}
        onClose={() => {
          setIsImportModalOpen(false);
          // Optional: clear the query param
          if (searchParams.get('importCategoryId')) {
            router.replace('/admin/questions');
          }
        }} 
        onSuccess={() => { setPage(1); loadQuestions(); }}
        onPdfParsed={(questions) => {
          setParsedQuestions(questions);
          setIsPdfPreviewOpen(true);
        }}
      />

      <PdfImportPreviewModal
        isOpen={isPdfPreviewOpen}
        onClose={() => setIsPdfPreviewOpen(false)}
        onSuccess={() => { setPage(1); loadQuestions(); }}
        initialQuestions={parsedQuestions}
      />
    </div>
  );
}
