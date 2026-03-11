import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Trash2,
  Pencil,
  Loader2,
  Play,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  X,
  Globe,
  Clock,
  Database,
} from "lucide-react";
import { cn, formatRelativeDate } from "@/lib/utils";
import { api } from "@/lib/api-client";
import type { PricingSource } from "@/lib/api-client";
import toast from "react-hot-toast";

function b64Encode(str: string): string {
  return btoa(new TextEncoder().encode(str).reduce((s, b) => s + String.fromCharCode(b), ""));
}

function b64Decode(str: string): string {
  try {
    return new TextDecoder().decode(
      Uint8Array.from(atob(str), (c) => c.charCodeAt(0))
    );
  } catch {
    return str;
  }
}

const JOB_STATUS_COLORS: Record<string, string> = {
  pending: "bg-surface-200 text-text-secondary",
  running: "bg-yellow-50 text-yellow-700",
  completed: "bg-status-success-light text-status-success",
  failed: "bg-status-error-light text-status-error",
};

function formatPrice(price: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(price);
}

// --- Source Form Modal ---
function SourceFormModal({
  source,
  onClose,
  onSaved,
}: {
  source?: PricingSource;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [brand, setBrand] = useState(source?.brand || "");
  const [websiteName, setWebsiteName] = useState(source?.website_name || "");
  const [url, setUrl] = useState(source ? b64Decode(source.url) : "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const encodedUrl = b64Encode(url);
    try {
      if (source) {
        await api.pricing.updateSource(source.id, { brand, website_name: websiteName, url: encodedUrl });
        toast.success("Source updated");
      } else {
        await api.pricing.createSource({ brand, website_name: websiteName, url: encodedUrl });
        toast.success("Source created");
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save source");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-white rounded-2xl shadow-xl w-full max-w-md mx-4 border border-surface-100">
        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-100">
          <h3 className="text-lg font-semibold text-text-primary">
            {source ? "Edit Source" : "Add Pricing Source"}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Brand</label>
            <input
              type="text"
              required
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="e.g. Mitsubishi"
              className="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 bg-surface-50 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent/40 transition-colors placeholder:text-text-tertiary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Website Name
            </label>
            <input
              type="text"
              required
              value={websiteName}
              onChange={(e) => setWebsiteName(e.target.value)}
              placeholder="e.g. Mitsubishi Motors Indonesia"
              className="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 bg-surface-50 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent/40 transition-colors placeholder:text-text-tertiary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">URL</label>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.mitsubishi-motors.co.id/our-cars"
              className="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 bg-surface-50 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent/40 transition-colors placeholder:text-text-tertiary"
            />
          </div>
          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary rounded-xl hover:bg-surface-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-brand-accent text-text-inverse hover:bg-brand-accent/90 disabled:opacity-50 flex items-center gap-2 transition-colors"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {source ? "Save Changes" : "Add Source"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Sources Section ---
function SourcesSection() {
  const queryClient = useQueryClient();
  const [formModal, setFormModal] = useState<{ open: boolean; source?: PricingSource }>({
    open: false,
  });

  const { data: sources, isLoading } = useQuery({
    queryKey: ["pricing-sources"],
    queryFn: api.pricing.getSources,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.pricing.deleteSource(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pricing-sources"] });
      toast.success("Source deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      api.pricing.updateSource(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pricing-sources"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="rounded-2xl border border-surface-100 bg-surface-white/50">
      <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Globe className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Pricing Sources</h3>
            <p className="text-xs text-text-tertiary">
              {sources?.length ? `${sources.length} source${sources.length > 1 ? "s" : ""} configured` : "Configure website URLs to scrape pricing"}
            </p>
          </div>
        </div>
        <button
          onClick={() => setFormModal({ open: true })}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-accent text-text-inverse hover:bg-brand-accent/90 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Source
        </button>
      </div>

      <div className="px-5 py-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-text-tertiary" />
          </div>
        ) : !sources?.length ? (
          <div className="flex flex-col items-center py-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-surface-100 flex items-center justify-center mb-3">
              <Globe className="w-6 h-6 text-text-tertiary" />
            </div>
            <p className="text-sm font-medium text-text-secondary mb-1">No sources configured</p>
            <p className="text-xs text-text-tertiary">Add a pricing source URL to start collecting data</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-100 text-left">
                  <th className="pb-3 pr-4 font-medium text-text-tertiary text-xs uppercase tracking-wider">Brand</th>
                  <th className="pb-3 pr-4 font-medium text-text-tertiary text-xs uppercase tracking-wider">Website</th>
                  <th className="pb-3 pr-4 font-medium text-text-tertiary text-xs uppercase tracking-wider">URL</th>
                  <th className="pb-3 pr-4 font-medium text-text-tertiary text-xs uppercase tracking-wider">Active</th>
                  <th className="pb-3 font-medium text-text-tertiary text-xs uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((s) => (
                  <tr key={s.id} className="border-b border-surface-50 last:border-b-0 hover:bg-surface-50/50 transition-colors">
                    <td className="py-3 pr-4 font-medium text-text-primary">{s.brand}</td>
                    <td className="py-3 pr-4 text-text-secondary">{s.website_name}</td>
                    <td className="py-3 pr-4">
                      <a
                        href={b64Decode(s.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1.5 max-w-[280px] truncate text-xs"
                      >
                        <span className="truncate">{b64Decode(s.url)}</span>
                        <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-60" />
                      </a>
                    </td>
                    <td className="py-3 pr-4">
                      <button
                        onClick={() => toggleMutation.mutate({ id: s.id, is_active: !s.is_active })}
                        className={cn(
                          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                          s.is_active ? "bg-status-success" : "bg-surface-200"
                        )}
                      >
                        <span
                          className={cn(
                            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                            s.is_active ? "translate-x-6" : "translate-x-1"
                          )}
                        />
                      </button>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <button
                          onClick={() => setFormModal({ open: true, source: s })}
                          className="p-1.5 rounded-lg hover:bg-surface-100 text-text-tertiary hover:text-text-primary transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete source "${s.website_name}"?`))
                              deleteMutation.mutate(s.id);
                          }}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-text-tertiary hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formModal.open && (
        <SourceFormModal
          source={formModal.source}
          onClose={() => setFormModal({ open: false })}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["pricing-sources"] })}
        />
      )}
    </div>
  );
}

// --- Scrape Jobs Section ---
function ScrapeSection() {
  const queryClient = useQueryClient();
  const [jobsPage, setJobsPage] = useState(1);

  const { data: sources } = useQuery({
    queryKey: ["pricing-sources"],
    queryFn: api.pricing.getSources,
  });

  const { data: jobsData, isLoading: jobsLoading } = useQuery({
    queryKey: ["pricing-jobs", jobsPage],
    queryFn: () => api.pricing.getJobs(jobsPage),
    refetchInterval: (query) => {
      const items = query.state.data?.items;
      if (items?.some((j) => j.status === "running" || j.status === "pending")) return 3000;
      return false;
    },
  });

  const scrapeMutation = useMutation({
    mutationFn: api.pricing.triggerScrape,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pricing-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["pricing-data"] });
      toast.success("Scrape started");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const hasActiveSources = sources?.some((s) => s.is_active);

  return (
    <div className="rounded-2xl border border-surface-100 bg-surface-white/50">
      <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
            <Clock className="w-4 h-4 text-yellow-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Scrape Jobs</h3>
            <p className="text-xs text-text-tertiary">Manual and scheduled scraping history</p>
          </div>
        </div>
        <button
          onClick={() => scrapeMutation.mutate()}
          disabled={scrapeMutation.isPending || !hasActiveSources}
          title={!hasActiveSources ? "Add active sources first" : ""}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-accent text-text-inverse hover:bg-brand-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {scrapeMutation.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
          Scrape Now
        </button>
      </div>

      <div className="px-5 py-4">
        {jobsLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-text-tertiary" />
          </div>
        ) : !jobsData?.items.length ? (
          <div className="flex flex-col items-center py-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-surface-100 flex items-center justify-center mb-3">
              <Clock className="w-6 h-6 text-text-tertiary" />
            </div>
            <p className="text-sm font-medium text-text-secondary mb-1">No scrape history</p>
            <p className="text-xs text-text-tertiary">
              {hasActiveSources
                ? "Click \"Scrape Now\" to run the first collection"
                : "Add active sources first, then trigger a scrape"}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-100 text-left">
                    <th className="pb-3 pr-4 font-medium text-text-tertiary text-xs uppercase tracking-wider">Status</th>
                    <th className="pb-3 pr-4 font-medium text-text-tertiary text-xs uppercase tracking-wider">Progress</th>
                    <th className="pb-3 pr-4 font-medium text-text-tertiary text-xs uppercase tracking-wider">Items</th>
                    <th className="pb-3 pr-4 font-medium text-text-tertiary text-xs uppercase tracking-wider">Started</th>
                    <th className="pb-3 pr-4 font-medium text-text-tertiary text-xs uppercase tracking-wider">Completed</th>
                    <th className="pb-3 font-medium text-text-tertiary text-xs uppercase tracking-wider">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {jobsData.items.map((job) => (
                    <tr
                      key={job.id}
                      className="border-b border-surface-50 last:border-b-0 hover:bg-surface-50/50 transition-colors"
                    >
                      <td className="py-3 pr-4">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                            JOB_STATUS_COLORS[job.status] || "bg-surface-200 text-text-secondary"
                          )}
                        >
                          {job.status === "running" && (
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                          )}
                          {job.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-surface-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-brand-accent transition-all"
                              style={{
                                width: job.total_sources
                                  ? `${(job.sources_completed / job.total_sources) * 100}%`
                                  : "0%",
                              }}
                            />
                          </div>
                          <span className="text-xs text-text-tertiary tabular-nums">
                            {job.sources_completed}/{job.total_sources}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-text-secondary tabular-nums">{job.items_found}</td>
                      <td className="py-3 pr-4 text-text-tertiary text-xs">
                        {job.started_at ? formatRelativeDate(job.started_at) : "-"}
                      </td>
                      <td className="py-3 pr-4 text-text-tertiary text-xs">
                        {job.completed_at ? formatRelativeDate(job.completed_at) : "-"}
                      </td>
                      <td className="py-3 text-xs max-w-[200px]">
                        {job.error_message ? (
                          <span className="text-red-400 truncate block" title={job.error_message}>
                            {job.error_message}
                          </span>
                        ) : (
                          <span className="text-text-tertiary">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {jobsData.total_pages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-surface-50">
                <span className="text-xs text-text-tertiary">
                  Page {jobsPage} of {jobsData.total_pages}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setJobsPage((p) => Math.max(1, p - 1))}
                    disabled={jobsPage <= 1}
                    className="p-1.5 rounded-lg hover:bg-surface-100 disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setJobsPage((p) => Math.min(jobsData.total_pages, p + 1))}
                    disabled={jobsPage >= jobsData.total_pages}
                    className="p-1.5 rounded-lg hover:bg-surface-100 disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// --- Pricing Data Section ---
function DataSection() {
  const [page, setPage] = useState(1);
  const [brandFilter, setBrandFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["pricing-data", page, brandFilter],
    queryFn: () => api.pricing.getData(page, 50, brandFilter || undefined),
  });

  const brands = useQuery({
    queryKey: ["pricing-sources-brands"],
    queryFn: async () => {
      const sources = await api.pricing.getSources();
      return [...new Set(sources.map((s) => s.brand))].sort();
    },
  });

  return (
    <div className="rounded-2xl border border-surface-100 bg-surface-white/50">
      <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
            <Database className="w-4 h-4 text-green-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Pricing Data</h3>
            <p className="text-xs text-text-tertiary">
              {data?.total ? `${data.total} record${data.total > 1 ? "s" : ""} collected` : "Collected vehicle pricing data"}
            </p>
          </div>
        </div>
        <select
          value={brandFilter}
          onChange={(e) => {
            setBrandFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-1.5 text-xs rounded-lg border border-surface-200 bg-surface-50 text-text-primary cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
        >
          <option value="">All Brands</option>
          {brands.data?.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>

      <div className="px-5 py-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-text-tertiary" />
          </div>
        ) : !data?.items.length ? (
          <div className="flex flex-col items-center py-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-surface-100 flex items-center justify-center mb-3">
              <Database className="w-6 h-6 text-text-tertiary" />
            </div>
            <p className="text-sm font-medium text-text-secondary mb-1">No pricing data</p>
            <p className="text-xs text-text-tertiary">Run a scrape to start collecting vehicle pricing</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-100 text-left">
                    <th className="pb-3 pr-4 font-medium text-text-tertiary text-xs uppercase tracking-wider">Brand</th>
                    <th className="pb-3 pr-4 font-medium text-text-tertiary text-xs uppercase tracking-wider">Type / Model</th>
                    <th className="pb-3 pr-4 font-medium text-text-tertiary text-xs uppercase tracking-wider text-right">
                      OTR Price
                    </th>
                    <th className="pb-3 font-medium text-text-tertiary text-xs uppercase tracking-wider">Scraped</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-surface-50 last:border-b-0 hover:bg-surface-50/50 transition-colors"
                    >
                      <td className="py-3 pr-4">
                        <span className="font-medium text-text-primary">{item.brand}</span>
                      </td>
                      <td className="py-3 pr-4 text-text-secondary">{item.type}</td>
                      <td className="py-3 pr-4 text-right">
                        <span className="font-mono text-text-primary font-medium tabular-nums">
                          {formatPrice(item.otr_price)}
                        </span>
                      </td>
                      <td className="py-3 text-text-tertiary text-xs">
                        {formatRelativeDate(item.scraped_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data.total_pages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-surface-50">
                <span className="text-xs text-text-tertiary">
                  {data.total} items - Page {page} of {data.total_pages}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="p-1.5 rounded-lg hover:bg-surface-100 disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                    disabled={page >= data.total_pages}
                    className="p-1.5 rounded-lg hover:bg-surface-100 disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// --- Main PricingTab ---
export function PricingTab() {
  return (
    <div className="space-y-5">
      <SourcesSection />
      <ScrapeSection />
      <DataSection />
    </div>
  );
}
