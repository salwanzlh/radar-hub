import { Loader2, GitCompareArrows } from "lucide-react";
import type { AtoaVehicle, AtoaMetrics } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface SummaryCardsProps {
  baseVehicle: AtoaVehicle | null;
  compVehicle: AtoaVehicle | null;
  metrics: AtoaMetrics | null;
  isLoading: boolean;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("id-ID").format(price);
}

function getViInterpretation(vi: number): { label: string; color: string } {
  if (vi > 100) return { label: "Competitor more expensive", color: "text-status-success" };
  if (vi < 100) return { label: "Competitor cheaper", color: "text-status-error" };
  return { label: "Same price", color: "text-text-secondary" };
}

function getVaInterpretation(va: number): { label: string; color: string } {
  if (va > 100) return { label: "Base vehicle better value", color: "text-status-success" };
  if (va < 100) return { label: "Competitor more value-for-money", color: "text-status-error" };
  return { label: "Equal value proposition", color: "text-text-secondary" };
}

function CardSkeleton() {
  return <div className="bg-surface-white rounded-[20px] shadow-card p-5 h-[120px] animate-pulse" />;
}

export function SummaryCards({ baseVehicle, compVehicle, metrics, isLoading }: SummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  const viInfo = metrics ? getViInterpretation(metrics.vi_percent) : null;
  const vaInfo = metrics ? getVaInterpretation(metrics.va_percent) : null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* BASE Vehicle */}
      <div className="bg-surface-white rounded-[20px] shadow-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-brand-accent text-text-inverse rounded">
            Base
          </span>
        </div>
        {baseVehicle ? (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-text-primary truncate">
              {baseVehicle.maker} {baseVehicle.model}
            </p>
            {baseVehicle.trim && (
              <p className="text-xs text-text-secondary truncate">{baseVehicle.trim}</p>
            )}
            <p className="text-sm font-mono text-text-primary">
              IDR {formatPrice(baseVehicle.retail_price)}
            </p>
          </div>
        ) : (
          <p className="text-xs text-text-tertiary">No base vehicle selected</p>
        )}
      </div>

      {/* COMP Vehicle */}
      <div className="bg-surface-white rounded-[20px] shadow-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-status-info text-white rounded">
            Comp
          </span>
        </div>
        {compVehicle ? (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-text-primary truncate">
              {compVehicle.maker} {compVehicle.model}
            </p>
            {compVehicle.trim && (
              <p className="text-xs text-text-secondary truncate">{compVehicle.trim}</p>
            )}
            <p className="text-sm font-mono text-text-primary">
              IDR {formatPrice(compVehicle.retail_price)}
            </p>
          </div>
        ) : (
          <p className="text-xs text-text-tertiary">No comp vehicle selected</p>
        )}
      </div>

      {/* VI% */}
      <div className="bg-surface-white rounded-[20px] shadow-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <GitCompareArrows className="w-4 h-4 text-text-tertiary" />
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            VI%
          </span>
        </div>
        {metrics ? (
          <div className="space-y-1">
            <p className="text-2xl font-bold text-text-primary">
              {metrics.vi_percent.toFixed(1)}%
            </p>
            <p className={cn("text-xs", viInfo?.color)}>{viInfo?.label}</p>
          </div>
        ) : (
          <p className="text-xs text-text-tertiary">
            {baseVehicle && compVehicle ? (
              <Loader2 className="w-4 h-4 animate-spin inline" />
            ) : (
              "Select base and comp"
            )}
          </p>
        )}
      </div>

      {/* VA% */}
      <div className="bg-surface-white rounded-[20px] shadow-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <GitCompareArrows className="w-4 h-4 text-text-tertiary" />
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            VA%
          </span>
        </div>
        {metrics ? (
          <div className="space-y-1">
            <p className="text-2xl font-bold text-text-primary">
              {metrics.va_percent.toFixed(1)}%
            </p>
            <p className={cn("text-xs", vaInfo?.color)}>{vaInfo?.label}</p>
          </div>
        ) : (
          <p className="text-xs text-text-tertiary">
            {baseVehicle && compVehicle ? (
              <Loader2 className="w-4 h-4 animate-spin inline" />
            ) : (
              "Select base and comp"
            )}
          </p>
        )}
      </div>
    </div>
  );
}
