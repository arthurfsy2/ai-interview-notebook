/**
 * AI 洞察卡片组件
 * 统一展示 AI 分析结果
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Brain, Lightbulb, Target, AlertTriangle } from 'lucide-react';

interface InsightCardProps {
  title: string;
  content?: string;
  variant?: 'tags' | 'summary' | 'recommendation' | 'warning';
  items?: string[];
  className?: string;
}

const variantConfig = {
  tags: {
    icon: Brain,
    iconColor: 'text-info',
    bgColor: 'bg-info/5',
    borderColor: 'border-info/20',
  },
  summary: {
    icon: Lightbulb,
    iconColor: 'text-warning',
    bgColor: 'bg-warning/5',
    borderColor: 'border-warning/20',
  },
  recommendation: {
    icon: Target,
    iconColor: 'text-success',
    bgColor: 'bg-success/5',
    borderColor: 'border-success/20',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-destructive',
    bgColor: 'bg-destructive/5',
    borderColor: 'border-destructive/20',
  },
};

export function InsightCard({ title, content, variant = 'tags', items, className }: InsightCardProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <Card className={cn(config.borderColor, className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Icon className={cn('h-4 w-4', config.iconColor)} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {variant === 'tags' && items && items.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {items.map((tag, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {variant === 'summary' && content && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {content}
          </p>
        )}

        {variant === 'recommendation' && items && items.length > 0 && (
          <ul className="space-y-1.5">
            {items.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-success mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}

        {variant === 'warning' && content && (
          <p className="text-sm text-destructive/80 leading-relaxed">
            {content}
          </p>
        )}

        {variant === 'warning' && items && items.length > 0 && (
          <ul className="space-y-1.5 mt-2">
            {items.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-destructive/80">
                <span className="mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}

        {content && variant === 'tags' && (
          <p className="text-sm text-muted-foreground mt-2">
            {content}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
