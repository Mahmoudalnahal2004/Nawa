import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';

interface ModuleCardProps {
  category_id: number;
  category_name: string;
  category_icon: string;
  total_questions: number;
  answered_count: number;
  accuracy_percentage: number;
  index: number;
}

function ProgressRing({ percentage, size = 90, strokeWidth = 6 }: { percentage: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle 
        cx={size / 2} 
        cy={size / 2} 
        r={radius} 
        stroke="rgba(255,255,255,0.05)" 
        strokeWidth={strokeWidth} 
        fill="none" 
      />
      <circle 
        cx={size / 2} 
        cy={size / 2} 
        r={radius} 
        stroke="url(#gradient)" 
        strokeWidth={strokeWidth} 
        fill="none"
        strokeLinecap="round" 
        strokeDasharray={circumference} 
        strokeDashoffset={offset}
        className="progress-ring-circle" 
        style={{ transition: 'stroke-dashoffset 1s ease-out' }} 
      />
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function ModuleCard({
  category_id,
  category_name,
  category_icon,
  total_questions,
  answered_count,
  accuracy_percentage,
  index
}: ModuleCardProps) {
  const router = useRouter();

  return (
    <div
      className={`glass-card p-6 group animate-slide-up transition-all ${
        total_questions > 0 ? 'cursor-pointer hover:border-emerald-500/30' : 'opacity-60 cursor-not-allowed'
      }`}
      style={{ animationDelay: `${index * 60}ms` }}
      onClick={() => {
        if (total_questions > 0) {
          router.push(`/student/quiz/setup/${category_id}`);
        }
      }}
    >
      <div className="flex flex-col items-center text-center">
        {/* Progress Ring */}
        <div className={`relative mb-4 ${total_questions === 0 ? 'grayscale' : ''}`}>
          <ProgressRing percentage={total_questions > 0 ? accuracy_percentage : 0} size={90} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl">{category_icon}</span>
          </div>
        </div>

        <h3 className={`font-semibold text-lg mb-1 transition-colors ${
          total_questions > 0 ? 'text-white group-hover:text-emerald-400' : 'text-gray-400'
        }`}>
          {category_name}
        </h3>

        <p className="text-gray-400 text-sm mb-1">
          {total_questions} questions
        </p>

        {total_questions > 0 ? (
          <>
            <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
              <span>{answered_count} answered</span>
              <span>•</span>
              <span className="text-emerald-400 font-medium">{accuracy_percentage}% accuracy</span>
            </div>

            <div className="w-full flex items-center justify-center gap-2 text-sm font-medium text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
              Start Quiz <ArrowRight className="w-4 h-4" />
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center mt-4 text-sm font-medium text-gray-500">
            Coming Soon
          </div>
        )}
      </div>
    </div>
  );
}
