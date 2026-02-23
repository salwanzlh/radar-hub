import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  LinkIcon,
  Search,
} from "lucide-react";
import { api, type HealthResponse } from "@/lib/api-client";
import { formatRelativeDate } from "@/lib/utils";

type Tab = "overview" | "url_issues" | "duplicates" | "source_status";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "url_issues", label: "URL Issues" },
  { key: "duplicates", label: "Duplicates" },
  { key: "source_status", label: "Source Status" },
];

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
  if (!status) return <span className="text-xs text-text-tertiary">—</span>;
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

function OverviewTab({ data }: { data: HealthResponse }) {
  const { summary } = data;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <SummaryCard
          label="Healthy Sources"
          value={summary.healthy_sources}
          color="text-status-success"
        />
        <SummaryCard
          label="Degraded Sources"
          value={summary.degraded_sources}
          color={summary.degraded_sources > 0 ? "text-status-warning" : "text-text-primary"}
        />
        <SummaryCard
          label="Failing Sources"
          value={summary.failing_sources}
          color={summary.failing_sources > 0 ? "text-status-error" : "text-text-primary"}
        />
      </div>

      {summary.last_scrape_at && (
        <div className="bg-surface-white rounded-[20px] shadow-card p-6">
          <p className="text-xs text-text-tertiary uppercase tracking-wider font-medium mb-2">Last Scrape</p>
          <div className="flex items-center gap-3">
            <p className="text-sm text-text-primary">
              {new Date(summary.last_scrape_at).toLocaleString()}
            </p>
            {summary.last_scrape_status && <StatusBadge status={summary.last_scrape_status} />}
          </div>
        </div>
      )}
    </div>
  );
}

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
                    {issue.error_detail || "—"}
                  </td>
                  <td className="px-5 py-4 text-right text-text-tertiary text-xs whitespace-nowrap">
                    {issue.response_time_ms != null ? `${issue.response_time_ms}ms` : "—"}
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
                      <span className="text-text-tertiary text-xs">—</span>
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

export default function HealthPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["health-evaluation"],
    queryFn: api.health.evaluation,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-surface-100 rounded-xl animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-surface-100 rounded-[20px] animate-pulse" />
          ))}
        </div>
        <div className="h-96 bg-surface-100 rounded-[20px] animate-pulse" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-text-tertiary">Failed to load health evaluation data.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex items-center gap-1 bg-surface-white rounded-xl shadow-card p-1.5">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          let count: number | undefined;
          if (tab.key === "url_issues") count = data.summary.flagged_urls;
          if (tab.key === "duplicates") count = data.summary.duplicate_groups;

          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSearchQuery(""); }}
              className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                isActive
                  ? "bg-brand-accent text-text-inverse"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-100"
              }`}
            >
              {tab.label}
              {count !== undefined && count > 0 && (
                <span
                  className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold ${
                    isActive ? "bg-black/20 text-text-inverse" : "bg-surface-200 text-text-secondary"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && <OverviewTab data={data} />}
      {activeTab === "url_issues" && <URLIssuesTab data={data} searchQuery={searchQuery} onSearchChange={setSearchQuery} />}
      {activeTab === "duplicates" && <DuplicatesTab data={data} searchQuery={searchQuery} onSearchChange={setSearchQuery} />}
      {activeTab === "source_status" && <SourceStatusTab data={data} searchQuery={searchQuery} onSearchChange={setSearchQuery} />}
    </div>
  );
}
