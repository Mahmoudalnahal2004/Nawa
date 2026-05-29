'use client';

import { useEffect, useState, useRef, Fragment } from 'react';
import api, { API_BASE } from '@/lib/api';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Pencil, Trash2, FolderTree, CornerDownRight, X, LayoutTemplate, Image as ImageIcon, Upload, Eye, EyeOff, ChevronRight, ChevronDown, AlertTriangle, FolderPlus, Pin } from 'lucide-react';

interface Category {
  id: number;
  name: string;
  description: string;
  icon: string;
  parent_id: number | null;
  target_year?: number | null;
  question_count: number;
  is_active: boolean;
  children?: Category[];
}

export default function AdminCategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [pinnedCategoryIds, setPinnedCategoryIds] = useState<number[]>([]);

  const updatePins = () => {
    try {
      const stored = localStorage.getItem('pinnedCategoryIds');
      if (stored) {
        setPinnedCategoryIds(JSON.parse(stored));
      } else {
        setPinnedCategoryIds([]);
      }
    } catch (e) {
      setPinnedCategoryIds([]);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    updatePins();

    window.addEventListener('storage', updatePins);
    window.addEventListener('pinned-categories-changed', updatePins);
    return () => {
      window.removeEventListener('storage', updatePins);
      window.removeEventListener('pinned-categories-changed', updatePins);
    };
  }, []);

  const togglePin = (id: number) => {
    setPinnedCategoryIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem('pinnedCategoryIds', JSON.stringify(next));
      window.dispatchEvent(new Event('pinned-categories-changed'));
      return next;
    });
  };

  const findCategoryAndPath = (
    cats: Category[],
    targetId: number,
    currentPath: string[] = []
  ): { category: Category; path: string } | null => {
    for (const cat of cats) {
      const newPath = [...currentPath, cat.name];
      if (cat.id === targetId) {
        return { category: cat, path: newPath.join(' > ') };
      }
      if (cat.children && cat.children.length > 0) {
        const result = findCategoryAndPath(cat.children, targetId, newPath);
        if (result) return result;
      }
    }
    return null;
  };

  const getCategoryLevel = (cat: Category): 'module' | 'sub' | 'topic' => {
    if (cat.parent_id === null) return 'module';
    
    const findParent = (cats: Category[], parentId: number): Category | null => {
      for (const c of cats) {
        if (c.id === parentId) return c;
        if (c.children && c.children.length > 0) {
          const found = findParent(c.children, parentId);
          if (found) return found;
        }
      }
      return null;
    };
    
    const parent = findParent(categories, cat.parent_id);
    if (!parent) return 'module';
    if (parent.parent_id === null) return 'sub';
    return 'topic';
  };
  
  const countTotalQuestions = (cat: Category): number => {
    let count = cat.question_count || 0;
    if (cat.children && cat.children.length > 0) {
      for (const child of cat.children) {
        count += countTotalQuestions(child);
      }
    }
    return count;
  };

  const renderModule = (module: Category) => {
    return (
      <div key={module.id} className="p-4 hover:bg-white/5 transition-colors group">
        {/* Top-Level Module Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 overflow-hidden text-2xl ${!module.is_active ? 'opacity-40 grayscale' : ''}`}>
              {module.icon?.startsWith('/') ? (
                <img src={`${API_BASE}${module.icon}`} alt={module.name} className="w-full h-full object-cover" />
              ) : (
                module.icon || <ImageIcon className="w-5 h-5 text-blue-400" />
              )}
            </div>
            <div>
              <h3 className={`font-semibold flex items-center gap-2 ${!module.is_active ? 'text-gray-500' : 'text-white'}`}>
                {module.children && module.children.length > 0 && (
                  <button onClick={() => toggleExpand(module.id)} className="p-0.5 hover:bg-white/10 rounded-md transition-colors text-gray-400">
                    {expandedCategories.includes(module.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                )}
                <span className={!module.is_active ? 'line-through' : ''}>{module.name}</span>
                {module.target_year && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">
                    Year {module.target_year}
                  </span>
                )}
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-white/10 text-gray-400">
                  ID: {module.id}
                </span>
                {!module.is_active && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/20">
                    Hidden
                  </span>
                )}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {module.description || 'No description provided'} • {countTotalQuestions(module)} Questions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Pinned indicator visible always */}
            {isMounted && pinnedCategoryIds.includes(module.id) && (
              <button onClick={() => togglePin(module.id)} className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors" title="Unpin Category">
                <Pin className="w-4 h-4 rotate-[45deg] fill-emerald-400" />
              </button>
            )}
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {isMounted && !pinnedCategoryIds.includes(module.id) && (
                <button onClick={() => togglePin(module.id)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="Pin Category">
                  <Pin className="w-4 h-4 rotate-[45deg]" />
                </button>
              )}
              <button onClick={() => handleToggleActive(module)} className={`p-2 rounded-lg transition-colors ${module.is_active ? 'bg-white/5 hover:bg-amber-500/20 text-gray-400 hover:text-amber-400' : 'bg-rose-500/10 text-rose-400 hover:bg-emerald-500/20 hover:text-emerald-400'}`} title={module.is_active ? "Hide Module" : "Show Module"}>
                {module.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <button onClick={() => router.push(`/admin/questions/new?categoryId=${module.id}`)} className="p-2 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-gray-400 hover:text-emerald-400 transition-colors" title="Create Question">
                <Plus className="w-4 h-4" />
              </button>
              <button onClick={() => openAddSubcategoryModal(module)} className="p-2 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-gray-400 hover:text-emerald-400 transition-colors" title="Add Subcategory">
                <FolderPlus className="w-4 h-4" />
              </button>
              <button onClick={() => router.push(`/admin/questions?importCategoryId=${module.id}`)} className="p-2 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-gray-400 hover:text-emerald-400 transition-colors" title="Import Questions">
                <Upload className="w-4 h-4" />
              </button>
              <button onClick={() => openEditModal(module)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="Edit Module">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => setCategoryToDelete({id: module.id, name: module.name})} className="p-2 rounded-lg bg-white/5 hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 transition-colors" title="Delete Module">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Subcategories */}
        {module.children && module.children.length > 0 && expandedCategories.includes(module.id) && (
          <div className="mt-3 pl-14 space-y-2">
            {module.children.map(sub => (
              <Fragment key={sub.id}>
                {renderSubcategory(sub)}
              </Fragment>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderSubcategory = (sub: Category) => {
    return (
      <div key={sub.id}>
        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-white/5 group/sub">
          <div className="flex items-center gap-3">
            <CornerDownRight className={`w-4 h-4 ${!sub.is_active ? 'text-gray-700' : 'text-gray-600'}`} />
            <div>
              <p className={`text-sm font-medium flex items-center gap-2 ${!sub.is_active ? 'text-gray-500' : 'text-gray-200'}`}>
                {sub.children && sub.children.length > 0 && (
                  <button onClick={() => toggleExpand(sub.id)} className="p-0.5 hover:bg-white/10 rounded-md transition-colors text-gray-400">
                    {expandedCategories.includes(sub.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                )}
                <span className={!sub.is_active ? 'line-through' : ''}>{sub.name}</span>
                {sub.target_year && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Year {sub.target_year}
                  </span>
                )}
                {!sub.is_active && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/20">
                    Hidden
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-500">{sub.description || 'No description'} • {countTotalQuestions(sub)} Questions</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Pinned indicator visible always */}
            {isMounted && pinnedCategoryIds.includes(sub.id) && (
              <button onClick={() => togglePin(sub.id)} className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors" title="Unpin Category">
                <Pin className="w-3.5 h-3.5 rotate-[45deg] fill-emerald-400" />
              </button>
            )}
            <div className="flex items-center gap-1.5 opacity-0 group-hover/sub:opacity-100 transition-opacity">
              {isMounted && !pinnedCategoryIds.includes(sub.id) && (
                <button onClick={() => togglePin(sub.id)} className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="Pin Category">
                  <Pin className="w-3.5 h-3.5 rotate-[45deg]" />
                </button>
              )}
              <button onClick={() => handleToggleActive(sub)} className={`p-1.5 rounded-md transition-colors ${sub.is_active ? 'bg-white/5 hover:bg-amber-500/20 text-gray-400 hover:text-amber-400' : 'bg-rose-500/10 text-rose-400 hover:bg-emerald-500/20 hover:text-emerald-400'}`} title={sub.is_active ? "Hide Module" : "Show Module"}>
                {sub.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => router.push(`/admin/questions/new?categoryId=${sub.id}`)} className="p-1.5 rounded-md bg-white/5 hover:bg-emerald-500/20 text-gray-400 hover:text-emerald-400 transition-colors" title="Create Question">
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => openAddSubcategoryModal(sub)} className="p-1.5 rounded-md bg-white/5 hover:bg-emerald-500/20 text-gray-400 hover:text-emerald-400 transition-colors" title="Add Topic/Subcategory">
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => router.push(`/admin/questions?importCategoryId=${sub.id}`)} className="p-1.5 rounded-md bg-white/5 hover:bg-emerald-500/20 text-gray-400 hover:text-emerald-400 transition-colors" title="Import Questions">
                <Upload className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => openEditModal(sub)} className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="Edit Module">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setCategoryToDelete({id: sub.id, name: sub.name})} className="p-1.5 rounded-md bg-white/5 hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 transition-colors" title="Delete Module">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Topics (3rd Level) */}
        {sub.children && sub.children.length > 0 && expandedCategories.includes(sub.id) && (
          <div className="mt-2 pl-12 space-y-2">
            {sub.children.map(topic => (
              <Fragment key={topic.id}>
                {renderTopic(topic)}
              </Fragment>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderTopic = (topic: Category) => {
    return (
      <div key={topic.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-900/30 border border-white/5 group/topic">
        <div className="flex items-center gap-3">
          <CornerDownRight className={`w-4 h-4 ${!topic.is_active ? 'text-gray-700' : 'text-gray-600'}`} />
          <div>
            <p className={`text-sm flex items-center gap-2 ${!topic.is_active ? 'text-gray-500' : 'text-gray-300'}`}>
              <span className={!topic.is_active ? 'line-through' : ''}>{topic.name}</span>
              {topic.target_year && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Year {topic.target_year}</span>}
              {!topic.is_active && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/20">Hidden</span>}
            </p>
            <p className="text-xs text-gray-500">{topic.description || 'No description'} • {countTotalQuestions(topic)} Questions</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Pinned indicator visible always */}
          {isMounted && pinnedCategoryIds.includes(topic.id) && (
            <button onClick={() => togglePin(topic.id)} className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors" title="Unpin Category">
              <Pin className="w-3.5 h-3.5 rotate-[45deg] fill-emerald-400" />
            </button>
          )}
          <div className="flex items-center gap-1.5 opacity-0 group-hover/topic:opacity-100 transition-opacity">
            {isMounted && !pinnedCategoryIds.includes(topic.id) && (
              <button onClick={() => togglePin(topic.id)} className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                <Pin className="w-3.5 h-3.5 rotate-[45deg]" />
              </button>
            )}
            <button onClick={() => handleToggleActive(topic)} className={`p-1.5 rounded-md transition-colors ${topic.is_active ? 'bg-white/5 hover:bg-amber-500/20 text-gray-400 hover:text-amber-400' : 'bg-rose-500/10 text-rose-400 hover:bg-emerald-500/20 hover:text-emerald-400'}`}>
              {topic.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
            <button onClick={() => router.push(`/admin/questions/new?categoryId=${topic.id}`)} className="p-1.5 rounded-md bg-white/5 hover:bg-emerald-500/20 text-gray-400 hover:text-emerald-400 transition-colors">
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => router.push(`/admin/questions?importCategoryId=${topic.id}`)} className="p-1.5 rounded-md bg-white/5 hover:bg-emerald-500/20 text-gray-400 hover:text-emerald-400 transition-colors">
              <Upload className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => openEditModal(topic)} className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setCategoryToDelete({id: topic.id, name: topic.name})} className="p-1.5 rounded-md bg-white/5 hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<{id: number, name: string} | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '',
    parent_id: '' as string | number,
    target_year: '' as string | number,
  });
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [yearFilter, setYearFilter] = useState<string>('All');
  const [expandedCategories, setExpandedCategories] = useState<number[]>([]);
  
  const [parentDropdownOpen, setParentDropdownOpen] = useState(false);
  const [expandedParentYears, setExpandedParentYears] = useState<number[]>([]);
  const [expandedParentModules, setExpandedParentModules] = useState<number[]>([]);
  const parentDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (parentDropdownRef.current && !parentDropdownRef.current.contains(event.target as Node)) {
        setParentDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleExpand = (id: number) => {
    setExpandedCategories(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data } = await api.get('/categories/tree');
      setCategories(data);
    } catch (e) {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingCategory(null);
    let defaultYear = '';
    if (yearFilter !== 'All' && yearFilter !== 'Global') {
      defaultYear = yearFilter;
    }
    setFormData({ name: '', description: '', icon: '', parent_id: '', target_year: defaultYear });
    setIsModalOpen(true);
  };

  const openAddSubcategoryModal = (parentCat: Category) => {
    setEditingCategory(null);
    setFormData({
      name: '',
      description: '',
      icon: '',
      parent_id: parentCat.id,
      target_year: parentCat.target_year || '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      description: cat.description,
      icon: cat.icon,
      parent_id: cat.parent_id || '',
      target_year: cat.target_year || '',
    });
    setIsModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!categoryToDelete) return;
    try {
      await api.delete(`/categories/${categoryToDelete.id}`, {
        params: { password: deletePassword || undefined }
      });
      toast.success('Category deleted successfully');
      fetchCategories();
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Failed to delete category');
    } finally {
      setCategoryToDelete(null);
      setDeletePassword('');
    }
  };

  const handleToggleActive = async (module: Category) => {
    try {
      await api.put(`/categories/${module.id}`, { is_active: !module.is_active });
      toast.success(module.is_active ? 'Category hidden' : 'Category visible');
      fetchCategories();
    } catch (e: any) {
      toast.error('Failed to update visibility');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        icon: formData.icon,
        parent_id: formData.parent_id === '' ? null : Number(formData.parent_id),
        target_year: formData.target_year === '' ? null : Number(formData.target_year),
      };

      if (editingCategory) {
        await api.put(`/categories/${editingCategory.id}`, payload);
        toast.success('Category updated successfully');
      } else {
        await api.post('/categories', payload);
        toast.success('Category created successfully');
      }
      
      setIsModalOpen(false);
      fetchCategories();
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      // Reusing the questions upload endpoint since it handles generic image uploads
      const { data } = await api.post('/questions/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFormData(prev => ({ ...prev, icon: data.url }));
      toast.success('Image uploaded successfully');
    } catch (err: any) {
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Category Management</h1>
          <p className="text-gray-400 text-sm">Organize the curriculum hierarchy for the platform.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="bg-slate-900 border border-white/10 text-gray-300 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500 appearance-none min-w-[140px] cursor-pointer"
            >
              <option value="All">All Years</option>
              <option value="Global">Global (No Year)</option>
              {[1, 2, 3, 4, 5].map(y => (
                <option key={y} value={y}>Year {y}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
          <button onClick={openAddModal} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Category
          </button>
        </div>
      </div>

      {/* Pinned Categories Section */}
      {isMounted && pinnedCategoryIds.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
            <Pin className="w-4 h-4 fill-emerald-400 rotate-[45deg]" />
            <h2>Pinned Categories</h2>
          </div>
          <div className="glass-card divide-y divide-white/5">
            {pinnedCategoryIds.map(id => {
              const matched = findCategoryAndPath(categories, id);
              if (!matched) return null;
              const { category } = matched;
              const level = getCategoryLevel(category);
              
              if (level === 'module') {
                return renderModule(category);
              } else if (level === 'sub') {
                return renderSubcategory(category);
              } else {
                return renderTopic(category);
              }
            })}
          </div>
        </div>
      )}

      <div className="glass-card overflow-hidden">
        {categories.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FolderTree className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No categories found. Start by creating a Top-Level Module.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {categories.filter(c => {
              if (yearFilter === 'All') return true;
              if (yearFilter === 'Global') return !c.target_year;
              return c.target_year === parseInt(yearFilter);
            }).map((module) => (
              <Fragment key={module.id}>
                {renderModule(module)}
              </Fragment>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">
            <div className="flex justify-between items-center p-6 border-b border-white/10 bg-white/5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {editingCategory ? <Pencil className="w-5 h-5 text-blue-400" /> : <Plus className="w-5 h-5 text-emerald-400" />}
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  placeholder="e.g. Basic Sciences"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Description (Optional)</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 resize-none h-20"
                  placeholder="Brief description of this category..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Module Image</label>
                  <div className="relative w-full h-10 bg-slate-950 border border-slate-800 rounded-xl flex items-center overflow-hidden">
                    {formData.icon?.startsWith('/') ? (
                      <div className="w-full h-full flex items-center justify-between px-3 group">
                        <img src={`${API_BASE}${formData.icon}`} alt="Preview" className="h-6 w-6 object-cover rounded" />
                        <button type="button" onClick={() => setFormData(p => ({ ...p, icon: '' }))} className="text-gray-500 hover:text-rose-400">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : formData.icon ? (
                      <div className="w-full h-full flex items-center justify-between px-3">
                        <span className="text-xl">{formData.icon}</span>
                        <button type="button" onClick={() => setFormData(p => ({ ...p, icon: '' }))} className="text-gray-500 hover:text-rose-400">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="w-full h-full flex items-center justify-center gap-2 text-sm text-gray-400 cursor-pointer hover:bg-white/5 transition-colors">
                        {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {uploadingImage ? 'Uploading...' : 'Upload'}
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                      </label>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Study Year</label>
                  <select
                    value={formData.target_year}
                    onChange={e => setFormData({ ...formData, target_year: e.target.value })}
                    disabled={!!formData.parent_id}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">-- All Years --</option>
                    {[1, 2, 3, 4, 5].map(y => (
                      <option key={y} value={y}>Year {y}</option>
                    ))}
                  </select>
                </div>
                <div className="relative" ref={parentDropdownRef}>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Parent Module</label>
                  <div 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white flex justify-between items-center cursor-pointer focus:outline-none focus:border-blue-500"
                    onClick={() => setParentDropdownOpen(!parentDropdownOpen)}
                  >
                    <span className="truncate">
                      {formData.parent_id === '' 
                        ? '-- None (Top-Level) --' 
                        : (() => {
                            const pid = Number(formData.parent_id);
                            const top = categories.find(c => c.id === pid);
                            if (top) return top.name;
                            for (const c of categories) {
                              const sub = c.children?.find(ch => ch.id === pid);
                              if (sub) return `${c.name} > ${sub.name}`;
                            }
                            return 'Unknown';
                          })()}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${parentDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>

                  {parentDropdownOpen && (
                    <div className="absolute z-50 bottom-full mb-1 right-0 w-[320px] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-h-72 overflow-y-auto">
                      <div 
                        className="px-4 py-2 hover:bg-white/5 cursor-pointer text-white text-sm border-b border-white/5"
                        onClick={() => { setFormData({ ...formData, parent_id: '' }); setParentDropdownOpen(false); }}
                      >
                        -- None (Top-Level) --
                      </div>
                      
                      {[1, 2, 3, 4, 5].map(year => {
                        const yearCats = categories.filter(c => c.target_year === year);
                        if (yearCats.length === 0) return null;
                        const isExpanded = expandedParentYears.includes(year);
                        return (
                          <div key={year} className="border-b border-white/5 last:border-0">
                            <div 
                              className="px-4 py-2 bg-slate-800/30 hover:bg-slate-800/80 text-emerald-400 font-semibold text-sm flex items-center justify-between cursor-pointer transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedParentYears(prev => prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]);
                              }}
                            >
                              <span>Year {year}</span>
                              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </div>
                            {isExpanded && (
                              <div className="py-1 bg-slate-950/50">
                                {yearCats.sort((a, b) => a.name.localeCompare(b.name)).map(c => {
                                  const hasChildren = c.children && c.children.length > 0;
                                  const isModuleExpanded = expandedParentModules.includes(c.id);
                                  return (
                                    <div key={c.id}>
                                      <div
                                        className={`px-6 py-2 text-sm flex items-center justify-between cursor-pointer ${editingCategory?.id === c.id ? 'opacity-50 cursor-not-allowed text-gray-500' : 'hover:bg-white/5 text-white'} ${Number(formData.parent_id) === c.id ? 'bg-emerald-500/10 text-emerald-400' : ''}`}
                                        onClick={() => {
                                          if (editingCategory?.id === c.id) return;
                                          setFormData({ ...formData, parent_id: c.id });
                                          setParentDropdownOpen(false);
                                        }}
                                      >
                                        <span>{c.name}</span>
                                        {hasChildren && (
                                          <button
                                            type="button"
                                            className="p-1 hover:bg-white/10 rounded"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setExpandedParentModules(prev => 
                                                prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id]
                                              );
                                            }}
                                          >
                                            {isModuleExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                          </button>
                                        )}
                                      </div>
                                      {isModuleExpanded && hasChildren && (
                                        <div className="bg-slate-950/30">
                                          {c.children!.sort((a, b) => a.name.localeCompare(b.name)).map(sub => (
                                            <div
                                              key={sub.id}
                                              className={`pl-10 pr-6 py-2 text-sm cursor-pointer ${editingCategory?.id === sub.id ? 'opacity-50 cursor-not-allowed text-gray-500' : 'hover:bg-white/5 text-gray-300'} ${Number(formData.parent_id) === sub.id ? 'bg-emerald-500/10 text-emerald-400' : ''}`}
                                              onClick={() => {
                                                if (editingCategory?.id === sub.id) return;
                                                setFormData({ ...formData, parent_id: sub.id });
                                                setParentDropdownOpen(false);
                                              }}
                                            >
                                              {sub.name}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      
                      {/* Global / Other */}
                      {(() => {
                        const otherCats = categories.filter(c => !c.target_year);
                        if (otherCats.length === 0) return null;
                        const isExpanded = expandedParentYears.includes(0);
                        return (
                          <div key={0}>
                            <div 
                              className="px-4 py-2 bg-slate-800/30 hover:bg-slate-800/80 text-emerald-400 font-semibold text-sm flex items-center justify-between cursor-pointer transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedParentYears(prev => prev.includes(0) ? prev.filter(y => y !== 0) : [...prev, 0]);
                              }}
                            >
                              <span>Global / Other</span>
                              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </div>
                            {isExpanded && (
                              <div className="py-1 bg-slate-950/50">
                                {otherCats.sort((a, b) => a.name.localeCompare(b.name)).map(c => {
                                  const hasChildren = c.children && c.children.length > 0;
                                  const isModuleExpanded = expandedParentModules.includes(c.id);
                                  return (
                                    <div key={c.id}>
                                      <div
                                        className={`px-6 py-2 text-sm flex items-center justify-between cursor-pointer ${editingCategory?.id === c.id ? 'opacity-50 cursor-not-allowed text-gray-500' : 'hover:bg-white/5 text-white'} ${Number(formData.parent_id) === c.id ? 'bg-emerald-500/10 text-emerald-400' : ''}`}
                                        onClick={() => {
                                          if (editingCategory?.id === c.id) return;
                                          setFormData({ ...formData, parent_id: c.id });
                                          setParentDropdownOpen(false);
                                        }}
                                      >
                                        <span>{c.name}</span>
                                        {hasChildren && (
                                          <button
                                            type="button"
                                            className="p-1 hover:bg-white/10 rounded"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setExpandedParentModules(prev => 
                                                prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id]
                                              );
                                            }}
                                          >
                                            {isModuleExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                          </button>
                                        )}
                                      </div>
                                      {isModuleExpanded && hasChildren && (
                                        <div className="bg-slate-950/30">
                                          {c.children!.sort((a, b) => a.name.localeCompare(b.name)).map(sub => (
                                            <div
                                              key={sub.id}
                                              className={`pl-10 pr-6 py-2 text-sm cursor-pointer ${editingCategory?.id === sub.id ? 'opacity-50 cursor-not-allowed text-gray-500' : 'hover:bg-white/5 text-gray-300'} ${Number(formData.parent_id) === sub.id ? 'bg-emerald-500/10 text-emerald-400' : ''}`}
                                              onClick={() => {
                                                if (editingCategory?.id === sub.id) return;
                                                setFormData({ ...formData, parent_id: sub.id });
                                                setParentDropdownOpen(false);
                                              }}
                                            >
                                              {sub.name}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up">
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/20 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-rose-500" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Delete Category?</h2>
              <p className="text-gray-400 text-sm mb-6">
                Are you sure you want to delete <span className="text-white font-semibold">"{categoryToDelete.name}"</span>? This action cannot be undone and may affect associated questions.
              </p>
              <div className="mb-6 text-left">
                <label className="block text-xs font-medium text-gray-400 mb-1">Confirmation Password (if has questions)</label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={e => setDeletePassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500"
                  placeholder="Enter '0000' to force delete"
                />
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setCategoryToDelete(null);
                    setDeletePassword('');
                  }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/20 transition-all"
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
