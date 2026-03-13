import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ReactECharts from "echarts-for-react";
import {
  BarChart3,
  AlertTriangle,
  ThumbsDown,
} from "lucide-react";
import {
  sentimentApi,
  type SentimentStats,
  type TrendPoint,
  type PainPointItem,
  type PlatformBreakdown,
  type ProductBreakdownItem,
  type SentimentComment,
  type PaginatedResponse,
} from "@/lib/sentiment-api-client";
import { formatRelativeDate } from "@/lib/utils";
import { SentimentBadge } from "./SentimentPage";

/* --- Tab 1: Overview --- */

export function OverviewTab({ selectedProduct }: { selectedProduct?: string }) {
  const [days, setDays] = useState(0);

  const { data: stats, isLoading: statsLoading } = useQuery<SentimentStats>({
    queryKey: ["sentiment-stats", days, selectedProduct],
    queryFn: () => sentimentApi.dashboard.stats(days, selectedProduct),
  });

  const { data: trends, isLoading: trendsLoading } = useQuery<TrendPoint[]>({
    queryKey: ["sentiment-trends", days, selectedProduct],
    queryFn: () => sentimentApi.dashboard.trends(days, selectedProduct),
  });

  const { data: platforms } = useQuery<PlatformBreakdown[]>({
    queryKey: ["sentiment-platforms", days, selectedProduct],
    queryFn: () => sentimentApi.dashboard.platformBreakdown(days, selectedProduct),
  });

  const { data: painPoints } = useQuery<PainPointItem[]>({
    queryKey: ["sentiment-pain-points", selectedProduct],
    queryFn: () => sentimentApi.dashboard.painPoints(selectedProduct),
  });

  const { data: negativeComments } = useQuery<PaginatedResponse<SentimentComment>>({
    queryKey: ["sentiment-negative-comments", selectedProduct],
    queryFn: () => {
      const params: Record<string, string> = { sentiment: "negative", page_size: "5", page: "1" };
      if (selectedProduct) params.product_lineup_id = selectedProduct;
      return sentimentApi.comments.list(params);
    },
  });

  const { data: productBreakdown } = useQuery<ProductBreakdownItem[]>({
    queryKey: ["sentiment-product-breakdown", days],
    queryFn: () => sentimentApi.dashboard.productBreakdown(days),
    enabled: !selectedProduct,
  });

  const hasData = stats && stats.total_comments > 0;
  const hasTrends = trends && trends.length > 0;
  const hasPlatforms = platforms && platforms.length > 0;
  const hasPainPoints = painPoints && painPoints.length > 0;
  const hasNegativeComments = negativeComments && negativeComments.items.length > 0;

  const trendOption = hasTrends ? {
    tooltip: { trigger: "axis" as const },
    legend: { data: ["Positive", "Neutral", "Negative"], bottom: 0, textStyle: { color: "#94a3b8" } },
    grid: { top: 20, right: 20, bottom: 40, left: 50 },
    xAxis: { type: "category" as const, data: trends!.map((t) => t.date), axisLabel: { fontSize: 11, color: "#64748b" }, axisLine: { lineStyle: { color: "#334155" } } },
    yAxis: { type: "value" as const, axisLabel: { fontSize: 11, color: "#64748b" }, splitLine: { lineStyle: { color: "#1e293b" } } },
    series: [
      { name: "Positive", type: "line" as const, stack: "total", areaStyle: { opacity: 0.3 }, data: trends!.map((t) => t.positive), itemStyle: { color: "#10B981" }, smooth: true },
      { name: "Neutral", type: "line" as const, stack: "total", areaStyle: { opacity: 0.3 }, data: trends!.map((t) => t.neutral), itemStyle: { color: "#3B82F6" }, smooth: true },
      { name: "Negative", type: "line" as const, stack: "total", areaStyle: { opacity: 0.3 }, data: trends!.map((t) => t.negative), itemStyle: { color: "#EF4444" }, smooth: true },
    ],
  } : null;

  const platformOption = hasPlatforms ? {
    tooltip: { trigger: "axis" as const, axisPointer: { type: "shadow" as const } },
    legend: { data: ["Positive", "Neutral", "Negative"], bottom: 0, textStyle: { color: "#94a3b8" } },
    grid: { top: 10, right: 30, bottom: 40, left: 100 },
    xAxis: { type: "value" as const, axisLabel: { color: "#64748b" }, splitLine: { lineStyle: { color: "#1e293b" } } },
    yAxis: { type: "category" as const, data: platforms!.map((p) => p.platform), axisLabel: { color: "#94a3b8" } },
    series: [
      { name: "Positive", type: "bar" as const, stack: "total", data: platforms!.map((p) => p.positive), itemStyle: { color: "#10B981" } },
      { name: "Neutral", type: "bar" as const, stack: "total", data: platforms!.map((p) => p.neutral), itemStyle: { color: "#3B82F6" } },
      { name: "Negative", type: "bar" as const, stack: "total", data: platforms!.map((p) => p.negative), itemStyle: { color: "#EF4444" } },
    ],
  } : null;

  const productBreakdownOption = productBreakdown && productBreakdown.length > 0 ? {
    tooltip: { trigger: "axis" as const, axisPointer: { type: "shadow" as const } },
    legend: { data: ["Positive", "Neutral", "Negative"], bottom: 0, textStyle: { color: "#94a3b8" } },
    grid: { top: 10, right: 30, bottom: 40, left: 120 },
    xAxis: { type: "value" as const, axisLabel: { color: "#64748b" }, splitLine: { lineStyle: { color: "#1e293b" } } },
    yAxis: { type: "category" as const, data: productBreakdown.map((p) => p.product_name), axisLabel: { color: "#94a3b8", fontSize: 11 } },
    series: [
      { name: "Positive", type: "bar" as const, stack: "total", data: productBreakdown.map((p) => p.positive), itemStyle: { color: "#10B981" } },
      { name: "Neutral", type: "bar" as const, stack: "total", data: productBreakdown.map((p) => p.neutral), itemStyle: { color: "#3B82F6" } },
      { name: "Negative", type: "bar" as const, stack: "total", data: productBreakdown.map((p) => p.negative), itemStyle: { color: "#EF4444" } },
    ],
  } : null;

  if (statsLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-surface-100 rounded-xl animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-surface-100 rounded-[20px] animate-pulse" />
          ))}
        </div>
        <div className="h-72 bg-surface-100 rounded-[20px] animate-pulse" />
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="text-center py-16">
        <BarChart3 className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
        <p className="text-sm text-text-tertiary">No data available yet. Run a scrape to start collecting comments.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          Sentiment analysis overview - {stats.period_label}
        </p>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="px-3.5 py-2 text-sm bg-surface-100 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/20 text-text-primary"
        >
          <option value={0}>All data</option>
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-white rounded-[20px] shadow-card p-6 border border-surface-100">
          <p className="text-xs text-text-tertiary uppercase tracking-wider font-medium mb-2">Total Comments</p>
          <p className="text-2xl font-bold text-text-primary">{stats.total_comments.toLocaleString()}</p>
        </div>
        <div className="bg-surface-white rounded-[20px] shadow-card p-6 border border-surface-100">
          <p className="text-xs text-text-tertiary uppercase tracking-wider font-medium mb-2">Positive</p>
          <p className="text-2xl font-bold text-status-success">{stats.positive_pct.toFixed(1)}%</p>
          <p className="text-xs text-text-tertiary mt-1">{stats.positive_count.toLocaleString()} comments</p>
        </div>
        <div className="bg-surface-white rounded-[20px] shadow-card p-6 border border-surface-100">
          <p className="text-xs text-text-tertiary uppercase tracking-wider font-medium mb-2">Neutral</p>
          <p className="text-2xl font-bold text-blue-500">{stats.neutral_pct.toFixed(1)}%</p>
          <p className="text-xs text-text-tertiary mt-1">{stats.neutral_count.toLocaleString()} comments</p>
        </div>
        <div className="bg-surface-white rounded-[20px] shadow-card p-6 border border-surface-100">
          <p className="text-xs text-text-tertiary uppercase tracking-wider font-medium mb-2">Negative</p>
          <p className="text-2xl font-bold text-status-error">{stats.negative_pct.toFixed(1)}%</p>
          <p className="text-xs text-text-tertiary mt-1">{stats.negative_count.toLocaleString()} comments</p>
        </div>
      </div>

      {/* Donut Chart + Platform Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-surface-white rounded-[20px] shadow-card p-6 border border-surface-100">
          <h4 className="text-sm font-semibold text-text-primary mb-4">Sentiment Distribution</h4>
          <ReactECharts
            option={{
              tooltip: { trigger: "item" as const, formatter: "{b}: {c} ({d}%)" },
              series: [{
                type: "pie" as const,
                radius: ["50%", "75%"],
                avoidLabelOverlap: false,
                itemStyle: { borderRadius: 6, borderColor: "#1a1a2e", borderWidth: 2 },
                label: { show: false },
                emphasis: { label: { show: true, fontSize: 13, fontWeight: "bold", color: "#e2e8f0" } },
                data: [
                  { value: stats.positive_count, name: "Positive", itemStyle: { color: "#10B981" } },
                  { value: stats.neutral_count, name: "Neutral", itemStyle: { color: "#3B82F6" } },
                  { value: stats.negative_count, name: "Negative", itemStyle: { color: "#EF4444" } },
                ],
              }],
            }}
            style={{ height: 220 }}
          />
        </div>

        {/* Platform Breakdown Chart */}
        {platformOption && (
          <div className="lg:col-span-2 bg-surface-white rounded-[20px] shadow-card p-6 border border-surface-100">
            <h4 className="text-sm font-semibold text-text-primary mb-4">Platform Breakdown</h4>
            <ReactECharts option={platformOption} style={{ height: 220 }} />
          </div>
        )}
      </div>

      {/* Product Breakdown Chart */}
      {!selectedProduct && productBreakdownOption && (
        <div className="bg-surface-white rounded-[20px] shadow-card p-6 border border-surface-100">
          <h4 className="text-sm font-semibold text-text-primary mb-4">Product Breakdown</h4>
          <ReactECharts option={productBreakdownOption} style={{ height: 280 }} />
        </div>
      )}

      {/* Sentiment Trend Chart */}
      {!trendsLoading && trendOption && (
        <div className="bg-surface-white rounded-[20px] shadow-card p-6 border border-surface-100">
          <h4 className="text-sm font-semibold text-text-primary mb-4">Sentiment Trend</h4>
          <ReactECharts option={trendOption} style={{ height: 300 }} />
        </div>
      )}

      {/* Pain Points */}
      {hasPainPoints && (
        <div className="bg-surface-white rounded-[20px] shadow-card p-6 border border-surface-100">
          <h4 className="text-sm font-semibold text-text-primary mb-4">Pain Points</h4>
          <div className="space-y-4">
            {painPoints!.map((pp, i) => (
              <div key={i} className="border border-surface-200 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <AlertTriangle className="w-4 h-4 text-status-warning shrink-0" />
                  <h5 className="text-sm font-medium text-text-primary">{pp.issue}</h5>
                  <span className="text-xs text-text-tertiary ml-auto whitespace-nowrap">Frekuensi: {pp.frequency}</span>
                </div>
                {pp.example_comments.length > 0 && (
                  <div className="ml-7 space-y-1.5">
                    {pp.example_comments.slice(0, 3).map((comment, j) => (
                      <p key={j} className="text-xs text-text-secondary italic line-clamp-2">"{comment}"</p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Negative Comments */}
      {hasNegativeComments && (
        <div className="bg-surface-white rounded-[20px] shadow-card p-6 border border-surface-100">
          <div className="flex items-center gap-2 mb-4">
            <ThumbsDown className="w-4 h-4 text-status-error" />
            <h4 className="text-sm font-semibold text-text-primary">Recent Negative Comments</h4>
          </div>
          <div className="space-y-3">
            {negativeComments.items.map((comment) => (
              <div key={comment.id} className="border border-surface-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-text-primary">{comment.author_name}</span>
                  <div className="flex items-center gap-2">
                    {comment.sentiment_result && (
                      <SentimentBadge
                        sentiment={comment.sentiment_result.sentiment}
                        confidence={comment.sentiment_result.confidence}
                      />
                    )}
                  </div>
                </div>
                <p className="text-sm text-text-secondary line-clamp-3">{comment.content}</p>
                {comment.commented_at && (
                  <p className="text-xs text-text-tertiary mt-2">{formatRelativeDate(comment.commented_at)}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
