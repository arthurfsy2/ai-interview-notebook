"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Star } from "lucide-react";
import { ChartCard } from "./ChartCard";
import { CustomTooltip } from "./CustomTooltip";

interface ExperienceTrendChartProps {
  data: { month: string; avgRating: number }[];
  title: string;
  description?: string;
  emptyMessage: string;
}

function formatMonth(month: string): string {
  const [, m] = month.split("-");
  return `${parseInt(m)}月`;
}

export function ExperienceTrendChart({
  data,
  title,
  description,
  emptyMessage,
}: ExperienceTrendChartProps) {
  return (
    <ChartCard
      title={title}
      description={description}
      icon={Star}
      empty={data.length === 0}
      emptyMessage={emptyMessage}
    >
      <div className="w-full min-h-[250px]">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="month"
              tickFormatter={formatMonth}
              tick={{ fontSize: 12 }}
              stroke="#94a3b8"
            />
            <YAxis
              domain={[1, 5]}
              ticks={[1, 2, 3, 4, 5]}
              tick={{ fontSize: 12 }}
              stroke="#94a3b8"
            />
            <Tooltip
              content={
                <CustomTooltip
                  formatter={(v) => `${v} 分`}
                />
              }
            />
            <Line
              type="monotone"
              dataKey="avgRating"
              name="平均评分"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={{ r: 4, fill: "#8b5cf6", strokeWidth: 2, stroke: "#fff" }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
