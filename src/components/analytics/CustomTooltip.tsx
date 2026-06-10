interface TooltipPayloadItem {
  name?: string;
  value?: number;
  color?: string;
  dataKey?: string;
  payload?: Record<string, unknown>;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  formatter?: (value: number, name: string) => string;
}

export function CustomTooltip({
  active,
  payload,
  label,
  formatter,
}: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow-lg border border-slate-200 px-3 py-2 text-xs">
      {label && <p className="font-medium text-slate-700 mb-1">{label}</p>}
      {payload.map((item, i) => {
        const name = item.name || item.dataKey || "";
        const value = item.value ?? 0;
        const display = formatter ? formatter(value, name) : String(value);
        return (
          <div key={i} className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: item.color || "#3b82f6" }}
            />
            <span className="text-slate-500">{name}:</span>
            <span className="font-medium text-slate-700">{display}</span>
          </div>
        );
      })}
    </div>
  );
}
