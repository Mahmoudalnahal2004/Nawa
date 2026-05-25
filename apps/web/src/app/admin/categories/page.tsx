'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Pencil, Trash2, FolderTree, CornerDownRight, X, LayoutTemplate, Image as ImageIcon, Upload, Eye, EyeOff } from 'lucide-react';

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
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
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

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await api.delete(`/categories/${id}`);
      toast.success('Category deleted successfully');
      fetchCategories();
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Failed to delete category');
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
              <div key={module.id} className="p-4 hover:bg-white/5 transition-colors group">
                {/* Top-Level Module Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 overflow-hidden text-2xl ${!module.is_active ? 'opacity-40 grayscale' : ''}`}>
                      {module.icon?.startsWith('/') ? (
                        <img src={`http://localhost:8000${module.icon}`} alt={module.name} className="w-full h-full object-cover" />
                      ) : (
                        module.icon || <ImageIcon className="w-5 h-5 text-blue-400" />
                      )}
                    </div>
                    <div>
                      <h3 className={`font-semibold flex items-center gap-2 ${!module.is_active ? 'text-gray-500' : 'text-white'}`}>
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
                        {module.description || 'No description provided'} • {module.question_count || 0} Questions
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleToggleActive(module)} className={`p-2 rounded-lg transition-colors ${module.is_active ? 'bg-white/5 hover:bg-amber-500/20 text-gray-400 hover:text-amber-400' : 'bg-rose-500/10 text-rose-400 hover:bg-emerald-500/20 hover:text-emerald-400'}`} title={module.is_active ? "Hide Module" : "Show Module"}>
                      {module.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button onClick={() => router.push(`/admin/questions/new?categoryId=${module.id}`)} className="p-2 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-gray-400 hover:text-emerald-400 transition-colors" title="Create Question">
                      <Plus className="w-4 h-4" />
                    </button>
                    <button onClick={() => router.push(`/admin/questions?importCategoryId=${module.id}`)} className="p-2 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-gray-400 hover:text-emerald-400 transition-colors" title="Import Questions">
                      <Upload className="w-4 h-4" />
                    </button>
                    <button onClick={() => openEditModal(module)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="Edit Module">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(module.id, module.name)} className="p-2 rounded-lg bg-white/5 hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 transition-colors" title="Delete Module">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Subcategories */}
                {module.children && module.children.length > 0 && (
                  <div className="mt-3 pl-14 space-y-2">
                    {module.children.map(sub => (
                      <div key={sub.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-white/5 group/sub">
                        <div className="flex items-center gap-3">
                          <CornerDownRight className={`w-4 h-4 ${!sub.is_active ? 'text-gray-700' : 'text-gray-600'}`} />
                          <div>
                            <p className={`text-sm font-medium flex items-center gap-2 ${!sub.is_active ? 'text-gray-500' : 'text-gray-200'}`}>
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
                            <p className="text-xs text-gray-500">{sub.description || 'No description'} • {sub.question_count || 0} Questions</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover/sub:opacity-100 transition-opacity">
                          <button onClick={() => handleToggleActive(sub)} className={`p-1.5 rounded-md transition-colors ${sub.is_active ? 'bg-white/5 hover:bg-amber-500/20 text-gray-400 hover:text-amber-400' : 'bg-rose-500/10 text-rose-400 hover:bg-emerald-500/20 hover:text-emerald-400'}`} title={sub.is_active ? "Hide Module" : "Show Module"}>
                            {sub.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={() => router.push(`/admin/questions/new?categoryId=${sub.id}`)} className="p-1.5 rounded-md bg-white/5 hover:bg-emerald-500/20 text-gray-400 hover:text-emerald-400 transition-colors" title="Create Question">
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => router.push(`/admin/questions?importCategoryId=${sub.id}`)} className="p-1.5 rounded-md bg-white/5 hover:bg-emerald-500/20 text-gray-400 hover:text-emerald-400 transition-colors" title="Import Questions">
                            <Upload className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => openEditModal(sub)} className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="Edit Module">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(sub.id, sub.name)} className="p-1.5 rounded-md bg-white/5 hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 transition-colors" title="Delete Module">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
                        <img src={`http://localhost:8000${formData.icon}`} alt="Preview" className="h-6 w-6 object-cover rounded" />
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
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Parent Module</label>
                  <select
                    value={formData.parent_id}
                    onChange={e => setFormData({ ...formData, parent_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 appearance-none"
                  >
                    <option value="">-- None (Top-Level) --</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id} disabled={editingCategory?.id === c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
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
    </div>
  );
}
