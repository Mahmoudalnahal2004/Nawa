'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { ShieldCheck, ShieldOff, Plus, Pencil, Trash2, X, Search, ChevronDown, ChevronRight, Users } from 'lucide-react';

interface Category {
  id: number;
  name: string;
  target_year: number | null;
  parent_id: number | null;
}

interface Quota {
  id: number;
  name: string;
  description: string;
  is_default: boolean;
  color: string;
  categories: Category[];
  student_count: number;
}

export default function QuotasPage() {
  const [quotas, setQuotas] = useState<Quota[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuota, setEditingQuota] = useState<Quota | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<number, boolean>>({});
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_ids: [] as number[],
    color: '#10b981',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [quotasRes, catRes] = await Promise.all([
        api.get('/admin/quotas'),
        api.get('/categories/tree') // Using tree or flat list, admin endpoint returns all
      ]);
      setQuotas(quotasRes.data);
      
      // Flatten category tree for simple selection if it's a tree, but /categories without /tree is flat
      // Let's use /categories flat endpoint
      const flatCatRes = await api.get('/categories');
      setCategories(flatCatRes.data);
    } catch (err) {
      toast.error('Failed to load data');
    }
    setLoading(false);
  };

  const openAddModal = () => {
    setEditingQuota(null);
    setFormData({ name: '', description: '', category_ids: [], color: '#10b981' });
    setIsModalOpen(true);
  };

  const openEditModal = (quota: Quota) => {
    setEditingQuota(quota);
    setFormData({
      name: quota.name,
      description: quota.description || '',
      category_ids: quota.categories.map(c => c.id),
      color: quota.color || '#10b981',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return toast.error('Name is required');

    try {
      if (editingQuota) {
        await api.put(`/admin/quotas/${editingQuota.id}`, formData);
        toast.success('Quota updated');
      } else {
        await api.post('/admin/quotas', formData);
        toast.success('Quota created');
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      toast.error('Failed to save quota');
    }
  };

  const deleteQuota = async (id: number) => {
    if (!confirm('Are you sure you want to delete this quota?')) return;
    try {
      await api.delete(`/admin/quotas/${id}`);
      toast.success('Quota deleted');
      loadData();
    } catch (err) {
      toast.error('Failed to delete quota');
    }
  };

  const toggleDefault = async (quota: Quota) => {
    try {
      await api.put(`/admin/quotas/${quota.id}/default`);
      toast.success(quota.is_default ? 'Default quota removed' : 'Default quota updated');
      loadData();
    } catch (err) {
      toast.error('Failed to update default quota');
    }
  };

  const mainCategories = categories.filter(c => c.parent_id === null);
  const subCategories = categories.filter(c => c.parent_id !== null);

  const toggleCategory = (catId: number, parentId: number | null = null) => {
    setFormData(prev => {
      let newIds = new Set(prev.category_ids);
      const isSelected = newIds.has(catId);
      
      if (isSelected) {
        newIds.delete(catId);
        // If unchecking a child, uncheck its parent too
        if (parentId) {
          newIds.delete(parentId);
        }
      } else {
        newIds.add(catId);
        // If checking a child, check if all siblings are now checked
        if (parentId) {
          const siblings = subCategories.filter(c => c.parent_id === parentId);
          const allSiblingsChecked = siblings.every(c => newIds.has(c.id));
          if (allSiblingsChecked) {
            newIds.add(parentId);
          }
        }
      }
      
      return {
        ...prev,
        category_ids: Array.from(newIds)
      };
    });
  };

  const toggleExpand = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedCategories(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleParentCategory = (parentId: number, childIds: number[]) => {
    setFormData(prev => {
      const isSelected = prev.category_ids.includes(parentId);
      const allIdsToToggle = [parentId, ...childIds];
      
      if (isSelected) {
        // Deselect parent and all children
        return {
          ...prev,
          category_ids: prev.category_ids.filter(id => !allIdsToToggle.includes(id))
        };
      } else {
        // Select parent and all children
        const newIds = new Set([...prev.category_ids, ...allIdsToToggle]);
        return {
          ...prev,
          category_ids: Array.from(newIds)
        };
      }
    });
  };

  const groupedCategories = mainCategories.reduce((acc, cat) => {
    const year = cat.target_year ? `Year ${cat.target_year}` : 'Other';
    if (!acc[year]) acc[year] = [];
    acc[year].push(cat);
    return acc;
  }, {} as Record<string, Category[]>);

  const sortedYearKeys = Object.keys(groupedCategories).sort((a, b) => {
    if (a === 'Other') return 1;
    if (b === 'Other') return -1;
    const numA = parseInt(a.replace('Year ', ''));
    const numB = parseInt(b.replace('Year ', ''));
    return numA - numB;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            Access Quotas
          </h1>
          <p className="text-gray-400 text-sm">Manage student access to specific modules</p>
        </div>
        
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium transition-all"
        >
          <Plus className="w-4 h-4" />
          Create Quota
        </button>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="glass-card p-6 min-h-[200px] flex flex-col gap-4">
              <div className="skeleton h-6 w-1/2" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-20 w-full mt-auto" />
            </div>
          ))
        ) : quotas.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500 glass-card">
            <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
            No quotas found. Create one to get started.
          </div>
        ) : (
          quotas.map(quota => (
            <div key={quota.id} className="glass-card p-6 flex flex-col group relative overflow-hidden" style={{ borderColor: `${quota.color || '#10b981'}30` }}>
              <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: quota.color || '#10b981' }} />
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => toggleDefault(quota)} 
                  className={`p-2 bg-slate-800/80 rounded-lg transition-colors ${
                    quota.is_default 
                      ? 'hover:bg-amber-500/20 text-blue-400 hover:text-amber-400' 
                      : 'hover:bg-blue-500/20 text-gray-400 hover:text-blue-400'
                  }`}
                  title={quota.is_default ? "Remove Default Status" : "Set as Default"}
                >
                  {quota.is_default ? <ShieldOff className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                </button>
                <button onClick={() => openEditModal(quota)} className="p-2 bg-slate-800/80 hover:bg-emerald-500/20 text-gray-400 hover:text-emerald-400 rounded-lg transition-colors" title="Edit">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => deleteQuota(quota.id)} className="p-2 bg-slate-800/80 hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 rounded-lg transition-colors" title="Delete">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              <div className="flex items-center gap-3 mb-2 pr-28">
                <h3 className="text-xl font-bold text-white">{quota.name}</h3>
                {quota.is_default && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-blue-500/20 text-blue-400 border border-blue-500/20">
                    Default
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-400 mb-6 flex-1">{quota.description || 'No description provided.'}</p>
              
              <div className="border-t border-white/5 pt-4 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Included Modules ({quota.categories.length})</p>
                  <div 
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                    style={{
                      backgroundColor: `${quota.color || '#10b981'}15`,
                      border: `1px solid ${quota.color || '#10b981'}30`,
                      color: quota.color || '#10b981'
                    }}
                  >
                    <Users className="w-3 h-3 opacity-80" />
                    <span className="text-xs font-medium">{quota.student_count || 0} Students</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {quota.categories.slice(0, 5).map(cat => (
                    <span key={cat.id} className="px-2 py-1 bg-white/5 text-gray-300 rounded-md text-xs">
                      {cat.name}
                    </span>
                  ))}
                  {quota.categories.length > 5 && (
                    <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-md text-xs font-medium">
                      +{quota.categories.length - 5} more
                    </span>
                  )}
                  {quota.categories.length === 0 && (
                    <span className="text-xs text-gray-500 italic">No modules assigned</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-slate-800 shrink-0">
              <h2 className="text-xl font-bold text-white">{editingQuota ? 'Edit Quota' : 'Create Quota'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Quota Name</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50"
                    placeholder="e.g. Free Tier, Premium Access"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Color</label>
                  <div className="flex items-center gap-3 flex-wrap">
                    {[
                      { label: 'Emerald', value: '#10b981' },
                      { label: 'Blue', value: '#3b82f6' },
                      { label: 'Indigo', value: '#6366f1' },
                      { label: 'Purple', value: '#8b5cf6' },
                      { label: 'Pink', value: '#ec4899' },
                      { label: 'Rose', value: '#f43f5e' },
                      { label: 'Amber', value: '#f59e0b' },
                      { label: 'Slate', value: '#64748b' },
                    ].map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, color: color.value })}
                        className={`w-8 h-8 rounded-full transition-all flex items-center justify-center ${formData.color === color.value ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : 'hover:scale-110'}`}
                        style={{ backgroundColor: color.value }}
                        title={color.label}
                      />
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Description (Optional)</label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 h-24 resize-none"
                    placeholder="Describe what this quota includes..."
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">Allowed Modules (Categories)</label>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 max-h-[40vh] overflow-y-auto space-y-4">
                  {sortedYearKeys.length === 0 && (
                    <p className="text-gray-500 text-sm text-center py-4">No categories available.</p>
                  )}
                  {sortedYearKeys.map(yearLabel => (
                    <div key={yearLabel}>
                      <h4 className="text-xs font-semibold text-emerald-400/80 uppercase tracking-wider mb-2 px-1">{yearLabel}</h4>
                      <div className="space-y-1">
                        {groupedCategories[yearLabel].sort((a, b) => a.name.localeCompare(b.name)).map(parentCat => {
                          const children = subCategories.filter(c => c.parent_id === parentCat.id).sort((a, b) => a.name.localeCompare(b.name));
                          const isParentSelected = formData.category_ids.includes(parentCat.id);
                          const isExpanded = expandedCategories[parentCat.id];
                          
                          return (
                            <div key={parentCat.id} className="mb-2">
                              <div className={`flex items-center p-3 rounded-lg transition-colors border ${isParentSelected ? 'bg-emerald-500/10 border-emerald-500/30' : 'hover:bg-slate-800/50 border-transparent'}`}>
                                <label className="flex items-center gap-3 cursor-pointer flex-1">
                                  <input
                                    type="checkbox"
                                    checked={isParentSelected}
                                    onChange={() => toggleParentCategory(parentCat.id, children.map(c => c.id))}
                                    className="w-4 h-4 rounded border-gray-600 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-950 bg-slate-800"
                                  />
                                  <span className={`text-sm font-medium ${isParentSelected ? 'text-emerald-400' : 'text-gray-300'}`}>
                                    {parentCat.name}
                                  </span>
                                </label>
                                
                                {children.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={(e) => toggleExpand(e, parentCat.id)}
                                    className="p-1 rounded-md hover:bg-slate-700/50 text-gray-400 transition-colors ml-2"
                                  >
                                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                  </button>
                                )}
                              </div>

                              {children.length > 0 && isExpanded && (
                                <div className="ml-6 mt-1 space-y-1 border-l-2 border-slate-800 pl-3">
                                  {children.map(childCat => {
                                    const isChildSelected = formData.category_ids.includes(childCat.id);
                                    return (
                                      <label key={childCat.id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors border ${isChildSelected ? 'bg-emerald-500/5 border-emerald-500/20' : 'hover:bg-slate-800/30 border-transparent'}`}>
                                        <input
                                          type="checkbox"
                                          checked={isChildSelected}
                                          onChange={() => toggleCategory(childCat.id, childCat.parent_id)}
                                          className="w-3.5 h-3.5 rounded border-gray-600 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-950 bg-slate-800"
                                        />
                                        <div className="flex-1">
                                          <span className={`text-xs font-medium ${isChildSelected ? 'text-emerald-400' : 'text-gray-400'}`}>
                                            {childCat.name}
                                          </span>
                                        </div>
                                      </label>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </form>
            
            <div className="p-6 border-t border-slate-800 shrink-0 flex justify-end gap-3 bg-slate-900/50">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-5 py-2.5 rounded-xl text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 transition-all"
              >
                Save Quota
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
