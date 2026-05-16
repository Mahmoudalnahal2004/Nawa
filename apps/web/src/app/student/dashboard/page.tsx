'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { BookOpen, Target } from 'lucide-react';
import { ModuleCard } from '@/components/student/ModuleCard';

interface CategoryProgress {
  category_id: number;
  category_name: string;
  category_icon: string;
  total_questions: number;
  answered_count: number;
  correct_count: number;
  accuracy_percentage: number;
}

export default function StudentDashboard() {
  const [categories, setCategories] = useState<CategoryProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [overall, setOverall] = useState({ total_answered: 0, accuracy_percentage: 0 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [catRes, progRes] = await Promise.all([
        api.get('/student/categories'),
        api.get('/analytics/progress'),
      ]);
      setCategories(catRes.data);
      setOverall(progRes.data);
    } catch (err) {
      console.error('Failed to load data', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header with overall stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Module Library</h1>
          <p className="text-gray-400">Select a module and start your quiz</p>
        </div>
        <div className="glass-card px-5 py-3 flex items-center gap-4">
          <Target className="w-5 h-5 text-emerald-400" />
          <div>
            <p className="text-xs text-gray-400">Overall Accuracy</p>
            <p className="text-lg font-bold text-white">{overall.accuracy_percentage}%</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div>
            <p className="text-xs text-gray-400">Answered</p>
            <p className="text-lg font-bold text-white">{overall.total_answered}</p>
          </div>
        </div>
      </div>

      {/* Module Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card p-6 animate-pulse">
              <div className="skeleton h-20 w-20 rounded-full mx-auto mb-4" />
              <div className="skeleton h-5 w-32 mx-auto mb-2" />
              <div className="skeleton h-4 w-20 mx-auto" />
            </div>
          ))
        ) : categories.length === 0 ? (
          <div className="col-span-full text-center py-16">
            <BookOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No modules available yet</p>
            <p className="text-gray-500 text-sm mt-1">Contact your administrator to add questions</p>
          </div>
        ) : (
          categories.map((cat, i) => (
            <ModuleCard
              key={cat.category_id}
              category_id={cat.category_id}
              category_name={cat.category_name}
              category_icon={cat.category_icon}
              total_questions={cat.total_questions}
              answered_count={cat.answered_count}
              accuracy_percentage={cat.accuracy_percentage}
              index={i}
            />
          ))
        )}
      </div>
    </div>
  );
}
