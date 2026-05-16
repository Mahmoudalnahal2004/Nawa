'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { FileQuestion, CheckCircle, Clock, Users, TrendingUp, BarChart3 } from 'lucide-react';

interface Stats {
  total: number;
  published: number;
  draft: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ total: 0, published: 0, draft: 0 });
  const [studentCount, setStudentCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, usersRes] = await Promise.all([
        api.get('/questions/stats'),
        api.get('/users'),
      ]);
      setStats(statsRes.data);
      setStudentCount(usersRes.data.length);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Total Questions', value: stats.total, icon: FileQuestion, color: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-500/25' },
    { label: 'Published', value: stats.published, icon: CheckCircle, color: 'from-emerald-500 to-emerald-600', shadow: 'shadow-emerald-500/25' },
    { label: 'Drafts', value: stats.draft, icon: Clock, color: 'from-amber-500 to-amber-600', shadow: 'shadow-amber-500/25' },
    { label: 'Students', value: studentCount, icon: Users, color: 'from-violet-500 to-violet-600', shadow: 'shadow-violet-500/25' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Dashboard</h1>
        <p className="text-gray-400">Overview of your question bank</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <div
            key={i}
            className="glass-card p-6 animate-slide-up"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} ${card.shadow} shadow-lg flex items-center justify-center`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              {loading ? (
                <div className="skeleton h-8 w-16 mb-1" />
              ) : (
                <p className="text-3xl font-bold text-white">{card.value.toLocaleString()}</p>
              )}
              <p className="text-sm text-gray-400 mt-1">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-emerald-400" />
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <a href="/admin/questions/new" className="glass-card p-4 text-center hover:bg-emerald-500/10 hover:border-emerald-500/20 transition-all cursor-pointer">
            <FileQuestion className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-white">Create Question</p>
          </a>
          <a href="/admin/questions/import" className="glass-card p-4 text-center hover:bg-blue-500/10 hover:border-blue-500/20 transition-all cursor-pointer">
            <TrendingUp className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-white">Import Excel</p>
          </a>
          <a href="/admin/categories" className="glass-card p-4 text-center hover:bg-violet-500/10 hover:border-violet-500/20 transition-all cursor-pointer">
            <BarChart3 className="w-8 h-8 text-violet-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-white">Manage Categories</p>
          </a>
        </div>
      </div>
    </div>
  );
}
