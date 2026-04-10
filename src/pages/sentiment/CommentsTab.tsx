import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ReactECharts from "echarts-for-react";
import {
  MessageSquare,
  Trash2,
  X,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Download,
  RefreshCw,
  WrapText,
} from "lucide-react";
import {
  sentimentApi,
  type SentimentStats,
  type PlatformBreakdown,
  type ProductBreakdownItem,
  type SentimentComment,
  type PaginatedResponse,
  type ScrapeProgress,
} from "@/lib/sentiment-api-client";
import { cn, formatRelativeDate } from "@/lib/utils";
import toast from "react-hot-toast";
import { SentimentBadge, PlatformBadge } from "./SentimentPage";
import { CommentDetailModal } from "./CommentDetailModal";

function SortHeader({
  field,
  label,
  align,
  sortBy,
  sortOrder,
  onSort,
}: {
  field: string;
  label: string;
  align: "left" | "right";
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSort: (field: string) => void;
}) {
  const isActive = sortBy === field;
  return (
    <th
      className={cn(
        "px-5 py-3 font-medium select-none cursor-pointer transition-colors hover:text-text-primary",
        align === "right" ? "text-right" : "text-left",
        isActive ? "text-brand-accent" : "text-text-secondary"
      )}
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive ? (
          sortOrder === "asc" ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-40" />
        )}
      </span>
    </th>
  );
}

export function CommentsTab({ selectedProduct }: { selectedProduct?: string }) {
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState("");
  const [sentiment, setSentiment] = useState("");
  const [localProduct, setLocalProduct] = useState<string>("");
  const [localProductName, setLocalProductName] = useState("");
  const [page, setPage] = useState(1);
  const [selectedComment, setSelectedComment] = useState<SentimentComment | null>(null);
  const [editingSentimentId, setEditingSentimentId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [wrapComments, setWrapComments] = useState(false);
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
    sort_by: sortBy,
    sort_order: sortOrder,
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

  const overrideMutation = useMutation({
    mutationFn: ({ id, sentiment }: { id: string; sentiment: string }) => {
      const userEmail = localStorage.getItem("user_email") || "unknown";
      return sentimentApi.comments.overrideSentiment(id, sentiment, userEmail);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sentiment-comments"] });
      queryClient.invalidateQueries({ queryKey: ["sentiment-stats"] });
      toast.success("Sentiment updated");
      setEditingSentimentId(null);
    },
    onError: () => {
      toast.error("Failed to update sentiment");
    },
  });

  const exportMutation = useMutation({
    mutationFn: sentimentApi.comments.exportCsv,
    onError: () => {
      toast.error("Failed to export CSV");
    },
  });

  const reclassifyMutation = useMutation({
    mutationFn: sentimentApi.scraping.reclassify,
    onSuccess: () => {
      toast.success("Sentiment reclassification started");
      // Optimistically show running state immediately
      queryClient.setQueryData<ScrapeProgress>(["reclassify-progress"], (old) => ({
        status: "running",
        current_phase: "Starting...",
        logs: [],
        started_at: new Date().toISOString(),
        finished_at: null,
        error: null,
        ...(old?.status === "running" ? old : {}),
      }));
      queryClient.invalidateQueries({ queryKey: ["reclassify-progress"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to start reclassification");
    },
  });

  const { data: reclassifyProgress } = useQuery<ScrapeProgress>({
    queryKey: ["reclassify-progress"],
    queryFn: sentimentApi.scraping.progress,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "running") return 2000;
      if (status === "completed" || status === "failed") {
        // Invalidate comments data when done
        queryClient.invalidateQueries({ queryKey: ["sentiment-comments"] });
        queryClient.invalidateQueries({ queryKey: ["sentiment-stats"] });
        return false;
      }
      return false;
    },
  });

  const isReclassifying = reclassifyProgress?.status === "running";

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReclassifyConfirm, setShowReclassifyConfirm] = useState(false);

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
    tooltip: { trigger: "item" as const, formatter: "{b}: {c} ({d}%)", confine: true },
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
    tooltip: { trigger: "axis" as const, axisPointer: { type: "shadow" as const }, confine: true },
    legend: { data: ["Positive", "Neutral", "Negative"], bottom: 0, textStyle: { color: "#94a3b8" } },
    grid: { top: 10, right: 10, bottom: 40, left: 120, containLabel: true },
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
    tooltip: { trigger: "axis" as const, axisPointer: { type: "shadow" as const }, confine: true },
    legend: { data: ["Positive", "Neutral", "Negative"], bottom: 0, textStyle: { color: "#94a3b8" } },
    grid: { top: 10, right: 10, bottom: 40, left: 100, containLabel: true },
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
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setShowReclassifyConfirm(true)}
              disabled={isReclassifying || reclassifyMutation.isPending}
              className="px-3.5 py-2.5 text-sm font-medium text-purple-400 bg-purple-400/10 border border-purple-400/20 rounded-xl hover:bg-purple-400/20 transition-colors disabled:opacity-50"
            >
              {isReclassifying ? (
                <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Reclassifying...</span>
              ) : (
                <span className="flex items-center gap-2"><RefreshCw className="w-4 h-4" />Re-run Sentiment</span>
              )}
            </button>
            <button
              onClick={() => exportMutation.mutate()}
              disabled={exportMutation.isPending}
              className="px-3.5 py-2.5 text-sm font-medium text-brand-accent bg-brand-accent/10 border border-brand-accent/20 rounded-xl hover:bg-brand-accent/20 transition-colors disabled:opacity-50"
            >
              {exportMutation.isPending ? (
                <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Exporting...</span>
              ) : (
                <span className="flex items-center gap-2"><Download className="w-4 h-4" />Export CSV</span>
              )}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deleteAllMutation.isPending}
              className="px-3.5 py-2.5 text-sm font-medium text-status-error bg-status-error-light border border-status-error/20 rounded-xl hover:bg-status-error hover:text-white transition-colors disabled:opacity-50"
            >
              {deleteAllMutation.isPending ? (
                <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Deleting...</span>
              ) : (
                <span className="flex items-center gap-2"><Trash2 className="w-4 h-4" />Delete All</span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Charts */}
      <div className={cn("grid grid-cols-1 gap-4", gridCols)}>
        {donutOption && (
          <div className="bg-surface-white rounded-[20px] shadow-card p-6 border border-surface-100 overflow-hidden">
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
          <div className="bg-surface-white rounded-[20px] shadow-card p-6 border border-surface-100 overflow-hidden">
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
          <div className="bg-surface-white rounded-[20px] shadow-card p-6 border border-surface-100 overflow-hidden">
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

      {/* Reclassify Confirmation */}
      {showReclassifyConfirm && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowReclassifyConfirm(false)}
        >
          <div
            className="bg-surface-white border border-surface-200 rounded-[20px] max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-400/10 rounded-xl">
                <RefreshCw className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary">Re-run Sentiment Analysis</h3>
            </div>
            <p className="text-sm text-text-secondary mb-2">
              This will re-classify all comments using the current model. Manual overrides will be preserved.
            </p>
            <p className="text-xs text-text-tertiary mb-6">
              This may take a few minutes depending on the number of comments.
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setShowReclassifyConfirm(false)}
                className="px-4 py-2.5 text-sm font-medium text-text-secondary bg-surface-100 border border-surface-200 rounded-xl hover:bg-surface-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  reclassifyMutation.mutate();
                  setShowReclassifyConfirm(false);
                }}
                className="px-4 py-2.5 text-sm font-medium text-white bg-purple-600 rounded-xl hover:bg-purple-700 transition-colors"
              >
                Re-run
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reclassify Progress */}
      {reclassifyProgress && reclassifyProgress.status !== "idle" && (
        <div className={cn(
          "border rounded-[20px] p-4",
          reclassifyProgress.status === "running" && "border-purple-400/30 bg-purple-400/5",
          reclassifyProgress.status === "completed" && "border-green-400/30 bg-green-400/5",
          reclassifyProgress.status === "failed" && "border-red-400/30 bg-red-400/5",
        )}>
          <div className="flex items-center gap-2 mb-2">
            {reclassifyProgress.status === "running" && <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />}
            {reclassifyProgress.status === "completed" && <RefreshCw className="w-4 h-4 text-green-400" />}
            {reclassifyProgress.status === "failed" && <AlertTriangle className="w-4 h-4 text-red-400" />}
            <span className="text-sm font-medium text-text-primary">
              {reclassifyProgress.status === "completed"
                ? `Data refreshed per ${reclassifyProgress.finished_at ? new Date(reclassifyProgress.finished_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`
                : reclassifyProgress.status === "running"
                ? "Refreshing data..."
                : "Data refresh failed"}
            </span>
            {reclassifyProgress.current_phase && reclassifyProgress.status === "running" && (
              <span className="text-xs text-text-tertiary">- {reclassifyProgress.current_phase}</span>
            )}
          </div>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {reclassifyProgress.logs.map((log, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className="text-text-tertiary whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className="text-text-secondary">{log.message}</span>
                {log.counts && Object.entries(log.counts).map(([k, v]) => (
                  <span key={k} className="px-1.5 py-0.5 bg-surface-200 rounded text-text-tertiary">
                    {k}: {v}
                  </span>
                ))}
              </div>
            ))}
          </div>
          {reclassifyProgress.error && (
            <p className="mt-2 text-xs text-red-400">{reclassifyProgress.error}</p>
          )}
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
                    <th className="text-left px-5 py-3 font-medium text-text-secondary">
                      <div className="flex items-center gap-2">
                        Comment
                        <button
                          onClick={() => setWrapComments((v) => !v)}
                          className={cn(
                            "p-1 rounded-md transition-colors",
                            wrapComments
                              ? "bg-brand-accent/15 text-brand-accent"
                              : "text-text-tertiary hover:text-text-secondary hover:bg-surface-200"
                          )}
                          title={wrapComments ? "Truncate comments" : "Wrap comments"}
                        >
                          <WrapText className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </th>
                    <SortHeader field="source" label="Source" align="left" sortBy={sortBy} sortOrder={sortOrder} onSort={(f) => { if (sortBy === f) { setSortOrder(o => o === "asc" ? "desc" : "asc"); } else { setSortBy(f); setSortOrder("asc"); } setPage(1); }} />
                    <SortHeader field="product" label="Product" align="left" sortBy={sortBy} sortOrder={sortOrder} onSort={(f) => { if (sortBy === f) { setSortOrder(o => o === "asc" ? "desc" : "asc"); } else { setSortBy(f); setSortOrder("asc"); } setPage(1); }} />
                    <SortHeader field="platform" label="Platform" align="left" sortBy={sortBy} sortOrder={sortOrder} onSort={(f) => { if (sortBy === f) { setSortOrder(o => o === "asc" ? "desc" : "asc"); } else { setSortBy(f); setSortOrder("asc"); } setPage(1); }} />
                    <SortHeader field="sentiment" label="Sentiment" align="left" sortBy={sortBy} sortOrder={sortOrder} onSort={(f) => { if (sortBy === f) { setSortOrder(o => o === "asc" ? "desc" : "asc"); } else { setSortBy(f); setSortOrder("asc"); } setPage(1); }} />
                    <th className="text-right px-5 py-3 font-medium text-text-secondary">Likes</th>
                    <SortHeader field="date" label="Date" align="right" sortBy={sortBy} sortOrder={sortOrder} onSort={(f) => { if (sortBy === f) { setSortOrder(o => o === "asc" ? "desc" : "asc"); } else { setSortBy(f); setSortOrder("desc"); } setPage(1); }} />
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
                      <td className={cn(
                        "px-5 py-3.5 text-text-secondary",
                        wrapComments ? "max-w-[500px]" : "max-w-[300px]"
                      )}>
                        <p className={wrapComments ? "whitespace-pre-wrap break-words" : "truncate"}>
                          {comment.content}
                        </p>
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
                      <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                        {comment.is_excluded ? (
                          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-surface-200 text-text-tertiary">excluded</span>
                        ) : editingSentimentId === comment.id ? (
                          <div className="flex items-center gap-1">
                            {(["positive", "neutral", "negative"] as const).map((s) => {
                              const styles: Record<string, string> = {
                                positive: "bg-status-success-light text-status-success hover:ring-2 hover:ring-status-success/30",
                                neutral: "bg-blue-50 text-blue-600 hover:ring-2 hover:ring-blue-300",
                                negative: "bg-status-error-light text-status-error hover:ring-2 hover:ring-status-error/30",
                              };
                              return (
                                <button
                                  key={s}
                                  disabled={overrideMutation.isPending}
                                  onClick={() => overrideMutation.mutate({ id: comment.id, sentiment: s })}
                                  className={cn(
                                    "px-2 py-0.5 text-xs font-semibold rounded-full transition-all cursor-pointer",
                                    styles[s],
                                    comment.sentiment_result?.sentiment === s && "ring-2 ring-offset-1"
                                  )}
                                >
                                  {s.charAt(0).toUpperCase() + s.slice(1, 3)}
                                </button>
                              );
                            })}
                            <button
                              onClick={() => setEditingSentimentId(null)}
                              className="ml-1 text-text-tertiary hover:text-text-primary"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : comment.sentiment_result ? (
                          <button
                            onClick={() => setEditingSentimentId(comment.id)}
                            className="group flex items-center gap-1 cursor-pointer"
                          >
                            <SentimentBadge
                              sentiment={comment.sentiment_result.sentiment}
                              confidence={comment.sentiment_result.confidence}
                            />
                            {comment.sentiment_result.is_manual_override && (
                              <span className="text-[10px] text-text-tertiary" title={`Overridden by ${comment.sentiment_result.overridden_by}`}>M</span>
                            )}
                            <ChevronDown className="w-3 h-3 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        ) : (
                          <button
                            onClick={() => setEditingSentimentId(comment.id)}
                            className="group flex items-center gap-1 cursor-pointer"
                          >
                            <span className="text-xs text-text-tertiary">Pending</span>
                            <ChevronDown className="w-3 h-3 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
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
