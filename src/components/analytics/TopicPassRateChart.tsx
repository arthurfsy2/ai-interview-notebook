"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import { MessageSquare } from "lucide-react";
import { ChartCard } from "./ChartCard";
import { CustomTooltip } from "./CustomTooltip";

interface TopicPassRateChartProps {
  data: { topic: string; count: number; passCount: number; passRate: number }[];
  title: string;
  description?: string;
  emptyMessage: string;
}

function getPassRateColor(rate: number): string {
  if (rate >= 60) return "#10b981";
  if (rate >= 40) return "#f59e0b";
  return "#ef4444";
}

export function TopicPassRateChart({
  data,
  title,
  description,
  emptyMessage,
}: TopicPassRateChartProps) {
  // Enrich data with color
  const chartData = data.map((d) => ({
    ...d,
    fillColor: getPassRateColor(d.passRate),
  }));

  return (
    <ChartCard
      title={title}
      description={description}
      icon={MessageSquare}
      empty={data.length === 0}
      emptyMessage={emptyMessage}
    >
      <div className="w-full min-h-[200px]">
        <ResponsiveContainer width="100%" height={Math.max(200, data.length * 40 + 20)}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 50, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 12 }} stroke="#94a3b8" />
            <YAxis
              type="category"
              dataKey="topic"
              width={100}
              tick={{ fontSize: 12 }}
              stroke="#94a3b8"
            />
            <Tooltip
              content={
                <CustomTooltip
                  formatter={(v, name) => {
                    if (name === "passRate") return `${v}%`;
                    return String(v);
                  }}
                />
              }
            />
            <Bar dataKey="passRate" name="通过率" barSize={24} radius={[0, 4, 4, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.fillColor} />
              ))}
              <LabelList
                dataKey="passRate"
                position="right"
                formatter={(v: number) => `${v}%`}
                style={{ fontSize: 11, fill: "#64748b" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
