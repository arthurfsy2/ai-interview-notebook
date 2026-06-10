"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { PieChart as PieIcon } from "lucide-react";
import { ChartCard } from "./ChartCard";
import { CustomTooltip } from "./CustomTooltip";

interface ResultDistributionChartProps {
  data: { result: string; count: number; percentage: number }[];
  title: string;
  description?: string;
  emptyMessage: string;
  totalCount: number;
}

const RESULT_COLORS: Record<string, string> = {
  "通过": "#10b981",
  "被拒": "#ef4444",
  "主动放弃": "#f59e0b",
  "无消息": "#94a3b8",
  "待定": "#6366f1",
};

const DEFAULT_COLORS = ["#3b82f6", "#10b981", "#ef4444", "#f59e0b", "#94a3b8", "#6366f1"];

export function ResultDistributionChart({
  data,
  title,
  description,
  emptyMessage,
  totalCount,
}: ResultDistributionChartProps) {
  return (
    <ChartCard
      title={title}
      description={description}
      icon={PieIcon}
      empty={data.length === 0}
      emptyMessage={emptyMessage}
    >
      <div className="w-full min-h-[280px] relative">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="45%"
              outerRadius="75%"
              dataKey="count"
              nameKey="result"
              paddingAngle={2}
            >
              {data.map((entry, i) => (
                <Cell
                  key={entry.result}
                  fill={RESULT_COLORS[entry.result] || DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              content={
                <CustomTooltip
                  formatter={(v, name) =>
                    name === "count" ? `${v} 次` : String(v)
                  }
                />
              }
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-700">{totalCount}</div>
            <div className="text-xs text-slate-400">总数</div>
          </div>
        </div>
      </div>
    </ChartCard>
  );
}
