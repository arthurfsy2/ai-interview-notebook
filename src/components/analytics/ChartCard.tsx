import { type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ChartCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  empty?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function ChartCard({
  title,
  description,
  icon: Icon,
  children,
  empty,
  emptyMessage,
  className = "",
}: ChartCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-blue-600" />}
          {title}
        </CardTitle>
        {description && (
          <p className="text-xs text-slate-500">{description}</p>
        )}
      </CardHeader>
      <CardContent>
        {empty ? (
          <div className="flex items-center justify-center h-[200px] text-sm text-slate-400">
            {emptyMessage || "暂无数据"}
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
