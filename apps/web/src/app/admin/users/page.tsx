'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Users, Shield, ShieldOff, Mail, Calendar } from 'lucide-react';

interface Student {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
}

export default function UsersPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadStudents(); }, []);

  const loadStudents = async () => {
    try {
      const { data } = await api.get('/users');
      setStudents(data);
    } catch { toast.error('Failed to load students'); }
    setLoading(false);
  };

  const toggleActive = async (id: number, current: boolean) => {
    try {
      await api.patch(`/users/${id}/activate`, { is_active: !current });
      toast.success(!current ? 'Account activated' : 'Account deactivated');
      loadStudents();
    } catch { toast.error('Failed to update status'); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Student Management</h1>
        <p className="text-gray-400 text-sm">{students.length} registered students</p>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Email</th>
              <th>Registered</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td><div className="skeleton h-4 w-32" /></td>
                  <td><div className="skeleton h-4 w-40" /></td>
                  <td><div className="skeleton h-4 w-24" /></td>
                  <td><div className="skeleton h-4 w-20" /></td>
                  <td><div className="skeleton h-4 w-24" /></td>
                </tr>
              ))
            ) : students.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                No students registered yet
              </td></tr>
            ) : students.map((s) => (
              <tr key={s.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <span className="text-emerald-400 text-xs font-bold">{s.full_name?.[0] || '?'}</span>
                    </div>
                    <span className="text-white font-medium text-sm">{s.full_name}</span>
                  </div>
                </td>
                <td className="text-gray-400 text-sm">{s.email}</td>
                <td className="text-gray-400 text-sm">{new Date(s.created_at).toLocaleDateString()}</td>
                <td>
                  <span className={s.is_active ? 'badge-emerald' : 'badge-rose'}>
                    {s.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <button
                    onClick={() => toggleActive(s.id, s.is_active)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                      ${s.is_active
                        ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                      }`}
                  >
                    {s.is_active ? <ShieldOff className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                    {s.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
