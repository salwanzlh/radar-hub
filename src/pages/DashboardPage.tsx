import { useQuery } from "@tanstack/react-query";
import { Newspaper, FolderOpen, Globe, Clock, ExternalLink } from "lucide-react";
import { api, type Article } from "@/lib/api-client";
import { formatRelativeDate, getCategoryColor } from "@/lib/utils";
import { Link } from "react-router-dom";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function StatsCard({
  icon: Icon,
  value,
  label,
  accent,
}: {
  icon: React.ElementType;
  value: string | number;
  label: string;
  accent: string;
}) {
  return (
    <div className="bg-surface-white rounded-[20px] shadow-card p-7">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-3xl font-bold text-text-primary tracking-tight">{value}</p>
          <p className="text-sm text-text-tertiary mt-1.5 tracking-wide">{label}</p>
        </div>
        <div className={`w-12 h-12 rounded-[14px] flex items-center justify-center ${accent}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}

function RecentArticleItem({ article }: { article: Article }) {
  return (
    <div className="flex items-center gap-4 py-3.5 border-b border-surface-100 last:border-0">
      <span
        className={`w-2.5 h-2.5 rounded-full shrink-0 ${getCategoryColor(article.category.slug)}`}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{article.title}</p>
        <p className="text-xs text-text-tertiary mt-0.5">
          {article.source.name} &middot; {formatRelativeDate(article.scraped_at)}
        </p>
      </div>
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-text-tertiary hover:text-brand-accent transition-colors shrink-0"
      >
        <ExternalLink className="w-4 h-4" />
      </a>
    </div>
  );
}

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: api.dashboard.stats,
    refetchInterval: 60000,
  });

  const { data: recentArticles, isLoading: articlesLoading } = useQuery({
    queryKey: ["dashboard", "recent"],
    queryFn: () => api.dashboard.recent(8),
  });

  const { data: trends } = useQuery({
    queryKey: ["dashboard", "trends"],
    queryFn: () => api.dashboard.trends(30),
  });

  const { data: latestReports } = useQuery({
    queryKey: ["lineup-reports-latest"],
    queryFn: api.lineupAnalysis.latestReports,
  });

  const lastScrapeLabel = stats?.last_scrape?.timestamp
    ? formatRelativeDate(stats.last_scrape.timestamp)
    : "Never";

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <StatsCard
          icon={Newspaper}
          value={statsLoading ? "..." : stats?.total_articles ?? 0}
          label="Total Articles"
          accent="bg-status-info"
        />
        <StatsCard
          icon={FolderOpen}
          value={statsLoading ? "..." : stats?.total_categories ?? 0}
          label="Categories"
          accent="bg-cat-ev"
        />
        <StatsCard
          icon={Globe}
          value={statsLoading ? "..." : stats?.active_sources ?? 0}
          label="Active Sources"
          accent="bg-cat-competitor"
        />
        <StatsCard
          icon={Clock}
          value={lastScrapeLabel}
          label="Last Scrape"
          accent="bg-brand-charcoal"
        />
      </div>

      {/* Article Trends Chart */}
      <div className="bg-surface-white rounded-[20px] shadow-card p-7">
        <h3 className="text-base font-semibold text-text-primary mb-5">Article Collection Trends (30 days)</h3>
        {trends && trends.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#666666" }}
                  tickFormatter={(v: string) => {
                    const d = new Date(v);
                    return `${d.getDate()}/${d.getMonth() + 1}`;
                  }}
                />
                <YAxis tick={{ fontSize: 11, fill: "#666666" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 14, border: "1px solid #262626", backgroundColor: "#141414", color: "#F0F0F0" }}
                  labelFormatter={(v) => new Date(String(v)).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                />
                <Area type="monotone" dataKey="electric-vehicles" name="Electric Vehicles" stroke="#B8A8FF" fill="#B8A8FF" fillOpacity={0.15} />
                <Area type="monotone" dataKey="competitors" name="Competitors" stroke="#FF9F7C" fill="#FF9F7C" fillOpacity={0.15} />
                <Area type="monotone" dataKey="market-trends" name="Market Trends" stroke="#7DD3A8" fill="#7DD3A8" fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center">
            <p className="text-sm text-text-tertiary">No trend data available yet.</p>
          </div>
        )}
      </div>

      {/* Category Breakdown + AI Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-surface-white rounded-[20px] shadow-card p-7">
          <h3 className="text-base font-semibold text-text-primary mb-5">Articles by Category</h3>
          {stats?.category_counts && Object.keys(stats.category_counts).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(stats.category_counts).map(([id, cat]) => (
                <div key={id} className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full shrink-0 ${getCategoryColor(cat.slug)}`} />
                  <span className="text-sm text-text-primary flex-1">{cat.name}</span>
                  <span className="text-sm font-semibold text-text-primary">{cat.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-tertiary">No data yet. Trigger a scrape to collect articles.</p>
          )}
        </div>

        <div className="lg:col-span-2 bg-surface-white rounded-[20px] shadow-card p-7">
          <h3 className="text-base font-semibold text-text-primary mb-4">Product Lineup Analysis</h3>
          {latestReports && latestReports.length > 0 ? (
            <div className="space-y-3">
              {latestReports.slice(0, 4).map((r) => (
                <div key={r.id} className="flex items-center justify-between py-1.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{r.lineup.name}</p>
                    <p className="text-xs text-text-tertiary">{r.cited_articles.length} cited articles</p>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-status-success shrink-0" />
                </div>
              ))}
              <Link
                to="/analysis"
                className="inline-flex items-center gap-1 text-sm text-text-primary hover:text-brand-accent font-medium mt-2"
              >
                View All Reports <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-text-tertiary">No lineup reports generated yet.</p>
              <Link
                to="/analysis"
                className="inline-block mt-2 text-sm text-text-primary hover:text-brand-accent font-medium"
              >
                Generate Reports →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Recent Articles */}
      <div className="bg-surface-white rounded-[20px] shadow-card p-7">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-text-primary">Recent Articles</h3>
          <Link to="/articles" className="text-sm text-text-primary hover:text-brand-accent font-medium">
            View All →
          </Link>
        </div>
        {articlesLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-surface-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : recentArticles && recentArticles.length > 0 ? (
          <div>{recentArticles.map((a) => <RecentArticleItem key={a.id} article={a} />)}</div>
        ) : (
          <div className="text-center py-8">
            <Newspaper className="w-10 h-10 text-text-tertiary mx-auto mb-2" />
            <p className="text-sm text-text-tertiary">No articles collected yet.</p>
            <p className="text-xs text-text-tertiary mt-1">Go to Settings to trigger a scrape.</p>
          </div>
        )}
      </div>
    </div>
  );
}
