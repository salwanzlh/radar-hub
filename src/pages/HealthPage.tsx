import { useState, useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  LinkIcon,
  Search,
  AlertTriangle,
  Activity,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  api,
  type HealthResponse,
  type HealthCheckHistoryPoint,
  type SentimentQualityStats,
  type SentimentAccountHealth,
  type SentimentScrapeLog,
} from "@/lib/api-client";
import { formatRelativeDate, cn } from "@/lib/utils";

type Section = "news" | "sentiment";
type NewsTab = "url_issues" | "duplicates" | "source_status" | "health_logs";
type SentimentTab = "scrape_logs" | "comment_quality" | "account_health";

const NEWS_TABS: { key: NewsTab; label: string }[] = [
  { key: "url_issues", label: "URL Issues" },
  { key: "duplicates", label: "Duplicates" },
  { key: "source_status", label: "Sources" },
  { key: "health_logs", label: "Health Logs" },
];

const SENTIMENT_TABS: { key: SentimentTab; label: string }[] = [
  { key: "scrape_logs", label: "Scrape Logs" },
  { key: "comment_quality", label: "Comment Quality" },
  { key: "account_health", label: "Account Health" },
];

// ---------------------------------------------------------------------------
// Shared badge components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    healthy: "bg-status-success-light text-status-success",
    degraded: "bg-status-warning-light text-status-warning",
    failing: "bg-status-error-light text-status-error",
    inactive: "bg-surface-100 text-text-tertiary",
  };
  return (
    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${styles[status] || styles.inactive}`}>
      {status}
    </span>
  );
}

function IssueBadge({ type }: { type: string }) {
  const config: Record<string, { label: string; style: string }> = {
    http_error: { label: "Not Found", style: "bg-status-error-light text-status-error" },
    server_error: { label: "Server Error", style: "bg-status-error-light text-status-error" },
    soft_404: { label: "Soft 404", style: "bg-status-warning-light text-status-warning" },
    homepage_redirect: { label: "Redirected Home", style: "bg-status-warning-light text-status-warning" },
    timeout: { label: "Timeout", style: "bg-status-warning-light text-status-warning" },
    connection_error: { label: "Unreachable", style: "bg-status-error-light text-status-error" },
    ssl_error: { label: "SSL Error", style: "bg-status-warning-light text-status-warning" },
    malformed: { label: "Malformed URL", style: "bg-surface-100 text-text-tertiary" },
  };
  const c = config[type] || { label: type, style: "bg-status-error-light text-status-error" };
  return (
    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${c.style}`}>
      {c.label}
    </span>
  );
}

function HttpStatusBadge({ status }: { status: number | null }) {
  if (!status) return <span className="text-xs text-text-tertiary">--</span>;
  const color =
    status >= 500 ? "text-status-error" :
    status >= 400 ? "text-status-warning" :
    "text-status-success";
  return <span className={`text-sm font-bold ${color}`}>{status}</span>;
}

function MatchTypeBadge({ type }: { type: string }) {
  const styles: Record<string, { bg: string; label: string }> = {
    exact_title: { bg: "bg-status-error-light text-status-error", label: "Exact Title" },
    similar_url: { bg: "bg-status-warning-light text-status-warning", label: "Similar URL" },
    similar_title: { bg: "bg-status-info-light text-status-info", label: "Similar Title" },
  };
  const s = styles[type] || { bg: "bg-surface-100 text-text-tertiary", label: type };
  return (
    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${s.bg}`}>
      {s.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Shared UI primitives
// ---------------------------------------------------------------------------

function SummaryCard({
  label,
  value,
  color = "text-text-primary",
}: {
  label: string;
  value: number | string;
  color?: string;
}) {
  return (
    <div className="bg-surface-white rounded-[20px] shadow-card p-6">
      <p className="text-xs text-text-tertiary uppercase tracking-wider font-medium mb-2">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function SearchBar({
  value,
  onChange,
  placeholder,
  resultCount,
  totalCount,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  resultCount: number;
  totalCount: number;
}) {
  return (
    <div className="bg-surface-white rounded-xl shadow-card px-4 py-3 flex items-center gap-3">
      <Search className="w-4 h-4 text-text-tertiary shrink-0" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary outline-none"
      />
      {value && (
        <span className="text-xs text-text-tertiary whitespace-nowrap">
          Showing {resultCount} of {totalCount} items
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Unified Overview
// ---------------------------------------------------------------------------

function UnifiedOverview({
  healthData,
  qualityStats,
  qualityLoading,
  qualityError,
  accounts,
  accountsLoading,
  accountsError,
}: {
  healthData: HealthResponse;
  qualityStats: SentimentQualityStats | undefined;
  qualityLoading: boolean;
  qualityError: boolean;
  accounts: SentimentAccountHealth[] | undefined;
  accountsLoading: boolean;
  accountsError: boolean;
}) {
  const { summary } = healthData;

  const sentimentUnavailable = qualityError && accountsError;

  const accountCounts = useMemo(() => {
    if (!accounts) return { healthy: 0, degraded: 0, failing: 0 };
    const counts = { healthy: 0, degraded: 0, failing: 0 };
    for (const a of accounts) {
      if (a.status === "healthy") counts.healthy++;
      else if (a.status === "degraded") counts.degraded++;
      else counts.failing++;
    }
    return counts;
  }, [accounts]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* News Intelligence column */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-4 h-4 text-brand-accent" />
          <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">News Intelligence</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <SummaryCard label="Total Articles" value={summary.total_articles} />
          <SummaryCard
            label="URL Issues"
            value={summary.flagged_urls}
            color={summary.flagged_urls > 0 ? "text-status-error" : "text-status-success"}
          />
          <SummaryCard
            label="Duplicate Groups"
            value={summary.duplicate_groups}
            color={summary.duplicate_groups > 0 ? "text-status-warning" : "text-status-success"}
          />
          <div className="bg-surface-white rounded-[20px] shadow-card p-6">
            <p className="text-xs text-text-tertiary uppercase tracking-wider font-medium mb-2">Sources</p>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-status-success font-bold">{summary.healthy_sources}</span>
              <span className="text-text-tertiary">/</span>
              <span className={cn("font-bold", summary.degraded_sources > 0 ? "text-status-warning" : "text-text-tertiary")}>
                {summary.degraded_sources}
              </span>
              <span className="text-text-tertiary">/</span>
              <span className={cn("font-bold", summary.failing_sources > 0 ? "text-status-error" : "text-text-tertiary")}>
                {summary.failing_sources}
              </span>
            </div>
            <p className="text-[10px] text-text-tertiary mt-1">healthy / degraded / failing</p>
          </div>
        </div>
        {summary.last_scrape_at && (
          <div className="bg-surface-white rounded-[20px] shadow-card p-6">
            <p className="text-xs text-text-tertiary uppercase tracking-wider font-medium mb-2">Last News Scrape</p>
            <div className="flex items-center gap-3">
              <p className="text-sm text-text-primary">{new Date(summary.last_scrape_at).toLocaleString()}</p>
              {summary.last_scrape_status && <StatusBadge status={summary.last_scrape_status} />}
            </div>
          </div>
        )}
      </div>

      {/* Sentiment Analysis column */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="w-4 h-4 text-brand-accent" />
          <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Sentiment Analysis</h3>
        </div>

        {sentimentUnavailable ? (
          <div className="bg-surface-white rounded-[20px] shadow-card p-8 flex flex-col items-center justify-center text-center">
            <AlertTriangle className="w-8 h-8 text-status-warning mb-3" />
            <p className="text-sm text-text-secondary">Sentiment service is currently unavailable</p>
            <p className="text-xs text-text-tertiary mt-1">Data will appear here once the service is back online</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface-white rounded-[20px] shadow-card p-6">
                <p className="text-xs text-text-tertiary uppercase tracking-wider font-medium mb-2">Total Comments</p>
                {qualityLoading ? (
                  <p className="text-sm text-text-tertiary">Loading...</p>
                ) : (
                  <p className="text-2xl font-bold text-text-primary">{qualityStats?.total_comments ?? "--"}</p>
                )}
              </div>
              <div className="bg-surface-white rounded-[20px] shadow-card p-6">
                <p className="text-xs text-text-tertiary uppercase tracking-wider font-medium mb-2">Active Comments</p>
                {qualityLoading ? (
                  <p className="text-sm text-text-tertiary">Loading...</p>
                ) : (
                  <p className="text-2xl font-bold text-status-success">{qualityStats?.total_active ?? "--"}</p>
                )}
              </div>
              <div className="bg-surface-white rounded-[20px] shadow-card p-6">
                <p className="text-xs text-text-tertiary uppercase tracking-wider font-medium mb-2">Classified</p>
                {qualityLoading ? (
                  <p className="text-sm text-text-tertiary">Loading...</p>
                ) : (
                  <p className="text-2xl font-bold text-text-primary">{qualityStats?.total_classified ?? "--"}</p>
                )}
              </div>
              <div className="bg-surface-white rounded-[20px] shadow-card p-6">
                <p className="text-xs text-text-tertiary uppercase tracking-wider font-medium mb-2">Accounts</p>
                {accountsLoading ? (
                  <p className="text-sm text-text-tertiary">Loading...</p>
                ) : (
                  <>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-status-success font-bold">{accountCounts.healthy}</span>
                      <span className="text-text-tertiary">/</span>
                      <span className={cn("font-bold", accountCounts.degraded > 0 ? "text-status-warning" : "text-text-tertiary")}>
                        {accountCounts.degraded}
                      </span>
                      <span className="text-text-tertiary">/</span>
                      <span className={cn("font-bold", accountCounts.failing > 0 ? "text-status-error" : "text-text-tertiary")}>
                        {accountCounts.failing}
                      </span>
                    </div>
                    <p className="text-[10px] text-text-tertiary mt-1">healthy / degraded / failing</p>
                  </>
                )}
              </div>
            </div>
            {qualityStats?.last_scrape_at && (
              <div className="bg-surface-white rounded-[20px] shadow-card p-6">
                <p className="text-xs text-text-tertiary uppercase tracking-wider font-medium mb-2">Last Sentiment Scrape</p>
                <p className="text-sm text-text-primary">{new Date(qualityStats.last_scrape_at).toLocaleString()}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trend Chart (health history)
// ---------------------------------------------------------------------------

const CHART_COLORS = {
  flagged_urls: "#EF4444",
  duplicate_groups: "#FACC15",
  failing_sources: "#EF4444",
  degraded_sources: "#FACC15",
  healthy_sources: "#22C55E",
};

function HealthTrendChart() {
  const { data, isLoading } = useQuery({
    queryKey: ["health-history"],
    queryFn: () => api.health.history(30),
  });

  if (isLoading) {
    return (
      <div className="bg-surface-white rounded-[20px] shadow-card p-6">
        <div className="h-48 bg-surface-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!data || data.length < 2) return null;

  const chartData = data.map((d: HealthCheckHistoryPoint) => ({
    ...d,
    date: new Date(d.checked_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
  }));

  return (
    <div className="bg-surface-white rounded-[20px] shadow-card p-6">
      <p className="text-xs text-text-tertiary uppercase tracking-wider font-medium mb-4">Health Trend (last {data.length} checks)</p>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="urlGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="dupGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FACC15" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#FACC15" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="date" tick={{ fill: "#888", fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#888", fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
          <Tooltip
            contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 12, fontSize: 12 }}
            labelStyle={{ color: "#ccc" }}
          />
          <Area type="monotone" dataKey="flagged_urls" name="URL Issues" stroke={CHART_COLORS.flagged_urls} fill="url(#urlGrad)" strokeWidth={2} />
          <Area type="monotone" dataKey="duplicate_groups" name="Duplicates" stroke={CHART_COLORS.duplicate_groups} fill="url(#dupGrad)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// News tabs (existing, preserved)
// ---------------------------------------------------------------------------

function URLIssuesTab({ data, searchQuery, onSearchChange }: { data: HealthResponse; searchQuery: string; onSearchChange: (v: string) => void }) {
  const filtered = useMemo(() => {
    if (!searchQuery) return data.url_issues;
    const q = searchQuery.toLowerCase();
    return data.url_issues.filter(
      (issue) =>
        issue.title.toLowerCase().includes(q) ||
        issue.source_name.toLowerCase().includes(q) ||
        issue.category_name.toLowerCase().includes(q) ||
        issue.issue_type.toLowerCase().includes(q) ||
        (issue.error_detail && issue.error_detail.toLowerCase().includes(q))
    );
  }, [data.url_issues, searchQuery]);

  if (data.url_issues.length === 0) {
    return (
      <div className="bg-surface-white rounded-[20px] shadow-card p-12 text-center">
        <CheckCircle2 className="w-10 h-10 text-status-success mx-auto mb-3" />
        <p className="text-text-secondary">No URL issues detected. All article URLs look healthy.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SearchBar
        value={searchQuery}
        onChange={onSearchChange}
        placeholder="Search URL issues..."
        resultCount={filtered.length}
        totalCount={data.url_issues.length}
      />
      <p className="text-xs text-text-tertiary">
        {filtered.length} broken URL{filtered.length !== 1 ? "s" : ""} detected via live HTTP checks
      </p>
      <div className="bg-surface-white rounded-[20px] shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-100">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-text-tertiary uppercase tracking-wider">Title</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-text-tertiary uppercase tracking-wider">Source</th>
                <th className="text-center px-5 py-3.5 text-xs font-semibold text-text-tertiary uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-text-tertiary uppercase tracking-wider">Issue</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-text-tertiary uppercase tracking-wider">Detail</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-text-tertiary uppercase tracking-wider">Time</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-text-tertiary uppercase tracking-wider">URL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200">
              {filtered.map((issue) => (
                <tr key={issue.article_id} className="hover:bg-surface-100 transition-colors">
                  <td className="px-5 py-4 max-w-[280px]">
                    <p className="text-text-primary truncate font-medium">{issue.title}</p>
                    <p className="text-xs text-text-tertiary mt-0.5">{issue.category_name}</p>
                  </td>
                  <td className="px-5 py-4 text-text-secondary text-xs">{issue.source_name}</td>
                  <td className="px-5 py-4 text-center">
                    <HttpStatusBadge status={issue.http_status} />
                  </td>
                  <td className="px-5 py-4"><IssueBadge type={issue.issue_type} /></td>
                  <td className="px-5 py-4 text-text-tertiary text-xs max-w-[200px] truncate" title={issue.error_detail || ""}>
                    {issue.error_detail || "--"}
                  </td>
                  <td className="px-5 py-4 text-right text-text-tertiary text-xs whitespace-nowrap">
                    {issue.response_time_ms != null ? `${issue.response_time_ms}ms` : "--"}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <a
                        href={issue.stored_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-status-info hover:underline inline-flex items-center gap-1 text-xs"
                        title={issue.stored_url}
                      >
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate max-w-[120px]">Open</span>
                      </a>
                      {issue.original_url && issue.original_url !== issue.stored_url && (
                        <a
                          href={issue.original_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-text-tertiary hover:text-text-secondary inline-flex items-center gap-1 text-xs"
                          title={`Original: ${issue.original_url}`}
                        >
                          <LinkIcon className="w-3.5 h-3.5 shrink-0" />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DuplicatesTab({ data, searchQuery, onSearchChange }: { data: HealthResponse; searchQuery: string; onSearchChange: (v: string) => void }) {
  const filtered = useMemo(() => {
    if (!searchQuery) return data.duplicates;
    const q = searchQuery.toLowerCase();
    return data.duplicates.filter((group) =>
      group.articles.some(
        (article) =>
          article.title.toLowerCase().includes(q) ||
          article.source_name.toLowerCase().includes(q) ||
          article.category_name.toLowerCase().includes(q)
      )
    );
  }, [data.duplicates, searchQuery]);

  if (data.duplicates.length === 0) {
    return (
      <div className="bg-surface-white rounded-[20px] shadow-card p-12 text-center">
        <CheckCircle2 className="w-10 h-10 text-status-success mx-auto mb-3" />
        <p className="text-text-secondary">No duplicates detected.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SearchBar
        value={searchQuery}
        onChange={onSearchChange}
        placeholder="Search duplicates..."
        resultCount={filtered.length}
        totalCount={data.duplicates.length}
      />
      {filtered.map((group, i) => (
        <div key={i} className="bg-surface-white rounded-[20px] shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-surface-200 flex items-center gap-3">
            <Copy className="w-4 h-4 text-text-tertiary" />
            <MatchTypeBadge type={group.match_type} />
            <span className="text-xs text-text-tertiary">
              {group.articles.length} articles
            </span>
          </div>
          <div className="divide-y divide-surface-200">
            {group.articles.map((article) => (
              <div key={article.article_id} className="px-6 py-4 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary truncate">{article.title}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs text-text-tertiary">{article.source_name}</span>
                    <span className="text-xs text-text-tertiary">&middot;</span>
                    <span className="text-xs text-text-tertiary">{article.category_name}</span>
                    <span className="text-xs text-text-tertiary">&middot;</span>
                    <span className="text-xs text-text-tertiary">{formatRelativeDate(article.scraped_at)}</span>
                  </div>
                  <p className="text-xs text-text-tertiary mt-1 truncate max-w-lg">{article.url}</p>
                </div>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-status-info hover:underline shrink-0"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SourceStatusTab({ data, searchQuery, onSearchChange }: { data: HealthResponse; searchQuery: string; onSearchChange: (v: string) => void }) {
  const filtered = useMemo(() => {
    if (!searchQuery) return data.source_health;
    const q = searchQuery.toLowerCase();
    return data.source_health.filter(
      (source) =>
        source.source_name.toLowerCase().includes(q) ||
        source.site_domain.toLowerCase().includes(q) ||
        source.status.toLowerCase().includes(q) ||
        (source.last_scrape_error && source.last_scrape_error.toLowerCase().includes(q))
    );
  }, [data.source_health, searchQuery]);

  return (
    <div className="space-y-4">
      <SearchBar
        value={searchQuery}
        onChange={onSearchChange}
        placeholder="Search sources..."
        resultCount={filtered.length}
        totalCount={data.source_health.length}
      />
      <div className="bg-surface-white rounded-[20px] shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-100">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-text-tertiary uppercase tracking-wider">Source</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-text-tertiary uppercase tracking-wider">Domain</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-text-tertiary uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-text-tertiary uppercase tracking-wider">Total</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-text-tertiary uppercase tracking-wider">Last 7d</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-text-tertiary uppercase tracking-wider">Last Article</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-text-tertiary uppercase tracking-wider">Last Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200">
              {filtered.map((source) => (
                <tr key={source.source_id} className="hover:bg-surface-100 transition-colors">
                  <td className="px-5 py-4 font-medium text-text-primary">{source.source_name}</td>
                  <td className="px-5 py-4 text-text-tertiary text-xs">{source.site_domain}</td>
                  <td className="px-5 py-4"><StatusBadge status={source.status} /></td>
                  <td className="px-5 py-4 text-text-secondary">{source.total_articles}</td>
                  <td className="px-5 py-4 text-text-secondary">{source.recent_articles_7d}</td>
                  <td className="px-5 py-4 text-text-tertiary">
                    {source.last_article_at ? formatRelativeDate(source.last_article_at) : "Never"}
                  </td>
                  <td className="px-5 py-4 text-text-tertiary max-w-xs truncate">
                    {source.last_scrape_error ? (
                      <span className="text-status-error text-xs">{source.last_scrape_error}</span>
                    ) : (
                      <span className="text-text-tertiary text-xs">--</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Health Logs tab (news health check history)
// ---------------------------------------------------------------------------

function HealthLogsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["health-history"],
    queryFn: () => api.health.history(50),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-surface-100 rounded-[20px] animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-surface-white rounded-[20px] shadow-card p-12 text-center">
        <p className="text-text-secondary">No health check logs yet. Logs are recorded each time this page loads.</p>
      </div>
    );
  }

  // Show newest first
  const rows = [...data].reverse();

  return (
    <div className="bg-surface-white rounded-[20px] shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-100">
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-text-tertiary uppercase tracking-wider">Checked At</th>
              <th className="text-right px-5 py-3.5 text-xs font-semibold text-text-tertiary uppercase tracking-wider">Articles</th>
              <th className="text-right px-5 py-3.5 text-xs font-semibold text-text-tertiary uppercase tracking-wider">URL Issues</th>
              <th className="text-right px-5 py-3.5 text-xs font-semibold text-text-tertiary uppercase tracking-wider">Duplicates</th>
              <th className="text-center px-5 py-3.5 text-xs font-semibold text-text-tertiary uppercase tracking-wider">Sources (H/D/F)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-200">
            {rows.map((row: HealthCheckHistoryPoint, i: number) => (
              <tr key={i} className="hover:bg-surface-100 transition-colors">
                <td className="px-5 py-4 text-text-primary whitespace-nowrap">
                  {new Date(row.checked_at).toLocaleString()}
                </td>
                <td className="px-5 py-4 text-right text-text-secondary">{row.total_articles}</td>
                <td className="px-5 py-4 text-right">
                  <span className={row.flagged_urls > 0 ? "text-status-error font-semibold" : "text-status-success"}>
                    {row.flagged_urls}
                  </span>
                </td>
                <td className="px-5 py-4 text-right">
                  <span className={row.duplicate_groups > 0 ? "text-status-warning font-semibold" : "text-status-success"}>
                    {row.duplicate_groups}
                  </span>
                </td>
                <td className="px-5 py-4 text-center">
                  <span className="text-status-success font-semibold">{row.healthy_sources}</span>
                  <span className="text-text-tertiary mx-1">/</span>
                  <span className={cn("font-semibold", row.degraded_sources > 0 ? "text-status-warning" : "text-text-tertiary")}>
                    {row.degraded_sources}
                  </span>
                  <span className="text-text-tertiary mx-1">/</span>
                  <span className={cn("font-semibold", row.failing_sources > 0 ? "text-status-error" : "text-text-tertiary")}>
                    {row.failing_sources}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sentiment tabs (new)
// ---------------------------------------------------------------------------

function ScrapeLogsTab() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["sentiment-scrape-logs"],
    queryFn: () => api.health.sentimentScrapeLogs(),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-surface-100 rounded-[20px] animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-surface-white rounded-[20px] shadow-card p-8 text-center">
        <AlertTriangle className="w-8 h-8 text-status-warning mx-auto mb-3" />
        <p className="text-sm text-text-secondary">Sentiment service is currently unavailable</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-surface-white rounded-[20px] shadow-card p-12 text-center">
        <p className="text-text-secondary">No scrape logs found.</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-white rounded-[20px] shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-100">
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-text-tertiary uppercase tracking-wider">Date</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-text-tertiary uppercase tracking-wider">Status</th>
              <th className="text-right px-5 py-3.5 text-xs font-semibold text-text-tertiary uppercase tracking-wider">Duration</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-text-tertiary uppercase tracking-wider">Summary</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-text-tertiary uppercase tracking-wider">Error</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-200">
            {data.map((log: SentimentScrapeLog) => {
              const statusStyle: Record<string, string> = {
                completed: "bg-status-success-light text-status-success",
                failed: "bg-status-error-light text-status-error",
                running: "bg-status-info-light text-status-info",
              };
              const summaryParts = Object.entries(log.summary || {})
                .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
                .join(", ");

              return (
                <tr key={log.id} className="hover:bg-surface-100 transition-colors">
                  <td className="px-5 py-4 text-text-primary whitespace-nowrap">
                    {new Date(log.started_at).toLocaleString()}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${statusStyle[log.status] || "bg-surface-100 text-text-tertiary"}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right text-text-secondary whitespace-nowrap">
                    {log.duration_seconds != null ? `${log.duration_seconds.toFixed(1)}s` : "--"}
                  </td>
                  <td className="px-5 py-4 text-text-tertiary text-xs max-w-[300px] truncate" title={summaryParts}>
                    {summaryParts || "--"}
                  </td>
                  <td className="px-5 py-4 max-w-[200px] truncate" title={log.error || ""}>
                    {log.error ? (
                      <span className="text-status-error text-xs">{log.error}</span>
                    ) : (
                      <span className="text-text-tertiary text-xs">--</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CommentQualityTab() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["sentiment-quality-stats"],
    queryFn: api.health.sentimentQualityStats,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-surface-100 rounded-[20px] animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-surface-100 rounded-[20px] animate-pulse" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-surface-white rounded-[20px] shadow-card p-8 text-center">
        <AlertTriangle className="w-8 h-8 text-status-warning mx-auto mb-3" />
        <p className="text-sm text-text-secondary">Sentiment service is currently unavailable</p>
      </div>
    );
  }

  if (!data) return null;

  const breakdownEntries = Object.entries(data.exclusion_breakdown || {}).sort((a, b) => b[1] - a[1]);
  const maxCount = breakdownEntries.length > 0 ? Math.max(...breakdownEntries.map(([, v]) => v)) : 1;

  function humanize(s: string): string {
    return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="Total Comments" value={data.total_comments} />
        <SummaryCard
          label="Excluded"
          value={data.total_excluded}
          color={data.total_excluded > 0 ? "text-status-warning" : "text-text-primary"}
        />
        <SummaryCard label="Active" value={data.total_active} color="text-status-success" />
        <SummaryCard label="Classified" value={data.total_classified} color="text-status-info" />
      </div>

      {breakdownEntries.length > 0 && (
        <div className="bg-surface-white rounded-[20px] shadow-card p-6">
          <p className="text-xs text-text-tertiary uppercase tracking-wider font-medium mb-4">Exclusion Breakdown</p>
          <div className="space-y-3">
            {breakdownEntries.map(([reason, count]) => (
              <div key={reason} className="flex items-center gap-4">
                <span className="text-xs text-text-secondary w-40 shrink-0 truncate" title={humanize(reason)}>
                  {humanize(reason)}
                </span>
                <div className="flex-1 bg-surface-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-brand-accent h-full rounded-full transition-all"
                    style={{ width: `${(count / maxCount) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-text-primary font-semibold w-12 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.last_scrape_at && (
        <div className="bg-surface-white rounded-[20px] shadow-card p-6">
          <p className="text-xs text-text-tertiary uppercase tracking-wider font-medium mb-2">Last Scrape</p>
          <p className="text-sm text-text-primary">{new Date(data.last_scrape_at).toLocaleString()}</p>
        </div>
      )}
    </div>
  );
}

function AccountHealthTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data, isLoading, isError } = useQuery({
    queryKey: ["sentiment-accounts"],
    queryFn: api.health.sentimentAccounts,
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!searchQuery) return data;
    const q = searchQuery.toLowerCase();
    return data.filter(
      (account: SentimentAccountHealth) =>
        account.account_name.toLowerCase().includes(q) ||
        account.platform.toLowerCase().includes(q) ||
        account.status.toLowerCase().includes(q) ||
        (account.last_error && account.last_error.toLowerCase().includes(q))
    );
  }, [data, searchQuery]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-surface-100 rounded-[20px] animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-surface-white rounded-[20px] shadow-card p-8 text-center">
        <AlertTriangle className="w-8 h-8 text-status-warning mx-auto mb-3" />
        <p className="text-sm text-text-secondary">Sentiment service is currently unavailable</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-surface-white rounded-[20px] shadow-card p-12 text-center">
        <p className="text-text-secondary">No accounts found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search accounts..."
        resultCount={filtered.length}
        totalCount={data.length}
      />
      <div className="bg-surface-white rounded-[20px] shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-100">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-text-tertiary uppercase tracking-wider">Platform</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-text-tertiary uppercase tracking-wider">Account Name</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-text-tertiary uppercase tracking-wider">Status</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-text-tertiary uppercase tracking-wider">Total Comments</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-text-tertiary uppercase tracking-wider">Last 7d</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-text-tertiary uppercase tracking-wider">Last Comment</th>
                <th className="text-center px-5 py-3.5 text-xs font-semibold text-text-tertiary uppercase tracking-wider">URL Accessible</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-text-tertiary uppercase tracking-wider">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200">
              {filtered.map((account: SentimentAccountHealth) => (
                <tr key={account.account_id} className="hover:bg-surface-100 transition-colors">
                  <td className="px-5 py-4 text-text-primary font-medium">
                    {account.platform.charAt(0).toUpperCase() + account.platform.slice(1)}
                  </td>
                  <td className="px-5 py-4 text-text-primary">{account.account_name}</td>
                  <td className="px-5 py-4"><StatusBadge status={account.status} /></td>
                  <td className="px-5 py-4 text-right text-text-secondary">{account.total_comments}</td>
                  <td className="px-5 py-4 text-right text-text-secondary">{account.recent_comments_7d}</td>
                  <td className="px-5 py-4 text-text-tertiary">
                    {account.last_comment_at ? formatRelativeDate(account.last_comment_at) : "Never"}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span
                      className={cn(
                        "inline-block w-2.5 h-2.5 rounded-full",
                        account.url_accessible ? "bg-status-success" : "bg-status-error"
                      )}
                    />
                  </td>
                  <td className="px-5 py-4 max-w-[260px]" title={account.last_error || ""}>
                    {account.status_reason ? (
                      <span className="text-text-secondary text-xs">{account.status_reason}</span>
                    ) : (
                      <span className="text-text-tertiary text-xs">--</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main HealthPage
// ---------------------------------------------------------------------------

export default function HealthPage() {
  const [section, setSection] = useState<Section>("news");
  const [newsTab, setNewsTab] = useState<NewsTab>("url_issues");
  const [sentimentTab, setSentimentTab] = useState<SentimentTab>("scrape_logs");
  const [searchQuery, setSearchQuery] = useState("");

  const queryClient = useQueryClient();

  // Always-fetched queries
  const { data: healthData, isLoading: healthLoading } = useQuery({
    queryKey: ["health-evaluation"],
    queryFn: api.health.evaluation,
  });

  const triggerMutation = useMutation({
    mutationFn: api.health.trigger,
    onSuccess: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["health-evaluation"] });
        queryClient.invalidateQueries({ queryKey: ["health-history"] });
      }, 5000);
    },
  });

  const {
    data: qualityStats,
    isLoading: qualityLoading,
    isError: qualityError,
  } = useQuery({
    queryKey: ["sentiment-quality-stats"],
    queryFn: api.health.sentimentQualityStats,
    retry: 1,
  });

  const {
    data: accounts,
    isLoading: accountsLoading,
    isError: accountsError,
  } = useQuery({
    queryKey: ["sentiment-accounts"],
    queryFn: api.health.sentimentAccounts,
    retry: 1,
  });

  if (healthLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-surface-100 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-24 bg-surface-100 rounded-[20px] animate-pulse" />
          ))}
        </div>
        <div className="h-12 bg-surface-100 rounded-xl animate-pulse" />
        <div className="h-96 bg-surface-100 rounded-[20px] animate-pulse" />
      </div>
    );
  }

  if (!healthData) {
    return <p className="text-text-tertiary">Failed to load health evaluation data.</p>;
  }

  const checkedAt = (healthData as Record<string, unknown> | undefined)?.checked_at as string | null | undefined;

  return (
    <div className="space-y-6">
      {/* Header with trigger button */}
      <div className="flex items-center justify-between">
        <div>
          {checkedAt && (
            <p className="text-xs text-text-tertiary">
              Last evaluation: {formatRelativeDate(checkedAt)}
            </p>
          )}
          {!checkedAt && (
            <p className="text-xs text-status-warning">
              No health evaluation yet. Run one to see results.
            </p>
          )}
        </div>
        <button
          onClick={() => triggerMutation.mutate()}
          disabled={triggerMutation.isPending}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors",
            "bg-brand-accent text-text-inverse hover:bg-brand-accent/90",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          <RefreshCw className={cn("w-4 h-4", triggerMutation.isPending && "animate-spin")} />
          {triggerMutation.isPending ? "Running..." : "Run Evaluation"}
        </button>
      </div>

      {/* Unified Overview */}
      <UnifiedOverview
        healthData={healthData}
        qualityStats={qualityStats}
        qualityLoading={qualityLoading}
        qualityError={qualityError}
        accounts={accounts}
        accountsLoading={accountsLoading}
        accountsError={accountsError}
      />

      {/* Trend Chart */}
      <HealthTrendChart />

      {/* Section Toggle */}
      <div className="flex items-center gap-2 bg-surface-white rounded-xl shadow-card p-1.5">
        <button
          onClick={() => { setSection("news"); setSearchQuery(""); }}
          className={cn(
            "px-5 py-3 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2",
            section === "news"
              ? "bg-brand-accent text-text-inverse"
              : "text-text-secondary hover:text-text-primary hover:bg-surface-100"
          )}
        >
          <Activity className="w-4 h-4" />
          News Intelligence
        </button>
        <button
          onClick={() => { setSection("sentiment"); setSearchQuery(""); }}
          className={cn(
            "px-5 py-3 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2",
            section === "sentiment"
              ? "bg-brand-accent text-text-inverse"
              : "text-text-secondary hover:text-text-primary hover:bg-surface-100"
          )}
        >
          <MessageSquare className="w-4 h-4" />
          Sentiment Analysis
        </button>
      </div>

      {/* Sub-tabs */}
      {section === "news" && (
        <div className="flex items-center gap-1 bg-surface-white rounded-xl shadow-card p-1.5">
          {NEWS_TABS.map((tab) => {
            const isActive = newsTab === tab.key;
            let count: number | undefined;
            if (tab.key === "url_issues") count = healthData.summary.flagged_urls;
            if (tab.key === "duplicates") count = healthData.summary.duplicate_groups;

            return (
              <button
                key={tab.key}
                onClick={() => { setNewsTab(tab.key); setSearchQuery(""); }}
                className={cn(
                  "px-4 py-2.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-2",
                  isActive
                    ? "bg-brand-accent text-text-inverse"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-100"
                )}
              >
                {tab.label}
                {count !== undefined && count > 0 && (
                  <span
                    className={cn(
                      "text-[11px] px-1.5 py-0.5 rounded-full font-bold",
                      isActive ? "bg-black/20 text-text-inverse" : "bg-surface-200 text-text-secondary"
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {section === "sentiment" && (
        <div className="flex items-center gap-1 bg-surface-white rounded-xl shadow-card p-1.5">
          {SENTIMENT_TABS.map((tab) => {
            const isActive = sentimentTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => { setSentimentTab(tab.key); setSearchQuery(""); }}
                className={cn(
                  "px-4 py-2.5 text-sm font-medium rounded-lg transition-colors",
                  isActive
                    ? "bg-brand-accent text-text-inverse"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-100"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Tab content */}
      {section === "news" && newsTab === "url_issues" && (
        <URLIssuesTab data={healthData} searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      )}
      {section === "news" && newsTab === "duplicates" && (
        <DuplicatesTab data={healthData} searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      )}
      {section === "news" && newsTab === "source_status" && (
        <SourceStatusTab data={healthData} searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      )}
      {section === "news" && newsTab === "health_logs" && <HealthLogsTab />}

      {section === "sentiment" && sentimentTab === "scrape_logs" && <ScrapeLogsTab />}
      {section === "sentiment" && sentimentTab === "comment_quality" && <CommentQualityTab />}
      {section === "sentiment" && sentimentTab === "account_health" && <AccountHealthTab />}
    </div>
  );
}
