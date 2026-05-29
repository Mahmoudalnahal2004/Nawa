'use client';

import { useEffect, useState, useMemo } from 'react';
import api, { API_BASE } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, BookmarkMinus, CheckCircle2, ChevronLeft, ChevronRight, LayoutTemplate, Filter, ChevronDown, ChevronRight as ChevronRightIcon, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Category {
  id: number;
  name: string;
  children?: Category[];
}

interface Question {
  id: number;
  category_name: string;
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

export default function BookmarksReviewPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  // Filter State
  const [categories, setCategories] = useState<Category[]>([]);
  const [availableCounts, setAvailableCounts] = useState<Record<number, number>>({});
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[] | null>(null);
  const [expandedParents, setExpandedParents] = useState<Record<number, boolean>>({});
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const getCategoryTotalCount = (cat: Category): number => {
    let count = availableCounts[cat.id] || 0;
    if (cat.children) {
      cat.children.forEach(c => { count += getCategoryTotalCount(c); });
    }
    return count;
  };

  const getDescendantIds = (cat: Category): number[] => {
    let ids: number[] = [cat.id];
    if (cat.children) {
      cat.children.forEach(c => { ids = ids.concat(getDescendantIds(c)); });
    }
    return ids;
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    fetchFilterData();
  }, []);

  useEffect(() => {
    fetchBookmarks(page, selectedCategoryIds, debouncedSearch);
  }, [page, selectedCategoryIds, debouncedSearch]);

  const fetchFilterData = async () => {
    try {
      const [catRes, countRes] = await Promise.all([
        api.get('/categories/tree'),
        api.post('/quiz/availability', { mode: 'Bookmarked' })
      ]);
      setCategories(catRes.data);
      setAvailableCounts(countRes.data);
    } catch (err) {
      toast.error('Failed to load filters');
    }
  };

  const fetchBookmarks = async (p: number, catIds: number[] | null, search: string) => {
    setLoading(true);
    try {
      let url = `/bookmarks?page=${p}&page_size=${pageSize}`;
      if (catIds && catIds.length > 0) {
        url += `&category_ids=${catIds.join(',')}`;
      }
      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }
      const res = await api.get(url);
      setQuestions(res.data.questions);
      setTotal(res.data.total);
    } catch (err) {
      toast.error('Failed to load bookmarks');
    } finally {
      setLoading(false);
    }
  };

  const handleUnbookmark = async (id: number) => {
    try {
      await api.delete(`/bookmarks/${id}`);
      toast.success('Bookmark removed');
      
      setQuestions(prev => prev.filter(q => q.id !== id));
      setTotal(prev => prev - 1);
      
      // Update filter tree in background
      fetchFilterData();
      
      if (questions.length === 1 && page > 1) {
        setPage(page - 1);
      }
    } catch (err) {
      toast.error('Failed to remove bookmark');
    }
  };

  const handleSelectCategory = (categoryId: number | null, allIds: number[] = []) => {
    setPage(1);
    if (categoryId === null) {
      setSelectedCategoryIds(null);
    } else {
      setSelectedCategoryIds(allIds);
    }
    setShowMobileFilter(false);
  };

  const toggleParent = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedParents(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const totalPages = Math.ceil(total / pageSize);

  const filterTree = useMemo(() => {
    const buildTree = (cats: Category[]): any[] => {
      return cats.map(c => {
        const totalCount = getCategoryTotalCount(c);
        if (totalCount === 0) return null;
        return {
          ...c,
          totalCount,
          children: c.children ? buildTree(c.children) : []
        };
      }).filter(Boolean);
    };
    return buildTree(categories);
  }, [categories, availableCounts]);

  const renderFilterNode = (node: any, depth: number = 0) => {
    const isExpanded = expandedParents[node.id] === true;
    const isSelected = selectedCategoryIds?.includes(node.id);
    const allIds = getDescendantIds(node);
    
    return (
      <div key={node.id} className={depth === 0 ? "pt-2" : "mt-1"}>
        <div 
          onClick={() => handleSelectCategory(node.id, allIds)}
          className={`flex items-center justify-between px-3 py-1.5 rounded-lg cursor-pointer transition-colors group ${isSelected ? 'bg-amber-500/20 text-amber-400' : 'text-gray-300 hover:bg-white/5'}`}
        >
          <div className="flex items-center gap-2 font-medium text-sm">
            {node.children && node.children.length > 0 ? (
              <button onClick={(e) => toggleParent(node.id, e)} className="p-0.5 rounded hover:bg-white/10 text-gray-400 group-hover:text-inherit transition-colors">
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
              </button>
            ) : (
              <div className="w-5" />
            )}
            {node.name}
          </div>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isSelected ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-gray-400 group-hover:bg-slate-700'}`}>
            {node.totalCount}
          </span>
        </div>
        
        {isExpanded && node.children && node.children.length > 0 && (
          <div className="ml-5 border-l border-white/10 pl-2">
            {node.children.map((child: any) => renderFilterNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading && questions.length === 0 && filterTree.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-32 animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/student/history')}
            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white">Flashcard Review</h1>
            <p className="text-gray-400 mt-1">Review your bookmarked questions and their explanations.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            className="sm:hidden flex items-center gap-2 text-sm font-medium text-gray-300 bg-slate-800 px-4 py-2 rounded-lg border border-slate-700"
            onClick={() => setShowMobileFilter(!showMobileFilter)}
          >
            <Filter className="w-4 h-4" /> Filter
          </button>
          <div className="text-sm font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-lg">
            {total} Bookmarks
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Sidebar Filter */}
        <div className={`w-full lg:w-72 shrink-0 glass-card p-5 ${!showMobileFilter && 'hidden lg:block'}`}>
          <div className="flex items-center gap-2 font-bold text-white mb-4 text-lg">
            <Filter className="w-5 h-5 text-amber-400" /> Filter
          </div>
          
          <div className="space-y-1">
            <button 
              onClick={() => handleSelectCategory(null)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${selectedCategoryIds === null ? 'bg-amber-500/20 text-amber-400' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              All Modules
            </button>
            
            {filterTree.map(parent => renderFilterNode(parent, 0))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 w-full space-y-6 relative min-h-[400px]">
          <div className="relative glass-card p-2 flex items-center">
            <Search className="w-5 h-5 absolute left-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search through your bookmarked questions..." 
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="w-full bg-transparent border-none pl-12 pr-4 py-2 text-white focus:outline-none focus:ring-0 placeholder-gray-500"
            />
          </div>

          {loading && questions.length > 0 && (
            <div className="absolute inset-0 z-10 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center rounded-2xl">
              <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
            </div>
          )}

          {questions.length === 0 && !loading ? (
            <div className="glass-card p-12 text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
                <LayoutTemplate className="w-8 h-8 text-gray-500" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">No Bookmarks Found</h2>
              <p className="text-gray-400 max-w-md">There are no bookmarked questions matching this filter. Select a different module or take a quiz to bookmark more questions!</p>
            </div>
          ) : (
            questions.map((q, index) => (
              <div key={q.id} className="glass-card p-6 md:p-8 animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div className="flex-1">
                    {q.category_name && (
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2 block">
                        {q.category_name}
                      </span>
                    )}
                    <h3 className="text-lg md:text-xl font-semibold text-white leading-relaxed">
                      {q.question_text}
                    </h3>
                  </div>
                  <button
                    onClick={() => handleUnbookmark(q.id)}
                    className="shrink-0 p-2 text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg transition-colors border border-rose-500/20 flex items-center gap-2 text-sm font-medium"
                    title="Remove from bookmarks"
                  >
                    <BookmarkMinus className="w-4 h-4" />
                    <span className="hidden sm:inline">Unbookmark</span>
                  </button>
                </div>

                {q.image_url && (
                  <div className="mb-6 rounded-xl overflow-hidden border border-white/10 bg-black/40">
                    <img src={`${API_BASE}${q.image_url}`} alt="Question visual" className="w-full max-h-96 object-contain" />
                  </div>
                )}

                <div className="space-y-3 mb-8">
                  {[
                    { key: 'A', val: q.option_a },
                    { key: 'B', val: q.option_b },
                    { key: 'C', val: q.option_c },
                    { key: 'D', val: q.option_d },
                    { key: 'E', val: q.option_e },
                  ].filter(opt => opt.val).map(opt => {
                    const isCorrect = q.correct_answer === opt.key;
                    return (
                      <div 
                        key={opt.key}
                        className={`p-4 rounded-xl border flex items-start gap-4 transition-all ${
                          isCorrect 
                            ? 'bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                            : 'bg-slate-900 border-slate-700 opacity-60'
                        }`}
                      >
                        <div className={`shrink-0 w-7 h-7 flex items-center justify-center rounded-lg font-bold text-sm ${
                          isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-gray-400'
                        }`}>
                          {opt.key}
                        </div>
                        <div className={`flex-1 text-sm pt-1 ${isCorrect ? 'text-emerald-50 font-medium' : 'text-gray-400'}`}>
                          {opt.val}
                        </div>
                        {isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
                      </div>
                    )
                  })}
                </div>

                {q.explanation && (
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-5 md:p-6">
                    <h4 className="text-blue-400 font-bold mb-2 flex items-center gap-2 text-sm uppercase tracking-wider">
                      Explanation
                    </h4>
                    <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                      {q.explanation}
                    </p>
                  </div>
                )}
              </div>
            ))
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between glass-card p-4 mt-8 sticky bottom-4 z-20 shadow-2xl">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="px-4 py-2 flex items-center gap-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 text-gray-300 hover:bg-white/10 bg-slate-800"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              
              <div className="text-sm font-medium text-gray-400 flex items-center gap-2">
                Page <span className="text-white bg-slate-800 px-2 py-1 rounded-md">{page}</span> of {totalPages}
              </div>

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
                className="px-4 py-2 flex items-center gap-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 text-gray-300 hover:bg-white/10 bg-slate-800"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
