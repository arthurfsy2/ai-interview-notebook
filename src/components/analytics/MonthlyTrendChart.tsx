"use client";

import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { BarChart3 } from "lucide-react";
import { ChartCard } from "./ChartCard";
import { CustomTooltip } from "./CustomTooltip";

interface MonthlyTrendChartProps {
  data: { month: string; count: number; passRate: number }[];
  title: string;
  description?: string;
  emptyMessage: string;
}

function formatMonth(month: string): string {
  const [, m] = month.split("-");
  return `${parseInt(m)}月`;
}

export function MonthlyTrendChart({
  data,
  title,
  description,
  emptyMessage,
}: MonthlyTrendChartProps) {
  const hasData = data.some((d) => d.count > 0);

  return (
    <ChartCard
      title={title}
      description={description}
      icon={BarChart3}
      empty={!hasData}
      emptyMessage={emptyMessage}
    >
      <div className="w-full min-h-[280px]">
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="month"
              tickFormatter={formatMonth}
              tick={{ fontSize: 12 }}
              stroke="#94a3b8"
            />
            <YAxis
              yAxisId="left"
              allowDecimals={false}
              tick={{ fontSize: 12 }}
              stroke="#94a3b8"
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 100]}
              tickFormatter={(v: number) => `${v}%`}
              tick={{ fontSize: 12 }}
              stroke="#94a3b8"
            />
            <Tooltip content={<CustomTooltip formatter={(v, name) => name === "通过率" ? `${v}%` : String(v)} />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar
              yAxisId="left"
              dataKey="count"
              name="面试数"
              fill="#3b82f6"
              radius={[4, 4, 0, 0]}
              barSize={28}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="passRate"
              name="通过率"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 3, fill: "#10b981" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
