'use client';

import { useEffect, useState, useRef } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Loader2, BookOpen, Trash2, UploadCloud, FileText } from 'lucide-react';

interface Category {
  id: number;
  name: string;
  target_year?: number;
}

interface Material {
  id: number;
  category_id: number;
  title: string;
  file_url: string;
  created_at: string;
}

export default function AdminMaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [selectedCategory, setSelectedCategory] = useState('');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [catsRes, matsRes] = await Promise.all([
        api.get('/categories?skip=0&limit=1000'),
        api.get('/admin/materials')
      ]);
      const cats = catsRes.data || [];
      cats.sort((a: Category, b: Category) => {
        const yearA = a.target_year || 999;
        const yearB = b.target_year || 999;
        if (yearA !== yearB) return yearA - yearB;
        return a.name.localeCompare(b.name);
      });
      setCategories(cats);
      setMaterials(matsRes.data || []);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || !title || !file) {
      toast.error('Please fill all fields');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('category_id', selectedCategory);
    formData.append('title', title);
    formData.append('file', file);

    try {
      const { data } = await api.post('/admin/materials', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Study material uploaded successfully');
      setMaterials(prev => [data, ...prev]);
      
      // Reset form
      setTitle('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      toast.error('Failed to upload material');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this study material?')) return;
    
    setDeletingId(id);
    try {
      await api.delete(`/admin/materials/${id}`);
      setMaterials(prev => prev.filter(m => m.id !== id));
      toast.success('Material deleted successfully');
    } catch (err) {
      toast.error('Failed to delete material');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-emerald-500/10 rounded-xl">
          <BookOpen className="w-6 h-6 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Study Materials</h1>
          <p className="text-sm text-gray-400">Upload and manage PDFs for student modules</p>
        </div>
      </div>

      {/* Upload Form */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <UploadCloud className="w-5 h-5 text-emerald-400" /> Upload New PDF
        </h2>
        
        <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Module (Category)</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500/50"
              required
            >
              <option value="">Select a module...</option>
              {Object.keys(
                categories.reduce((acc, cat) => {
                  const year = cat.target_year ? `Year ${cat.target_year}` : 'Other Modules';
                  if (!acc[year]) acc[year] = [];
                  acc[year].push(cat);
                  return acc;
                }, {} as Record<string, Category[]>)
              )
                .sort((a, b) => {
                  if (a === 'Other Modules') return 1;
                  if (b === 'Other Modules') return -1;
                  return a.localeCompare(b);
                })
                .map((year) => {
                  const groupCats = categories.filter(
                    (cat) => (cat.target_year ? `Year ${cat.target_year}` : 'Other Modules') === year
                  );
                  return (
                    <optgroup key={year} label={year} className="bg-slate-900 text-emerald-400 font-bold">
                      {groupCats.map((c) => (
                        <option key={c.id} value={c.id} className="text-white font-normal">
                          {c.name}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
            </select>
          </div>
          
          <div className="md:col-span-4">
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Title / Name</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Cardiology Cheat Sheet"
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500/50"
              required
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-400 mb-1.5">PDF File</label>
            <input
              type="file"
              accept="application/pdf"
              ref={fileInputRef}
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2 text-sm text-gray-300 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-500/10 file:text-emerald-400 hover:file:bg-emerald-500/20"
              required
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={uploading}
              className="w-full btn-primary py-2.5 flex justify-center items-center gap-2"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Upload'}
            </button>
          </div>
        </form>
      </div>

      {/* Data Table */}
      <div className="glass-card overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02]">
          <h2 className="text-lg font-semibold text-white">Existing Materials</h2>
        </div>
        
        {materials.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No study materials uploaded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">File</th>
                  <th className="py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Module</th>
                  <th className="py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {materials.map(mat => {
                  const cat = categories.find(c => c.id === mat.category_id);
                  return (
                    <tr key={mat.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-rose-500/10 rounded-lg">
                            <FileText className="w-4 h-4 text-rose-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{mat.title}</p>
                            <a href={`http://localhost:8000${mat.file_url}`} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline">
                              View PDF
                            </a>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-300">
                        {cat?.name || 'Unknown Module'}
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-400">
                        {new Date(mat.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => handleDelete(mat.id)}
                          disabled={deletingId === mat.id}
                          className="p-2 text-gray-400 hover:text-rose-400 bg-white/5 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="Delete Material"
                        >
                          {deletingId === mat.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
