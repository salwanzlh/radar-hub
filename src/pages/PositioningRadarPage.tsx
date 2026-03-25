import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Radar, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Label,
} from "recharts";
import { api, type RadarBrand, type PricingDataItem } from "@/lib/api-client";
import { formatRelativeDate, cn } from "@/lib/utils";

type Tab = "value-map" | "price-list";

const BRAND_COLORS = [
  "#D4FF00",
  "#3B82F6",
  "#F59E0B",
  "#10B981",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#EF4444",
  "#84CC16",
  "#F97316",
];

const TABS: { key: Tab; label: string }[] = [
  { key: "value-map", label: "Value Map" },
  { key: "price-list", label: "Price List" },
];

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

// ---------------------------------------------------------------------------
// Custom Scatter Dot — renders brand abbreviation inside circle
// ---------------------------------------------------------------------------
interface BubbleDotProps {
  cx?: number;
  cy?: number;
  payload?: RadarBrand;
  fill?: string;
  r?: number;
  isSelected?: boolean;
}

function BubbleDot({ cx = 0, cy = 0, payload, fill, r = 20, isSelected }: BubbleDotProps) {
  if (!payload) return null;
  const abbr = payload.brand.substring(0, 3).toUpperCase();
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={fill}
        fillOpacity={isSelected ? 0.9 : 0.6}
        stroke={isSelected ? "#FFFFFF" : fill}
        strokeWidth={isSelected ? 3 : 1.5}
        style={{ cursor: "pointer", transition: "all 0.2s" }}
      />
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fill={isSelected ? "#FFFFFF" : "#000000"}
        fontSize={Math.max(10, r * 0.5)}
        fontWeight={700}
        style={{ pointerEvents: "none" }}
      >
        {abbr}
      </text>
      <text
        x={cx}
        y={cy + r * 0.55}
        textAnchor="middle"
        dominantBaseline="central"
        fill={isSelected ? "#FFFFFF" : "#000000"}
        fontSize={Math.max(8, r * 0.35)}
        fontWeight={400}
        style={{ pointerEvents: "none" }}
      >
        {payload.variant_count}
      </text>
    </g>
  );
}

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------
function RadarTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: RadarBrand }> }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-surface-100 bg-surface-white p-3 shadow-lg text-xs space-y-1">
      <div className="font-semibold text-text-primary text-sm">{d.brand}</div>
      <div className="flex justify-between gap-6">
        <span className="text-text-secondary">Variants</span>
        <span className="text-text-primary font-medium">{d.variant_count}</span>
      </div>
      <div className="flex justify-between gap-6">
        <span className="text-text-secondary">Avg Price</span>
        <span className="text-text-primary font-medium">{formatIDR(d.avg_price)}</span>
      </div>
      <div className="flex justify-between gap-6">
        <span className="text-text-secondary">Range</span>
        <span className="text-text-primary font-medium">{formatIDR(d.price_range)}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Metrics Panel
// ---------------------------------------------------------------------------
function MetricsPanel({ brand, colorIndex }: { brand: RadarBrand | null; colorIndex: number }) {
  if (!brand) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <div className="w-12 h-12 rounded-xl bg-surface-100 flex items-center justify-center mb-3">
          <Radar className="w-6 h-6 text-text-tertiary" />
        </div>
        <p className="text-sm text-text-tertiary">Click a bubble to view brand metrics</p>
      </div>
    );
  }

  const color = BRAND_COLORS[colorIndex % BRAND_COLORS.length];
  const metrics = [
    { label: "Avg Price", value: formatIDR(brand.avg_price) },
    { label: "Min Price", value: formatIDR(brand.min_price) },
    { label: "Max Price", value: formatIDR(brand.max_price) },
    { label: "Variants", value: String(brand.variant_count) },
    { label: "Price Range", value: formatIDR(brand.price_range) },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div
          className="w-4 h-4 rounded-full"
          style={{ backgroundColor: color }}
        />
        <h3 className="text-lg font-semibold text-text-primary">{brand.brand}</h3>
      </div>
      <div className="space-y-3">
        {metrics.map((m) => (
          <div key={m.label} className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">{m.label}</span>
            <span className="text-sm font-semibold text-text-primary">{m.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Price List Table
// ---------------------------------------------------------------------------
type SortKey = "brand" | "type" | "otr_price";

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <ArrowUpDown className="w-3.5 h-3.5 text-text-tertiary" />;
  return dir === "asc"
    ? <ArrowUp className="w-3.5 h-3.5 text-brand-accent" />
    : <ArrowDown className="w-3.5 h-3.5 text-brand-accent" />;
}

function PriceListTab({ data, isLoading }: { data: PricingDataItem[]; isLoading: boolean }) {
  const [sortBy, setSortBy] = useState<SortKey>("brand");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const handleSort = useCallback((key: SortKey) => {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
  }, [sortBy]);

  const sorted = useMemo(() => {
    if (!data) return [];
    return [...data].sort((a, b) => {
      let cmp = 0;
      if (sortBy === "brand") cmp = a.brand.localeCompare(b.brand);
      else if (sortBy === "type") cmp = a.type.localeCompare(b.type);
      else if (sortBy === "otr_price") cmp = a.otr_price - b.otr_price;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortBy, sortDir]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-text-tertiary">Loading price list...</div>
      </div>
    );
  }

  if (!sorted.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm text-text-tertiary">No pricing data available</p>
      </div>
    );
  }

  const thClass = "px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider cursor-pointer select-none hover:text-text-primary transition-colors";

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-100">
            <th className={thClass} onClick={() => handleSort("brand")}>
              <div className="flex items-center gap-1.5">
                Brand <SortIcon active={sortBy === "brand"} dir={sortDir} />
              </div>
            </th>
            <th className={thClass} onClick={() => handleSort("type")}>
              <div className="flex items-center gap-1.5">
                Type <SortIcon active={sortBy === "type"} dir={sortDir} />
              </div>
            </th>
            <th className={cn(thClass, "text-right")} onClick={() => handleSort("otr_price")}>
              <div className="flex items-center justify-end gap-1.5">
                OTR Price <SortIcon active={sortBy === "otr_price"} dir={sortDir} />
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((item) => (
            <tr
              key={item.id}
              className="border-b border-surface-50 hover:bg-surface-50/50 transition-colors"
            >
              <td className="px-4 py-3 font-medium text-text-primary">{item.brand}</td>
              <td className="px-4 py-3 text-text-secondary">{item.type}</td>
              <td className="px-4 py-3 text-right font-mono text-text-primary">
                {formatIDR(item.otr_price)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export function PricingRadarContent() {
  const [activeTab, setActiveTab] = useState<Tab>("value-map");
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);

  const { data: radarData, isLoading: radarLoading } = useQuery({
    queryKey: ["pricing", "radar"],
    queryFn: () => api.pricing.getRadar(),
  });

  const { data: latestData, isLoading: latestLoading } = useQuery({
    queryKey: ["pricing", "latest"],
    queryFn: () => api.pricing.getLatest(),
  });

  const brandMap = useMemo(() => {
    const map = new Map<string, { data: RadarBrand; index: number }>();
    radarData?.forEach((b, i) => map.set(b.brand, { data: b, index: i }));
    return map;
  }, [radarData]);

  const selected = selectedBrand ? brandMap.get(selectedBrand) : null;

  const lastSyncLabel = useMemo(() => {
    if (!latestData?.length) return null;
    return formatRelativeDate(latestData[0].scraped_at);
  }, [latestData]);

  const handleBubbleClick = useCallback((brand: string) => {
    setSelectedBrand((prev) => (prev === brand ? null : brand));
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-surface-white rounded-[20px] shadow-card p-7">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-surface-100 flex items-center justify-center">
              <Radar className="w-5 h-5 text-text-secondary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-text-primary">Positioning Radar</h1>
              <p className="text-xs text-text-tertiary">Pricing-based competitive positioning</p>
            </div>
          </div>
          {lastSyncLabel && (
            <div className="flex items-center gap-2 text-xs text-text-tertiary">
              <span>LAST SYNC</span>
              <span className="font-medium text-text-secondary">{lastSyncLabel}</span>
              <span className="w-2 h-2 rounded-full bg-status-success" />
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                activeTab === tab.key
                  ? "bg-surface-100 text-text-primary"
                  : "text-text-tertiary hover:text-text-secondary hover:bg-surface-50",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === "value-map" ? (
          <ValueMapTab
            data={radarData ?? []}
            isLoading={radarLoading}
            selectedBrand={selectedBrand}
            selectedEntry={selected}
            brandMap={brandMap}
            onBubbleClick={handleBubbleClick}
          />
        ) : (
          <PriceListTab data={latestData ?? []} isLoading={latestLoading} />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Value Map Tab
// ---------------------------------------------------------------------------
interface ValueMapProps {
  data: RadarBrand[];
  isLoading: boolean;
  selectedBrand: string | null;
  selectedEntry: { data: RadarBrand; index: number } | null | undefined;
  brandMap: Map<string, { data: RadarBrand; index: number }>;
  onBubbleClick: (brand: string) => void;
}

function ValueMapTab({
  data,
  isLoading,
  selectedBrand,
  selectedEntry,
  brandMap,
  onBubbleClick,
}: ValueMapProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-text-tertiary">Loading radar data...</div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mb-4">
          <Radar className="w-8 h-8 text-text-tertiary" />
        </div>
        <h2 className="text-lg font-semibold text-text-primary mb-2">No Data</h2>
        <p className="text-sm text-text-tertiary max-w-md">
          No pricing data available. Run a scrape job from the Pricing Comparison page first.
        </p>
      </div>
    );
  }

  const maxRange = Math.max(...data.map((d) => d.price_range), 1);

  return (
    <div className="flex gap-6">
      {/* Chart */}
      <div className="flex-1 min-w-0">
        <div className="rounded-2xl border border-surface-100 bg-surface-50/30 p-4">
          <ResponsiveContainer width="100%" height={480}>
            <ScatterChart margin={{ top: 20, right: 30, bottom: 30, left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--th-surface-200)" />
              <XAxis
                type="number"
                dataKey="variant_count"
                name="Variant Count"
                tick={{ fontSize: 11, fill: "var(--th-text-secondary)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--th-surface-200)" }}
              >
                <Label
                  value="VARIANT COUNT"
                  position="bottom"
                  offset={10}
                  style={{ fontSize: 11, fill: "var(--th-text-tertiary)", letterSpacing: "0.05em" }}
                />
              </XAxis>
              <YAxis
                type="number"
                dataKey="avg_price"
                name="Avg OTR Price"
                tick={{ fontSize: 11, fill: "var(--th-text-secondary)" }}
                tickFormatter={formatShortIDR}
                tickLine={false}
                axisLine={{ stroke: "var(--th-surface-200)" }}
              >
                <Label
                  value="AVG OTR PRICE"
                  angle={-90}
                  position="insideLeft"
                  offset={-15}
                  style={{ fontSize: 11, fill: "var(--th-text-tertiary)", letterSpacing: "0.05em" }}
                />
              </YAxis>
              <ZAxis
                type="number"
                dataKey="price_range"
                range={[300, 1500]}
                name="Price Range"
              />
              <Tooltip content={<RadarTooltip />} cursor={false} />
              <Scatter
                data={data}
                shape={(props: BubbleDotProps) => {
                  const brand = props.payload?.brand ?? "";
                  const entry = brandMap.get(brand);
                  const color = BRAND_COLORS[(entry?.index ?? 0) % BRAND_COLORS.length];
                  return (
                    <BubbleDot
                      {...props}
                      fill={color}
                      isSelected={brand === selectedBrand}
                      r={Math.max(18, 18 + ((props.payload?.price_range ?? 0) / maxRange) * 30)}
                    />
                  );
                }}
                onClick={(entry) => {
                  if (entry?.payload?.brand) {
                    onBubbleClick(entry.payload.brand);
                  }
                }}
              />
            </ScatterChart>
          </ResponsiveContainer>
          <p className="text-center text-xs text-text-tertiary mt-2">
            Bubble size = price range
          </p>
        </div>
      </div>

      {/* Metrics Panel */}
      <div className="w-72 shrink-0">
        <div className="rounded-2xl border border-surface-100 bg-surface-50/30 p-5 sticky top-6">
          <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-4">
            Brand Metrics
          </h3>
          <MetricsPanel
            brand={selectedEntry?.data ?? null}
            colorIndex={selectedEntry?.index ?? 0}
          />
        </div>
      </div>
    </div>
  );
}

export default function PositioningRadarPage() {
  return <PricingRadarContent />;
}
