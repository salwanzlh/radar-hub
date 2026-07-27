import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionProps {
  label: string;
  count?: string;
  action?: ReactNode;
  /** "button" renders the label+count as a pill matching `action`'s button styling, so they read as a row of adjacent controls instead of a plain heading. */
  labelVariant?: "text" | "button";
  /** Only meaningful with labelVariant="button" — makes the label pill clickable, e.g. to toggle a section below. */
  onLabelClick?: () => void;
  /** Only meaningful with labelVariant="button" — highlights the label pill the same way an active `action` button would be. */
  labelActive?: boolean;
  children: ReactNode;
  className?: string;
}

export function Section({ label, count, action, labelVariant = "text", onLabelClick, labelActive, children, className }: SectionProps) {
  return (
    <section className={className}>
      <div className="flex items-center gap-2 mb-3">
        {labelVariant === "button" ? (
          <button
            type="button"
            onClick={onLabelClick}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors",
              labelActive
                ? "bg-status-warning/15 text-status-warning border-status-warning/20"
                : "text-text-secondary border-surface-200 hover:bg-surface-100"
            )}
          >
            <span className="text-[10.5px] font-bold uppercase tracking-wider">{label}</span>
            {count && <span className="text-[11px] text-text-tertiary">{count}</span>}
          </button>
        ) : (
          <>
            <h3 className="text-[10.5px] font-bold uppercase tracking-wider text-text-tertiary">
              {label}
            </h3>
            {count && <span className="text-[11px] text-text-tertiary">{count}</span>}
          </>
        )}
        {action}
      </div>
      {children}
    </section>
  );
}

interface StatItem {
  label: string;
  value: ReactNode;
  valueClassName?: string;
  /** Explicit name for the value, e.g. "Positive" — spells out polarity instead of relying on color alone. */
  heading?: string;
  dotClassName?: string;
}

export function StatStrip({ items }: { items: StatItem[] }) {
  return (
    <div className="bg-surface-white rounded-[20px] shadow-card border border-surface-100 flex divide-x divide-surface-100 overflow-x-auto">
      {items.map((item, i) => (
        <div key={i} className="flex-1 min-w-[130px] px-5 py-4 flex flex-col gap-1">
          <span
            className={cn(
              "flex items-center gap-1.5 text-[11px] font-semibold text-text-secondary",
              !item.heading && "invisible"
            )}
          >
            {item.dotClassName && <span className={cn("w-1.5 h-1.5 rounded-full", item.dotClassName)} />}
            {item.heading || " "}
          </span>
          <span className={cn("text-xl font-bold text-text-primary", item.valueClassName)}>
            {item.value}
          </span>
          <span className="text-[11px] text-text-tertiary whitespace-nowrap">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

interface AttentionItemProps {
  stripeClassName?: string;
  title: ReactNode;
  badge?: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
}

export function AttentionItem({
  stripeClassName = "bg-status-error",
  title,
  badge,
  description,
  meta,
}: AttentionItemProps) {
  return (
    <div className="flex gap-3 py-3 border-t border-surface-100 first:border-t-0 first:pt-0">
      <div className={cn("w-[3px] rounded-sm shrink-0", stripeClassName)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h5 className="text-sm font-semibold text-text-primary">{title}</h5>
          {badge}
        </div>
        {description && (
          <div className="text-xs text-text-secondary mt-1 leading-relaxed">{description}</div>
        )}
        {meta && <div className="text-[11px] text-text-tertiary mt-1.5 flex gap-3">{meta}</div>}
      </div>
    </div>
  );
}
