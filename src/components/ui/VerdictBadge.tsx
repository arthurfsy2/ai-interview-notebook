/**
 * 面试结果徽章组件
 * 语义化的颜色展示面试结果
 */

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Verdict = '通过' | '被拒' | '主动放弃' | '无消息' | '待定';

interface VerdictBadgeProps {
  verdict: Verdict;
  size?: 'sm' | 'md';
  className?: string;
}

const verdictConfig: Record<Verdict, { color: string; icon?: string }> = {
  '通过': { color: 'bg-success/10 text-success border-success/20', icon: '✓' },
  '被拒': { color: 'bg-destructive/10 text-destructive border-destructive/20', icon: '✗' },
  '主动放弃': { color: 'bg-muted text-muted-foreground border-border', icon: '○' },
  '无消息': { color: 'bg-warning/10 text-warning border-warning/20', icon: '○' },
  '待定': { color: 'bg-info/10 text-info border-info/20', icon: '...' },
};

export function VerdictBadge({ verdict, size = 'sm', className }: VerdictBadgeProps) {
  const config = verdictConfig[verdict] || verdictConfig['待定'];

  return (
    <Badge
      className={cn(
        config.color,
        size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1',
        className
      )}
    >
      {verdict}
    </Badge>
  );
}
