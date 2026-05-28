'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Stethoscope, BookOpen, Brain, TrendingUp, ArrowRight } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'admin') router.push('/admin/dashboard');
      else router.push('/student/home');
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-950" />
      <div className="absolute top-20 left-20 w-[500px] h-[500px] bg-emerald-500/8 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-20 w-[400px] h-[400px] bg-emerald-600/5 rounded-full blur-3xl" />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 lg:px-12 py-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">Nawa</span>
        </div>
        <button onClick={() => router.push('/login')} className="btn-primary text-sm py-2.5 px-5">
          Get Started <ArrowRight className="w-4 h-4 inline ml-1" />
        </button>
      </nav>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6">
        <div className="text-center max-w-3xl mx-auto animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 mb-6">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-emerald-400 text-sm font-medium">Medical Education Platform</span>
          </div>

          <h1 className="text-5xl lg:text-7xl font-extrabold text-white leading-tight mb-6">
            Master Medicine,
            <br />
            <span className="gradient-text">One Question at a Time</span>
          </h1>

          <p className="text-gray-400 text-lg lg:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            A professional-grade Question Bank designed for medical students.
            Adaptive quizzes, real-time feedback, and intelligent weak-point tracking.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <button onClick={() => router.push('/login')} className="btn-primary text-base py-4 px-8">
              Start Studying <ArrowRight className="w-5 h-5 inline ml-2" />
            </button>
            <a
              href="https://t.me/+201002429528"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-base py-4 px-8 flex items-center justify-center"
            >
              Contact Us
            </a>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {[
              { icon: BookOpen, title: 'Rich Content', desc: 'Clinical cases with images' },
              { icon: Brain, title: 'Smart Quizzes', desc: 'Randomized & adaptive' },
              { icon: TrendingUp, title: 'Track Progress', desc: 'Weak-point analysis' },
            ].map((feature, i) => (
              <div
                key={i}
                className="glass-card p-5 text-center animate-slide-up"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <feature.icon className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
                <h3 className="text-white font-semibold text-sm mb-1">{feature.title}</h3>
                <p className="text-gray-400 text-xs">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
