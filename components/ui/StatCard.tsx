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
    <div className="rounded-xl border border-ink-100 bg-white p-4 shadow-panel sm:p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500">{label}</p>
        {Icon && (
          <div className="rounded-lg bg-korvix-50 p-1.5 text-korvix-600">
            <Icon size={16} strokeWidth={2} />
          </div>
        )}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-ink-900">
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
