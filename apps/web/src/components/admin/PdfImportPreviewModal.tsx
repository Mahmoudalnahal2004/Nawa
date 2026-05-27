'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  X, Search, ChevronLeft, ChevronRight, ChevronDown, ChevronRight as ChevronRightIcon,
  Trash2, Check, Loader2, AlertCircle, HelpCircle, Layers, Settings, ListFilter, Plus
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

interface Category {
  id: number;
  name: string;
  parent_id: number | null;
  target_year?: number | null;
}

interface ParsedQuestion {
  tempId: string;
  category_id: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  option_e: string;
  correct_answer: string;
  explanation: string;
  difficulty: string;
  status: string;
}

interface PdfImportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialQuestions: any[];
}

// Self-contained tree selector for categories to keep main render fast
function CategorySelect({ 
  categories, 
  value, 
  onChange 
}: { 
  categories: Category[]; 
  value: number; 
  onChange: (val: number) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedYears, setExpandedYears] = useState<Record<number, boolean>>({});
  const [expandedMainCats, setExpandedMainCats] = useState<Record<number, boolean>>({});

  const selectedCat = categories.find(c => c.id === value);
  const selectedCatName = selectedCat ? selectedCat.name : 'Select category';

  const renderCategoryTree = (catsToRender: Category[]) => {
    const mainCats = catsToRender.filter(c => c.parent_id === null).sort((a, b) => a.name.localeCompare(b.name));
    return mainCats.map(mainCat => {
      const subCats = categories.filter(sub => sub.parent_id === mainCat.id).sort((a, b) => a.name.localeCompare(b.name));
      const isMainExpanded = expandedMainCats[mainCat.id];
      return (
        <div key={mainCat.id}>
          <div className="flex items-stretch">
            {subCats.length > 0 ? (
              <div
                className="pl-4 pr-1 flex items-center justify-center cursor-pointer hover:bg-white/5 text-gray-400"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedMainCats(prev => ({ ...prev, [mainCat.id]: !prev[mainCat.id] }));
                }}
              >
                {isMainExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRightIcon className="w-3.5 h-3.5" />}
              </div>
            ) : (
              <div className="pl-4 pr-1 w-8 flex items-center justify-center"></div>
            )}
            <div
              className={`flex-1 pr-4 py-1.5 text-xs cursor-pointer transition-colors flex justify-between items-center ${value === mainCat.id ? 'text-emerald-400 bg-emerald-500/10' : 'text-gray-300 hover:bg-white/5'}`}
              onClick={() => {
                onChange(mainCat.id);
                setIsOpen(false);
              }}
            >
              {mainCat.name}
              {value === mainCat.id && <Check className="w-3.5 h-3.5" />}
            </div>
          </div>
          {isMainExpanded && subCats.length > 0 && (
            <div className="mb-1 bg-black/20">
              {subCats.map(subCat => (
                <div
                  key={subCat.id}
                  className={`pl-10 pr-4 py-1.5 text-xs cursor-pointer transition-colors flex justify-between items-center ${value === subCat.id ? 'text-emerald-400 bg-emerald-500/10' : 'text-gray-400 hover:text-gray-300 hover:bg-white/5'}`}
                  onClick={() => {
                    onChange(subCat.id);
                    setIsOpen(false);
                  }}
                >
                  {subCat.name}
                  {value === subCat.id && <Check className="w-3.5 h-3.5" />}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center text-left bg-slate-800 border border-slate-700/60 hover:border-slate-600 rounded-lg px-3 py-2 text-xs text-white outline-none transition-colors"
      >
        <span className={value === 0 ? "text-gray-400 truncate" : "text-white font-medium truncate"}>
          {selectedCatName}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto bg-slate-900 border border-white/10 rounded-lg shadow-2xl py-1 scrollbar-thin">
            {[1, 2, 3, 4, 5].map(year => {
              const yearCats = categories.filter(c => c.target_year === year);
              if (yearCats.length === 0) return null;
              const isExpanded = expandedYears[year];
              return (
                <div key={year} className="mb-0.5">
                  <div
                    className="px-3 py-1.5 flex items-center gap-1.5 cursor-pointer hover:bg-white/5 text-emerald-400 font-semibold text-xs transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedYears(prev => ({ ...prev, [year]: !prev[year] }));
                    }}
                  >
                    {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRightIcon className="w-3 h-3" />}
                    Year {year}
                  </div>
                  {isExpanded && (
                    <div className="mb-0.5">
                      {renderCategoryTree(yearCats)}
                    </div>
                  )}
                </div>
              );
            })}
            {(() => {
              const otherCats = categories.filter(c => !c.target_year);
              if (otherCats.length === 0) return null;
              return (
                <div className="mb-0.5 mt-1.5 pt-1.5 border-t border-white/5">
                  <div className="px-3 py-1.5 flex items-center gap-1.5 text-emerald-400 font-semibold text-xs">
                    <div className="w-3 h-3" />
                    Global / Other
                  </div>
                  <div>
                    {renderCategoryTree(otherCats)}
                  </div>
                </div>
              );
            })()}
          </div>
        </>
      )}
    </div>
  );
}

export function PdfImportPreviewModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  initialQuestions 
}: PdfImportPreviewModalProps) {
  const [questions, setQuestions] = useState<ParsedQuestion[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUnassigned, setFilterUnassigned] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [importing, setImporting] = useState(false);
  const itemsPerPage = 10;

  // New Category states
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCatLoading, setNewCatLoading] = useState(false);
  const [newCatForm, setNewCatForm] = useState({
    name: '',
    target_year: '',
    parent_id: 0
  });

  const loadCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch {
      toast.error('Failed to load categories');
    }
  };

  const handleCreateCategory = async () => {
    if (!newCatForm.name.trim()) {
      toast.error('Category name is required');
      return;
    }
    setNewCatLoading(true);
    try {
      const payload = {
        name: newCatForm.name.trim(),
        description: '',
        icon: '',
        parent_id: newCatForm.parent_id === 0 ? null : newCatForm.parent_id,
        target_year: newCatForm.target_year === '' ? null : Number(newCatForm.target_year)
      };
      await api.post('/categories', payload);
      toast.success('Category created successfully');
      setNewCatForm({ name: '', target_year: '', parent_id: 0 });
      setIsCreatingCategory(false);
      await loadCategories();
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Failed to create category');
    } finally {
      setNewCatLoading(false);
    }
  };

  // Initialize questions with temporary unique IDs
  useEffect(() => {
    if (isOpen) {
      const formatted = initialQuestions.map((q, idx) => ({
        ...q,
        tempId: `parsed-${idx}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        category_id: q.category_id || 0,
        difficulty: q.difficulty || 'medium',
        explanation: q.explanation || '',
      }));
      setQuestions(formatted);
      setSelectedIds(new Set(formatted.map(q => q.tempId)));
      setCurrentPage(1);
      
      loadCategories();
    }
  }, [isOpen, initialQuestions]);

  const handleQuestionChange = (tempId: string, field: keyof ParsedQuestion, value: any) => {
    setQuestions(prev => prev.map(q => q.tempId === tempId ? { ...q, [field]: value } : q));
  };

  const handleDelete = (tempId: string) => {
    setQuestions(prev => prev.filter(q => q.tempId !== tempId));
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(tempId);
      return next;
    });
  };

  // Bulk actions
  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredQuestions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredQuestions.map(q => q.tempId)));
    }
  };

  const handleToggleSelectOne = (tempId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(tempId)) {
        next.delete(tempId);
      } else {
        next.add(tempId);
      }
      return next;
    });
  };

  const handleBulkAssignCategory = (catId: number) => {
    if (selectedIds.size === 0) {
      toast.warning('No questions selected');
      return;
    }
    setQuestions(prev => prev.map(q => selectedIds.has(q.tempId) ? { ...q, category_id: catId } : q));
    toast.success(`Assigned category to ${selectedIds.size} questions`);
  };

  const handleBulkAssignDifficulty = (diff: string) => {
    if (selectedIds.size === 0) {
      toast.warning('No questions selected');
      return;
    }
    setQuestions(prev => prev.map(q => selectedIds.has(q.tempId) ? { ...q, difficulty: diff } : q));
    toast.success(`Set difficulty of ${selectedIds.size} questions to ${diff}`);
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) {
      toast.warning('No questions selected');
      return;
    }
    if (confirm(`Remove ${selectedIds.size} selected questions?`)) {
      setQuestions(prev => prev.filter(q => !selectedIds.has(q.tempId)));
      setSelectedIds(new Set());
      setCurrentPage(1);
    }
  };

  // Filters
  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      const matchesSearch = q.question_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.option_a.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.option_b.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.option_c.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesUnassigned = !filterUnassigned || q.category_id === 0;

      return matchesSearch && matchesUnassigned;
    });
  }, [questions, searchTerm, filterUnassigned]);

  // Pagination
  const paginatedQuestions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredQuestions.slice(start, start + itemsPerPage);
  }, [filteredQuestions, currentPage]);

  const totalPages = Math.ceil(filteredQuestions.length / itemsPerPage);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Import Action
  const handleImport = async () => {
    const toImport = questions.filter(q => selectedIds.has(q.tempId));
    if (toImport.length === 0) {
      toast.error('Please select at least one question to import');
      return;
    }

    // Check if any selected questions are missing a category
    const missingCategory = toImport.some(q => q.category_id === 0);
    if (missingCategory) {
      toast.error('All selected questions must be assigned to a category before importing.');
      return;
    }

    setImporting(true);
    try {
      const payload = toImport.map(({ tempId, ...rest }) => rest);
      const { data } = await api.post('/questions/bulk-create', { questions: payload });
      
      toast.success(`Imported ${data.imported_count} questions successfully!`);
      if (data.errors && data.errors.length > 0) {
        console.error('Bulk import errors:', data.errors);
        toast.warning(`${data.errors.length} questions failed to import. Check console.`);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to import questions');
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  const totalUnassigned = questions.filter(q => q.category_id === 0).length;

  return (
    <div className="fixed inset-0 z-50 bg-[#020617] flex flex-col font-sans text-slate-100 overflow-hidden">
      {/* Top Header */}
      <header className="bg-slate-900 border-b border-white/5 px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <div className="bg-emerald-500/10 border border-emerald-500/25 p-2 rounded-xl">
            <Layers className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-wide">PDF Import Preview</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Review, edit, categorize and bulk-configure parsed questions
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="hidden md:flex items-center gap-6 text-sm">
          <div className="bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-700/30">
            <span className="text-gray-400">Total Parsed:</span>
            <span className="ml-2 font-bold text-white">{questions.length}</span>
          </div>
          <div className="bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-700/30">
            <span className="text-gray-400">Selected:</span>
            <span className="ml-2 font-bold text-emerald-400">{selectedIds.size}</span>
          </div>
          <div className={`px-4 py-2 rounded-xl border transition-colors ${totalUnassigned > 0 ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
            <span className="opacity-90">Unassigned Category:</span>
            <span className="ml-2 font-bold">{totalUnassigned}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors border border-transparent hover:border-slate-800"
          >
            Discard
          </button>
          <button 
            onClick={handleImport}
            disabled={importing || questions.length === 0}
            className="btn-primary px-6 py-2.5 text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/15"
          >
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Importing...
              </>
            ) : (
              `Import ${selectedIds.size} Questions`
            )}
          </button>
        </div>
      </header>

      {/* Main Workspace split */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Control Sidebar */}
        <aside className="w-80 bg-slate-900/60 border-r border-white/5 flex flex-col p-5 space-y-6 overflow-y-auto">
          {/* Filters Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
              <ListFilter className="w-3.5 h-3.5" /> Filters
            </h3>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text"
                placeholder="Search parsed text..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-9 py-2 text-xs"
              />
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-300 hover:text-white select-none">
              <input 
                type="checkbox"
                checked={filterUnassigned}
                onChange={(e) => setFilterUnassigned(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
              />
              Show Only Unassigned Categories
            </label>
          </div>

          <hr className="border-white/5" />

          {/* Bulk Actions Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
              <Settings className="w-3.5 h-3.5" /> Bulk Operations
            </h3>

            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={handleToggleSelectAll}
                className="bg-slate-800 hover:bg-slate-700 text-white rounded-lg py-2 px-3 text-xs font-medium border border-slate-700/40 transition-colors"
              >
                {selectedIds.size === filteredQuestions.length ? 'Deselect All' : 'Select All'}
              </button>
              <button 
                onClick={handleBulkDelete}
                disabled={selectedIds.size === 0}
                className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 disabled:opacity-30 rounded-lg py-2 px-3 text-xs font-medium border border-rose-500/20 transition-colors flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Selected
              </button>
            </div>

            <div className="space-y-3.5 bg-slate-900/40 p-4 border border-white/5 rounded-xl">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                  Assign Category to Selected
                </label>
                <CategorySelect 
                  categories={categories}
                  value={0}
                  onChange={handleBulkAssignCategory}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                  Assign Difficulty to Selected
                </label>
                <div className="flex gap-1.5">
                  {['easy', 'medium', 'hard'].map((diff) => (
                    <button
                      key={diff}
                      onClick={() => handleBulkAssignDifficulty(diff)}
                      className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-[10px] font-bold uppercase rounded border border-slate-700/50 text-slate-300 transition-colors"
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Create Category */}
            <div className="bg-slate-900/40 p-4 border border-white/5 rounded-xl space-y-3">
              {isCreatingCategory ? (
                <div className="space-y-3 animate-fade-in">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="text-[11px] font-extrabold text-emerald-400 uppercase tracking-wider">
                      New Category
                    </span>
                    <button 
                      onClick={() => setIsCreatingCategory(false)} 
                      className="text-gray-500 hover:text-white transition-colors"
                      type="button"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  
                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-[10px] font-medium text-slate-400 mb-1">
                        Category Name *
                      </label>
                      <input 
                        type="text"
                        placeholder="e.g., Cardiology"
                        value={newCatForm.name}
                        onChange={e => setNewCatForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-medium text-slate-400 mb-1">
                          Study Year
                        </label>
                        <select
                          value={newCatForm.target_year}
                          onChange={e => setNewCatForm(prev => ({ ...prev, target_year: e.target.value }))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-[11px] text-white outline-none focus:border-emerald-500 transition-colors"
                        >
                          <option value="">All Years</option>
                          {[1,2,3,4,5].map(y => <option key={y} value={y}>Year {y}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-medium text-slate-400 mb-1">
                          Parent Category
                        </label>
                        <CategorySelect 
                          categories={categories}
                          value={newCatForm.parent_id}
                          onChange={val => setNewCatForm(prev => ({ ...prev, parent_id: val }))}
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleCreateCategory}
                      disabled={newCatLoading || !newCatForm.name.trim()}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold py-2 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/10"
                      type="button"
                    >
                      {newCatLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      Create Category
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsCreatingCategory(true)}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700/80 border border-slate-700/40 text-emerald-400 hover:text-emerald-300 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  type="button"
                >
                  <Plus className="w-4 h-4" /> Quick Add Category
                </button>
              )}
            </div>

          </div>
        </aside>

        {/* Main Editable Workspace */}
        <main className="flex-1 flex flex-col bg-slate-950/40 overflow-hidden">
          {filteredQuestions.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8">
              <HelpCircle className="w-16 h-16 text-slate-700 mb-4" />
              <p className="text-lg font-medium text-slate-400">No questions match your current filters</p>
              <p className="text-sm text-slate-600 mt-1">Try adjusting the filters or uploading a different PDF.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
              {paginatedQuestions.map((q, index) => {
                const globalIndex = (currentPage - 1) * itemsPerPage + index + 1;
                const isSelected = selectedIds.has(q.tempId);
                const hasNoCategory = q.category_id === 0;

                return (
                  <div 
                    key={q.tempId}
                    className={`glass-card p-6 flex items-start gap-4 transition-all duration-300 ${
                      isSelected 
                        ? 'border-emerald-500/30 bg-emerald-500/[0.02]' 
                        : 'border-slate-800/80'
                    } ${hasNoCategory ? 'shadow-[0_0_15px_-3px_rgba(244,63,94,0.08)]' : ''}`}
                  >
                    {/* Checkbox selector */}
                    <div className="pt-2">
                      <input 
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectOne(q.tempId)}
                        className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                      />
                    </div>

                    {/* Question Content */}
                    <div className="flex-1 space-y-4">
                      {/* Top Row: Info/Controls */}
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-extrabold text-slate-400">
                            #{globalIndex}
                          </span>
                          {hasNoCategory && (
                            <span className="flex items-center gap-1 bg-rose-500/15 border border-rose-500/20 text-rose-400 text-[10px] px-2 py-0.5 rounded-full font-bold">
                              <AlertCircle className="w-3 h-3" /> Unassigned Category
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex rounded-lg border border-slate-800 overflow-hidden bg-slate-900">
                            {['easy', 'medium', 'hard'].map((d) => (
                              <button
                                key={d}
                                onClick={() => handleQuestionChange(q.tempId, 'difficulty', d)}
                                className={`px-2.5 py-1 text-[10px] font-bold capitalize transition-colors ${
                                  q.difficulty === d
                                    ? d === 'easy' ? 'bg-emerald-500/20 text-emerald-400'
                                      : d === 'hard' ? 'bg-rose-500/20 text-rose-400'
                                      : 'bg-amber-500/20 text-amber-400'
                                    : 'text-slate-500 hover:text-slate-300'
                                }`}
                              >
                                {d}
                              </button>
                            ))}
                          </div>

                          <button 
                            onClick={() => handleDelete(q.tempId)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Remove Question"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Question Text Input */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Question Vignette / Text</label>
                        <textarea
                          value={q.question_text}
                          onChange={(e) => handleQuestionChange(q.tempId, 'question_text', e.target.value)}
                          className="input-field text-sm min-h-[90px] resize-y py-2 px-3"
                          rows={3}
                        />
                      </div>

                      {/* Options Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {['a', 'b', 'c', 'd', 'e'].map((letter) => {
                          const optionField = `option_${letter}` as keyof ParsedQuestion;
                          const isCorrect = q.correct_answer === letter.toUpperCase();
                          return (
                            <div key={letter} className="flex items-center gap-2">
                              <button
                                onClick={() => handleQuestionChange(q.tempId, 'correct_answer', letter.toUpperCase())}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-all ${
                                  isCorrect 
                                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' 
                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-750 border border-slate-700/50'
                                }`}
                              >
                                {letter.toUpperCase()}
                              </button>
                              <input 
                                type="text"
                                value={q[optionField] as string}
                                onChange={(e) => handleQuestionChange(q.tempId, optionField, e.target.value)}
                                className="input-field text-xs py-1.5 px-3 flex-1"
                                placeholder={`Option ${letter.toUpperCase()}`}
                              />
                            </div>
                          );
                        })}
                      </div>

                      {/* Details split */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1.5">Category</label>
                          <CategorySelect 
                            categories={categories}
                            value={q.category_id}
                            onChange={(val) => handleQuestionChange(q.tempId, 'category_id', val)}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1.5">Explanation</label>
                          <textarea
                            value={q.explanation}
                            onChange={(e) => handleQuestionChange(q.tempId, 'explanation', e.target.value)}
                            className="input-field text-xs min-h-[36px] resize-y py-1.5 px-3"
                            rows={1}
                            placeholder="Optional explanation..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination controls */}
          {totalPages > 1 && (
            <footer className="bg-slate-900/90 border-t border-white/5 px-6 py-4 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredQuestions.length)} of {filteredQuestions.length} questions
              </span>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="bg-slate-800 hover:bg-slate-700 disabled:opacity-30 border border-slate-700/50 rounded-lg p-1.5 text-slate-300 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                <div className="flex items-center gap-1.5 text-xs text-slate-300 px-3">
                  Page <strong className="text-white font-bold mx-1">{currentPage}</strong> of <strong className="text-white font-bold mx-1">{totalPages}</strong>
                </div>

                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="bg-slate-800 hover:bg-slate-700 disabled:opacity-30 border border-slate-700/50 rounded-lg p-1.5 text-slate-300 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </footer>
          )}
        </main>
      </div>
    </div>
  );
}
