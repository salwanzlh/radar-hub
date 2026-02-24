import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ReactECharts from "echarts-for-react";
import ReactMarkdown from "react-markdown";
import {
  BarChart3,
  MessageSquare,
  Hash,
  FileText,
  Settings,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Loader2,
  Play,
  Pause,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  ThumbsDown,
  Shield,
  Package,
  Eye,
  Zap,
  Clock,
  ChevronDown,
} from "lucide-react";
import {
  sentimentApi,
  type SentimentStats,
  type TrendPoint,
  type TopicItem,
  type PainPointItem,
  type PlatformBreakdown,
  type ProductBreakdownItem,
  type SentimentComment,
  type SentimentReport,
  type ReportSummary,
  type SocialAccount,
  type PaginatedResponse,
  type ProductLineup,
  type ProductMapping,
  type CleansingRule,
  type ScrapeProgress,
  type ScrapeLogItem,
} from "@/lib/sentiment-api-client";
import { cn, formatRelativeDate } from "@/lib/utils";
import toast from "react-hot-toast";

type Tab = "overview" | "comments" | "topics" | "reports" | "settings";

const TABS: { id: Tab; label: string; icon: typeof BarChart3 }[] = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "comments", label: "Comments", icon: MessageSquare },
  { id: "topics", label: "Topics", icon: Hash },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "settings", label: "Settings", icon: Settings },
];

/* --- Shared Badge Components --- */

function SentimentBadge({ sentiment, confidence }: { sentiment: string; confidence?: number }) {
  const styles: Record<string, string> = {
    positive: "bg-status-success-light text-status-success",
    neutral: "bg-blue-50 text-blue-600",
    negative: "bg-status-error-light text-status-error",
  };
  return (
    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${styles[sentiment] || "bg-surface-100 text-text-tertiary"}`}>
      {sentiment}{confidence !== undefined ? ` ${(confidence * 100).toFixed(0)}%` : ""}
    </span>
  );
}

function PlatformBadge({ platform }: { platform: string }) {
  const colors: Record<string, string> = {
    facebook: "bg-blue-50 text-blue-600",
    instagram: "bg-pink-50 text-pink-600",
    twitter: "bg-sky-50 text-sky-600",
    youtube: "bg-red-50 text-red-600",
    tiktok: "bg-gray-50 text-gray-800",
  };
  return (
    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full capitalize ${colors[platform] || "bg-surface-100 text-text-tertiary"}`}>
      {platform}
    </span>
  );
}

/* --- Main Page Component --- */

export default function SentimentPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [selectedProduct, setSelectedProduct] = useState<string | undefined>(undefined);

  const { data: productLineups } = useQuery<ProductLineup[]>({
    queryKey: ["sentiment-product-lineups"],
    queryFn: sentimentApi.products.lineups,
  });

  return (
    <div className="space-y-6">
      {/* Product Selector */}
      <div className="bg-surface-white rounded-[20px] shadow-card p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Package className="w-4 h-4 text-text-tertiary shrink-0" />
          <span className="text-xs font-medium text-text-tertiary mr-1">Product:</span>
          <button
            onClick={() => setSelectedProduct(undefined)}
            className={cn(
              "px-3.5 py-1.5 text-xs font-medium rounded-full transition-colors",
              !selectedProduct
                ? "bg-brand-accent text-text-inverse"
                : "bg-surface-100 text-text-secondary hover:bg-surface-200"
            )}
          >
            All Products
          </button>
          {productLineups?.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedProduct(p.id)}
              className={cn(
                "px-3.5 py-1.5 text-xs font-medium rounded-full transition-colors",
                selectedProduct === p.id
                  ? "bg-brand-accent text-text-inverse"
                  : "bg-surface-100 text-text-secondary hover:bg-surface-200"
              )}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-surface-white rounded-[20px] shadow-card">
        <div className="flex border-b border-surface-100">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 -mb-px",
                activeTab === tab.id
                  ? "border-brand-accent text-text-primary"
                  : "border-transparent text-text-secondary hover:text-text-primary"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-7">
          {activeTab === "overview" && <OverviewTab selectedProduct={selectedProduct} />}
          {activeTab === "comments" && <CommentsTab selectedProduct={selectedProduct} />}
          {activeTab === "topics" && <TopicsTab selectedProduct={selectedProduct} />}
          {activeTab === "reports" && <ReportsTab selectedProduct={selectedProduct} />}
          {activeTab === "settings" && <SettingsTab />}
        </div>
      </div>
    </div>
  );
}

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

function OverviewTab({ selectedProduct }: { selectedProduct?: string }) {
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

/* --- Tab 2: Comments --- */

function CommentDetailModal({
  comment,
  onClose,
}: {
  comment: SentimentComment;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-white border border-surface-200 rounded-[20px] max-w-2xl w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-surface-200">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">{comment.author_name}</h3>
            {comment.commented_at && (
              <p className="text-xs text-text-tertiary mt-0.5">{formatRelativeDate(comment.commented_at)}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-text-tertiary hover:text-brand-accent hover:bg-surface-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Full comment text */}
        <div className="px-6 py-5 border-b border-surface-200">
          <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap break-words">{comment.content}</p>
          {comment.post_url && (
            <a
              href={comment.post_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-3 text-xs text-brand-accent hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              View original post
            </a>
          )}
        </div>

        {/* Metadata grid */}
        <div className="px-6 py-5 grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-text-tertiary text-xs font-medium uppercase tracking-wide">Platform</span>
            <div className="mt-1.5">
              <PlatformBadge platform={comment.platform || "unknown"} />
            </div>
          </div>
          <div>
            <span className="text-text-tertiary text-xs font-medium uppercase tracking-wide">Source Account</span>
            <p className="mt-1.5 text-text-primary">{comment.source_account || <span className="text-text-tertiary">--</span>}</p>
          </div>
          <div>
            <span className="text-text-tertiary text-xs font-medium uppercase tracking-wide">Sentiment</span>
            <div className="mt-1.5">
              {comment.is_excluded ? (
                <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-surface-200 text-text-tertiary">excluded</span>
              ) : comment.sentiment_result ? (
                <SentimentBadge
                  sentiment={comment.sentiment_result.sentiment}
                  confidence={comment.sentiment_result.confidence}
                />
              ) : (
                <span className="text-xs text-text-tertiary">Pending</span>
              )}
            </div>
          </div>
          <div>
            <span className="text-text-tertiary text-xs font-medium uppercase tracking-wide">Product</span>
            <p className="mt-1.5 text-text-primary">{comment.product_name || <span className="text-text-tertiary">--</span>}</p>
          </div>
          <div>
            <span className="text-text-tertiary text-xs font-medium uppercase tracking-wide">Likes</span>
            <p className="mt-1.5 text-text-primary">{comment.likes_count}</p>
          </div>
          {comment.sentiment_result && (
            <>
              <div>
                <span className="text-text-tertiary text-xs font-medium uppercase tracking-wide">Classified at</span>
                <p className="mt-1.5 text-text-primary">{formatRelativeDate(comment.sentiment_result.classified_at)}</p>
              </div>
              <div>
                <span className="text-text-tertiary text-xs font-medium uppercase tracking-wide">Model used</span>
                <p className="mt-1.5 text-text-primary">{comment.sentiment_result.model_used}</p>
              </div>
            </>
          )}
        </div>

        {/* Excluded badge */}
        {comment.is_excluded && (
          <div className="px-6 pb-5">
            <div className="flex items-center gap-2 px-4 py-3 bg-surface-100 border border-surface-200 rounded-xl">
              <Shield className="w-4 h-4 text-text-tertiary flex-shrink-0" />
              <span className="text-xs text-text-tertiary font-medium">This comment has been excluded from analysis</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CommentsTab({ selectedProduct }: { selectedProduct?: string }) {
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState("");
  const [sentiment, setSentiment] = useState("");
  const [localProduct, setLocalProduct] = useState<string>("");
  const [localProductName, setLocalProductName] = useState("");
  const [page, setPage] = useState(1);
  const [selectedComment, setSelectedComment] = useState<SentimentComment | null>(null);
  const pageSize = 20;

  // Clear local product filter when parent filter changes
  useEffect(() => {
    if (selectedProduct) {
      setLocalProduct("");
      setLocalProductName("");
    }
  }, [selectedProduct]);

  const effectiveProduct = selectedProduct || localProduct || undefined;

  const params: Record<string, string> = {
    page: String(page),
    page_size: String(pageSize),
  };
  if (search) params.search = search;
  if (platform) params.platform = platform;
  if (sentiment) params.sentiment = sentiment;
  if (effectiveProduct) params.product_lineup_id = effectiveProduct;

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<PaginatedResponse<SentimentComment>>({
    queryKey: ["sentiment-comments", params],
    queryFn: () => sentimentApi.comments.list(params),
  });

  const deleteAllMutation = useMutation({
    mutationFn: sentimentApi.comments.deleteAll,
    onSuccess: (result) => {
      toast.success(`Deleted ${result.deleted} comments`);
      queryClient.invalidateQueries({ queryKey: ["sentiment-comments"] });
      queryClient.invalidateQueries({ queryKey: ["sentiment-stats"] });
      setPage(1);
    },
    onError: () => {
      toast.error("Failed to delete comments");
    },
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: stats } = useQuery<SentimentStats>({
    queryKey: ["sentiment-stats-comments", effectiveProduct],
    queryFn: () => sentimentApi.dashboard.stats(30, effectiveProduct),
  });

  const { data: productBreakdown } = useQuery<ProductBreakdownItem[]>({
    queryKey: ["sentiment-product-breakdown-comments"],
    queryFn: () => sentimentApi.dashboard.productBreakdown(30),
  });

  const { data: platformBreakdown } = useQuery<PlatformBreakdown[]>({
    queryKey: ["sentiment-platform-breakdown-comments", effectiveProduct],
    queryFn: () => sentimentApi.dashboard.platformBreakdown(30, effectiveProduct),
  });

  const donutOption = stats && stats.total_comments > 0 ? {
    tooltip: { trigger: "item" as const, formatter: "{b}: {c} ({d}%)" },
    legend: { bottom: 0, textStyle: { color: "#94a3b8" } },
    series: [{
      type: "pie" as const,
      radius: ["45%", "70%"],
      center: ["50%", "45%"],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 6, borderColor: "#1a1a2e", borderWidth: 2 },
      label: {
        show: true,
        position: "center" as const,
        formatter: `{total|${stats.total_comments.toLocaleString()}}\n{label|comments}`,
        rich: {
          total: { fontSize: 22, fontWeight: "bold" as const, color: "#e2e8f0", lineHeight: 30 },
          label: { fontSize: 11, color: "#64748b", lineHeight: 16 },
        },
      },
      emphasis: { label: { show: true, fontSize: 13, fontWeight: "bold", color: "#e2e8f0" } },
      data: [
        { value: stats.positive_count, name: "Positive", itemStyle: { color: "#10B981" } },
        { value: stats.neutral_count, name: "Neutral", itemStyle: { color: "#3B82F6" } },
        { value: stats.negative_count, name: "Negative", itemStyle: { color: "#EF4444" } },
      ],
    }],
  } : null;

  const onDonutClick = (params: { name?: string }) => {
    if (!params.name) return;
    const val = params.name.toLowerCase();
    setSentiment((prev) => prev === val ? "" : val);
    setPage(1);
  };

  const showProductChart = productBreakdown && productBreakdown.length > 0 && !selectedProduct;

  const productChartOption = showProductChart ? {
    tooltip: { trigger: "axis" as const, axisPointer: { type: "shadow" as const } },
    legend: { data: ["Positive", "Neutral", "Negative"], bottom: 0, textStyle: { color: "#94a3b8" } },
    grid: { top: 10, right: 30, bottom: 40, left: 120 },
    xAxis: { type: "value" as const, axisLabel: { color: "#64748b" }, splitLine: { lineStyle: { color: "#1e293b" } } },
    yAxis: {
      type: "category" as const,
      data: productBreakdown!.map((p) => p.product_name),
      axisLabel: {
        fontSize: 11,
        color: (value: string) => value === localProductName ? "#D4FF00" : "#94a3b8",
        fontWeight: ((value: string) => value === localProductName ? "bold" : "normal") as unknown as string,
      },
      triggerEvent: true,
    },
    series: [
      { name: "Positive", type: "bar" as const, stack: "total", data: productBreakdown!.map((p) => p.positive), itemStyle: { color: "#10B981" }, barMaxWidth: 28 },
      { name: "Neutral", type: "bar" as const, stack: "total", data: productBreakdown!.map((p) => p.neutral), itemStyle: { color: "#3B82F6" }, barMaxWidth: 28 },
      { name: "Negative", type: "bar" as const, stack: "total", data: productBreakdown!.map((p) => p.negative), itemStyle: { color: "#EF4444" }, barMaxWidth: 28 },
    ],
  } : null;

  const onProductChartClick = (params: { componentType: string; name?: string; value?: string }) => {
    const clickedName = params.componentType === "yAxis" ? params.value : params.name;
    if (!clickedName || !productBreakdown) return;
    const match = productBreakdown.find((p) => p.product_name === clickedName);
    if (!match) return;
    const id = match.product_lineup_id || "";
    if (localProduct === id) {
      setLocalProduct("");
      setLocalProductName("");
    } else {
      setLocalProduct(id);
      setLocalProductName(match.product_name);
    }
    setPage(1);
  };

  const platformChartOption = platformBreakdown && platformBreakdown.length > 0 ? {
    tooltip: { trigger: "axis" as const, axisPointer: { type: "shadow" as const } },
    legend: { data: ["Positive", "Neutral", "Negative"], bottom: 0, textStyle: { color: "#94a3b8" } },
    grid: { top: 10, right: 30, bottom: 40, left: 100 },
    xAxis: { type: "value" as const, axisLabel: { color: "#64748b" }, splitLine: { lineStyle: { color: "#1e293b" } } },
    yAxis: {
      type: "category" as const,
      data: platformBreakdown.map((p) => p.platform),
      axisLabel: {
        color: (value: string) => value === platform ? "#D4FF00" : "#94a3b8",
        fontWeight: ((value: string) => value === platform ? "bold" : "normal") as unknown as string,
      },
      triggerEvent: true,
    },
    series: [
      { name: "Positive", type: "bar" as const, stack: "total", data: platformBreakdown.map((p) => p.positive), itemStyle: { color: "#10B981", opacity: platform && platformBreakdown.find((b) => b.platform === platform) ? undefined : 1 }, barMaxWidth: 28, emphasis: { itemStyle: { opacity: 1 } } },
      { name: "Neutral", type: "bar" as const, stack: "total", data: platformBreakdown.map((p) => p.neutral), itemStyle: { color: "#3B82F6" }, barMaxWidth: 28 },
      { name: "Negative", type: "bar" as const, stack: "total", data: platformBreakdown.map((p) => p.negative), itemStyle: { color: "#EF4444" }, barMaxWidth: 28 },
    ],
  } : null;

  const onPlatformChartClick = (params: { componentType: string; name?: string; value?: string }) => {
    const clickedPlatform = params.componentType === "yAxis" ? params.value : params.name;
    if (!clickedPlatform) return;
    setPlatform((prev) => prev === clickedPlatform ? "" : clickedPlatform);
    setPage(1);
  };

  // Grid: 3 cols when product chart visible, 2 cols when filtered by product
  const gridCols = showProductChart ? "lg:grid-cols-3" : "lg:grid-cols-2";

  return (
    <div className="space-y-4">
      {/* Charts */}
      <div className={cn("grid grid-cols-1 gap-4", gridCols)}>
        {donutOption && (
          <div className="bg-surface-white rounded-[20px] shadow-card p-6 border border-surface-100">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-text-primary">Sentiment Distribution</h4>
              {sentiment && (
                <button
                  onClick={() => { setSentiment(""); setPage(1); }}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-brand-accent bg-brand-accent/10 rounded-lg hover:bg-brand-accent/20 transition-colors capitalize"
                >
                  <X className="w-3 h-3" />
                  {sentiment}
                </button>
              )}
            </div>
            <ReactECharts
              option={donutOption}
              style={{ height: 220 }}
              onEvents={{ click: onDonutClick }}
            />
          </div>
        )}
        {productChartOption && (
          <div className="bg-surface-white rounded-[20px] shadow-card p-6 border border-surface-100">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-text-primary">Sentiment per Product</h4>
              {localProduct && (
                <button
                  onClick={() => { setLocalProduct(""); setLocalProductName(""); setPage(1); }}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-brand-accent bg-brand-accent/10 rounded-lg hover:bg-brand-accent/20 transition-colors"
                >
                  <X className="w-3 h-3" />
                  {localProductName}
                </button>
              )}
            </div>
            <ReactECharts
              option={productChartOption}
              style={{ height: 220 }}
              onEvents={{ click: onProductChartClick }}
            />
          </div>
        )}
        {platformChartOption && (
          <div className="bg-surface-white rounded-[20px] shadow-card p-6 border border-surface-100">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-text-primary">Sentiment per Platform</h4>
              {platform && (
                <button
                  onClick={() => { setPlatform(""); setPage(1); }}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-brand-accent bg-brand-accent/10 rounded-lg hover:bg-brand-accent/20 transition-colors"
                >
                  <X className="w-3 h-3" />
                  {platform}
                </button>
              )}
            </div>
            <ReactECharts
              option={platformChartOption}
              style={{ height: 220 }}
              onEvents={{ click: onPlatformChartClick }}
            />
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 text-text-tertiary absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search comments..."
            className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-surface-100 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/20 text-text-primary placeholder:text-text-tertiary"
          />
        </div>
        <select
          value={platform}
          onChange={(e) => { setPlatform(e.target.value); setPage(1); }}
          className="px-3.5 py-2.5 text-sm bg-surface-100 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/20 text-text-primary"
        >
          <option value="">All Platforms</option>
          <option value="facebook">Facebook</option>
          <option value="instagram">Instagram</option>
          <option value="twitter">Twitter</option>
          <option value="youtube">YouTube</option>
          <option value="tiktok">TikTok</option>
        </select>
        <select
          value={sentiment}
          onChange={(e) => { setSentiment(e.target.value); setPage(1); }}
          className="px-3.5 py-2.5 text-sm bg-surface-100 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/20 text-text-primary"
        >
          <option value="">All Sentiments</option>
          <option value="positive">Positive</option>
          <option value="neutral">Neutral</option>
          <option value="negative">Negative</option>
        </select>
        {data && data.total > 0 && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleteAllMutation.isPending}
            className="ml-auto px-3.5 py-2.5 text-sm font-medium text-status-error bg-status-error-light border border-status-error/20 rounded-xl hover:bg-status-error hover:text-white transition-colors disabled:opacity-50"
          >
            {deleteAllMutation.isPending ? (
              <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Deleting...</span>
            ) : (
              <span className="flex items-center gap-2"><Trash2 className="w-4 h-4" />Delete All</span>
            )}
          </button>
        )}
      </div>

      {/* Delete All Confirmation */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="bg-surface-white border border-surface-200 rounded-[20px] max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-status-error-light rounded-xl">
                <AlertTriangle className="w-5 h-5 text-status-error" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary">Delete All Comments</h3>
            </div>
            <p className="text-sm text-text-secondary mb-6">
              This will permanently delete all <strong>{data?.total}</strong> comments and their sentiment results. This action cannot be undone.
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2.5 text-sm font-medium text-text-secondary bg-surface-100 border border-surface-200 rounded-xl hover:bg-surface-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteAllMutation.mutate();
                  setShowDeleteConfirm(false);
                }}
                className="px-4 py-2.5 text-sm font-medium text-white bg-status-error rounded-xl hover:bg-red-700 transition-colors"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-surface-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : data && data.items.length > 0 ? (
        <>
          <div className="border border-surface-200 rounded-[20px] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-100 border-b border-surface-200">
                    <th className="text-left px-5 py-3 font-medium text-text-secondary">Author</th>
                    <th className="text-left px-5 py-3 font-medium text-text-secondary">Comment</th>
                    <th className="text-left px-5 py-3 font-medium text-text-secondary">Source</th>
                    <th className="text-left px-5 py-3 font-medium text-text-secondary">Product</th>
                    <th className="text-left px-5 py-3 font-medium text-text-secondary">Platform</th>
                    <th className="text-left px-5 py-3 font-medium text-text-secondary">Sentiment</th>
                    <th className="text-right px-5 py-3 font-medium text-text-secondary">Likes</th>
                    <th className="text-right px-5 py-3 font-medium text-text-secondary">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {data.items.map((comment) => (
                    <tr
                      key={comment.id}
                      onClick={() => setSelectedComment(comment)}
                      className={cn(
                        "hover:bg-surface-100 transition-colors cursor-pointer",
                        comment.is_excluded && "opacity-50"
                      )}
                    >
                      <td className="px-5 py-3.5 font-medium text-text-primary whitespace-nowrap">
                        {comment.author_name}
                      </td>
                      <td className="px-5 py-3.5 text-text-secondary max-w-[300px]">
                        <p className="truncate">{comment.content}</p>
                      </td>
                      <td className="px-5 py-3.5 text-text-secondary text-xs whitespace-nowrap">
                        {comment.source_account || <span className="text-text-tertiary">--</span>}
                      </td>
                      <td className="px-5 py-3.5 text-text-secondary text-xs whitespace-nowrap">
                        {comment.product_name || <span className="text-text-tertiary">--</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <PlatformBadge platform={comment.platform || "unknown"} />
                      </td>
                      <td className="px-5 py-3.5">
                        {comment.is_excluded ? (
                          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-surface-200 text-text-tertiary">excluded</span>
                        ) : comment.sentiment_result ? (
                          <SentimentBadge
                            sentiment={comment.sentiment_result.sentiment}
                            confidence={comment.sentiment_result.confidence}
                          />
                        ) : (
                          <span className="text-xs text-text-tertiary">Pending</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right text-text-secondary">
                        {comment.likes_count}
                      </td>
                      <td className="px-5 py-3.5 text-right text-text-tertiary text-xs whitespace-nowrap">
                        {comment.commented_at ? formatRelativeDate(comment.commented_at) : "--"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-tertiary">
              Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, data.total)} of {data.total} comments
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="p-2 text-text-tertiary hover:text-text-primary hover:bg-surface-100 rounded-xl transition-colors disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-text-secondary px-2">
                Page {page} of {data.total_pages}
              </span>
              <button
                onClick={() => setPage(Math.min(data.total_pages, page + 1))}
                disabled={page >= data.total_pages}
                className="p-2 text-text-tertiary hover:text-text-primary hover:bg-surface-100 rounded-xl transition-colors disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12 border border-surface-200 rounded-[20px]">
          <MessageSquare className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
          <p className="text-sm text-text-tertiary">No comments found matching your filters.</p>
        </div>
      )}

      {selectedComment && (
        <CommentDetailModal
          comment={selectedComment}
          onClose={() => setSelectedComment(null)}
        />
      )}
    </div>
  );
}

/* --- Tab 3: Topics --- */

function TopicsTab({ selectedProduct }: { selectedProduct?: string }) {
  const { data: topics, isLoading } = useQuery<TopicItem[]>({
    queryKey: ["sentiment-topics", selectedProduct],
    queryFn: () => sentimentApi.dashboard.topics(selectedProduct),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-14 bg-surface-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!topics || topics.length === 0) {
    return (
      <div className="text-center py-12 border border-surface-200 rounded-[20px]">
        <Hash className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
        <p className="text-sm text-text-tertiary">No topic data available. Generate a report to see topics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        Topics extracted from sentiment analysis reports.
      </p>
      <div className="border border-surface-200 rounded-[20px] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-100 border-b border-surface-200">
              <th className="text-left px-5 py-3 font-medium text-text-secondary">Topic</th>
              <th className="text-right px-5 py-3 font-medium text-text-secondary">Count</th>
              <th className="text-left px-5 py-3 font-medium text-text-secondary">Sentiment Distribution</th>
              <th className="text-right px-5 py-3 font-medium text-text-secondary">Positive</th>
              <th className="text-right px-5 py-3 font-medium text-text-secondary">Neutral</th>
              <th className="text-right px-5 py-3 font-medium text-text-secondary">Negative</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100">
            {topics.map((topic, i) => (
              <tr key={i} className="hover:bg-surface-100 transition-colors">
                <td className="px-5 py-3.5 font-medium text-text-primary">{topic.topic}</td>
                <td className="px-5 py-3.5 text-right text-text-secondary">{topic.count}</td>
                <td className="px-5 py-3.5">
                  <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-surface-200">
                    <div
                      className="bg-status-success transition-all"
                      style={{ width: `${topic.positive_pct}%` }}
                    />
                    <div
                      className="bg-blue-500 transition-all"
                      style={{ width: `${topic.neutral_pct}%` }}
                    />
                    <div
                      className="bg-status-error transition-all"
                      style={{ width: `${topic.negative_pct}%` }}
                    />
                  </div>
                </td>
                <td className="px-5 py-3.5 text-right text-status-success text-xs font-medium">
                  {topic.positive_pct.toFixed(1)}%
                </td>
                <td className="px-5 py-3.5 text-right text-blue-500 text-xs font-medium">
                  {topic.neutral_pct.toFixed(1)}%
                </td>
                <td className="px-5 py-3.5 text-right text-status-error text-xs font-medium">
                  {topic.negative_pct.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* --- Tab 4: Reports --- */

function ReportsTab({ selectedProduct }: { selectedProduct?: string }) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const { data: latestReport, isLoading: latestLoading } = useQuery<SentimentReport | null>({
    queryKey: ["sentiment-latest-report", selectedProduct],
    queryFn: () => sentimentApi.reports.latest(selectedProduct),
  });

  const params: Record<string, string> = { page: String(page), page_size: "10" };
  if (selectedProduct) params.product_lineup_id = selectedProduct;

  const { data: reportHistory, isLoading: historyLoading } = useQuery<PaginatedResponse<ReportSummary>>({
    queryKey: ["sentiment-report-history", page, selectedProduct],
    queryFn: () => sentimentApi.reports.list(params),
  });

  const generateMutation = useMutation({
    mutationFn: () => sentimentApi.reports.generate({
      product_lineup_id: selectedProduct,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sentiment-latest-report"] });
      queryClient.invalidateQueries({ queryKey: ["sentiment-report-history"] });
      queryClient.invalidateQueries({ queryKey: ["sentiment-topics"] });
      queryClient.invalidateQueries({ queryKey: ["sentiment-pain-points"] });
      toast.success("Report generated successfully");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      {/* Generate Button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          AI-generated sentiment analysis reports.
        </p>
        <button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          className="px-5 py-2 text-sm bg-brand-accent text-text-inverse rounded-xl hover:bg-brand-accent-hover disabled:opacity-60 flex items-center gap-1.5 font-medium transition-colors"
        >
          {generateMutation.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <FileText className="w-3.5 h-3.5" />
          )}
          Generate Report
        </button>
      </div>

      {/* Latest Report */}
      {latestLoading ? (
        <div className="h-64 bg-surface-100 rounded-[20px] animate-pulse" />
      ) : latestReport ? (
        <div className="border border-surface-200 rounded-[20px] p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-semibold text-text-primary">Latest Report</h4>
              <p className="text-xs text-text-tertiary mt-0.5">
                {latestReport.report_type} | {new Date(latestReport.period_start).toLocaleDateString()} - {new Date(latestReport.period_end).toLocaleDateString()} | {latestReport.total_analyzed} comments analyzed
                {latestReport.product_name && ` | ${latestReport.product_name}`}
              </p>
            </div>
            <span className="text-xs text-text-tertiary">
              Generated {formatRelativeDate(latestReport.generated_at)}
            </span>
          </div>
          <div className="prose prose-sm max-w-none text-text-secondary">
            <ReactMarkdown>{latestReport.content}</ReactMarkdown>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 border border-surface-200 rounded-[20px]">
          <FileText className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
          <p className="text-sm text-text-tertiary">No reports generated yet. Click "Generate Report" to create one.</p>
        </div>
      )}

      {/* Report History */}
      <div>
        <h4 className="text-sm font-semibold text-text-primary mb-3">Report History</h4>
        {historyLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 bg-surface-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : reportHistory && reportHistory.items.length > 0 ? (
          <>
            <div className="border border-surface-200 rounded-[20px] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-100 border-b border-surface-200">
                    <th className="text-left px-5 py-3 font-medium text-text-secondary">Date</th>
                    <th className="text-left px-5 py-3 font-medium text-text-secondary">Type</th>
                    <th className="text-left px-5 py-3 font-medium text-text-secondary">Product</th>
                    <th className="text-left px-5 py-3 font-medium text-text-secondary">Summary</th>
                    <th className="text-right px-5 py-3 font-medium text-text-secondary">Analyzed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {reportHistory.items.map((report) => (
                    <tr key={report.id} className="hover:bg-surface-100 transition-colors">
                      <td className="px-5 py-3.5 text-text-tertiary text-xs whitespace-nowrap">
                        {new Date(report.generated_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5 text-text-primary capitalize">{report.report_type}</td>
                      <td className="px-5 py-3.5 text-text-secondary text-xs whitespace-nowrap">
                        {report.product_name || "All Products"}
                      </td>
                      <td className="px-5 py-3.5 text-text-secondary max-w-[400px]">
                        <p className="truncate">{report.summary}</p>
                      </td>
                      <td className="px-5 py-3.5 text-right text-text-secondary">
                        {report.total_analyzed}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {reportHistory.total_pages > 1 && (
              <div className="flex items-center justify-end gap-2 mt-3">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="p-2 text-text-tertiary hover:text-text-primary hover:bg-surface-100 rounded-xl transition-colors disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-text-secondary px-2">
                  Page {page} of {reportHistory.total_pages}
                </span>
                <button
                  onClick={() => setPage(Math.min(reportHistory.total_pages, page + 1))}
                  disabled={page >= reportHistory.total_pages}
                  className="p-2 text-text-tertiary hover:text-text-primary hover:bg-surface-100 rounded-xl transition-colors disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 border border-surface-200 rounded-[20px]">
            <FileText className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
            <p className="text-sm text-text-tertiary">No report history yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* --- Tab 5: Settings --- */

function SettingsTab() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ platform: "facebook", account_name: "", account_id: "" });

  const { data: accounts, isLoading: accountsLoading } = useQuery<SocialAccount[]>({
    queryKey: ["sentiment-accounts"],
    queryFn: sentimentApi.accounts.list,
  });

  const { data: schedulerStatus, isLoading: statusLoading } = useQuery({
    queryKey: ["sentiment-scheduler-status"],
    queryFn: sentimentApi.scheduler.status,
    refetchInterval: 10000,
  });

  const createMutation = useMutation({
    mutationFn: (data: { platform: string; account_name: string; account_id: string }) =>
      sentimentApi.accounts.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sentiment-accounts"] });
      setShowCreate(false);
      setForm({ platform: "facebook", account_name: "", account_id: "" });
      toast.success("Account added");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SocialAccount> }) =>
      sentimentApi.accounts.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sentiment-accounts"] });
      setEditingId(null);
      toast.success("Account updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => sentimentApi.accounts.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sentiment-accounts"] });
      toast.success("Account deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const pauseMutation = useMutation({
    mutationFn: sentimentApi.scheduler.pause,
    onSuccess: (data) => {
      queryClient.setQueryData(["sentiment-scheduler-status"], data);
      toast.success("Scheduler paused");
    },
    onError: (err: Error) => toast.error(`Failed to pause: ${err.message}`),
  });

  const resumeMutation = useMutation({
    mutationFn: sentimentApi.scheduler.resume,
    onSuccess: (data) => {
      queryClient.setQueryData(["sentiment-scheduler-status"], data);
      toast.success("Scheduler resumed");
    },
    onError: (err: Error) => toast.error(`Failed to resume: ${err.message}`),
  });

  const triggerMutation = useMutation({
    mutationFn: sentimentApi.scraping.trigger,
    onSuccess: () => {
      toast.success("Daily scrape triggered!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const triggerWeeklyMutation = useMutation({
    mutationFn: sentimentApi.scraping.triggerWeekly,
    onSuccess: () => {
      toast.success("Weekly report generation triggered!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const { data: scrapeProgress } = useQuery<ScrapeProgress>({
    queryKey: ["scrape-progress"],
    queryFn: sentimentApi.scraping.progress,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "running" ? 2000 : false;
    },
  });

  const isScraping = scrapeProgress?.status === "running";

  const isSchedulerRunning = schedulerStatus?.is_running;

  return (
    <div className="space-y-6">
      {/* Social Accounts */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-semibold text-text-primary">Social Accounts</h4>
            <p className="text-xs text-text-tertiary mt-0.5">Manage social media accounts for comment scraping.</p>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="px-4 py-2 text-sm bg-brand-accent text-text-inverse rounded-xl hover:bg-brand-accent-hover transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add Account
          </button>
        </div>

        {/* Create Form */}
        {showCreate && (
          <div className="rounded-2xl border border-surface-200 bg-surface-50 p-6 space-y-5 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
                  Platform
                </label>
                <select
                  value={form.platform}
                  onChange={(e) => setForm({ ...form, platform: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-surface-100 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent text-text-primary"
                >
                  <option value="facebook">Facebook</option>
                  <option value="instagram">Instagram</option>
                  <option value="twitter">Twitter</option>
                  <option value="youtube">YouTube</option>
                  <option value="tiktok">TikTok</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
                  Account Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mitsubishi Motors ID"
                  value={form.account_name}
                  onChange={(e) => setForm({ ...form, account_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-surface-100 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent text-text-primary placeholder:text-text-tertiary"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
                  Account ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. @mitsubishimotorsid"
                  value={form.account_id}
                  onChange={(e) => setForm({ ...form, account_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-surface-100 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent text-text-primary placeholder:text-text-tertiary"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-100">
              <button
                onClick={() => {
                  setShowCreate(false);
                  setForm({ platform: "facebook", account_name: "", account_id: "" });
                }}
                className="px-4 py-2 text-sm border border-surface-200 rounded-xl hover:bg-surface-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => createMutation.mutate(form)}
                disabled={!form.account_name || !form.account_id || createMutation.isPending}
                className="px-5 py-2 text-sm bg-brand-accent text-text-inverse rounded-xl hover:bg-brand-accent-hover disabled:opacity-60 flex items-center gap-1.5 font-medium"
              >
                {createMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                Add Account
              </button>
            </div>
          </div>
        )}

        {/* Accounts Table */}
        {accountsLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 bg-surface-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : accounts && accounts.length > 0 ? (
          <div className="border border-surface-200 rounded-[20px] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-100 border-b border-surface-200">
                  <th className="text-left px-5 py-3 font-medium text-text-secondary">Platform</th>
                  <th className="text-left px-5 py-3 font-medium text-text-secondary">Account Name</th>
                  <th className="text-left px-5 py-3 font-medium text-text-secondary">Account ID</th>
                  <th className="text-center px-5 py-3 font-medium text-text-secondary">Status</th>
                  <th className="text-right px-5 py-3 font-medium text-text-secondary">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {accounts.map((account) => (
                  <AccountRow
                    key={account.id}
                    account={account}
                    isEditing={editingId === account.id}
                    onEdit={() => setEditingId(account.id)}
                    onCancelEdit={() => setEditingId(null)}
                    onSave={(data) => updateMutation.mutate({ id: account.id, data })}
                    onToggle={() =>
                      updateMutation.mutate({
                        id: account.id,
                        data: { is_active: !account.is_active },
                      })
                    }
                    onDelete={() => {
                      if (confirm(`Delete account "${account.account_name}"?`)) {
                        deleteMutation.mutate(account.id);
                      }
                    }}
                    isSaving={updateMutation.isPending}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 border border-surface-200 rounded-[20px]">
            <MessageSquare className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
            <p className="text-sm text-text-tertiary">No social accounts configured yet.</p>
          </div>
        )}
      </div>

      {/* Scheduler Status */}
      <div>
        <h4 className="text-sm font-semibold text-text-primary mb-3">Scraping Scheduler</h4>
        <div className="flex items-center gap-4 p-5 border border-surface-200 rounded-xl bg-surface-50">
          <div className="flex-1">
            <div className="flex items-center gap-2.5 mb-1">
              <span className="relative flex h-2.5 w-2.5">
                <span
                  className={cn(
                    "absolute inline-flex h-full w-full rounded-full opacity-75",
                    isSchedulerRunning ? "bg-status-success animate-ping" : "hidden"
                  )}
                />
                <span
                  className={cn(
                    "relative inline-flex h-2.5 w-2.5 rounded-full",
                    isSchedulerRunning ? "bg-status-success" : "bg-surface-300"
                  )}
                />
              </span>
              <span className="text-sm font-medium text-text-primary">
                {statusLoading
                  ? "Loading..."
                  : isSchedulerRunning
                  ? "Running"
                  : "Paused"}
              </span>
            </div>
            {schedulerStatus?.next_run_time && (
              <p className="text-xs text-text-tertiary ml-5">
                Daily next run: {new Date(schedulerStatus.next_run_time).toLocaleString("id-ID")}
              </p>
            )}
            {schedulerStatus?.weekly_next_run_time && (
              <p className="text-xs text-text-tertiary ml-5">
                Weekly next run: {new Date(schedulerStatus.weekly_next_run_time).toLocaleString("id-ID")}
              </p>
            )}
            {schedulerStatus?.cron_expression && (
              <p className="text-xs text-text-tertiary ml-5">
                Schedule: {schedulerStatus.cron_expression}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {isSchedulerRunning ? (
              <button
                onClick={() => pauseMutation.mutate()}
                disabled={pauseMutation.isPending}
                className="px-4 py-2 text-sm border border-surface-200 rounded-xl hover:bg-surface-100 flex items-center gap-1.5 transition-colors disabled:opacity-60"
              >
                {pauseMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Pause className="w-3.5 h-3.5" />
                )}
                Pause
              </button>
            ) : (
              <button
                onClick={() => resumeMutation.mutate()}
                disabled={resumeMutation.isPending}
                className="px-4 py-2 text-sm bg-status-success text-white rounded-xl hover:opacity-90 flex items-center gap-1.5 transition-colors disabled:opacity-60"
              >
                {resumeMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                Resume
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Trigger Scrape */}
      <div>
        <h4 className="text-sm font-semibold text-text-primary mb-3">Manual Trigger</h4>
        <div className="p-5 border border-surface-200 rounded-xl bg-surface-50 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-sm text-text-secondary">
                Trigger an immediate scrape or weekly report generation.
              </p>
            </div>
            <button
              onClick={() => {
                triggerMutation.mutate();
                queryClient.invalidateQueries({ queryKey: ["scrape-progress"] });
              }}
              disabled={triggerMutation.isPending || isScraping}
              className="px-5 py-2.5 text-sm bg-brand-accent text-text-inverse rounded-xl hover:bg-brand-accent-hover disabled:opacity-60 flex items-center gap-1.5 transition-colors"
            >
              {isScraping ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              {isScraping ? "Running..." : "Daily Scrape"}
            </button>
            <button
              onClick={() => triggerWeeklyMutation.mutate()}
              disabled={triggerWeeklyMutation.isPending}
              className="px-5 py-2.5 text-sm border border-brand-accent text-brand-accent rounded-xl hover:bg-brand-accent/10 disabled:opacity-60 flex items-center gap-1.5 transition-colors"
            >
              {triggerWeeklyMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Zap className="w-3.5 h-3.5" />
              )}
              Weekly Report
            </button>
          </div>

          {/* Scrape Progress Panel */}
          {scrapeProgress && scrapeProgress.status !== "idle" && (
            <div className="border border-surface-200 rounded-xl overflow-hidden">
              {/* Status header */}
              <div className={cn(
                "flex items-center gap-2.5 px-4 py-3",
                scrapeProgress.status === "running" && "bg-blue-500/10 border-b border-surface-200",
                scrapeProgress.status === "completed" && "bg-status-success-light border-b border-surface-200",
                scrapeProgress.status === "failed" && "bg-status-error-light border-b border-surface-200",
              )}>
                {scrapeProgress.status === "running" && <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />}
                {scrapeProgress.status === "completed" && <Check className="w-4 h-4 text-status-success flex-shrink-0" />}
                {scrapeProgress.status === "failed" && <AlertTriangle className="w-4 h-4 text-status-error flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-text-primary capitalize">{scrapeProgress.status}</span>
                  {scrapeProgress.current_phase && (
                    <span className="text-xs text-text-tertiary ml-2">- {scrapeProgress.current_phase}</span>
                  )}
                </div>
                {scrapeProgress.started_at && (
                  <span className="text-[10px] text-text-tertiary flex-shrink-0">
                    {new Date(scrapeProgress.started_at).toLocaleTimeString("id-ID")}
                    {scrapeProgress.finished_at && ` - ${new Date(scrapeProgress.finished_at).toLocaleTimeString("id-ID")}`}
                  </span>
                )}
              </div>

              {/* Log entries */}
              <div className="max-h-[240px] overflow-y-auto">
                {scrapeProgress.logs.map((log, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-start gap-3 px-4 py-2 text-xs",
                      i < scrapeProgress.logs.length - 1 && "border-b border-surface-50"
                    )}
                  >
                    <span className="text-text-tertiary flex-shrink-0 w-16 text-[10px] pt-0.5">
                      {new Date(log.timestamp).toLocaleTimeString("id-ID")}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-text-secondary">{log.message}</span>
                      {log.counts && (
                        <div className="flex gap-3 mt-1 flex-wrap">
                          {Object.entries(log.counts).map(([key, val]) => (
                            <span key={key} className="text-[10px] font-medium px-1.5 py-0.5 bg-surface-100 rounded text-text-tertiary">
                              {key.replace(/_/g, " ")}: <span className="text-text-primary">{val}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Error detail */}
              {scrapeProgress.error && (
                <div className="px-4 py-3 border-t border-surface-200 bg-status-error-light">
                  <p className="text-xs text-status-error font-mono break-all">{scrapeProgress.error}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Run History */}
      <ScrapeHistorySection />

      {/* Product Keyword Mappings */}
      <ProductMappingsSection />

      {/* Cleansing Rules */}
      <CleansingRulesSection />
    </div>
  );
}

/* --- Scrape Run History Section --- */

function ScrapeHistorySection() {
  const { data: logs, isLoading } = useQuery<ScrapeLogItem[]>({
    queryKey: ["scrape-logs"],
    queryFn: () => sentimentApi.scraping.logs(10),
  });

  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-text-tertiary" />
        <h4 className="text-sm font-semibold text-text-primary">Run History</h4>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-surface-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : logs && logs.length > 0 ? (
        <div className="border border-surface-200 rounded-[20px] overflow-hidden divide-y divide-surface-100">
          {logs.map((log) => {
            const duration = Math.round(
              (new Date(log.finished_at).getTime() - new Date(log.started_at).getTime()) / 1000
            );
            const isExpanded = expandedId === log.id;
            return (
              <div key={log.id}>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-50 transition-colors text-left"
                >
                  {log.status === "completed" ? (
                    <Check className="w-4 h-4 text-status-success flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-status-error flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-text-primary">
                      {new Date(log.started_at).toLocaleString("id-ID")}
                    </span>
                    <div className="flex gap-2 mt-0.5 flex-wrap">
                      {Object.entries(log.summary).map(([key, val]) => (
                        <span key={key} className="text-[10px] px-1.5 py-0.5 bg-surface-100 rounded text-text-tertiary">
                          {key.replace(/_/g, " ")}: <span className="text-text-primary font-medium">{val}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="text-xs text-text-tertiary flex-shrink-0">
                    {duration < 60 ? `${duration}s` : `${Math.floor(duration / 60)}m ${duration % 60}s`}
                  </span>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 text-text-tertiary transition-transform flex-shrink-0",
                      isExpanded && "rotate-180"
                    )}
                  />
                </button>
                {isExpanded && (
                  <div className="border-t border-surface-100 bg-surface-50 max-h-[200px] overflow-y-auto">
                    {log.error && (
                      <div className="px-4 py-2 bg-status-error-light">
                        <p className="text-xs text-status-error font-mono break-all">{log.error}</p>
                      </div>
                    )}
                    {log.log_entries.map((entry, i) => (
                      <div key={i} className="flex items-start gap-3 px-4 py-1.5 text-xs">
                        <span className="text-text-tertiary flex-shrink-0 w-16 text-[10px] pt-0.5">
                          {new Date(entry.timestamp).toLocaleTimeString("id-ID")}
                        </span>
                        <span className="text-text-secondary">{entry.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-6 border border-surface-200 rounded-[20px]">
          <p className="text-sm text-text-tertiary">No scrape runs recorded yet.</p>
        </div>
      )}
    </div>
  );
}

/* --- Account Row (inline edit) --- */

function AccountRow({
  account,
  isEditing,
  onEdit,
  onCancelEdit,
  onSave,
  onToggle,
  onDelete,
  isSaving,
}: {
  account: SocialAccount;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (data: Partial<SocialAccount>) => void;
  onToggle: () => void;
  onDelete: () => void;
  isSaving: boolean;
}) {
  const [accountName, setAccountName] = useState(account.account_name);
  const [accountId, setAccountId] = useState(account.account_id);

  if (isEditing) {
    return (
      <tr className="bg-surface-50">
        <td className="px-5 py-3.5">
          <PlatformBadge platform={account.platform} />
        </td>
        <td className="px-5 py-3.5">
          <input
            type="text"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            className="w-full px-2.5 py-1.5 text-sm bg-surface-100 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent/20 text-text-primary"
          />
        </td>
        <td className="px-5 py-3.5">
          <input
            type="text"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="w-full px-2.5 py-1.5 text-sm bg-surface-100 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent/20 text-text-primary"
          />
        </td>
        <td className="px-5 py-3.5 text-center">
          <button
            onClick={onToggle}
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
              account.is_active ? "bg-status-success" : "bg-surface-200"
            )}
          >
            <span
              className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                account.is_active ? "translate-x-6" : "translate-x-1"
              )}
            />
          </button>
        </td>
        <td className="px-5 py-3.5 text-right">
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => onSave({ account_name: accountName, account_id: accountId })}
              disabled={isSaving}
              className="p-1.5 text-status-success hover:bg-status-success-light rounded-lg transition-colors disabled:opacity-60"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onCancelEdit}
              className="p-1.5 text-text-tertiary hover:text-text-primary hover:bg-surface-100 rounded-lg transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-surface-100 transition-colors">
      <td className="px-5 py-3.5">
        <PlatformBadge platform={account.platform} />
      </td>
      <td className="px-5 py-3.5 font-medium text-text-primary">{account.account_name}</td>
      <td className="px-5 py-3.5 text-text-secondary">{account.account_id}</td>
      <td className="px-5 py-3.5 text-center">
        <button
          onClick={onToggle}
          className={cn(
            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
            account.is_active ? "bg-status-success" : "bg-surface-200"
          )}
        >
          <span
            className={cn(
              "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
              account.is_active ? "translate-x-6" : "translate-x-1"
            )}
          />
        </button>
      </td>
      <td className="px-5 py-3.5 text-right">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={onEdit}
            className="p-2 text-text-tertiary hover:text-text-primary hover:bg-surface-100 rounded-xl transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-text-tertiary hover:text-status-error hover:bg-status-error-light rounded-xl transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

/* --- Product Keyword Mappings Section --- */

function ProductMappingsSection() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKeywords, setEditKeywords] = useState("");

  const { data: mappings, isLoading } = useQuery<ProductMapping[]>({
    queryKey: ["sentiment-product-mappings"],
    queryFn: sentimentApi.products.mappings.list,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, keywords }: { id: string; keywords: string[] }) =>
      sentimentApi.products.mappings.update(id, { keywords }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sentiment-product-mappings"] });
      setEditingId(null);
      toast.success("Keywords updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      sentimentApi.products.mappings.update(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sentiment-product-mappings"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Package className="w-4 h-4 text-text-tertiary" />
        <h4 className="text-sm font-semibold text-text-primary">Product Keyword Mappings</h4>
      </div>
      <p className="text-xs text-text-tertiary mb-4">
        Keywords used to detect which product a comment/post is about. Separate multiple keywords with commas.
      </p>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 bg-surface-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : mappings && mappings.length > 0 ? (
        <div className="border border-surface-200 rounded-[20px] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-100 border-b border-surface-200">
                <th className="text-left px-5 py-3 font-medium text-text-secondary">Product</th>
                <th className="text-left px-5 py-3 font-medium text-text-secondary">Keywords</th>
                <th className="text-center px-5 py-3 font-medium text-text-secondary">Active</th>
                <th className="text-right px-5 py-3 font-medium text-text-secondary">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {mappings.map((mapping) => (
                <tr key={mapping.id} className="hover:bg-surface-100 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-text-primary whitespace-nowrap">
                    {mapping.product_name || mapping.product_lineup_id}
                  </td>
                  <td className="px-5 py-3.5">
                    {editingId === mapping.id ? (
                      <input
                        type="text"
                        value={editKeywords}
                        onChange={(e) => setEditKeywords(e.target.value)}
                        placeholder="keyword1, keyword2, ..."
                        className="w-full px-2.5 py-1.5 text-sm bg-surface-100 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent/20 text-text-primary"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            updateMutation.mutate({
                              id: mapping.id,
                              keywords: editKeywords.split(",").map((k) => k.trim()).filter(Boolean),
                            });
                          }
                          if (e.key === "Escape") setEditingId(null);
                        }}
                      />
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {mapping.keywords.map((kw, i) => (
                          <span key={i} className="px-2 py-0.5 text-xs bg-surface-100 text-text-secondary rounded-md">
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <button
                      onClick={() => toggleMutation.mutate({ id: mapping.id, is_active: !mapping.is_active })}
                      className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                        mapping.is_active ? "bg-status-success" : "bg-surface-200"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                          mapping.is_active ? "translate-x-6" : "translate-x-1"
                        )}
                      />
                    </button>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {editingId === mapping.id ? (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            updateMutation.mutate({
                              id: mapping.id,
                              keywords: editKeywords.split(",").map((k) => k.trim()).filter(Boolean),
                            });
                          }}
                          disabled={updateMutation.isPending}
                          className="p-1.5 text-status-success hover:bg-status-success-light rounded-lg transition-colors disabled:opacity-60"
                        >
                          {updateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1.5 text-text-tertiary hover:text-text-primary hover:bg-surface-100 rounded-lg transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingId(mapping.id);
                          setEditKeywords(mapping.keywords.join(", "));
                        }}
                        className="p-2 text-text-tertiary hover:text-text-primary hover:bg-surface-100 rounded-xl transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 border border-surface-200 rounded-[20px]">
          <Package className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
          <p className="text-sm text-text-tertiary">No product mappings configured. Run migration to seed defaults.</p>
        </div>
      )}
    </div>
  );
}

/* --- Cleansing Rules Section --- */

function CleansingRulesSection() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ pattern: "", description: "" });
  const [createForm, setCreateForm] = useState({ rule_type: "exclusion_keyword", pattern: "", description: "" });
  const [previewText, setPreviewText] = useState("");

  const { data: rules, isLoading } = useQuery<CleansingRule[]>({
    queryKey: ["sentiment-cleansing-rules"],
    queryFn: sentimentApi.cleansing.rules.list,
  });

  const createMutation = useMutation({
    mutationFn: (data: { rule_type: string; pattern: string; description?: string }) =>
      sentimentApi.cleansing.rules.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sentiment-cleansing-rules"] });
      setShowCreate(false);
      setCreateForm({ rule_type: "exclusion_keyword", pattern: "", description: "" });
      toast.success("Rule added");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { pattern?: string; description?: string } }) =>
      sentimentApi.cleansing.rules.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sentiment-cleansing-rules"] });
      setEditingId(null);
      toast.success("Rule updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      sentimentApi.cleansing.rules.update(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sentiment-cleansing-rules"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => sentimentApi.cleansing.rules.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sentiment-cleansing-rules"] });
      toast.success("Rule deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const previewMutation = useMutation({
    mutationFn: (text: string) => sentimentApi.cleansing.preview(text),
  });

  const ruleTypeLabels: Record<string, string> = {
    exclusion_keyword: "Keyword",
    exclusion_regex: "Regex",
    min_length: "Min Length",
    max_emoji_ratio: "Max Emoji",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-text-tertiary" />
          <h4 className="text-sm font-semibold text-text-primary">Data Cleansing Rules</h4>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 text-sm bg-brand-accent text-text-inverse rounded-xl hover:bg-brand-accent-hover transition-colors flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Add Rule
        </button>
      </div>
      <p className="text-xs text-text-tertiary mb-4">
        Rules to filter and clean comments before sentiment analysis.
      </p>

      {/* Preview */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 relative">
          <Eye className="w-4 h-4 text-text-tertiary absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value)}
            placeholder="Test cleansing: paste a comment here..."
            className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-surface-100 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/20 text-text-primary placeholder:text-text-tertiary"
            onKeyDown={(e) => {
              if (e.key === "Enter" && previewText.trim()) {
                previewMutation.mutate(previewText);
              }
            }}
          />
        </div>
        <button
          onClick={() => previewText.trim() && previewMutation.mutate(previewText)}
          disabled={!previewText.trim() || previewMutation.isPending}
          className="px-4 py-2.5 text-sm border border-surface-200 rounded-xl hover:bg-surface-100 flex items-center gap-1.5 transition-colors disabled:opacity-60"
        >
          {previewMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
          Preview
        </button>
      </div>

      {/* Preview Result */}
      {previewMutation.data && (
        <div className="mb-4 p-4 border border-surface-200 rounded-xl bg-surface-50 space-y-2">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-text-tertiary font-medium">Cleaned:</span>
              <p className="text-text-secondary mt-1">{previewMutation.data.cleaned || "(empty)"}</p>
            </div>
            <div className="space-y-1">
              <p>
                <span className="text-text-tertiary font-medium">Excluded:</span>{" "}
                <span className={previewMutation.data.is_excluded ? "text-status-error font-semibold" : "text-status-success"}>
                  {previewMutation.data.is_excluded ? "Yes" : "No"}
                </span>
              </p>
              {previewMutation.data.exclusion_reason && (
                <p>
                  <span className="text-text-tertiary font-medium">Reason:</span>{" "}
                  <span className="text-text-secondary">{previewMutation.data.exclusion_reason}</span>
                </p>
              )}
              {previewMutation.data.detected_product && (
                <p>
                  <span className="text-text-tertiary font-medium">Product:</span>{" "}
                  <span className="text-text-secondary">{previewMutation.data.detected_product}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Form */}
      {showCreate && (
        <div className="rounded-2xl border border-surface-200 bg-surface-50 p-5 space-y-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
                Rule Type
              </label>
              <select
                value={createForm.rule_type}
                onChange={(e) => setCreateForm({ ...createForm, rule_type: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm bg-surface-100 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/20 text-text-primary"
              >
                <option value="exclusion_keyword">Exclusion Keyword</option>
                <option value="exclusion_regex">Exclusion Regex</option>
                <option value="min_length">Min Length</option>
                <option value="max_emoji_ratio">Max Emoji Ratio</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
                Pattern / Value
              </label>
              <input
                type="text"
                placeholder={createForm.rule_type === "min_length" ? "e.g. 3" : "e.g. sholawat"}
                value={createForm.pattern}
                onChange={(e) => setCreateForm({ ...createForm, pattern: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm bg-surface-100 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/20 text-text-primary placeholder:text-text-tertiary"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
                Description
              </label>
              <input
                type="text"
                placeholder="Optional description"
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm bg-surface-100 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/20 text-text-primary placeholder:text-text-tertiary"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-100">
            <button
              onClick={() => {
                setShowCreate(false);
                setCreateForm({ rule_type: "exclusion_keyword", pattern: "", description: "" });
              }}
              className="px-4 py-2 text-sm border border-surface-200 rounded-xl hover:bg-surface-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => createMutation.mutate({
                rule_type: createForm.rule_type,
                pattern: createForm.pattern,
                description: createForm.description || undefined,
              })}
              disabled={!createForm.pattern || createMutation.isPending}
              className="px-5 py-2 text-sm bg-brand-accent text-text-inverse rounded-xl hover:bg-brand-accent-hover disabled:opacity-60 flex items-center gap-1.5 font-medium"
            >
              {createMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Add Rule
            </button>
          </div>
        </div>
      )}

      {/* Rules Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 bg-surface-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : rules && rules.length > 0 ? (
        <div className="border border-surface-200 rounded-[20px] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-100 border-b border-surface-200">
                <th className="text-left px-5 py-3 font-medium text-text-secondary">Type</th>
                <th className="text-left px-5 py-3 font-medium text-text-secondary">Pattern</th>
                <th className="text-left px-5 py-3 font-medium text-text-secondary">Description</th>
                <th className="text-center px-5 py-3 font-medium text-text-secondary">Active</th>
                <th className="text-right px-5 py-3 font-medium text-text-secondary">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {rules.map((rule) => (
                <tr key={rule.id} className="hover:bg-surface-100 transition-colors">
                  <td className="px-5 py-3.5">
                    <span className="px-2 py-0.5 text-xs bg-surface-100 text-text-secondary rounded-md font-medium">
                      {ruleTypeLabels[rule.rule_type] || rule.rule_type}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {editingId === rule.id ? (
                      <input
                        type="text"
                        value={editForm.pattern}
                        onChange={(e) => setEditForm({ ...editForm, pattern: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-sm bg-surface-100 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent/20 text-text-primary"
                      />
                    ) : (
                      <code className="text-xs text-text-secondary bg-surface-100 px-1.5 py-0.5 rounded">
                        {rule.pattern}
                      </code>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-text-tertiary text-xs">
                    {editingId === rule.id ? (
                      <input
                        type="text"
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-sm bg-surface-100 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent/20 text-text-primary"
                      />
                    ) : (
                      rule.description || "--"
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <button
                      onClick={() => toggleMutation.mutate({ id: rule.id, is_active: !rule.is_active })}
                      className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                        rule.is_active ? "bg-status-success" : "bg-surface-200"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                          rule.is_active ? "translate-x-6" : "translate-x-1"
                        )}
                      />
                    </button>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {editingId === rule.id ? (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            updateMutation.mutate({
                              id: rule.id,
                              data: { pattern: editForm.pattern, description: editForm.description },
                            });
                          }}
                          disabled={updateMutation.isPending}
                          className="p-1.5 text-status-success hover:bg-status-success-light rounded-lg transition-colors disabled:opacity-60"
                        >
                          {updateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1.5 text-text-tertiary hover:text-text-primary hover:bg-surface-100 rounded-lg transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditingId(rule.id);
                            setEditForm({ pattern: rule.pattern, description: rule.description || "" });
                          }}
                          className="p-2 text-text-tertiary hover:text-text-primary hover:bg-surface-100 rounded-xl transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete rule "${rule.pattern}"?`)) {
                              deleteMutation.mutate(rule.id);
                            }
                          }}
                          className="p-2 text-text-tertiary hover:text-status-error hover:bg-status-error-light rounded-xl transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 border border-surface-200 rounded-[20px]">
          <Shield className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
          <p className="text-sm text-text-tertiary">No cleansing rules configured. Run migration to seed defaults.</p>
        </div>
      )}
    </div>
  );
}
