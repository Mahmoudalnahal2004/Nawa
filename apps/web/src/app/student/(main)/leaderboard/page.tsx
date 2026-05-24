'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Loader2, Trophy, Medal, Crown, ChevronDown } from 'lucide-react';

interface Category {
  category_id: number;
  category_name: string;
  category_icon: string;
}

interface LeaderboardEntry {
  rank: number;
  user_id: number;
  display_name: string;
  correct_count: number;
  total_answered: number;
  accuracy_percentage: number;
}

export default function LeaderboardPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingBoard, setLoadingBoard] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const { data } = await api.get('/analytics/by-category');
      const allCategory: Category = {
        category_id: 0,
        category_name: 'All Modules',
        category_icon: '🌍'
      };
      const categoriesWithAll = [allCategory, ...data];
      setCategories(categoriesWithAll);
      if (categoriesWithAll.length > 0) {
        setSelectedCategory(categoriesWithAll[0].category_id);
        await fetchLeaderboard(categoriesWithAll[0].category_id);
      }
    } catch {
      toast.error('Failed to load modules');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async (categoryId: number) => {
    setLoadingBoard(true);
    try {
      const { data } = await api.get(`/analytics/leaderboard/${categoryId}`);
      setLeaderboard(data);
    } catch {
      toast.error('Failed to load leaderboard');
    } finally {
      setLoadingBoard(false);
    }
  };

  const handleCategoryChange = (categoryId: number) => {
    setSelectedCategory(categoryId);
    fetchLeaderboard(categoryId);
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-300" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="text-sm font-bold text-gray-500 w-5 text-center">{rank}</span>;
  };

  const getRankBg = (rank: number) => {
    if (rank === 1) return 'bg-yellow-500/10 border-yellow-500/20';
    if (rank === 2) return 'bg-gray-400/10 border-gray-400/20';
    if (rank === 3) return 'bg-amber-600/10 border-amber-600/20';
    return 'bg-white/5 border-transparent';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
      </div>
    );
  }

  const selectedCat = categories.find(c => c.category_id === selectedCategory);

  return (
    <div className="max-w-6xl mx-auto animate-fade-in flex flex-col lg:flex-row gap-8 items-start">
      {/* Main Content: Leaderboard */}
      <div className="flex-1 space-y-8 w-full order-2 lg:order-1">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center shadow-lg shadow-yellow-500/25">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Leaderboard</h1>
            <p className="text-gray-400 text-sm">Compete with fellow students across modules</p>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            {selectedCat && (
              <span className="text-2xl flex items-center justify-center">
                {selectedCat.category_icon?.startsWith('/') ? (
                  <img src={`http://localhost:8000${selectedCat.category_icon}`} alt={selectedCat.category_name} className="w-8 h-8 object-contain" />
                ) : (
                  selectedCat.category_icon
                )}
              </span>
            )}
            {selectedCat?.category_name || 'Module'} Rankings
          </h2>

          {loadingBoard ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 text-sm">No students have attempted this module yet.</p>
              <p className="text-gray-600 text-xs mt-1">Be the first to claim the top spot!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboard.map(entry => (
                <div
                  key={entry.user_id}
                  className={`flex items-center gap-4 px-5 py-4 rounded-xl border transition-all hover:scale-[1.01] ${getRankBg(entry.rank)}`}
                >
                  <div className="w-8 flex items-center justify-center shrink-0">
                    {getRankIcon(entry.rank)}
                  </div>

                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 flex items-center justify-center shrink-0">
                    <span className="text-emerald-400 font-bold text-sm">
                      {entry.display_name === 'Anonymous Student' ? '?' : entry.display_name[0]}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${entry.display_name === 'Anonymous Student' ? 'text-gray-400 italic' : 'text-white'}`}>
                      {entry.display_name}
                    </p>
                    <p className="text-xs text-gray-500">{entry.total_answered} questions answered</p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className={`text-lg font-bold ${
                      entry.accuracy_percentage >= 80 ? 'text-emerald-400' :
                      entry.accuracy_percentage >= 60 ? 'text-amber-400' : 'text-rose-400'
                    }`}>
                      {entry.accuracy_percentage}%
                    </p>
                    <p className="text-xs text-gray-500">{entry.correct_count} correct</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sidebar: Module Selector */}
      <div className="w-full lg:w-80 shrink-0 sticky top-24 order-1 lg:order-2">
        <div className="glass-card p-5 border-t-4 border-t-emerald-500">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Select Module</h3>
          </div>
          <div className="flex flex-col gap-2 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2">
            {categories.map(cat => (
              <button
                key={cat.category_id}
                onClick={() => handleCategoryChange(cat.category_id)}
                className={`w-full px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-3 text-left ${
                  selectedCategory === cat.category_id
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                    : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="shrink-0">
                  {cat.category_icon?.startsWith('/') ? (
                    <img src={`http://localhost:8000${cat.category_icon}`} alt={cat.category_name} className="w-5 h-5 object-contain" />
                  ) : (
                    cat.category_icon
                  )}
                </span>
                <span className="truncate">{cat.category_name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
