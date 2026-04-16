import { useMemo } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ContentMapItem {
  category: string;
  status: string;
  detail: string;
}

interface GapItem {
  category: string;
  why_needed: string;
}

interface Props {
  auditResult: {
    content_map: ContentMapItem[];
    gaps: GapItem[];
    confirmed_at: string | null;
  };
  onConfirm: () => void;
  isConfirming: boolean;
}

const STATUS_CONFIG: Record<
  string,
  {
    bg: string;
    text: string;
    ring: string;
    icon: typeof CheckCircle2;
    label: string;
  }
> = {
  provided: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-500",
    ring: "ring-emerald-500/20",
    icon: CheckCircle2,
    label: "Provided",
  },
  partial: {
    bg: "bg-amber-500/10",
    text: "text-amber-500",
    ring: "ring-amber-500/20",
    icon: AlertTriangle,
    label: "Partial",
  },
  missing: {
    bg: "bg-red-500/10",
    text: "text-red-500",
    ring: "ring-red-500/20",
    icon: XCircle,
    label: "Missing",
  },
};

export default function AuditStep({
  auditResult,
  onConfirm,
  isConfirming,
}: Props) {
  const isConfirmed = !!auditResult.confirmed_at;

  const stats = useMemo(() => {
    const counts = { provided: 0, partial: 0, missing: 0 };
    for (const item of auditResult.content_map) {
      const key = item.status as keyof typeof counts;
      if (key in counts) counts[key]++;
    }
    return counts;
  }, [auditResult.content_map]);

  return (
    <div className="space-y-6">
      {/* Summary stats pills */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-xs font-bold text-emerald-500">
            {stats.provided} Provided
          </span>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 ring-1 ring-amber-500/20">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-xs font-bold text-amber-500">
            {stats.partial} Partial
          </span>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 ring-1 ring-red-500/20">
          <XCircle className="w-3.5 h-3.5 text-red-500" />
          <span className="text-xs font-bold text-red-500">
            {stats.missing} Missing
          </span>
        </div>
      </div>

      {/* Content Map Table */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-0.5 h-4 bg-brand-accent rounded-full" />
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-text-secondary">
            Content Structure Map
          </span>
        </div>
        <div className="bg-surface-white rounded-xl border border-surface-100 overflow-hidden shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100 bg-brand-accent/5">
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-brand-accent">
                  Category
                </th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-brand-accent">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-brand-accent">
                  Detail
                </th>
              </tr>
            </thead>
            <tbody>
              {auditResult.content_map.map((item, i) => {
                const config =
                  STATUS_CONFIG[item.status] ?? STATUS_CONFIG.missing;
                const Icon = config.icon;
                return (
                  <tr
                    key={i}
                    className={cn(
                      "border-b border-surface-50 last:border-0 transition-colors duration-150 hover:bg-surface-50",
                      i % 2 === 1 && "bg-surface-50/50"
                    )}
                  >
                    <td className="px-4 py-3 font-semibold text-text-primary">
                      {item.category}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ring-1",
                          config.bg,
                          config.text,
                          config.ring
                        )}
                      >
                        <Icon className="w-3 h-3" />
                        {config.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary text-xs">
                      {item.detail}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gaps */}
      {auditResult.gaps.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-0.5 h-4 bg-status-error rounded-full" />
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-text-secondary">
              Gaps to Address
            </span>
          </div>
          <div className="space-y-2">
            {auditResult.gaps.map((gap, i) => (
              <div
                key={i}
                className="bg-red-500/5 rounded-xl border border-red-500/10 px-4 py-3 border-l-[3px] border-l-red-500 animate-[fadeIn_0.3s_ease-out_both]"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-text-primary">
                      {gap.category}
                    </p>
                    <p className="text-xs text-text-secondary mt-1">
                      {gap.why_needed}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirm button */}
      <div className="flex justify-end pt-2">
        {isConfirmed ? (
          <span className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white text-sm font-bold shadow-lg">
            <CheckCircle2 className="w-4 h-4" />
            Audit Confirmed
          </span>
        ) : (
          <button
            onClick={onConfirm}
            disabled={isConfirming}
            className={cn(
              "inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-sm font-bold text-white shadow-lg transition-all duration-200",
              "bg-gradient-to-r from-brand-accent to-red-600",
              "hover:shadow-xl hover:-translate-y-0.5",
              "disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-lg"
            )}
          >
            {isConfirming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            {isConfirming ? "Confirming..." : "Confirm & Proceed"}
          </button>
        )}
      </div>
    </div>
  );
}
