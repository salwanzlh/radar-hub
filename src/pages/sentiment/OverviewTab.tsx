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

/* --- Sample Data (shown when no real data exists) --- */

const SAMPLE_STATS: SentimentStats = {
  total_comments: 1847,
  positive_count: 923,
  neutral_count: 571,
  negative_count: 353,
  positive_pct: 50.0,
  neutral_pct: 30.9,
  negative_pct: 19.1,
  period_label: "Last 7 days",
};

function generateSampleTrends(): TrendPoint[] {
  const today = new Date();
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (13 - i));
    return {
      date: d.toISOString().split("T")[0],
      positive: Math.floor(40 + Math.random() * 80),
      neutral: Math.floor(20 + Math.random() * 50),
      negative: Math.floor(10 + Math.random() * 40),
    };
  });
}

const SAMPLE_TRENDS = generateSampleTrends();

const SAMPLE_PLATFORMS: PlatformBreakdown[] = [
  { platform: "Instagram", positive: 412, neutral: 234, negative: 128, total: 774 },
  { platform: "YouTube", positive: 287, neutral: 189, negative: 112, total: 588 },
  { platform: "Facebook", positive: 156, neutral: 98, negative: 73, total: 327 },
  { platform: "Twitter", positive: 68, neutral: 50, negative: 40, total: 158 },
];

const SAMPLE_PAIN_POINTS: PainPointItem[] = [
  {
    issue: "Keluhan waktu tunggu servis terlalu lama",
    frequency: 47,
    example_comments: [
      "Servis di dealer resmi bisa sampai 4 jam, terlalu lama menunggu",
      "Sudah booking tapi tetap harus nunggu berjam-jam, tolong diperbaiki",
    ],
  },
  {
    issue: "Ketersediaan suku cadang sulit ditemukan",
    frequency: 32,
    example_comments: [
      "Part Xpander Cross indent 2 minggu, harusnya ready stock dong",
      "Suku cadang AC susah banget dicari di kota kecil",
    ],
  },
  {
    issue: "Harga BBM tinggi untuk kendaraan non-hybrid",
    frequency: 28,
    example_comments: [
      "Konsumsi BBM Pajero Sport di kota cuma 8 km/L, boros banget",
      "Kapan Mitsubishi bikin hybrid yang affordable kayak kompetitor?",
    ],
  },
  {
    issue: "Fitur infotainment terasa ketinggalan",
    frequency: 19,
    example_comments: [
      "Head unit Xpander masih belum support wireless Android Auto",
      "Layar infotainment responsnya lambat dibanding kompetitor",
    ],
  },
];

const SAMPLE_NEGATIVE_COMMENTS = [
  { id: "s1", author_name: "Rizky Pratama", content: "Sudah 3 minggu nunggu part AC Xpander, katanya indent terus. Padahal ini mobil best seller, masa suku cadangnya susah?", sentiment: "negative", confidence: 0.94, commented_at: "2026-02-19T10:30:00Z" },
  { id: "s2", author_name: "Dewi Sartika", content: "Booking servis jam 9 pagi, baru dikerjain jam 11. Mau sampai kapan sistem antrian nya begini terus?", sentiment: "negative", confidence: 0.91, commented_at: "2026-02-18T14:22:00Z" },
  { id: "s3", author_name: "Budi Santoso", content: "Harga Pajero Sport 2026 naik lagi tapi fitur infotainment masih sama, kompetitor udah jauh lebih canggih", sentiment: "negative", confidence: 0.87, commented_at: "2026-02-18T09:15:00Z" },
  { id: "s4", author_name: "Ayu Lestari", content: "Kecewa sama cat Xpander baru 2 tahun sudah mulai pudar di bagian kap mesin, quality control nya gimana sih?", sentiment: "negative", confidence: 0.92, commented_at: "2026-02-17T16:45:00Z" },
  { id: "s5", author_name: "Hendra Wijaya", content: "Dealer di Surabaya pelayanannya mengecewakan, SA nya cuek dan tidak informatif soal progress servis kendaraan", sentiment: "negative", confidence: 0.89, commented_at: "2026-02-17T11:30:00Z" },
];

/* --- Tab 1: Overview --- */

export function OverviewTab({ selectedProduct }: { selectedProduct?: string }) {
  const [days, setDays] = useState(7);

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

  // Use sample data when real data is empty
  const hasRealData = stats && stats.total_comments > 0;
  const displayStats = hasRealData ? stats : SAMPLE_STATS;
  const displayTrends = (trends && trends.length > 0) ? trends : SAMPLE_TRENDS;
  const displayPlatforms = (platforms && platforms.length > 0) ? platforms : SAMPLE_PLATFORMS;
  const displayPainPoints = (painPoints && painPoints.length > 0) ? painPoints : SAMPLE_PAIN_POINTS;
  const hasRealNegative = negativeComments && negativeComments.items.length > 0;

  const trendOption = {
    tooltip: { trigger: "axis" as const },
    legend: { data: ["Positive", "Neutral", "Negative"], bottom: 0, textStyle: { color: "#94a3b8" } },
    grid: { top: 20, right: 20, bottom: 40, left: 50 },
    xAxis: { type: "category" as const, data: displayTrends.map((t) => t.date), axisLabel: { fontSize: 11, color: "#64748b" }, axisLine: { lineStyle: { color: "#334155" } } },
    yAxis: { type: "value" as const, axisLabel: { fontSize: 11, color: "#64748b" }, splitLine: { lineStyle: { color: "#1e293b" } } },
    series: [
      { name: "Positive", type: "line" as const, stack: "total", areaStyle: { opacity: 0.3 }, data: displayTrends.map((t) => t.positive), itemStyle: { color: "#10B981" }, smooth: true },
      { name: "Neutral", type: "line" as const, stack: "total", areaStyle: { opacity: 0.3 }, data: displayTrends.map((t) => t.neutral), itemStyle: { color: "#3B82F6" }, smooth: true },
      { name: "Negative", type: "line" as const, stack: "total", areaStyle: { opacity: 0.3 }, data: displayTrends.map((t) => t.negative), itemStyle: { color: "#EF4444" }, smooth: true },
    ],
  };

  const platformOption = {
    tooltip: { trigger: "axis" as const, axisPointer: { type: "shadow" as const } },
    legend: { data: ["Positive", "Neutral", "Negative"], bottom: 0, textStyle: { color: "#94a3b8" } },
    grid: { top: 10, right: 30, bottom: 40, left: 100 },
    xAxis: { type: "value" as const, axisLabel: { color: "#64748b" }, splitLine: { lineStyle: { color: "#1e293b" } } },
    yAxis: { type: "category" as const, data: displayPlatforms.map((p) => p.platform), axisLabel: { color: "#94a3b8" } },
    series: [
      { name: "Positive", type: "bar" as const, stack: "total", data: displayPlatforms.map((p) => p.positive), itemStyle: { color: "#10B981" } },
      { name: "Neutral", type: "bar" as const, stack: "total", data: displayPlatforms.map((p) => p.neutral), itemStyle: { color: "#3B82F6" } },
      { name: "Negative", type: "bar" as const, stack: "total", data: displayPlatforms.map((p) => p.negative), itemStyle: { color: "#EF4444" } },
    ],
  };

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

  return (
    <div className="space-y-6">
      {/* Sample Data Banner */}
      {!hasRealData && (
        <div className="flex items-center gap-3 px-4 py-3 bg-brand-accent/10 border border-brand-accent/20 rounded-xl">
          <BarChart3 className="w-4 h-4 text-brand-accent shrink-0" />
          <p className="text-xs text-text-secondary">
            <span className="font-semibold text-brand-accent">Sample data</span> — Menampilkan data contoh. Data akan diganti otomatis setelah scraping pertama dijalankan.
          </p>
        </div>
      )}

      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          Sentiment analysis overview - {displayStats.period_label}
        </p>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="px-3.5 py-2 text-sm bg-surface-100 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/20 text-text-primary"
        >
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
          <p className="text-2xl font-bold text-text-primary">{displayStats.total_comments.toLocaleString()}</p>
        </div>
        <div className="bg-surface-white rounded-[20px] shadow-card p-6 border border-surface-100">
          <p className="text-xs text-text-tertiary uppercase tracking-wider font-medium mb-2">Positive</p>
          <p className="text-2xl font-bold text-status-success">{displayStats.positive_pct.toFixed(1)}%</p>
          <p className="text-xs text-text-tertiary mt-1">{displayStats.positive_count.toLocaleString()} comments</p>
        </div>
        <div className="bg-surface-white rounded-[20px] shadow-card p-6 border border-surface-100">
          <p className="text-xs text-text-tertiary uppercase tracking-wider font-medium mb-2">Neutral</p>
          <p className="text-2xl font-bold text-blue-500">{displayStats.neutral_pct.toFixed(1)}%</p>
          <p className="text-xs text-text-tertiary mt-1">{displayStats.neutral_count.toLocaleString()} comments</p>
        </div>
        <div className="bg-surface-white rounded-[20px] shadow-card p-6 border border-surface-100">
          <p className="text-xs text-text-tertiary uppercase tracking-wider font-medium mb-2">Negative</p>
          <p className="text-2xl font-bold text-status-error">{displayStats.negative_pct.toFixed(1)}%</p>
          <p className="text-xs text-text-tertiary mt-1">{displayStats.negative_count.toLocaleString()} comments</p>
        </div>
      </div>

      {/* Donut Chart — Sentiment Distribution */}
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
                  { value: displayStats.positive_count, name: "Positive", itemStyle: { color: "#10B981" } },
                  { value: displayStats.neutral_count, name: "Neutral", itemStyle: { color: "#3B82F6" } },
                  { value: displayStats.negative_count, name: "Negative", itemStyle: { color: "#EF4444" } },
                ],
              }],
            }}
            style={{ height: 220 }}
          />
        </div>

        {/* Platform Breakdown Chart */}
        <div className="lg:col-span-2 bg-surface-white rounded-[20px] shadow-card p-6 border border-surface-100">
          <h4 className="text-sm font-semibold text-text-primary mb-4">Platform Breakdown</h4>
          <ReactECharts option={platformOption} style={{ height: 220 }} />
        </div>
      </div>

      {/* Product Breakdown Chart */}
      {!selectedProduct && productBreakdownOption && (
        <div className="bg-surface-white rounded-[20px] shadow-card p-6 border border-surface-100">
          <h4 className="text-sm font-semibold text-text-primary mb-4">Product Breakdown</h4>
          <ReactECharts option={productBreakdownOption} style={{ height: 280 }} />
        </div>
      )}

      {/* Sentiment Trend Chart */}
      {!trendsLoading && (
        <div className="bg-surface-white rounded-[20px] shadow-card p-6 border border-surface-100">
          <h4 className="text-sm font-semibold text-text-primary mb-4">Sentiment Trend</h4>
          <ReactECharts option={trendOption} style={{ height: 300 }} />
        </div>
      )}

      {/* Pain Points */}
      <div className="bg-surface-white rounded-[20px] shadow-card p-6 border border-surface-100">
        <h4 className="text-sm font-semibold text-text-primary mb-4">Pain Points</h4>
        <div className="space-y-4">
          {displayPainPoints.map((pp, i) => (
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

      {/* Recent Negative Comments */}
      <div className="bg-surface-white rounded-[20px] shadow-card p-6 border border-surface-100">
        <div className="flex items-center gap-2 mb-4">
          <ThumbsDown className="w-4 h-4 text-status-error" />
          <h4 className="text-sm font-semibold text-text-primary">Recent Negative Comments</h4>
        </div>
        <div className="space-y-3">
          {(hasRealNegative ? negativeComments.items : SAMPLE_NEGATIVE_COMMENTS.map((c) => ({
            id: c.id,
            platform_comment_id: c.id,
            author_name: c.author_name,
            content: c.content,
            likes_count: 0,
            is_reply: false,
            commented_at: c.commented_at,
            sentiment_result: { sentiment: c.sentiment, confidence: c.confidence, model_used: "sample", classified_at: c.commented_at },
          }))).map((comment) => (
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
    </div>
  );
}
