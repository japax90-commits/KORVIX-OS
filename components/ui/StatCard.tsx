import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  helper,
  icon: Icon,
  trend,
}: {
  label: string;
  value: string;
  helper?: string;
  icon?: LucideIcon;
  trend?: { positive: boolean; label: string };
}) {
  return (
    <div className="min-w-0 rounded-xl border border-ink-100 bg-surface p-4 shadow-panel sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 text-[13px] leading-snug text-ink-500 sm:text-sm">{label}</p>
        {Icon && (
          <div className="shrink-0 rounded-lg bg-korvix-50 p-1.5 text-korvix-600">
            <Icon size={16} strokeWidth={2} />
          </div>
        )}
      </div>
      <p className="mt-2 break-words text-lg font-semibold tracking-tight text-ink-900 tabular-nums sm:text-2xl">
        {value}
      </p>
      {(helper || trend) && (
        <div className="mt-1 flex items-center gap-2">
          {trend && (
            <span
              className={cn(
                "text-xs font-medium",
                trend.positive ? "text-success" : "text-danger"
              )}
            >
              {trend.label}
            </span>
          )}
          {helper && <span className="text-xs text-ink-500">{helper}</span>}
        </div>
      )}
    </div>
  );
}
