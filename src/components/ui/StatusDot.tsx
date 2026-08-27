/**
 * 状态指示点组件
 * 用于列表项、卡片等展示状态
 */

import { cn } from '@/lib/utils';

type Status = 'success' | 'warning' | 'error' | 'info' | 'muted';

interface StatusDotProps {
  status: Status;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  className?: string;
}

const statusColors: Record<Status, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-destructive',
  info: 'bg-info',
  muted: 'bg-muted-foreground',
};

const sizeMap = {
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
};

export function StatusDot({ status, size = 'sm', pulse = false, className }: StatusDotProps) {
  return (
    <span className={cn('relative inline-flex', className)}>
      {pulse && (
        <span
          className={cn(
            'absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping',
            statusColors[status]
          )}
        />
      )}
      <span
        className={cn(
          'relative inline-flex rounded-full',
          sizeMap[size],
          statusColors[status]
        )}
      />
    </span>
  );
}
