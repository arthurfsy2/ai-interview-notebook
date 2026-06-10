"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from "recharts";
import { Building2 } from "lucide-react";
import { ChartCard } from "./ChartCard";
import { CustomTooltip } from "./CustomTooltip";

interface CompanyGroupingChartProps {
  data: { name: string; count: number; passRate: number; avgRating: number }[];
  dimension: "industry" | "size" | "mode";
  title: string;
  description?: string;
  emptyMessage: string;
  fallbackNote?: string;
}

export function CompanyGroupingChart({
  data,
  dimension,
  title,
  description,
  emptyMessage,
  fallbackNote,
}: CompanyGroupingChartProps) {
  return (
    <ChartCard
      title={title}
      description={description}
      icon={Building2}
      empty={data.length === 0}
      emptyMessage={emptyMessage}
    >
      {fallbackNote && dimension === "mode" && (
        <p className="text-xs text-amber-600 bg-amber-50 rounded-md px-3 py-1.5 mb-3">
          {fallbackNote}
        </p>
      )}
      <div className="w-full min-h-[200px]">
        <ResponsiveContainer width="100%" height={Math.max(200, data.length * 40 + 20)}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 40, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 12 }} stroke="#94a3b8" />
            <YAxis
              type="category"
              dataKey="name"
              width={100}
              tick={{ fontSize: 12 }}
              stroke="#94a3b8"
            />
            <Tooltip
              content={
                <CustomTooltip
                  formatter={(v, name) => {
                    if (name === "通过率") return `${v}%`;
                    if (name === "平均评分") return `${v} 分`;
                    return String(v);
                  }}
                />
              }
            />
            <Bar dataKey="count" name="面试数" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24}>
              <LabelList
                dataKey="passRate"
                position="right"
                formatter={(v: number) => `通过${v}%`}
                style={{ fontSize: 11, fill: "#64748b" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
