'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isAuthenticated, getStoredUser, clearAuth } from '@/lib/auth';
import {
  LayoutDashboard, AlertTriangle, LogOut, Menu, X, Stethoscope, ChevronRight, BookOpen, UserCircle2, History, Trophy, Flame
} from 'lucide-react';

const navItems = [
  { href: '/student/dashboard', icon: LayoutDashboard, label: 'Create Quiz' },
  { href: '/student/weak-points', icon: AlertTriangle, label: 'Weak Points' },
  { href: '/student/history', icon: History, label: 'History & Analytics' },
  { href: '/student/leaderboard', icon: Trophy, label: 'Leaderboard' },
  { href: '/student/profile', icon: UserCircle2, label: 'My Profile' },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/login'); return; }
    const u = getStoredUser();
    if (u?.role !== 'student') { router.push('/admin/dashboard'); return; }
    setUser(u);
    // Fetch streak from backend
    import('@/lib/api').then(mod => {
      mod.default.get('/users/me').then((res: any) => {
        setStreak(res.data.current_streak || 0);
      }).catch(() => {});
    });
  }, [router]);

  const handleLogout = () => { clearAuth(); router.push('/login'); };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-navy-950 flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 h-screen bg-navy-900/80 backdrop-blur-xl border-r border-white/5
        transform transition-transform duration-300 ease-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-3 px-6 py-6 border-b border-white/5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Nawa</h1>
              <p className="text-xs text-gray-500">Study Hub</p>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <button key={item.href} onClick={() => { router.push(item.href); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                    ${isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                  <item.icon className="w-5 h-5" />{item.label}
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                </button>
              );
            })}
          </nav>

          <div className="px-4 py-4 border-t border-white/5">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <span className="text-emerald-400 text-sm font-bold">{user.full_name?.[0] || 'S'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user.full_name}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
              <button onClick={handleLogout} className="text-gray-400 hover:text-rose-400 transition-colors" title="Logout">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className="flex-1 flex flex-col min-h-screen lg:ml-72">
        <header className="sticky top-0 z-30 bg-navy-950/80 backdrop-blur-xl border-b border-white/5 px-6 py-4">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-400 hover:text-white">
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-semibold text-white">Study Hub</h2>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20">
                <Flame className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-bold text-orange-400">{streak}</span>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 p-6 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
