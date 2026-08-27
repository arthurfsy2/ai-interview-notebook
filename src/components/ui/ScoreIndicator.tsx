/**
 * 评分指示器组件
 * 可视化的星级评分展示
 */

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScoreIndicatorProps {
  score: number; // 1-5
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  className?: string;
}

const scoreColors: Record<number, string> = {
  1: 'text-destructive',
  2: 'text-destructive',
  3: 'text-warning',
  4: 'text-info',
  5: 'text-success',
};

const sizeMap = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4.5 w-4.5',
  lg: 'h-5.5 w-5.5',
};

export function ScoreIndicator({ score, size = 'sm', showValue = false, className }: ScoreIndicatorProps) {
  const clampedScore = Math.max(1, Math.min(5, score));
  const colorClass = scoreColors[clampedScore] || 'text-muted-foreground';

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            sizeMap[size],
            i <= clampedScore ? cn('fill-current', colorClass) : 'text-muted'
          )}
        />
      ))}
      {showValue && (
        <span className={cn('ml-1 text-sm font-medium', colorClass)}>
          {clampedScore}
        </span>
      )}
    </div>
  );
}
