'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Trash2, Building2, Loader2 } from 'lucide-react';

interface University {
  id: number;
  name: string;
}

export default function AdminSettingsPage() {
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUni, setNewUni] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadUniversities();
  }, []);

  const loadUniversities = async () => {
    try {
      const { data } = await api.get('/universities');
      setUniversities(data);
    } catch {
      toast.error('Failed to load universities');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUni.trim()) return;
    setAdding(true);
    try {
      await api.post('/universities', { name: newUni.trim() });
      setNewUni('');
      toast.success('University added');
      loadUniversities();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to add university');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this university?')) return;
    try {
      await api.delete(`/universities/${id}`);
      toast.success('University deleted');
      loadUniversities();
    } catch {
      toast.error('Failed to delete university');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">Platform Settings</h1>
        <p className="text-gray-400 text-sm">Manage dynamic lists and configurations</p>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-semibold text-white">Universities</h2>
        </div>
        
        <form onSubmit={handleAdd} className="flex gap-3 mb-6">
          <input
            type="text"
            value={newUni}
            onChange={e => setNewUni(e.target.value)}
            placeholder="Enter new university name..."
            className="input-field flex-1"
          />
          <button type="submit" disabled={adding || !newUni.trim()} className="btn-primary flex items-center gap-2 px-4">
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add
          </button>
        </form>

        <div className="space-y-2">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
            </div>
          ) : universities.length === 0 ? (
            <p className="text-gray-500 text-center py-4 text-sm">No universities added yet.</p>
          ) : (
            universities.map(uni => (
              <div key={uni.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                <span className="text-white text-sm">{uni.name}</span>
                <button
                  onClick={() => handleDelete(uni.id)}
                  className="p-1.5 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
