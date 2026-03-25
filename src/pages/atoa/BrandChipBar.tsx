import { useMemo } from "react";
import type { AtoaVehicle } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type FilterMode = "all" | "base" | "comp" | "basecomp";

interface BrandChipBarProps {
  vehicles: AtoaVehicle[];
  expandedBrands: Set<string>;
  onToggleBrand: (brand: string) => void;
  activeFilter: FilterMode;
  onFilterChange: (filter: FilterMode) => void;
  baseId: string | null;
  compId: string | null;
}

const FILTER_OPTIONS: { key: FilterMode; label: string }[] = [
  { key: "all", label: "All" },
  { key: "base", label: "Base" },
  { key: "comp", label: "Comp" },
  { key: "basecomp", label: "Base+Comp" },
];

export function BrandChipBar({
  vehicles,
  expandedBrands,
  onToggleBrand,
  activeFilter,
  onFilterChange,
  baseId,
  compId,
}: BrandChipBarProps) {
  const brandGroups = useMemo(() => {
    const groups = new Map<string, AtoaVehicle[]>();
    for (const vehicle of vehicles) {
      const existing = groups.get(vehicle.maker) ?? [];
      existing.push(vehicle);
      groups.set(vehicle.maker, existing);
    }
    return groups;
  }, [vehicles]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Brand chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        {Array.from(brandGroups.entries()).map(([brand, brandVehicles]) => {
          const isExpanded = expandedBrands.has(brand);
          const hasBase = brandVehicles.some((v) => v.id === baseId);
          const hasComp = brandVehicles.some((v) => v.id === compId);

          return (
            <button
              key={brand}
              onClick={() => onToggleBrand(brand)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-colors",
                isExpanded
                  ? "bg-brand-accent text-text-inverse"
                  : "bg-surface-100 text-text-secondary hover:bg-surface-200"
              )}
            >
              {brand}
              <span
                className={cn(
                  "text-[10px] font-bold",
                  isExpanded ? "text-text-inverse/70" : "text-text-tertiary"
                )}
              >
                {brandVehicles.length}
              </span>
              {hasBase && (
                <span className="w-1.5 h-1.5 rounded-full bg-brand-accent shrink-0" />
              )}
              {hasComp && (
                <span className="w-1.5 h-1.5 rounded-full bg-status-info shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-surface-200" />

      {/* Filter mode buttons */}
      <div className="flex items-center gap-1">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => onFilterChange(opt.key)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
              activeFilter === opt.key
                ? "bg-surface-200 text-text-primary"
                : "text-text-tertiary hover:text-text-secondary hover:bg-surface-100"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
