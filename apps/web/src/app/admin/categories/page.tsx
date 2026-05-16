'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { FolderTree, Plus, Pencil, Trash2, X, Check, ChevronRight, ChevronDown } from 'lucide-react';

interface Category {
  id: number;
  name: string;
  description: string;
  icon: string;
  parent_id: number | null;
  question_count: number;
  children?: Category[];
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', description: '', icon: '📚', parent_id: '' });
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  useEffect(() => { loadCategories(); }, []);

  const loadCategories = async () => {
    try {
      const { data } = await api.get('/categories');
      setCategories(data);
    } catch { toast.error('Failed to load categories'); }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!form.name) { toast.error('Name is required'); return; }
    try {
      const payload = { ...form, parent_id: form.parent_id ? parseInt(form.parent_id) : null };
      if (editId) {
        await api.put(`/categories/${editId}`, payload);
        toast.success('Category updated');
      } else {
        await api.post('/categories', payload);
        toast.success('Category created');
      }
      setShowForm(false);
      setEditId(null);
      setForm({ name: '', description: '', icon: '📚', parent_id: '' });
      loadCategories();
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  const startEdit = (cat: Category) => {
    setEditId(cat.id);
    setForm({ name: cat.name, description: cat.description || '', icon: cat.icon || '📚', parent_id: cat.parent_id?.toString() || '' });
    setShowForm(true);
  };

  const deleteCategory = async (id: number) => {
    if (!confirm('Delete this category?')) return;
    try {
      await api.delete(`/categories/${id}`);
      toast.success('Category deleted');
      loadCategories();
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Cannot delete'); }
  };

  const toggleExpand = (id: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Build tree
  const tree = categories.filter(c => !c.parent_id);
  const childrenOf = (parentId: number) => categories.filter(c => c.parent_id === parentId);

  const renderCategory = (cat: Category, depth: number = 0) => {
    const children = childrenOf(cat.id);
    const isExpanded = expanded.has(cat.id);

    return (
      <div key={cat.id}>
        <div className={`flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors ${depth > 0 ? 'ml-8 border-l border-white/5' : ''}`}>
          {children.length > 0 ? (
            <button onClick={() => toggleExpand(cat.id)} className="text-gray-400 hover:text-white">
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : <div className="w-4" />}
          <span className="text-lg">{cat.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white">{cat.name}</p>
            {cat.description && <p className="text-xs text-gray-500 truncate">{cat.description}</p>}
          </div>
          <span className="badge-emerald text-xs">{cat.question_count} Q</span>
          <button onClick={() => startEdit(cat)} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"><Pencil className="w-3.5 h-3.5" /></button>
          <button onClick={() => deleteCategory(cat.id)} className="p-1.5 rounded-lg hover:bg-rose-500/10 text-gray-400 hover:text-rose-400"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
        {isExpanded && children.map(child => renderCategory(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Categories</h1>
          <p className="text-gray-400 text-sm">{categories.length} categories</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm({ name: '', description: '', icon: '📚', parent_id: '' }); }} className="btn-primary flex items-center gap-2 py-2.5 px-4 text-sm">
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="glass-card p-6 animate-scale-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">{editId ? 'Edit Category' : 'New Category'}</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Category name" className="input-field" />
            <select value={form.parent_id} onChange={(e) => setForm(f => ({ ...f, parent_id: e.target.value }))} className="select-field">
              <option value="">No parent (top-level)</option>
              {categories.filter(c => c.id !== editId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description" className="input-field" />
            <input value={form.icon} onChange={(e) => setForm(f => ({ ...f, icon: e.target.value }))} placeholder="Icon emoji" className="input-field" />
          </div>
          <button onClick={handleSubmit} className="btn-primary mt-4 flex items-center gap-2 py-2.5 px-4 text-sm">
            <Check className="w-4 h-4" /> {editId ? 'Update' : 'Create'}
          </button>
        </div>
      )}

      {/* Tree */}
      <div className="glass-card overflow-hidden divide-y divide-white/5">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3"><div className="skeleton h-4 w-48" /></div>
          ))
        ) : tree.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FolderTree className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No categories yet. Create one to get started.</p>
          </div>
        ) : tree.map(cat => renderCategory(cat))}
      </div>
    </div>
  );
}
