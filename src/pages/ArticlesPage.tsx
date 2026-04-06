import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Search, ArrowUpRight, ChevronLeft, ChevronRight, SlidersHorizontal, DatabaseZap, Loader2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { formatRelativeDate, getCategoryTextColor } from "@/lib/utils";

export default function ArticlesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const pageSize = 21;
  const { isAdmin } = useAuth();

  const reindexMutation = useMutation({
    mutationFn: api.articles.reindex,
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: api.categories.list,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["articles", page, search, categoryId],
    queryFn: () =>
      api.articles.list({
        page: String(page),
        page_size: String(pageSize),
        ...(search && { search }),
        ...(categoryId && { category_id: categoryId }),
      }),
  });

  const selectedCategory = categories?.find((c) => c.id === categoryId);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-end justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            {selectedCategory ? selectedCategory.name : "News Articles"}
          </h1>
          <p className="text-sm text-text-secondary mt-1.5 max-w-xl leading-relaxed">
            {selectedCategory
              ? selectedCategory.description || `Latest news and insights about ${selectedCategory.name.toLowerCase()}.`
              : "Browse collected news across all categories. Filter by topic or search for specific articles."}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isAdmin && (
            <button
              onClick={() => reindexMutation.mutate()}
              disabled={reindexMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-brand-accent text-text-inverse rounded-xl hover:bg-brand-accent-hover disabled:opacity-60 transition-colors"
            >
              {reindexMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Reindexing...</>
              ) : (
                <><DatabaseZap className="w-4 h-4" /> Reindex</>
              )}
            </button>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border border-surface-200 rounded-xl hover:bg-surface-white transition-colors text-text-primary"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filter
          </button>
        </div>
      </div>

      {/* Filters (collapsible) */}
      {showFilters && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search articles..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-surface-100 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent text-text-primary placeholder:text-text-tertiary"
            />
          </div>
          <select
            value={categoryId}
            onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}
            className="px-3.5 py-2.5 text-sm border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/20 bg-surface-100 text-text-primary"
          >
            <option value="">All Categories</option>
            {categories?.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Category pills (always visible for quick filtering) */}
      {!showFilters && categories && categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setCategoryId(""); setPage(1); }}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-colors ${
              !categoryId
                ? "bg-brand-accent text-text-inverse"
                : "bg-surface-white text-text-secondary border border-surface-200 hover:border-surface-300"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setCategoryId(categoryId === cat.id ? "" : cat.id); setPage(1); }}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-colors ${
                categoryId === cat.id
                  ? "bg-brand-accent text-text-inverse"
                  : "bg-surface-white text-text-secondary border border-surface-200 hover:border-surface-300"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Results count */}
      {data && (
        <p className="text-xs text-text-tertiary uppercase tracking-wider font-medium">
          {data.total} article{data.total !== 1 ? "s" : ""} found
        </p>
      )}

      {/* Articles Editorial Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="h-3 w-24 bg-surface-200 rounded animate-pulse" />
              <div className="h-5 w-full bg-surface-200 rounded animate-pulse" />
              <div className="h-4 w-3/4 bg-surface-100 rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-surface-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : data && data.items.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-0">
          {data.items.map((article) => (
            <article
              key={article.id}
              className="group py-6 border-t border-surface-200 first:border-t-0 md:[&:nth-child(-n+3)]:border-t-0"
            >
              <p className={`text-[11px] font-semibold uppercase tracking-wider mb-2.5 ${getCategoryTextColor(article.category.slug)}`}>
                {article.category.name}
              </p>
              <h3 className="text-[15px] font-bold text-text-primary leading-snug mb-2 group-hover:text-brand-accent transition-opacity">
                <a href={article.url} target="_blank" rel="noopener noreferrer">
                  {article.title}
                </a>
              </h3>
              {article.snippet && (
                <p className="text-sm text-text-secondary leading-relaxed line-clamp-3 mb-3">
                  {article.snippet}
                </p>
              )}
              <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
                <span>{article.source.name}</span>
                <span>&middot;</span>
                <span>{formatRelativeDate(article.scraped_at)}</span>
              </div>
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-semibold text-status-info mt-3 hover:underline"
              >
                Read More <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </article>
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-text-tertiary">No articles found.</p>
        </div>
      )}

      {/* Pagination */}
      {data && data.total_pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4 border-t border-surface-200">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="p-2.5 rounded-xl border border-surface-200 hover:bg-surface-white disabled:opacity-40 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-text-secondary px-4">
            Page {page} of {data.total_pages}
          </span>
          <button
            onClick={() => setPage(Math.min(data.total_pages, page + 1))}
            disabled={page === data.total_pages}
            className="p-2.5 rounded-xl border border-surface-200 hover:bg-surface-white disabled:opacity-40 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
