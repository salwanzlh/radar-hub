import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Crosshair } from "lucide-react";
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
  payload?: AtoaRadarPoint;
}

function CompetitiveDot({ cx = 0, cy = 0, payload }: DotProps) {
  if (!payload) return null;

  if (payload.is_base) {
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

  const config = getQuadrantConfig(payload.quadrant);
  return (
    <circle
      cx={cx}
      cy={cy}
      r={6}
      fill={config.color}
      fillOpacity={0.7}
      stroke={config.color}
      strokeWidth={1.5}
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
  payload?: Array<{ payload: AtoaRadarPoint }>;
}) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  const config = getQuadrantConfig(d.quadrant);

  return (
    <div className="rounded-lg border border-surface-100 bg-surface-white p-3 shadow-lg text-xs space-y-1">
      <div className="font-semibold text-text-primary text-sm">
        {vehicleLabel(d)}
      </div>
      {d.is_base && (
        <div className="text-brand-accent font-medium text-[10px] uppercase tracking-wider">
          Base Vehicle
        </div>
      )}
      {!d.is_base && (
        <span
          className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium"
          style={{
            backgroundColor: `${config.color}20`,
            color: config.color,
          }}
        >
          {config.label}
        </span>
      )}
      <div className="flex justify-between gap-6">
        <span className="text-text-secondary">Feature Value</span>
        <span className="text-text-primary font-medium">
          {d.value.toFixed(1)}
        </span>
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
// Assessment Panel
// ---------------------------------------------------------------------------

function AssessmentPanel({
  point,
  basePoint,
}: {
  point: AtoaRadarPoint;
  basePoint: AtoaRadarPoint | undefined;
}) {
  const config = getQuadrantConfig(point.quadrant);

  const priceDiff =
    basePoint != null ? point.price - basePoint.price : null;
  const featureDiff =
    basePoint != null ? point.value - basePoint.value : null;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3">
          Position Assessment
        </h3>
        <p className="text-sm font-semibold text-text-primary">
          {vehicleLabel(point)}
        </p>
      </div>

      {/* Quadrant badge */}
      <span
        className="inline-block px-3 py-1 rounded-full text-xs font-semibold"
        style={{
          backgroundColor: `${config.color}20`,
          color: config.color,
        }}
      >
        {config.label}
      </span>

      {/* Description */}
      <p className="text-xs text-text-secondary leading-relaxed">
        {config.description}
      </p>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-3">
        {point.vi_percent != null && (
          <div className="bg-surface-100 rounded-lg p-3">
            <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">
              VI%
            </div>
            <div className="text-sm font-semibold text-text-primary">
              {point.vi_percent.toFixed(1)}%
            </div>
          </div>
        )}
        {point.va_percent != null && (
          <div className="bg-surface-100 rounded-lg p-3">
            <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">
              VA%
            </div>
            <div className="text-sm font-semibold text-text-primary">
              {point.va_percent.toFixed(1)}%
            </div>
          </div>
        )}
        {priceDiff != null && (
          <div className="bg-surface-100 rounded-lg p-3">
            <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">
              Price Diff
            </div>
            <div
              className={cn(
                "text-sm font-semibold",
                priceDiff > 0
                  ? "text-status-error"
                  : priceDiff < 0
                    ? "text-status-success"
                    : "text-text-primary",
              )}
            >
              {priceDiff > 0 ? "+" : ""}
              {formatShortIDR(priceDiff)}
            </div>
          </div>
        )}
        {featureDiff != null && (
          <div className="bg-surface-100 rounded-lg p-3">
            <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">
              Feature Diff
            </div>
            <div
              className={cn(
                "text-sm font-semibold",
                featureDiff > 0
                  ? "text-status-error"
                  : featureDiff < 0
                    ? "text-status-success"
                    : "text-text-primary",
              )}
            >
              {featureDiff > 0 ? "+" : ""}
              {featureDiff.toFixed(1)}
            </div>
          </div>
        )}
      </div>

      {/* Comparison table: Base vs Selected */}
      {basePoint && (
        <div>
          <h4 className="text-[10px] text-text-tertiary uppercase tracking-wider mb-2">
            Base vs Selected
          </h4>
          <div className="border border-surface-100 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-surface-100 bg-surface-100/50">
                  <th className="px-3 py-2 text-left text-text-tertiary font-medium">
                    Metric
                  </th>
                  <th className="px-3 py-2 text-right text-text-tertiary font-medium">
                    Base
                  </th>
                  <th className="px-3 py-2 text-right text-text-tertiary font-medium">
                    Selected
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-surface-50">
                  <td className="px-3 py-2 text-text-secondary">Price</td>
                  <td className="px-3 py-2 text-right text-text-primary font-mono">
                    {formatShortIDR(basePoint.price)}
                  </td>
                  <td className="px-3 py-2 text-right text-text-primary font-mono">
                    {formatShortIDR(point.price)}
                  </td>
                </tr>
                <tr className="border-b border-surface-50">
                  <td className="px-3 py-2 text-text-secondary">
                    Feature Value
                  </td>
                  <td className="px-3 py-2 text-right text-text-primary font-mono">
                    {basePoint.value.toFixed(1)}
                  </td>
                  <td className="px-3 py-2 text-right text-text-primary font-mono">
                    {point.value.toFixed(1)}
                  </td>
                </tr>
                {basePoint.segment && (
                  <tr>
                    <td className="px-3 py-2 text-text-secondary">Segment</td>
                    <td className="px-3 py-2 text-right text-text-primary">
                      {basePoint.segment}
                    </td>
                    <td className="px-3 py-2 text-right text-text-primary">
                      {point.segment ?? "-"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
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
  const [baseId, setBaseId] = useState<string>("");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
    null,
  );
  const [hiddenBrands, setHiddenBrands] = useState<Set<string>>(new Set());

  // Fetch all vehicles for dropdown
  const { data: vehicles, isLoading: vehiclesLoading } = useQuery({
    queryKey: ["atoa-vehicles"],
    queryFn: () => api.atoa.getVehicles(),
  });

  // Fetch radar points when base is selected
  const { data: radarPoints, isLoading: radarLoading } = useQuery({
    queryKey: ["atoa-radar", baseId],
    queryFn: () => api.atoa.getRadar(baseId),
    enabled: !!baseId,
  });

  // Group vehicles by maker for the dropdown
  const vehicleOptions = useMemo(() => {
    if (!vehicles) return [];
    const grouped = new Map<string, AtoaVehicle[]>();
    for (const v of vehicles) {
      const list = grouped.get(v.maker) ?? [];
      list.push(v);
      grouped.set(v.maker, list);
    }
    return Array.from(grouped.entries()).sort(([a], [b]) =>
      a.localeCompare(b),
    );
  }, [vehicles]);

  // Extract unique brands from radar data
  const brands = useMemo(() => {
    if (!radarPoints) return [];
    const set = new Set<string>();
    for (const p of radarPoints) {
      if (!p.is_base) set.add(p.maker);
    }
    return Array.from(set).sort();
  }, [radarPoints]);

  // Filter points by hidden brands
  const filteredPoints = useMemo(() => {
    if (!radarPoints) return [];
    return radarPoints.filter(
      (p) => p.is_base || !hiddenBrands.has(p.maker),
    );
  }, [radarPoints, hiddenBrands]);

  // Base vehicle reference point
  const basePoint = useMemo(
    () => filteredPoints.find((p) => p.is_base),
    [filteredPoints],
  );

  // Selected vehicle
  const selectedPoint = useMemo(
    () =>
      selectedVehicleId
        ? filteredPoints.find((p) => p.vehicle_id === selectedVehicleId)
        : null,
    [filteredPoints, selectedVehicleId],
  );

  // Axis domain calculations
  const { xDomain, yDomain } = useMemo(() => {
    if (!filteredPoints.length) {
      return { xDomain: [0, 100] as [number, number], yDomain: [0, 1_000_000_000] as [number, number] };
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

  const handleBrandToggle = useCallback((brand: string) => {
    setHiddenBrands((prev) => {
      const next = new Set(prev);
      if (next.has(brand)) {
        next.delete(brand);
      } else {
        next.add(brand);
      }
      return next;
    });
  }, []);

  const handleDotClick = useCallback(
    (entry: { payload?: AtoaRadarPoint }) => {
      if (!entry?.payload) return;
      const id = entry.payload.vehicle_id;
      setSelectedVehicleId((prev) => (prev === id ? null : id));
    },
    [],
  );

  const handleBaseChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setBaseId(e.target.value);
      setSelectedVehicleId(null);
      setHiddenBrands(new Set());
    },
    [],
  );

  // Loading state
  if (vehiclesLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-text-tertiary">
          Loading vehicles...
        </div>
      </div>
    );
  }

  // No vehicles
  if (!vehicles?.length) {
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
    <div className="flex gap-6">
      {/* Left: Chart area */}
      <div className="flex-1 bg-surface-white rounded-[20px] shadow-card p-7">
        <div className="flex items-center gap-4 mb-6">
          <label
            htmlFor="base-vehicle-select"
            className="text-sm font-medium text-text-secondary whitespace-nowrap"
          >
            Base Vehicle
          </label>
          <select
            id="base-vehicle-select"
            aria-label="Select base vehicle"
            value={baseId}
            onChange={handleBaseChange}
            className="flex-1 max-w-sm bg-surface-100 border border-surface-200 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
          >
            <option value="">-- Select a vehicle --</option>
            {vehicleOptions.map(([maker, vList]) => (
              <optgroup key={maker} label={maker}>
                {vList.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.model}
                    {v.trim ? ` ${v.trim}` : ""}
                    {v.model_year ? ` (${v.model_year})` : ""}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {!baseId && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mb-4">
              <Crosshair className="w-8 h-8 text-text-tertiary" />
            </div>
            <p className="text-sm text-text-tertiary">
              Select a base vehicle to generate the competitive radar
            </p>
          </div>
        )}

        {baseId && radarLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-sm text-text-tertiary">
              Loading radar data...
            </div>
          </div>
        )}

        {baseId && !radarLoading && filteredPoints.length > 0 && basePoint && (
          <>
            <div className="rounded-2xl border border-surface-100 bg-surface-50/30 p-4">
              <ResponsiveContainer width="100%" height={480}>
                <ScatterChart
                  margin={{ top: 20, right: 30, bottom: 30, left: 30 }}
                >
                  {/* Quadrant backgrounds */}
                  {/* Top-left: Favorable (high price, low value) */}
                  <ReferenceArea
                    x1={xDomain[0]}
                    x2={basePoint.value}
                    y1={basePoint.price}
                    y2={yDomain[1]}
                    fill="#22C55E"
                    fillOpacity={0.06}
                  />
                  {/* Top-right: Value Pressure (high price, high value) */}
                  <ReferenceArea
                    x1={basePoint.value}
                    x2={xDomain[1]}
                    y1={basePoint.price}
                    y2={yDomain[1]}
                    fill="#A855F7"
                    fillOpacity={0.06}
                  />
                  {/* Bottom-left: Price Pressure (low price, low value) */}
                  <ReferenceArea
                    x1={xDomain[0]}
                    x2={basePoint.value}
                    y1={yDomain[0]}
                    y2={basePoint.price}
                    fill="#F59E0B"
                    fillOpacity={0.06}
                  />
                  {/* Bottom-right: High Threat (low price, high value) */}
                  <ReferenceArea
                    x1={basePoint.value}
                    x2={xDomain[1]}
                    y1={yDomain[0]}
                    y2={basePoint.price}
                    fill="#EF4444"
                    fillOpacity={0.06}
                  />

                  <XAxis
                    type="number"
                    dataKey="value"
                    name="Feature Value"
                    domain={xDomain}
                    tick={{
                      fontSize: 11,
                      fill: "var(--th-text-secondary)",
                    }}
                    tickLine={false}
                    axisLine={{ stroke: "var(--th-surface-200)" }}
                  >
                    <Label
                      value="FEATURE VALUE"
                      position="bottom"
                      offset={10}
                      style={{
                        fontSize: 11,
                        fill: "var(--th-text-tertiary)",
                        letterSpacing: "0.05em",
                      }}
                    />
                  </XAxis>
                  <YAxis
                    type="number"
                    dataKey="price"
                    name="Retail Price"
                    domain={yDomain}
                    tick={{
                      fontSize: 11,
                      fill: "var(--th-text-secondary)",
                    }}
                    tickFormatter={formatShortIDR}
                    tickLine={false}
                    axisLine={{ stroke: "var(--th-surface-200)" }}
                  >
                    <Label
                      value="RETAIL PRICE"
                      angle={-90}
                      position="insideLeft"
                      offset={-15}
                      style={{
                        fontSize: 11,
                        fill: "var(--th-text-tertiary)",
                        letterSpacing: "0.05em",
                      }}
                    />
                  </YAxis>

                  {/* Crosshair at base vehicle */}
                  <ReferenceLine
                    x={basePoint.value}
                    stroke="#3B82F6"
                    strokeOpacity={0.3}
                    strokeDasharray="6 4"
                  />
                  <ReferenceLine
                    y={basePoint.price}
                    stroke="#3B82F6"
                    strokeOpacity={0.3}
                    strokeDasharray="6 4"
                  />

                  <Tooltip
                    content={<RadarChartTooltip />}
                    cursor={false}
                  />

                  <Scatter
                    data={filteredPoints}
                    shape={(props: DotProps) => (
                      <CompetitiveDot {...props} />
                    )}
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
        )}

        {baseId && !radarLoading && filteredPoints.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm text-text-tertiary">
              No radar data available for this vehicle
            </p>
          </div>
        )}
      </div>

      {/* Right: Assessment panel */}
      <div className="w-80 shrink-0 bg-surface-white rounded-[20px] shadow-card p-7">
        {selectedPoint && !selectedPoint.is_base ? (
          <AssessmentPanel point={selectedPoint} basePoint={basePoint} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="w-12 h-12 rounded-xl bg-surface-100 flex items-center justify-center mb-3">
              <Crosshair className="w-6 h-6 text-text-tertiary" />
            </div>
            <p className="text-sm text-text-tertiary">
              Click a vehicle on the chart to see its assessment
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
