'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Users, Shield, ShieldOff, Mail, Calendar, Search, Crown } from 'lucide-react';

interface User {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
  role: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [promotingUser, setPromotingUser] = useState<User | null>(null);
  const [demotingUser, setDemotingUser] = useState<User | null>(null);

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      const { data } = await api.get('/users');
      setUsers(data);
    } catch { toast.error('Failed to load users'); }
    setLoading(false);
  };

  const toggleActive = async (id: number, current: boolean) => {
    try {
      await api.patch(`/users/${id}/activate`, { is_active: !current });
      toast.success(!current ? 'Account activated' : 'Account deactivated');
      loadUsers();
    } catch { toast.error('Failed to update status'); }
  };

  const confirmPromotion = async (id: number) => {
    try {
      await api.patch(`/users/${id}/promote`);
      toast.success('User promoted to admin successfully');
      setPromotingUser(null);
      loadUsers();
    } catch { toast.error('Failed to promote user'); }
  };

  const confirmDemotion = async (id: number) => {
    try {
      await api.patch(`/users/${id}/demote`);
      toast.success('Admin removed successfully');
      setDemotingUser(null);
      loadUsers();
    } catch { toast.error('Failed to demote user'); }
  };

  const filteredUsers = users.filter(u => 
    (u.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    (u.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const admins = filteredUsers.filter(u => u.role === 'admin');
  const students = filteredUsers.filter(u => u.role === 'student');

  const renderTable = (data: User[], emptyMessage: string, showPromote: boolean) => (
    <div className="glass-card overflow-hidden">
      <table className="data-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Email</th>
            <th>Registered</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <tr key={i}>
                <td><div className="skeleton h-4 w-32" /></td>
                <td><div className="skeleton h-4 w-40" /></td>
                <td><div className="skeleton h-4 w-24" /></td>
                <td><div className="skeleton h-4 w-20" /></td>
                <td><div className="skeleton h-4 w-24" /></td>
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr><td colSpan={5} className="text-center py-12 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              {emptyMessage}
            </td></tr>
          ) : (
            data.map((u) => (
              <tr key={u.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${u.role === 'admin' ? 'bg-amber-500/20' : 'bg-emerald-500/20'}`}>
                      <span className={`text-xs font-bold ${u.role === 'admin' ? 'text-amber-400' : 'text-emerald-400'}`}>{u.full_name?.[0] || '?'}</span>
                    </div>
                    <span className="text-white font-medium text-sm">{u.full_name}</span>
                  </div>
                </td>
                <td className="text-gray-400 text-sm">{u.email}</td>
                <td className="text-gray-400 text-sm">{new Date(u.created_at).toLocaleDateString()}</td>
                <td>
                  <span className={u.is_active ? 'badge-emerald' : 'badge-rose'}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleActive(u.id, u.is_active)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                        ${u.is_active
                          ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                        }`}
                    >
                      {u.is_active ? <ShieldOff className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    {showPromote && (
                      <button
                        onClick={() => setPromotingUser(u)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                        title="Promote to Admin"
                      >
                        <Crown className="w-3.5 h-3.5" />
                        Promote
                      </button>
                    )}
                    {!showPromote && u.email !== 'admin@nawa.com' && (
                      <button
                        onClick={() => setDemotingUser(u)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                        title="Remove Admin"
                      >
                        <ShieldOff className="w-3.5 h-3.5" />
                        Demote
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <p className="text-gray-400 text-sm">{users.length} registered users</p>
        </div>
        
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            className="w-full bg-slate-900 border border-slate-700/50 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Crown className="w-5 h-5 text-amber-400" />
          Administrators
        </h2>
        {renderTable(admins, "No administrators found", false)}
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-emerald-400" />
          Students
        </h2>
        {renderTable(students, "No students found", true)}
      </div>

      {promotingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 transform transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                <Crown className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Promote to Admin</h3>
                <p className="text-sm text-gray-400">This action cannot be undone here.</p>
              </div>
            </div>
            
            <p className="text-gray-300 text-sm mb-6">
              Are you sure you want to promote <span className="text-white font-semibold">{promotingUser.full_name}</span> (<span className="text-white">{promotingUser.email}</span>) to an Administrator role? They will gain full access to the dashboard.
            </p>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setPromotingUser(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-300 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmPromotion(promotingUser.id)}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2"
              >
                <Crown className="w-4 h-4" />
                Yes, Promote
              </button>
            </div>
          </div>
        </div>
      )}

      {demotingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 transform transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0">
                <ShieldOff className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Remove Admin</h3>
                <p className="text-sm text-gray-400">This action cannot be undone here.</p>
              </div>
            </div>
            
            <p className="text-gray-300 text-sm mb-6">
              Are you sure you want to demote <span className="text-white font-semibold">{demotingUser.full_name}</span> (<span className="text-white">{demotingUser.email}</span>) to a Student role? They will lose access to the admin dashboard.
            </p>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDemotingUser(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-300 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmDemotion(demotingUser.id)}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20 transition-all flex items-center gap-2"
              >
                <ShieldOff className="w-4 h-4" />
                Yes, Demote
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
