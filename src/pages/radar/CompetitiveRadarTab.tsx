import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Crosshair, ArrowRight, AlertTriangle, BarChart3, Search, X } from "lucide-react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
  Label,
} from "recharts";
import { api, type AtoaRadarPoint, type AtoaVehicle } from "@/lib/api-client";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Brand Colors
// ---------------------------------------------------------------------------

const BRAND_COLORS: Record<string, string> = {
  Mitsubishi: "#ED0000",
  Toyota: "#8B8B8B",
  HYUNDAI: "#002C5F",
  Honda: "#CC0000",
  Suzuki: "#003399",
  NISSAN: "#C3002F",
  Daihatsu: "#E60012",
};

function getBrandColor(maker: string): string {
  return BRAND_COLORS[maker] ?? "#6B7280";
}

// ---------------------------------------------------------------------------
// Quadrant Logic
// ---------------------------------------------------------------------------

interface QuadrantConfig {
  label: string;
  color: string;
  bgColor: string;
  description: string;
}

const QUADRANT_CONFIG: Record<string, QuadrantConfig> = {
  "high-threat": {
    label: "High Threat",
    color: "#EF4444",
    bgColor: "rgba(239, 68, 68, 0.15)",
    description:
      "Cheaper and more features. Consider adjusting pricing or enhancing features.",
  },
  "price-pressure": {
    label: "Price Pressure",
    color: "#F59E0B",
    bgColor: "rgba(245, 158, 11, 0.15)",
    description:
      "Undercuts on price but fewer features. Emphasize your feature advantages.",
  },
  "value-pressure": {
    label: "Value Pressure",
    color: "#F59E0B",
    bgColor: "rgba(245, 158, 11, 0.15)",
    description:
      "Pricier but offers more features. Close the feature gap.",
  },
  favorable: {
    label: "Favorable",
    color: "#22C55E",
    bgColor: "rgba(34, 197, 94, 0.15)",
    description:
      "More expensive with fewer features. Maintain current positioning.",
  },
};

function getQuadrantConfig(quadrant: string): QuadrantConfig {
  return (
    QUADRANT_CONFIG[quadrant] ?? {
      label: "Unknown",
      color: "#6B7280",
      bgColor: "rgba(107, 114, 128, 0.15)",
      description: "",
    }
  );
}

function computeQuadrant(
  price: number,
  value: number,
  basePrice: number,
  baseValue: number,
): string {
  const cheaper = price <= basePrice;
  const moreFeatures = value >= baseValue;
  if (cheaper && moreFeatures) return "high-threat";
  if (cheaper && !moreFeatures) return "price-pressure";
  if (!cheaper && moreFeatures) return "value-pressure";
  return "favorable";
}

// ---------------------------------------------------------------------------
// Formatting Utilities
// ---------------------------------------------------------------------------

/** Format price as "Rp 334.740" (Indonesian thousands with dot separator) */
function formatPriceIDR(value: number): string {
  const formatted = new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(value);
  return `Rp ${formatted}`;
}

/** Format price for axis ticks: "220K", "330K" */
function formatAxisPrice(value: number): string {
  if (value >= 1_000) return `${Math.round(value)}K`;
  return String(value);
}

/** Format feature value for display: "137K", "149K" */
function formatFeatureValue(value: number): string {
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(Math.round(value));
}

/** Format axis feature value ticks: "49K", "74K" */
function formatAxisFeature(value: number): string {
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(Math.round(value));
}

/** Format price difference: "Rp -3.640" or "Rp +3.640" */
function formatPriceDiff(diff: number): string {
  const sign = diff > 0 ? "+" : "";
  const formatted = new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(Math.abs(diff));
  return `Rp ${sign}${diff < 0 ? "-" : ""}${formatted}`;
}

/** Format feature difference: "+12K", "-5K" */
function formatFeatureDiff(diff: number): string {
  const sign = diff >= 0 ? "+" : "";
  if (Math.abs(diff) >= 1_000) {
    return `${sign}${Math.round(diff / 1_000)}K`;
  }
  return `${sign}${Math.round(diff)}`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EnrichedPoint extends AtoaRadarPoint {
  _role: "base" | "comp" | "normal";
  _brandColor: string;
}

// ---------------------------------------------------------------------------
// Custom Scatter Dot (SVG)
// ---------------------------------------------------------------------------

interface DotProps {
  cx?: number;
  cy?: number;
  payload?: EnrichedPoint;
}

function PositioningDot({ cx = 0, cy = 0, payload }: DotProps) {
  if (!payload) return null;

  const brandColor = payload._brandColor;

  if (payload._role === "base") {
    return (
      <g style={{ cursor: "pointer" }}>
        {/* Outer ring */}
        <circle
          cx={cx}
          cy={cy}
          r={14}
          fill="none"
          stroke="#3B82F6"
          strokeWidth={2}
          strokeOpacity={0.6}
        />
        {/* Filled inner dot */}
        <circle
          cx={cx}
          cy={cy}
          r={9}
          fill={brandColor}
          stroke={brandColor}
          strokeWidth={1.5}
        />
        {/* "BASE" label above */}
        <text
          x={cx}
          y={cy - 20}
          textAnchor="middle"
          fill="#3B82F6"
          fontSize={9}
          fontWeight={700}
          letterSpacing="0.05em"
        >
          BASE
        </text>
      </g>
    );
  }

  if (payload._role === "comp") {
    return (
      <g style={{ cursor: "pointer" }}>
        {/* Dashed outer ring */}
        <circle
          cx={cx}
          cy={cy}
          r={14}
          fill="none"
          stroke={brandColor}
          strokeWidth={2}
          strokeDasharray="4 3"
        />
        {/* Filled inner dot */}
        <circle
          cx={cx}
          cy={cy}
          r={8}
          fill={brandColor}
          stroke={brandColor}
          strokeWidth={1.5}
        />
        {/* "COMP" label above */}
        <text
          x={cx}
          y={cy - 20}
          textAnchor="middle"
          fill={brandColor}
          fontSize={9}
          fontWeight={700}
          letterSpacing="0.05em"
        >
          COMP
        </text>
      </g>
    );
  }

  // Normal dot — small solid
  return (
    <circle
      cx={cx}
      cy={cy}
      r={5}
      fill={brandColor}
      fillOpacity={0.8}
      stroke={brandColor}
      strokeWidth={1}
      style={{ cursor: "pointer" }}
    />
  );
}

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------

function RadarChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: EnrichedPoint }>;
}) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;

  return (
    <div className="rounded-lg border border-surface-100 bg-surface-white p-3 shadow-lg text-xs space-y-1">
      <div className="font-semibold text-text-primary text-sm">
        {d.maker} {d.model}
      </div>
      {d.trim && (
        <div className="text-text-secondary">{d.trim}</div>
      )}
      {d._role !== "normal" && (
        <div
          className="font-medium text-[10px] uppercase tracking-wider"
          style={{ color: d._role === "base" ? "#3B82F6" : d._brandColor }}
        >
          {d._role === "base" ? "Base Vehicle" : "Competitor (Selected)"}
        </div>
      )}
      <div className="flex justify-between gap-6">
        <span className="text-text-secondary">Feature Value</span>
        <span className="text-text-primary font-medium">
          {formatFeatureValue(d.value)}
        </span>
      </div>
      <div className="flex justify-between gap-6">
        <span className="text-text-secondary">Retail Price</span>
        <span className="text-text-primary font-medium">
          {formatPriceIDR(d.price)}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary Cards
// ---------------------------------------------------------------------------

function SummaryCards({
  base,
  comp,
  vi,
  va,
}: {
  base: AtoaRadarPoint;
  comp: AtoaRadarPoint | null;
  vi: number;
  va: number;
}) {
  const viLabel = vi < 100 ? "Selected cheaper" : vi > 100 ? "Selected pricier" : "Same price";
  const vaLabel = va < 100 ? "Selected has more value" : va > 100 ? "Base has more value" : "Same value";

  return (
    <div className="grid grid-cols-4 gap-4">
      {/* Base Vehicle */}
      <div className="bg-surface-white rounded-xl shadow-card p-4">
        <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-2 font-medium">
          Base Vehicle
        </div>
        <div className="text-sm font-semibold text-text-primary">
          {base.model}
        </div>
        <div className="text-xs text-text-secondary mt-1">
          {base.maker} · {formatPriceIDR(base.price)}
        </div>
      </div>

      {/* Competitor */}
      <div className="bg-surface-white rounded-xl shadow-card p-4">
        <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-2 font-medium">
          Competitor
        </div>
        {comp ? (
          <>
            <div className="text-sm font-semibold text-text-primary">
              {comp.model}
            </div>
            <div className="text-xs text-text-secondary mt-1">
              {comp.trim && <span>{comp.trim} · </span>}
              {comp.maker} · {formatPriceIDR(comp.price)}
            </div>
          </>
        ) : (
          <div className="text-xs text-text-tertiary mt-1">
            Click a dot to select
          </div>
        )}
      </div>

      {/* Value Index */}
      <div className="bg-surface-white rounded-xl shadow-card p-4">
        <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-2 font-medium">
          Value Index (VI)
        </div>
        <div className="text-lg font-bold text-text-primary">
          {comp ? `${vi.toFixed(1)}%` : "--"}
        </div>
        {comp && (
          <div className="text-[10px] text-text-secondary mt-1">
            {viLabel}
          </div>
        )}
      </div>

      {/* Value Advantage */}
      <div className="bg-surface-white rounded-xl shadow-card p-4">
        <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-2 font-medium">
          Value Advantage (VA)
        </div>
        <div className="text-lg font-bold text-text-primary">
          {comp ? `${va.toFixed(1)}%` : "--"}
        </div>
        {comp && (
          <div className="text-[10px] text-text-secondary mt-1">
            {vaLabel}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Brand Chips Bar
// ---------------------------------------------------------------------------

function BrandChipsBar({
  brands,
  brandCounts,
  activeBrands,
  onToggle,
  onShowAll,
}: {
  brands: string[];
  brandCounts: Record<string, number>;
  activeBrands: Set<string>;
  onToggle: (brand: string) => void;
  onShowAll: () => void;
}) {
  if (brands.length === 0) return null;

  const allActive = activeBrands.size === brands.length;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {brands.map((brand) => {
        const active = activeBrands.has(brand);
        const color = getBrandColor(brand);
        const count = brandCounts[brand] ?? 0;

        return (
          <button
            key={brand}
            onClick={() => onToggle(brand)}
            className={cn(
              "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
              active
                ? "text-white border-transparent"
                : "border-surface-200 text-text-tertiary bg-transparent hover:bg-surface-100",
            )}
            style={active ? { backgroundColor: color, borderColor: color } : undefined}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: active ? "#fff" : color }}
            />
            {brand}
            <span
              className={cn(
                "text-[10px] tabular-nums",
                active ? "opacity-70" : "text-text-tertiary",
              )}
            >
              {count}
            </span>
          </button>
        );
      })}

      <button
        onClick={onShowAll}
        className={cn(
          "ml-auto px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
          allActive
            ? "bg-surface-200 text-text-primary border-surface-200"
            : "border-surface-200 text-text-secondary hover:bg-surface-100",
        )}
      >
        All
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vehicle Combobox
// ---------------------------------------------------------------------------

interface VehicleComboboxProps {
  vehicles: AtoaVehicle[];
  selectedId: string | null;
  onSelect: (vehicleId: string | null) => void;
  label: string;
  accentClass: string;
  excludeId?: string | null;
}

function VehicleCombobox({
  vehicles,
  selectedId,
  onSelect,
  label,
  accentClass,
  excludeId,
}: VehicleComboboxProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Selected vehicle object
  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === selectedId) ?? null,
    [vehicles, selectedId],
  );

  // Display text when selected
  const displayText = selectedVehicle
    ? `${selectedVehicle.maker} ${selectedVehicle.model}${selectedVehicle.trim ? ` ${selectedVehicle.trim}` : ""}`
    : "";

  // Filter and group vehicles
  const grouped = useMemo(() => {
    const lowerQuery = query.toLowerCase();
    const filtered = vehicles
      .filter((v) => {
        if (excludeId && v.id === excludeId) return false;
        if (!lowerQuery) return true;
        const searchable = `${v.maker} ${v.model} ${v.trim ?? ""}`.toLowerCase();
        return searchable.includes(lowerQuery);
      })
      .sort((a, b) => a.display_order - b.display_order);

    const groups: { maker: string; items: AtoaVehicle[] }[] = [];
    const groupMap = new Map<string, AtoaVehicle[]>();

    for (const v of filtered) {
      const existing = groupMap.get(v.maker);
      if (existing) {
        existing.push(v);
      } else {
        const arr = [v];
        groupMap.set(v.maker, arr);
        groups.push({ maker: v.maker, items: arr });
      }
    }

    // Sort groups: alphabetical by maker
    groups.sort((a, b) => a.maker.localeCompare(b.maker));
    return groups;
  }, [vehicles, query, excludeId]);

  const handleSelect = (vehicleId: string) => {
    onSelect(vehicleId);
    setQuery("");
    setIsOpen(false);
  };

  const handleClear = () => {
    onSelect(null);
    setQuery("");
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    if (selectedVehicle) {
      setQuery("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const totalFiltered = grouped.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <div ref={containerRef} className="relative flex-1">
      <div className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider mb-1">
        {label}
      </div>
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl border px-3 py-2 transition-colors",
          "bg-surface-100 border-surface-200",
          selectedId && accentClass,
        )}
      >
        <Search className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? query : displayText}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder="Search vehicle..."
          disabled={vehicles.length === 0}
          className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary outline-none min-w-0"
        />
        {selectedId && (
          <button
            onClick={handleClear}
            className="p-0.5 rounded hover:bg-surface-200 text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-surface-50 border border-surface-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
          {totalFiltered === 0 ? (
            <div className="px-3 py-3 text-xs text-text-tertiary text-center">
              Tidak ditemukan
            </div>
          ) : (
            grouped.map((group) => (
              <div key={group.maker}>
                <div className="text-[10px] uppercase tracking-wide text-text-tertiary font-semibold px-3 py-1.5 bg-surface-100 sticky top-0">
                  {group.maker}
                </div>
                {group.items.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => handleSelect(v.id)}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm hover:bg-surface-100 transition-colors cursor-pointer flex items-center justify-between gap-2",
                      v.id === selectedId
                        ? "text-text-primary font-medium bg-surface-100"
                        : "text-text-secondary",
                    )}
                  >
                    <span className="truncate">
                      {v.model}{v.trim ? ` ${v.trim}` : ""}
                    </span>
                    <span className="text-xs text-text-tertiary shrink-0">
                      {formatPriceIDR(v.retail_price)}
                    </span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Position Assessment Panel (right side)
// ---------------------------------------------------------------------------

function PositionAssessment({
  base,
  comp,
  baseVehicle,
  compVehicle,
  vi,
  va,
}: {
  base: AtoaRadarPoint;
  comp: AtoaRadarPoint;
  baseVehicle: AtoaVehicle | null;
  compVehicle: AtoaVehicle | null;
  vi: number;
  va: number;
}) {
  const quadrant = computeQuadrant(comp.price, comp.value, base.price, base.value);
  const config = getQuadrantConfig(quadrant);
  const priceDiff = comp.price - base.price;
  const featureDiff = comp.value - base.value;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-text-tertiary" />
          <h3 className="text-sm font-semibold text-text-primary">
            Position Assessment
          </h3>
        </div>

        {/* Comp vehicle info */}
        <div className="mb-3">
          <div className="text-sm font-semibold text-text-primary">
            {comp.maker} {comp.model}
          </div>
          {comp.trim && (
            <div className="text-xs text-text-secondary">{comp.trim}</div>
          )}
        </div>

        {/* Quadrant badge */}
        <span
          className="inline-block px-3 py-1 rounded-full text-xs font-semibold"
          style={{ backgroundColor: config.bgColor, color: config.color }}
        >
          {config.label}
        </span>

        <p className="text-xs text-text-secondary leading-relaxed mt-2">
          {config.description}
        </p>
      </div>

      {/* Metrics */}
      <div className="space-y-2">
        <div className="flex items-center justify-between py-1.5">
          <span className="text-xs text-text-secondary">Value Index (VI)</span>
          <span className="text-xs font-semibold text-text-primary tabular-nums">
            {vi.toFixed(1)}%
          </span>
        </div>
        <div className="flex items-center justify-between py-1.5">
          <span className="text-xs text-text-secondary">Value Advantage (VA)</span>
          <span className="text-xs font-semibold text-text-primary tabular-nums">
            {va.toFixed(1)}%
          </span>
        </div>
        <div className="flex items-center justify-between py-1.5">
          <span className="text-xs text-text-secondary">Price Diff</span>
          <span
            className={cn(
              "text-xs font-semibold tabular-nums",
              priceDiff > 0
                ? "text-status-error"
                : priceDiff < 0
                  ? "text-status-success"
                  : "text-text-primary",
            )}
          >
            {formatPriceDiff(priceDiff)}
          </span>
        </div>
        <div className="flex items-center justify-between py-1.5">
          <span className="text-xs text-text-secondary">Feature Diff</span>
          <span
            className={cn(
              "text-xs font-semibold tabular-nums",
              featureDiff > 0
                ? "text-status-error"
                : featureDiff < 0
                  ? "text-status-success"
                  : "text-text-primary",
            )}
          >
            {formatFeatureDiff(featureDiff)}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-surface-100" />

      {/* Value For Money Table */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-text-tertiary" />
          <h3 className="text-sm font-semibold text-text-primary">
            Value For Money
          </h3>
        </div>

        <div className="border border-surface-100 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-surface-100 bg-surface-100/50">
                <th className="px-3 py-2 text-left text-text-tertiary font-medium" />
                <th className="px-3 py-2 text-right text-text-tertiary font-medium">
                  Base
                </th>
                <th className="px-3 py-2 text-right text-text-tertiary font-medium">
                  Selected
                </th>
              </tr>
            </thead>
            <tbody>
              <ComparisonRow
                label="Maker"
                baseVal={base.maker}
                compVal={comp.maker}
              />
              <ComparisonRow
                label="Model"
                baseVal={base.model}
                compVal={comp.model}
              />
              <ComparisonRow
                label="Grade"
                baseVal={base.trim ?? "-"}
                compVal={comp.trim ?? "-"}
              />
              <ComparisonRow
                label="Engine"
                baseVal={baseVehicle?.engine_displacement ?? "-"}
                compVal={compVehicle?.engine_displacement ?? "-"}
              />
              <ComparisonRow
                label="Fuel"
                baseVal={baseVehicle?.fuel ?? "-"}
                compVal={compVehicle?.fuel ?? "-"}
              />
              <ComparisonRow
                label="Trans."
                baseVal={baseVehicle?.transmission ?? "-"}
                compVal={compVehicle?.transmission ?? "-"}
              />
              <ComparisonRow
                label="Drive"
                baseVal={baseVehicle?.drive_system ?? "-"}
                compVal={compVehicle?.drive_system ?? "-"}
              />
              <ComparisonRow
                label="Seats"
                baseVal={baseVehicle?.seat_capacity != null ? String(baseVehicle.seat_capacity) : "-"}
                compVal={compVehicle?.seat_capacity != null ? String(compVehicle.seat_capacity) : "-"}
              />
              <ComparisonRow
                label="Price"
                baseVal={formatPriceIDR(base.price)}
                compVal={formatPriceIDR(comp.price)}
                mono
              />
              <ComparisonRow
                label="Value"
                baseVal={formatFeatureValue(base.value)}
                compVal={formatFeatureValue(comp.value)}
                mono
              />
              <ComparisonRow
                label="VI"
                baseVal="100%"
                compVal={`${vi.toFixed(1)}%`}
                mono
              />
              <ComparisonRow
                label="VA"
                baseVal="100%"
                compVal={`${va.toFixed(1)}%`}
                mono
                last
              />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ComparisonRow({
  label,
  baseVal,
  compVal,
  mono = false,
  last = false,
}: {
  label: string;
  baseVal: string;
  compVal: string;
  mono?: boolean;
  last?: boolean;
}) {
  return (
    <tr className={last ? "" : "border-b border-surface-50"}>
      <td className="px-3 py-2 text-text-secondary">{label}</td>
      <td className={cn("px-3 py-2 text-right text-text-primary", mono && "font-mono text-[11px]")}>
        {baseVal}
      </td>
      <td className={cn("px-3 py-2 text-right text-text-primary", mono && "font-mono text-[11px]")}>
        {compVal}
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Chart Legend
// ---------------------------------------------------------------------------

function ChartLegend({ brands }: { brands: string[] }) {
  return (
    <div className="flex items-center gap-4 flex-wrap mt-4 px-2">
      {/* Brand colors */}
      {brands.map((brand) => (
        <div key={brand} className="flex items-center gap-1.5 text-[10px] text-text-secondary">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: getBrandColor(brand) }}
          />
          {brand}
        </div>
      ))}

      {/* Separator */}
      <div className="w-px h-3 bg-surface-200" />

      {/* Base icon */}
      <div className="flex items-center gap-1.5 text-[10px] text-text-secondary">
        <svg width="12" height="12" viewBox="0 0 12 12">
          <circle cx="6" cy="6" r="5" fill="none" stroke="#3B82F6" strokeWidth="1.5" />
          <circle cx="6" cy="6" r="3" fill="#6B7280" />
        </svg>
        Base
      </div>

      {/* Comp icon */}
      <div className="flex items-center gap-1.5 text-[10px] text-text-secondary">
        <svg width="12" height="12" viewBox="0 0 12 12">
          <circle cx="6" cy="6" r="5" fill="none" stroke="#6B7280" strokeWidth="1.5" strokeDasharray="3 2" />
          <circle cx="6" cy="6" r="3" fill="#6B7280" />
        </svg>
        Selected
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function CompetitiveRadarTab() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read base/comp from URL query params (synced from A2A page)
  const urlBase = searchParams.get("base");
  const urlComp = searchParams.get("comp");

  // Selection state — initialized from URL params
  const [baseId, setBaseId] = useState<string | null>(urlBase);
  const [compId, setCompId] = useState<string | null>(urlComp);
  const [activeBrands, setActiveBrands] = useState<Set<string>>(new Set());

  // Fetch all radar points
  const { data: allPoints, isLoading: loadingRadar } = useQuery({
    queryKey: ["atoa-radar-all"],
    queryFn: () => api.atoa.getRadarAll(),
  });

  // Fetch vehicles for detailed fields (engine, fuel, etc.)
  const { data: allVehicles } = useQuery({
    queryKey: ["atoa-vehicles"],
    queryFn: () => api.atoa.getVehicles(),
  });

  // Vehicle lookup map
  const vehicleMap = useMemo(() => {
    if (!allVehicles) return new Map<string, AtoaVehicle>();
    const map = new Map<string, AtoaVehicle>();
    for (const v of allVehicles) {
      map.set(v.id, v);
    }
    return map;
  }, [allVehicles]);

  // No auto-select — user clicks dots or arrives via URL params from A2A page

  // Unique brands with counts
  const { brands, brandCounts } = useMemo(() => {
    if (!allPoints) return { brands: [], brandCounts: {} as Record<string, number> };
    const counts: Record<string, number> = {};
    for (const p of allPoints) {
      counts[p.maker] = (counts[p.maker] ?? 0) + 1;
    }
    // Sort: Mitsubishi first, then alphabetical
    const sorted = Object.keys(counts).sort((a, b) => {
      if (a === "Mitsubishi") return -1;
      if (b === "Mitsubishi") return 1;
      return a.localeCompare(b);
    });
    return { brands: sorted, brandCounts: counts };
  }, [allPoints]);

  // Initialize all brands as active when data loads
  useEffect(() => {
    if (brands.length > 0 && activeBrands.size === 0) {
      setActiveBrands(new Set(brands));
    }
  }, [brands, activeBrands.size]);

  // Filter points by active brands
  const filteredPoints = useMemo(() => {
    if (!allPoints) return [];
    return allPoints.filter((p) => activeBrands.has(p.maker));
  }, [allPoints, activeBrands]);

  // Base and comp points
  const basePoint = useMemo(
    () => allPoints?.find((p) => p.vehicle_id === baseId) ?? null,
    [allPoints, baseId],
  );
  const compPoint = useMemo(
    () => allPoints?.find((p) => p.vehicle_id === compId) ?? null,
    [allPoints, compId],
  );

  // Vehicle details for comparison table
  const baseVehicle = baseId ? vehicleMap.get(baseId) ?? null : null;
  const compVehicle = compId ? vehicleMap.get(compId) ?? null : null;

  // Compute VI and VA
  const { vi, va } = useMemo(() => {
    if (!basePoint || !compPoint) return { vi: 0, va: 0 };
    const viVal = basePoint.price !== 0
      ? (compPoint.price / basePoint.price) * 100
      : 0;
    const vaVal = basePoint.price !== 0
      ? ((compPoint.price - (compPoint.value - basePoint.value)) / basePoint.price) * 100
      : 0;
    return { vi: viVal, va: vaVal };
  }, [basePoint, compPoint]);

  // Enrich points with roles and brand colors
  const enrichedPoints: EnrichedPoint[] = useMemo(() => {
    return filteredPoints.map((p) => ({
      ...p,
      _role:
        p.vehicle_id === baseId
          ? ("base" as const)
          : p.vehicle_id === compId
            ? ("comp" as const)
            : ("normal" as const),
      _brandColor: getBrandColor(p.maker),
    }));
  }, [filteredPoints, baseId, compId]);

  // Sort: normals first, then comp, then base (so base draws on top)
  const sortedPoints = useMemo(() => {
    const order: Record<string, number> = { normal: 0, comp: 1, base: 2 };
    return [...enrichedPoints].sort(
      (a, b) => (order[a._role] ?? 0) - (order[b._role] ?? 0),
    );
  }, [enrichedPoints]);

  // Axis domains
  const { xDomain, yDomain } = useMemo(() => {
    if (!filteredPoints.length) {
      return {
        xDomain: [0, 200] as [number, number],
        yDomain: [0, 500] as [number, number],
      };
    }
    const values = filteredPoints.map((p) => p.value);
    const prices = filteredPoints.map((p) => p.price);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const valPad = (maxVal - minVal) * 0.12 || 10;
    const pricePad = (maxPrice - minPrice) * 0.12 || 50;
    return {
      xDomain: [
        Math.max(0, Math.floor(minVal - valPad)),
        Math.ceil(maxVal + valPad),
      ] as [number, number],
      yDomain: [
        Math.max(0, Math.floor(minPrice - pricePad)),
        Math.ceil(maxPrice + pricePad),
      ] as [number, number],
    };
  }, [filteredPoints]);

  // Visible brands (those that are currently active)
  const visibleBrands = useMemo(() => {
    const set = new Set<string>();
    for (const p of filteredPoints) set.add(p.maker);
    return Array.from(set).sort((a, b) => {
      if (a === "Mitsubishi") return -1;
      if (b === "Mitsubishi") return 1;
      return a.localeCompare(b);
    });
  }, [filteredPoints]);

  // Handlers
  const handleBrandToggle = useCallback(
    (brand: string) => {
      setActiveBrands((prev) => {
        const next = new Set(prev);
        if (next.has(brand)) {
          // Don't allow deactivating all brands
          if (next.size <= 1) return prev;
          next.delete(brand);
        } else {
          next.add(brand);
        }
        return next;
      });
    },
    [],
  );

  const handleShowAll = useCallback(() => {
    setActiveBrands(new Set(brands));
  }, [brands]);

  const handleDotClick = useCallback(
    (entry: { payload?: EnrichedPoint }) => {
      if (!entry?.payload) return;
      const id = entry.payload.vehicle_id;

      // Click on current base → deselect base (clear both)
      if (id === baseId) {
        setBaseId(null);
        setCompId(null);
        setSearchParams({}, { replace: true });
        return;
      }

      // Click on current comp → deselect comp
      if (id === compId) {
        setCompId(null);
        const params: Record<string, string> = {};
        if (baseId) params.base = baseId;
        setSearchParams(params, { replace: true });
        return;
      }

      // No base set → set as base
      if (!baseId) {
        setBaseId(id);
        setSearchParams({ base: id }, { replace: true });
        return;
      }

      // Base set, no comp → set as comp
      setCompId(id);
      const params: Record<string, string> = { base: baseId };
      params.comp = id;
      setSearchParams(params, { replace: true });
    },
    [baseId, compId, setSearchParams],
  );

  const handleSelectBase = useCallback(
    (vehicleId: string | null) => {
      setBaseId(vehicleId);
      if (!vehicleId) {
        setCompId(null);
        setSearchParams({}, { replace: true });
      } else {
        const params: Record<string, string> = { base: vehicleId };
        if (compId) params.comp = compId;
        setSearchParams(params, { replace: true });
      }
    },
    [compId, setSearchParams],
  );

  const handleSelectComp = useCallback(
    (vehicleId: string | null) => {
      setCompId(vehicleId);
      const params: Record<string, string> = {};
      if (baseId) params.base = baseId;
      if (vehicleId) params.comp = vehicleId;
      setSearchParams(params, { replace: true });
    },
    [baseId, setSearchParams],
  );

  // Loading state
  if (loadingRadar) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-text-tertiary">Loading radar data...</div>
      </div>
    );
  }

  // No vehicles
  if (!allPoints?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mb-4">
          <Crosshair className="w-8 h-8 text-text-tertiary" />
        </div>
        <h2 className="text-lg font-semibold text-text-primary mb-2">
          No Vehicles
        </h2>
        <p className="text-sm text-text-tertiary max-w-md">
          No vehicles available for competitive radar. Add vehicles in the A2A
          Comparison page first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Crosshair className="w-5 h-5 text-text-secondary" />
            <h1 className="text-lg font-semibold text-text-primary">
              Positioning Radar
            </h1>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            All vehicles mapped by Feature Value vs Retail Price
          </p>
        </div>
        <button
          onClick={() => navigate("/atoa")}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary bg-surface-100 hover:bg-surface-200 rounded-lg transition-colors"
        >
          Edit in A2A
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Summary Cards */}
      {basePoint && (
        <SummaryCards base={basePoint} comp={compPoint} vi={vi} va={va} />
      )}

      {/* Brand Chips */}
      <BrandChipsBar
        brands={brands}
        brandCounts={brandCounts}
        activeBrands={activeBrands}
        onToggle={handleBrandToggle}
        onShowAll={handleShowAll}
      />

      {/* Main Two-Column Layout */}
      <div className="flex gap-5">
        {/* Left: Chart */}
        <div className="flex-1 bg-surface-white rounded-[20px] shadow-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Crosshair className="w-4 h-4 text-text-tertiary" />
            <h3 className="text-sm font-semibold text-text-primary">
              Competitive Position Map
            </h3>
            <span className="text-[10px] text-text-tertiary ml-1">
              Click any dot to inspect
            </span>
          </div>

          {filteredPoints.length > 0 ? (
            <>
              <div className="rounded-2xl border border-surface-100 bg-surface-50 p-4">
                <ResponsiveContainer width="100%" height={480}>
                  <ScatterChart margin={{ top: 30, right: 40, bottom: 40, left: 40 }}>
                    {/* Quadrant backgrounds (relative to BASE) */}
                    {basePoint && (
                      <>
                        {/* Top-left: Favorable (green) */}
                        <ReferenceArea
                          x1={xDomain[0]}
                          x2={basePoint.value}
                          y1={basePoint.price}
                          y2={yDomain[1]}
                          fill="#22C55E"
                          fillOpacity={0.04}
                        />
                        {/* Top-right: Value Pressure (yellow) */}
                        <ReferenceArea
                          x1={basePoint.value}
                          x2={xDomain[1]}
                          y1={basePoint.price}
                          y2={yDomain[1]}
                          fill="#F59E0B"
                          fillOpacity={0.04}
                        />
                        {/* Bottom-left: Price Pressure (yellow) */}
                        <ReferenceArea
                          x1={xDomain[0]}
                          x2={basePoint.value}
                          y1={yDomain[0]}
                          y2={basePoint.price}
                          fill="#F59E0B"
                          fillOpacity={0.04}
                        />
                        {/* Bottom-right: High Threat (red) */}
                        <ReferenceArea
                          x1={basePoint.value}
                          x2={xDomain[1]}
                          y1={yDomain[0]}
                          y2={basePoint.price}
                          fill="#EF4444"
                          fillOpacity={0.04}
                        />
                      </>
                    )}

                    <XAxis
                      type="number"
                      dataKey="value"
                      name="Feature Value"
                      domain={xDomain}
                      tick={{ fontSize: 10, fill: "var(--th-text-secondary)" }}
                      tickLine={false}
                      axisLine={{ stroke: "var(--th-surface-200)" }}
                      tickFormatter={formatAxisFeature}
                    >
                      <Label
                        value="Feature Value"
                        position="bottom"
                        offset={15}
                        style={{
                          fontSize: 11,
                          fill: "var(--th-text-tertiary)",
                          fontWeight: 500,
                        }}
                      />
                    </XAxis>

                    <YAxis
                      type="number"
                      dataKey="price"
                      name="Retail Price"
                      domain={yDomain}
                      tick={{ fontSize: 10, fill: "var(--th-text-secondary)" }}
                      tickFormatter={formatAxisPrice}
                      tickLine={false}
                      axisLine={{ stroke: "var(--th-surface-200)" }}
                    >
                      <Label
                        value="Retail Price (in Thousand IDR)"
                        angle={-90}
                        position="insideLeft"
                        offset={-20}
                        style={{
                          fontSize: 11,
                          fill: "var(--th-text-tertiary)",
                          fontWeight: 500,
                        }}
                      />
                    </YAxis>

                    {/* Crosshair at BASE position */}
                    {basePoint && (
                      <>
                        <ReferenceLine
                          x={basePoint.value}
                          stroke="#ED0000"
                          strokeOpacity={0.4}
                          strokeDasharray="6 4"
                        />
                        <ReferenceLine
                          y={basePoint.price}
                          stroke="#ED0000"
                          strokeOpacity={0.4}
                          strokeDasharray="6 4"
                        />
                      </>
                    )}

                    {/* Quadrant labels at corners */}
                    {basePoint && (
                      <>
                        {/* Favorable: top-left */}
                        <text
                          x="15%"
                          y="8%"
                          textAnchor="middle"
                          fill="#22C55E"
                          fontSize={10}
                          fontWeight={600}
                          opacity={0.7}
                        >
                          Favorable
                        </text>
                        {/* Value Pressure: top-right */}
                        <text
                          x="85%"
                          y="8%"
                          textAnchor="middle"
                          fill="#F59E0B"
                          fontSize={10}
                          fontWeight={600}
                          opacity={0.7}
                        >
                          Value Pressure
                        </text>
                        {/* Price Pressure: bottom-left */}
                        <text
                          x="15%"
                          y="92%"
                          textAnchor="middle"
                          fill="#F59E0B"
                          fontSize={10}
                          fontWeight={600}
                          opacity={0.7}
                        >
                          Price Pressure
                        </text>
                        {/* High Threat: bottom-right */}
                        <text
                          x="85%"
                          y="92%"
                          textAnchor="middle"
                          fill="#EF4444"
                          fontSize={10}
                          fontWeight={600}
                          opacity={0.7}
                        >
                          High Threat
                        </text>
                      </>
                    )}

                    <Tooltip
                      content={<RadarChartTooltip />}
                      cursor={false}
                    />

                    <Scatter
                      data={sortedPoints}
                      shape={(props: DotProps) => <PositioningDot {...props} />}
                      onClick={handleDotClick}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>

              <ChartLegend brands={visibleBrands} />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-sm text-text-tertiary">
                No vehicles match the current brand filters.
              </p>
              <button
                onClick={handleShowAll}
                className="mt-3 px-4 py-2 text-xs font-medium text-text-secondary bg-surface-100 hover:bg-surface-200 rounded-lg transition-colors"
              >
                Show All Brands
              </button>
            </div>
          )}
        </div>

        {/* Right: Assessment Panel */}
        <div className="w-80 shrink-0 bg-surface-white rounded-[20px] shadow-card p-6 overflow-y-auto max-h-[700px]">
          {basePoint && compPoint ? (
            <PositionAssessment
              base={basePoint}
              comp={compPoint}
              baseVehicle={baseVehicle}
              compVehicle={compVehicle}
              vi={vi}
              va={va}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <div className="w-12 h-12 rounded-xl bg-surface-100 flex items-center justify-center mb-3">
                <Crosshair className="w-6 h-6 text-text-tertiary" />
              </div>
              <p className="text-sm text-text-secondary mb-1">
                Position Assessment
              </p>
              <p className="text-xs text-text-tertiary">
                Click any vehicle dot on the chart to see its competitive
                assessment against the base vehicle.
              </p>
              {basePoint && (
                <div className="mt-4 text-xs text-text-secondary">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: getBrandColor(basePoint.maker) }}
                    />
                    Base: {basePoint.maker} {basePoint.model}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
