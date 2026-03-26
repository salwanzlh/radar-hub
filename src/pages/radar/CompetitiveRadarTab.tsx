import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Crosshair, Filter, X } from "lucide-react";
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
import { api, type AtoaRadarPoint } from "@/lib/api-client";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

interface QuadrantConfig {
  label: string;
  color: string;
  description: string;
}

const QUADRANT_CONFIG: Record<string, QuadrantConfig> = {
  "high-threat": {
    label: "High Threat",
    color: "#EF4444",
    description:
      "Cheaper with more features. Consider adjusting pricing or enhancing features.",
  },
  "price-pressure": {
    label: "Price Pressure",
    color: "#F59E0B",
    description:
      "Undercuts on price but fewer features. Emphasize your feature advantages.",
  },
  "value-pressure": {
    label: "Value Pressure",
    color: "#A855F7",
    description:
      "Pricier but offers more features. Close the feature gap.",
  },
  favorable: {
    label: "Favorable",
    color: "#22C55E",
    description:
      "More expensive with fewer features. Maintain current positioning.",
  },
};

function getQuadrantConfig(quadrant: string | null): QuadrantConfig {
  return (
    QUADRANT_CONFIG[quadrant ?? ""] ?? {
      label: "Unknown",
      color: "#6B7280",
      description: "",
    }
  );
}

function getQuadrant(
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

function formatIDR(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatShortIDR(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)}jt`;
  return String(value);
}

function vehicleLabel(point: AtoaRadarPoint): string {
  const parts = [point.maker, point.model];
  if (point.trim) parts.push(point.trim);
  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// Custom Scatter Dot
// ---------------------------------------------------------------------------

interface DotProps {
  cx?: number;
  cy?: number;
  payload?: AtoaRadarPoint & { _isV1?: boolean; _isV2?: boolean };
}

function CompetitiveDot({ cx = 0, cy = 0, payload }: DotProps) {
  if (!payload) return null;

  // Vehicle 1 (base) — large accent dot
  if (payload._isV1) {
    return (
      <circle
        cx={cx}
        cy={cy}
        r={10}
        fill="var(--th-brand-accent)"
        stroke="var(--th-brand-accent)"
        strokeWidth={2}
        fillOpacity={0.9}
        style={{ cursor: "pointer" }}
      />
    );
  }

  // Vehicle 2 — large blue dot
  if (payload._isV2) {
    return (
      <circle
        cx={cx}
        cy={cy}
        r={10}
        fill="#3B82F6"
        stroke="#3B82F6"
        strokeWidth={2}
        fillOpacity={0.9}
        style={{ cursor: "pointer" }}
      />
    );
  }

  // Others — small gray dot
  return (
    <circle
      cx={cx}
      cy={cy}
      r={5}
      fill="var(--th-text-tertiary)"
      fillOpacity={0.4}
      stroke="var(--th-text-tertiary)"
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
  payload?: Array<{ payload: AtoaRadarPoint & { _isV1?: boolean; _isV2?: boolean } }>;
}) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;

  return (
    <div className="rounded-lg border border-surface-100 bg-surface-white p-3 shadow-lg text-xs space-y-1">
      <div className="font-semibold text-text-primary text-sm">
        {vehicleLabel(d)}
      </div>
      {d._isV1 && (
        <div className="text-brand-accent font-medium text-[10px] uppercase tracking-wider">
          Vehicle 1
        </div>
      )}
      {d._isV2 && (
        <div className="text-blue-500 font-medium text-[10px] uppercase tracking-wider">
          Vehicle 2
        </div>
      )}
      {d.segment && (
        <div className="text-text-tertiary">{d.segment}</div>
      )}
      <div className="flex justify-between gap-6">
        <span className="text-text-secondary">Feature Value</span>
        <span className="text-text-primary font-medium">{d.value}</span>
      </div>
      <div className="flex justify-between gap-6">
        <span className="text-text-secondary">Retail Price</span>
        <span className="text-text-primary font-medium">
          {formatIDR(d.price)}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Comparison Panel (2 vehicles)
// ---------------------------------------------------------------------------

function ComparisonPanel({
  v1,
  v2,
}: {
  v1: AtoaRadarPoint;
  v2: AtoaRadarPoint;
}) {
  const quadrant = getQuadrant(v2.price, v2.value, v1.price, v1.value);
  const config = getQuadrantConfig(quadrant);

  const priceDiff = v2.price - v1.price;
  const featureDiff = v2.value - v1.value;
  const vi = v1.price ? ((v2.price / v1.price) * 100) : 0;
  const va = v1.price ? (((v2.price - (v2.value - v1.value)) / v1.price) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Vehicle 1 */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full bg-brand-accent" />
          <span className="text-[10px] text-text-tertiary uppercase tracking-wider">Vehicle 1</span>
        </div>
        <p className="text-sm font-semibold text-text-primary">{vehicleLabel(v1)}</p>
        {v1.segment && <p className="text-xs text-text-tertiary">{v1.segment}</p>}
      </div>

      {/* Vehicle 2 */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-[10px] text-text-tertiary uppercase tracking-wider">Vehicle 2</span>
        </div>
        <p className="text-sm font-semibold text-text-primary">{vehicleLabel(v2)}</p>
        {v2.segment && <p className="text-xs text-text-tertiary">{v2.segment}</p>}
      </div>

      {/* Quadrant badge */}
      <div>
        <span
          className="inline-block px-3 py-1 rounded-full text-xs font-semibold"
          style={{ backgroundColor: `${config.color}20`, color: config.color }}
        >
          {config.label}
        </span>
        <p className="text-xs text-text-secondary leading-relaxed mt-2">
          {config.description}
        </p>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface-100 rounded-lg p-3">
          <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">VI%</div>
          <div className="text-sm font-semibold text-text-primary">{vi.toFixed(1)}%</div>
        </div>
        <div className="bg-surface-100 rounded-lg p-3">
          <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">VA%</div>
          <div className="text-sm font-semibold text-text-primary">{va.toFixed(1)}%</div>
        </div>
        <div className="bg-surface-100 rounded-lg p-3">
          <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">Price Diff</div>
          <div className={cn(
            "text-sm font-semibold",
            priceDiff > 0 ? "text-status-error" : priceDiff < 0 ? "text-status-success" : "text-text-primary",
          )}>
            {priceDiff > 0 ? "+" : ""}{formatShortIDR(priceDiff)}
          </div>
        </div>
        <div className="bg-surface-100 rounded-lg p-3">
          <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">Feature Diff</div>
          <div className={cn(
            "text-sm font-semibold",
            featureDiff > 0 ? "text-status-error" : featureDiff < 0 ? "text-status-success" : "text-text-primary",
          )}>
            {featureDiff > 0 ? "+" : ""}{featureDiff}
          </div>
        </div>
      </div>

      {/* Comparison table */}
      <div>
        <h4 className="text-[10px] text-text-tertiary uppercase tracking-wider mb-2">
          Side by Side
        </h4>
        <div className="border border-surface-100 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-surface-100 bg-surface-100/50">
                <th className="px-3 py-2 text-left text-text-tertiary font-medium">Metric</th>
                <th className="px-3 py-2 text-right text-text-tertiary font-medium">V1</th>
                <th className="px-3 py-2 text-right text-text-tertiary font-medium">V2</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-surface-50">
                <td className="px-3 py-2 text-text-secondary">Price</td>
                <td className="px-3 py-2 text-right text-text-primary font-mono">{formatShortIDR(v1.price)}</td>
                <td className="px-3 py-2 text-right text-text-primary font-mono">{formatShortIDR(v2.price)}</td>
              </tr>
              <tr className="border-b border-surface-50">
                <td className="px-3 py-2 text-text-secondary">Feature Value</td>
                <td className="px-3 py-2 text-right text-text-primary font-mono">{v1.value}</td>
                <td className="px-3 py-2 text-right text-text-primary font-mono">{v2.value}</td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-text-secondary">Segment</td>
                <td className="px-3 py-2 text-right text-text-primary">{v1.segment ?? "-"}</td>
                <td className="px-3 py-2 text-right text-text-primary">{v2.segment ?? "-"}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Brand Chip Bar
// ---------------------------------------------------------------------------

function BrandChipFilter({
  brands,
  hiddenBrands,
  onToggle,
}: {
  brands: string[];
  hiddenBrands: Set<string>;
  onToggle: (brand: string) => void;
}) {
  if (brands.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-4">
      {brands.map((brand) => {
        const hidden = hiddenBrands.has(brand);
        return (
          <button
            key={brand}
            onClick={() => onToggle(brand)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition-colors border",
              hidden
                ? "border-surface-200 text-text-tertiary bg-transparent"
                : "border-surface-200 text-text-primary bg-surface-100",
            )}
          >
            {brand}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function CompetitiveRadarTab() {
  // Selection: up to 2 vehicles
  const [selectedIds, setSelectedIds] = useState<[string | null, string | null]>([null, null]);
  const [hiddenBrands, setHiddenBrands] = useState<Set<string>>(new Set());

  // Filters
  const [filterSegment, setFilterSegment] = useState("");
  const [filterModel, setFilterModel] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Fetch all radar points on mount
  const { data: allPoints, isLoading } = useQuery({
    queryKey: ["atoa-radar-all"],
    queryFn: () => api.atoa.getRadarAll(),
  });

  // Unique segments and models for filters
  const { segments, models } = useMemo(() => {
    if (!allPoints) return { segments: [], models: [] };
    const segSet = new Set<string>();
    const modSet = new Set<string>();
    for (const p of allPoints) {
      if (p.segment) segSet.add(p.segment);
      modSet.add(`${p.maker} ${p.model}`);
    }
    return {
      segments: Array.from(segSet).sort(),
      models: Array.from(modSet).sort(),
    };
  }, [allPoints]);

  // Unique brands
  const brands = useMemo(() => {
    if (!allPoints) return [];
    const set = new Set<string>();
    for (const p of allPoints) set.add(p.maker);
    return Array.from(set).sort();
  }, [allPoints]);

  // Apply filters
  const filteredPoints = useMemo(() => {
    if (!allPoints) return [];
    return allPoints.filter((p) => {
      if (hiddenBrands.has(p.maker)) return false;
      if (filterSegment && p.segment !== filterSegment) return false;
      if (filterModel && `${p.maker} ${p.model}` !== filterModel) return false;
      return true;
    });
  }, [allPoints, hiddenBrands, filterSegment, filterModel]);

  // Enrich points with selection flags
  const [v1Id, v2Id] = selectedIds;

  const enrichedPoints = useMemo(() => {
    return filteredPoints.map((p) => ({
      ...p,
      _isV1: p.vehicle_id === v1Id,
      _isV2: p.vehicle_id === v2Id,
    }));
  }, [filteredPoints, v1Id, v2Id]);

  const v1Point = useMemo(() => allPoints?.find((p) => p.vehicle_id === v1Id) ?? null, [allPoints, v1Id]);
  const v2Point = useMemo(() => allPoints?.find((p) => p.vehicle_id === v2Id) ?? null, [allPoints, v2Id]);

  // Axis domains
  const { xDomain, yDomain } = useMemo(() => {
    if (!filteredPoints.length) {
      return {
        xDomain: [0, 100] as [number, number],
        yDomain: [0, 1_000_000_000] as [number, number],
      };
    }
    const values = filteredPoints.map((p) => p.value);
    const prices = filteredPoints.map((p) => p.price);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const valPad = (maxVal - minVal) * 0.1 || 5;
    const pricePad = (maxPrice - minPrice) * 0.1 || 50_000_000;
    return {
      xDomain: [Math.max(0, Math.floor(minVal - valPad)), Math.ceil(maxVal + valPad)] as [number, number],
      yDomain: [Math.max(0, Math.floor(minPrice - pricePad)), Math.ceil(maxPrice + pricePad)] as [number, number],
    };
  }, [filteredPoints]);

  // Quadrant reference lines (only when V1 is selected)
  const showQuadrants = v1Point != null;

  const handleBrandToggle = useCallback((brand: string) => {
    setHiddenBrands((prev) => {
      const next = new Set(prev);
      if (next.has(brand)) next.delete(brand);
      else next.add(brand);
      return next;
    });
  }, []);

  const handleDotClick = useCallback(
    (entry: { payload?: AtoaRadarPoint }) => {
      if (!entry?.payload) return;
      const id = entry.payload.vehicle_id;

      setSelectedIds((prev) => {
        const [prevV1, prevV2] = prev;

        // Clicking same dot deselects it
        if (prevV1 === id) return [prevV2, null];
        if (prevV2 === id) return [prevV1, null];

        // If no V1 yet, set V1
        if (!prevV1) return [id, null];

        // If V1 set but no V2, set V2
        if (!prevV2) return [prevV1, id];

        // Both set — replace V2
        return [prevV1, id];
      });
    },
    [],
  );

  const clearSelection = useCallback(() => {
    setSelectedIds([null, null]);
  }, []);

  const clearFilters = useCallback(() => {
    setFilterSegment("");
    setFilterModel("");
    setHiddenBrands(new Set());
  }, []);

  // Loading state
  if (isLoading) {
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
        <h2 className="text-lg font-semibold text-text-primary mb-2">No Vehicles</h2>
        <p className="text-sm text-text-tertiary max-w-md">
          No vehicles available for competitive radar. Add vehicles in the A2A Comparison page first.
        </p>
      </div>
    );
  }

  const hasActiveFilters = filterSegment || filterModel || hiddenBrands.size > 0;

  return (
    <div className="flex gap-6">
      {/* Left: Chart area */}
      <div className="flex-1 bg-surface-white rounded-[20px] shadow-card p-7">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <p className="text-sm text-text-secondary">
              Click any 2 vehicles to compare.
              {v1Id && !v2Id && (
                <span className="text-brand-accent ml-1">Select a second vehicle.</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(v1Id || v2Id) && (
              <button
                onClick={clearSelection}
                className="px-3 py-1.5 text-xs font-medium text-text-secondary bg-surface-100 hover:bg-surface-200 rounded-lg transition-colors"
              >
                Clear Selection
              </button>
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                showFilters || hasActiveFilters
                  ? "bg-brand-accent text-black"
                  : "bg-surface-100 text-text-secondary hover:bg-surface-200",
              )}
            >
              <Filter className="w-3.5 h-3.5" />
              Filters
              {hasActiveFilters && (
                <span className="w-4 h-4 rounded-full bg-black/20 text-[10px] flex items-center justify-center">
                  {(filterSegment ? 1 : 0) + (filterModel ? 1 : 0) + hiddenBrands.size}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="flex items-center gap-3 mb-4 p-3 bg-surface-50 rounded-xl border border-surface-100">
            <select
              value={filterSegment}
              onChange={(e) => setFilterSegment(e.target.value)}
              className="px-3 py-1.5 text-xs border border-surface-200 rounded-lg bg-surface-white text-text-primary focus:outline-none"
            >
              <option value="">All Segments</option>
              {segments.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              value={filterModel}
              onChange={(e) => setFilterModel(e.target.value)}
              className="px-3 py-1.5 text-xs border border-surface-200 rounded-lg bg-surface-white text-text-primary focus:outline-none"
            >
              <option value="">All Models</option>
              {models.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-2 py-1 text-[10px] text-text-tertiary hover:text-text-primary transition-colors"
              >
                <X className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>
        )}

        {/* Chart */}
        {filteredPoints.length > 0 ? (
          <>
            <div className="rounded-2xl border border-surface-100 bg-surface-50/30 p-4">
              <ResponsiveContainer width="100%" height={480}>
                <ScatterChart margin={{ top: 20, right: 30, bottom: 30, left: 30 }}>
                  {/* Quadrant backgrounds (only when V1 selected) */}
                  {showQuadrants && v1Point && (
                    <>
                      <ReferenceArea x1={xDomain[0]} x2={v1Point.value} y1={v1Point.price} y2={yDomain[1]} fill="#22C55E" fillOpacity={0.06} />
                      <ReferenceArea x1={v1Point.value} x2={xDomain[1]} y1={v1Point.price} y2={yDomain[1]} fill="#A855F7" fillOpacity={0.06} />
                      <ReferenceArea x1={xDomain[0]} x2={v1Point.value} y1={yDomain[0]} y2={v1Point.price} fill="#F59E0B" fillOpacity={0.06} />
                      <ReferenceArea x1={v1Point.value} x2={xDomain[1]} y1={yDomain[0]} y2={v1Point.price} fill="#EF4444" fillOpacity={0.06} />
                    </>
                  )}

                  <XAxis
                    type="number"
                    dataKey="value"
                    name="Feature Value"
                    domain={xDomain}
                    tick={{ fontSize: 11, fill: "var(--th-text-secondary)" }}
                    tickLine={false}
                    axisLine={{ stroke: "var(--th-surface-200)" }}
                  >
                    <Label
                      value="FEATURE VALUE"
                      position="bottom"
                      offset={10}
                      style={{ fontSize: 11, fill: "var(--th-text-tertiary)", letterSpacing: "0.05em" }}
                    />
                  </XAxis>
                  <YAxis
                    type="number"
                    dataKey="price"
                    name="Retail Price"
                    domain={yDomain}
                    tick={{ fontSize: 11, fill: "var(--th-text-secondary)" }}
                    tickFormatter={formatShortIDR}
                    tickLine={false}
                    axisLine={{ stroke: "var(--th-surface-200)" }}
                  >
                    <Label
                      value="RETAIL PRICE"
                      angle={-90}
                      position="insideLeft"
                      offset={-15}
                      style={{ fontSize: 11, fill: "var(--th-text-tertiary)", letterSpacing: "0.05em" }}
                    />
                  </YAxis>

                  {/* Crosshair at V1 */}
                  {v1Point && (
                    <>
                      <ReferenceLine x={v1Point.value} stroke="#3B82F6" strokeOpacity={0.3} strokeDasharray="6 4" />
                      <ReferenceLine y={v1Point.price} stroke="#3B82F6" strokeOpacity={0.3} strokeDasharray="6 4" />
                    </>
                  )}

                  <Tooltip content={<RadarChartTooltip />} cursor={false} />

                  <Scatter
                    data={enrichedPoints}
                    shape={(props: DotProps) => <CompetitiveDot {...props} />}
                    onClick={handleDotClick}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            <BrandChipFilter
              brands={brands}
              hiddenBrands={hiddenBrands}
              onToggle={handleBrandToggle}
            />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm text-text-tertiary">
              No vehicles match the current filters.
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-3 px-4 py-2 text-xs font-medium text-text-secondary bg-surface-100 hover:bg-surface-200 rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Right: Assessment panel */}
      <div className="w-80 shrink-0 bg-surface-white rounded-[20px] shadow-card p-7">
        {v1Point && v2Point ? (
          <ComparisonPanel v1={v1Point} v2={v2Point} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="w-12 h-12 rounded-xl bg-surface-100 flex items-center justify-center mb-3">
              <Crosshair className="w-6 h-6 text-text-tertiary" />
            </div>
            <p className="text-sm text-text-tertiary">
              {!v1Id
                ? "Click any vehicle to start comparing"
                : "Click a second vehicle to see the comparison"}
            </p>
            {v1Point && (
              <div className="mt-4 text-xs text-text-secondary">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-accent" />
                  {vehicleLabel(v1Point)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
