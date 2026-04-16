import {
  ArrowRight,
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

const STATUS_STYLES: Record<
  string,
  { bg: string; text: string; icon: typeof CheckCircle2 }
> = {
  provided: {
    bg: "bg-status-success/10",
    text: "text-status-success",
    icon: CheckCircle2,
  },
  partial: {
    bg: "bg-amber-50",
    text: "text-amber-600",
    icon: AlertTriangle,
  },
  missing: {
    bg: "bg-red-50",
    text: "text-red-600",
    icon: XCircle,
  },
};

export default function AuditStep({
  auditResult,
  onConfirm,
  isConfirming,
}: Props) {
  const isConfirmed = !!auditResult.confirmed_at;

  return (
    <div className="space-y-6">
      {/* Content Map */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-0.5 h-4 bg-brand-accent rounded-full" />
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-text-secondary">
            Content Structure Map
          </span>
        </div>
        <div className="bg-surface-white rounded-xl border border-surface-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100">
                <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
                  Category
                </th>
                <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
                  Status
                </th>
                <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
                  Detail
                </th>
              </tr>
            </thead>
            <tbody>
              {auditResult.content_map.map((item, i) => {
                const style =
                  STATUS_STYLES[item.status] ?? STATUS_STYLES.missing;
                const Icon = style.icon;
                return (
                  <tr
                    key={i}
                    className="border-b border-surface-50 last:border-0"
                  >
                    <td className="px-4 py-3 font-medium text-text-primary">
                      {item.category}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                          style.bg,
                          style.text,
                        )}
                      >
                        <Icon className="w-3 h-3" />
                        {item.status}
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
            <div className="w-0.5 h-4 bg-red-500 rounded-full" />
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-text-secondary">
              Gaps to Address
            </span>
          </div>
          <div className="space-y-2">
            {auditResult.gaps.map((gap, i) => (
              <div
                key={i}
                className="bg-surface-white rounded-lg border border-surface-100 px-4 py-3"
              >
                <p className="text-sm font-semibold text-text-primary">
                  {gap.category}
                </p>
                <p className="text-xs text-text-secondary mt-1">
                  {gap.why_needed}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirm button */}
      <div className="flex justify-end pt-2">
        {isConfirmed ? (
          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-status-success/10 text-status-success text-sm font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            Audit Confirmed
          </span>
        ) : (
          <button
            onClick={onConfirm}
            disabled={isConfirming}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-accent text-white text-sm font-semibold hover:bg-brand-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isConfirming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
            {isConfirming ? "Confirming..." : "Confirm & Proceed"}
          </button>
        )}
      </div>
    </div>
  );
}
