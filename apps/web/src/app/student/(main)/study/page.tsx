'use client';

import { useEffect, useState } from 'react';
import api, { API_BASE } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2, BookOpen, FileText, ChevronDown, ChevronUp, Download } from 'lucide-react';

interface Category {
  id: number;
  name: string;
  icon: string | null;
}

interface Material {
  id: number;
  category_id: number;
  title: string;
  file_url: string;
  created_at: string;
}

export default function StudyHubPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Track expanded category and its materials
  const [expandedCategoryId, setExpandedCategoryId] = useState<number | null>(null);
  const [materials, setMaterials] = useState<Record<number, Material[]>>({});
  const [loadingMaterials, setLoadingMaterials] = useState<number | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data } = await api.get('/materials/categories');
      setCategories(data);
    } catch (err) {
      toast.error('Failed to load study modules');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = async (categoryId: number) => {
    if (expandedCategoryId === categoryId) {
      // Collapse if already expanded
      setExpandedCategoryId(null);
      return;
    }

    setExpandedCategoryId(categoryId);
    
    // Only fetch if we haven't already
    if (!materials[categoryId]) {
      setLoadingMaterials(categoryId);
      try {
        const { data } = await api.get(`/materials/category/${categoryId}`);
        setMaterials(prev => ({ ...prev, [categoryId]: data }));
      } catch (err) {
        toast.error('Failed to load PDFs');
      } finally {
        setLoadingMaterials(null);
      }
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
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 shadow-inner">
          <BookOpen className="w-6 h-6 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Study Hub</h1>
          <p className="text-gray-400 mt-1">Review your module cheat sheets and PDF materials.</p>
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="glass-card p-12 text-center flex flex-col items-center border border-white/5 bg-gradient-to-br from-slate-900 to-slate-900/50 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-slate-800/80 flex items-center justify-center mb-4 border border-white/5">
            <BookOpen className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No study materials yet</h3>
          <p className="text-gray-400">
            Check back later! Modules with PDF resources will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map(category => {
            const isExpanded = expandedCategoryId === category.id;
            const isLoading = loadingMaterials === category.id;
            const categoryMaterials = materials[category.id] || [];

            return (
              <div 
                key={category.id} 
                className={`glass-card transition-all duration-300 overflow-hidden ${
                  isExpanded 
                    ? 'border-emerald-500/30 bg-gradient-to-br from-slate-900 to-emerald-950/10 shadow-lg shadow-emerald-500/5' 
                    : 'border-white/5 hover:border-white/10 hover:bg-white/[0.02]'
                }`}
              >
                {/* Category Header (Clickable) */}
                <div 
                  className="p-6 flex items-center justify-between cursor-pointer group"
                  onClick={() => handleCategoryClick(category.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                      isExpanded ? 'bg-emerald-500/20' : 'bg-slate-800 group-hover:bg-slate-700'
                    }`}>
                      {category.icon && category.icon.startsWith('/') ? (
                        <img src={`${API_BASE}${category.icon}`} alt={category.name} className="w-6 h-6 object-contain" />
                      ) : (
                        <span className="text-2xl">{category.icon || '📚'}</span>
                      )}
                    </div>
                    <h2 className="text-lg font-semibold text-white group-hover:text-emerald-300 transition-colors">
                      {category.name}
                    </h2>
                  </div>
                  <div className={`p-2 rounded-full transition-colors ${isExpanded ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-gray-400 group-hover:text-white'}`}>
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>

                {/* Expanded Content (PDF List) */}
                {isExpanded && (
                  <div className="px-6 pb-6 animate-fade-in border-t border-white/5 pt-4 bg-black/20">
                    {isLoading ? (
                      <div className="flex justify-center py-6">
                        <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                      </div>
                    ) : categoryMaterials.length === 0 ? (
                      <p className="text-center text-gray-500 py-4 text-sm">No materials available for this module.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {categoryMaterials.map(mat => (
                          <a 
                            key={mat.id} 
                            href={`${API_BASE}${mat.file_url}`}
                            target="_blank" 
                            rel="noreferrer"
                            className="flex items-center justify-between p-4 rounded-xl bg-slate-800/80 border border-slate-700 hover:border-emerald-500/40 hover:bg-slate-800 transition-all group"
                          >
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="p-2 bg-rose-500/10 rounded-lg shrink-0 group-hover:bg-rose-500/20 transition-colors">
                                <FileText className="w-5 h-5 text-rose-400" />
                              </div>
                              <div className="truncate">
                                <p className="text-sm font-medium text-gray-200 group-hover:text-white truncate transition-colors">
                                  {mat.title}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {new Date(mat.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="shrink-0 p-2 rounded-full bg-white/5 text-gray-400 group-hover:bg-emerald-500/10 group-hover:text-emerald-400 transition-colors">
                              <Download className="w-4 h-4" />
                            </div>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
