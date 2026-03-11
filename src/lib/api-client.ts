const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function tryRefreshToken(): Promise<string | null> {
  const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });
  if (res.ok) {
    const data = await res.json();
    localStorage.setItem("access_token", data.access_token);
    return data.access_token;
  }
  return null;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const token = localStorage.getItem("access_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  if (response.status === 401) {
    if (token) {
      // Try refresh once
      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = tryRefreshToken();
      }
      const newToken = await refreshPromise;
      isRefreshing = false;
      refreshPromise = null;

      if (newToken) {
        headers["Authorization"] = `Bearer ${newToken}`;
        const retry = await fetch(url, { ...options, headers, credentials: "include" });
        if (retry.status === 401) {
          localStorage.removeItem("access_token");
          window.location.href = import.meta.env.BASE_URL + "login";
          throw new ApiError(401, "Session expired");
        }
        if (!retry.ok) {
          const error = await retry.json().catch(() => ({}));
          throw new ApiError(retry.status, error.error || error.detail || `Request failed: ${retry.statusText}`);
        }
        if (retry.status === 204) return undefined as T;
        return retry.json();
      }
    }

    // No token or refresh failed — clear auth and redirect
    localStorage.removeItem("access_token");
    window.location.href = import.meta.env.BASE_URL + "login";
    throw new ApiError(401, "Session expired");
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new ApiError(response.status, error.error || error.detail || `Request failed: ${response.statusText}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

function get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return request<T>(`${endpoint}${qs}`);
}

function post<T>(endpoint: string, body?: unknown): Promise<T> {
  return request<T>(endpoint, { method: "POST", body: body ? JSON.stringify(body) : undefined });
}

function put<T>(endpoint: string, body: unknown): Promise<T> {
  return request<T>(endpoint, { method: "PUT", body: JSON.stringify(body) });
}

function del<T>(endpoint: string): Promise<T> {
  return request<T>(endpoint, { method: "DELETE" });
}

async function uploadFile<T>(endpoint: string, file: File): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const token = localStorage.getItem("access_token");
  const formData = new FormData();
  formData.append("file", file);

  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: formData,
    credentials: "include",
  });

  if (response.status === 401) {
    localStorage.removeItem("access_token");
    window.location.href = import.meta.env.BASE_URL + "login";
    throw new ApiError(401, "Session expired");
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new ApiError(response.status, error.error || error.detail || `Upload failed: ${response.statusText}`);
  }

  return response.json();
}

// API endpoints
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface Article {
  id: string;
  title: string;
  url: string;
  snippet: string | null;
  published_date: string | null;
  scraped_at: string;
  source: { id: string; name: string; site_domain: string };
  category: { id: string; name: string; slug: string };
  created_at: string;
  raw_content?: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  keywords: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Source {
  id: string;
  name: string;
  site_domain: string;
  serpapi_site_query: string;
  is_active: boolean;
  created_at: string;
}

export interface ScrapeJob {
  id: string;
  job_type: string;
  status: string;
  total_sources: number;
  sources_completed: number;
  articles_found: number;
  articles_new: number;
  errors: unknown[] | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface DashboardStats {
  total_articles: number;
  total_categories: number;
  active_sources: number;
  last_scrape: {
    timestamp: string | null;
    status: string | null;
    articles_collected: number;
  } | null;
  category_counts: Record<string, { name: string; slug: string; count: number }>;
}

export interface SchedulerJob {
  id: string;
  name: string;
  frequency: string;
  schedule: string;
  next_run_time: string | null;
  last_run_time: string | null;
  is_active: boolean;
}

export interface SchedulerStatus {
  is_running: boolean;
  next_run_time: string | null;
  cron_expression?: string;
  timezone?: string;
  jobs?: SchedulerJob[];
}

export interface ProductLineup {
  id: string;
  name: string;
  slug: string;
  segment: string | null;
  competitors: string[];
  market_context: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LineupReportCitation {
  title: string;
  source: string;
  url?: string;
  relevance_reason: string;
}

export interface LineupReport {
  id: string;
  lineup: { id: string; name: string; slug: string; segment: string | null };
  batch_id: string;
  content: string;
  cited_articles: LineupReportCitation[];
  model_used: string;
  token_usage: { prompt: number; completion: number } | null;
  report_date: string;
  date_from: string;
  date_to: string;
  generated_at: string;
  created_at: string;
}

export interface URLHealthItem {
  article_id: string;
  title: string;
  stored_url: string;
  original_url: string | null;
  source_name: string;
  category_name: string;
  issue_type: string;
  http_status: number | null;
  error_detail: string | null;
  response_time_ms: number | null;
  final_url: string | null;
  scraped_at: string;
}

export interface DuplicateArticleItem {
  article_id: string;
  title: string;
  url: string;
  source_name: string;
  category_name: string;
  scraped_at: string;
}

export interface DuplicateGroup {
  match_type: string;
  articles: DuplicateArticleItem[];
}

export interface SourceHealthItem {
  source_id: string;
  source_name: string;
  site_domain: string;
  is_active: boolean;
  total_articles: number;
  recent_articles_7d: number;
  last_article_at: string | null;
  last_scrape_error: string | null;
  status: string;
}

export interface HealthSummary {
  total_articles: number;
  flagged_urls: number;
  duplicate_groups: number;
  healthy_sources: number;
  degraded_sources: number;
  failing_sources: number;
  last_scrape_at: string | null;
  last_scrape_status: string | null;
}

export interface HealthResponse {
  summary: HealthSummary;
  url_issues: URLHealthItem[];
  duplicates: DuplicateGroup[];
  source_health: SourceHealthItem[];
}

export interface HealthCheckHistoryPoint {
  checked_at: string;
  total_articles: number;
  flagged_urls: number;
  duplicate_groups: number;
  healthy_sources: number;
  degraded_sources: number;
  failing_sources: number;
}

export interface SentimentScrapeLog {
  id: string;
  status: string;
  started_at: string;
  finished_at: string;
  duration_seconds: number;
  error: string | null;
  summary: Record<string, number>;
  log_entries: Array<{ timestamp: string; message: string; counts?: Record<string, number> }>;
}

export interface SentimentQualityStats {
  total_comments: number;
  total_excluded: number;
  total_active: number;
  total_classified: number;
  exclusion_breakdown: Record<string, number>;
  last_scrape_summary: Record<string, number>;
  last_scrape_at: string | null;
}

export interface SentimentAccountHealth {
  account_id: string;
  platform: string;
  account_name: string;
  is_active: boolean;
  total_comments: number;
  recent_comments_7d: number;
  last_comment_at: string | null;
  last_error: string | null;
  url_accessible: boolean;
  account_url: string | null;
  status: string;
  status_reason: string | null;
}

export interface UserInfo {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "viewer";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Pipeline types
export interface PipelineFile {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  blob_url: string;
  status: string;
  error_message: string | null;
  uploaded_by: string;
  created_at: string;
  structured_tables: PipelineStructuredTable[];
  unstructured_refs: PipelineUnstructuredRef[];
}

export interface PipelineFileSummary {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  status: string;
  created_at: string;
}

export interface PipelineStructuredTable {
  id: string;
  file_id: string;
  table_name: string;
  sheet_name: string | null;
  detected_header: string | null;
  column_schema: { name: string; type: string }[];
  row_count: number;
  created_at: string;
}

export interface PipelineUnstructuredRef {
  id: string;
  file_id: string;
  parent_id: string;
  chunk_count: number;
  transcript_text: string | null;
  created_at: string;
}

export interface TableData {
  table_name: string;
  columns: { name: string; type: string }[];
  rows: unknown[][];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface PipelineJob {
  id: string;
  file_id: string;
  job_type: string;
  status: string;
  current_stage: string | null;
  progress_pct: number;
  stages_detail: { stage: string; status: string; message?: string }[];
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface DetectedColumn {
  name: string;
  type: string;
}

export interface DetectedTable {
  sheet_name: string;
  detected_header: string;
  suggested_table_name: string;
  columns: DetectedColumn[];
  sample_rows: unknown[][];
  row_count: number;
  schema_match: string | null;
  quality_score: number;
}

export interface ParsePreview {
  file_id: string;
  file_name: string;
  tables: DetectedTable[];
}

export interface TableConfirmItem {
  detected_header: string;
  sheet_name: string;
  target_table: string;
}

export interface SheetPreview {
  sheet_name: string;
  rows: unknown[][];
  total_rows: number;
  total_cols: number;
}

export interface SheetsPreviewResponse {
  file_id: string;
  file_name: string;
  sheets: SheetPreview[];
}

export interface SheetConfig {
  sheet_name: string;
  header_row: number;
  table_name: string;
  normalize?: boolean;
  skip_rows?: number[];
}

export interface AnalyzeResult {
  file_id: string;
  file_name: string;
  file_type: string;
  summary: string;
  script: string;
  tables: DetectedTable[];
}

// Pricing types
export interface PricingSource {
  id: string;
  brand: string;
  website_name: string;
  url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PricingDataItem {
  id: string;
  source_id: string;
  brand: string;
  type: string;
  otr_price: number;
  batch_id: string;
  scraped_at: string;
}

export interface PricingScrapeJob {
  id: string;
  status: string;
  total_sources: number;
  sources_completed: number;
  items_found: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export const api = {
  auth: {
    verifyPassword: (password: string) =>
      post<{ verified: boolean }>("/api/v1/auth/verify-password", { password }),
  },
  dashboard: {
    stats: () => get<DashboardStats>("/api/v1/dashboard/stats"),
    recent: (limit = 5) => get<Article[]>("/api/v1/dashboard/recent", { limit: String(limit) }),
    trends: (days = 30) => get<Array<Record<string, unknown>>>("/api/v1/dashboard/trends", { days: String(days) }),
  },
  articles: {
    list: (params: Record<string, string>) => get<PaginatedResponse<Article>>("/api/v1/articles", params),
    get: (id: string) => get<Article>(`/api/v1/articles/${id}`),
    delete: (id: string) => del(`/api/v1/articles/${id}`),
  },
  categories: {
    list: () => get<Category[]>("/api/v1/categories"),
    create: (data: { name: string; description?: string; keywords?: string[] }) =>
      post<Category>("/api/v1/categories", data),
    update: (id: string, data: Partial<Category>) => put<Category>(`/api/v1/categories/${id}`, data),
    delete: (id: string) => del(`/api/v1/categories/${id}`),
  },
  sources: {
    list: () => get<Source[]>("/api/v1/sources"),
    create: (data: { site_domain: string }) => post<Source>("/api/v1/sources", data),
    update: (id: string, data: Partial<Source>) => put<Source>(`/api/v1/sources/${id}`, data),
    delete: (id: string) => del(`/api/v1/sources/${id}`),
  },
  scraping: {
    trigger: (password: string) => post<ScrapeJob>("/api/v1/scraping/trigger", { password }),
    jobs: () => get<PaginatedResponse<ScrapeJob>>("/api/v1/scraping/jobs"),
    cancel: (jobId: string) => post<{ status: string; message: string }>(`/api/v1/scraping/jobs/${jobId}/cancel`),
  },
  lineupAnalysis: {
    lineups: () => get<ProductLineup[]>("/api/v1/lineup-analysis/lineups"),
    createLineup: (data: { name: string; segment?: string; competitors?: string[]; market_context?: string; display_order?: number }) =>
      post<ProductLineup>("/api/v1/lineup-analysis/lineups", data),
    updateLineup: (id: string, data: Partial<ProductLineup>) =>
      put<ProductLineup>(`/api/v1/lineup-analysis/lineups/${id}`, data),
    deleteLineup: (id: string) => del(`/api/v1/lineup-analysis/lineups/${id}`),
    generate: (data: { lineup_id: string; date_from?: string; date_to?: string }) =>
      post<LineupReport>("/api/v1/lineup-analysis/generate", data),
    generateAll: (data?: { date_from?: string; date_to?: string }) =>
      post<LineupReport[]>("/api/v1/lineup-analysis/generate-all", data || {}),
    latestReports: () => get<LineupReport[]>("/api/v1/lineup-analysis/reports/latest"),
    getReport: (id: string) => get<LineupReport>(`/api/v1/lineup-analysis/reports/${id}`),
    downloadPdf: async (reportId: string, filename?: string) => {
      const token = localStorage.getItem("access_token");
      const url = `${API_BASE}/api/v1/lineup-analysis/reports/${reportId}/pdf`;
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (!res.ok) throw new ApiError(res.status, "Failed to download PDF");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename || "report.pdf";
      a.click();
      URL.revokeObjectURL(a.href);
    },
  },
  health: {
    evaluation: () => get<HealthResponse & { checked_at?: string }>("/api/v1/health/evaluation"),
    trigger: () => post<{ status: string; message: string }>("/api/v1/health/trigger"),
    history: (limit = 30) => get<HealthCheckHistoryPoint[]>("/api/v1/health/history", { limit: String(limit) }),
    sentimentScrapeLogs: (limit = 20) => get<SentimentScrapeLog[]>("/api/v1/health/sentiment/scrape-logs", { limit: String(limit) }),
    sentimentQualityStats: () => get<SentimentQualityStats>("/api/v1/health/sentiment/quality-stats"),
    sentimentAccounts: () => get<SentimentAccountHealth[]>("/api/v1/health/sentiment/accounts"),
  },
  scheduler: {
    status: () => get<SchedulerStatus>("/api/v1/scheduler/status"),
    pause: () => post<SchedulerStatus>("/api/v1/scheduler/pause"),
    resume: () => post<SchedulerStatus>("/api/v1/scheduler/resume"),
  },
  chat: {
    stream: async function* (messages: ChatMessage[], mode: "quick" | "advisor"): AsyncGenerator<string> {
      const token = localStorage.getItem("access_token");
      const response = await fetch(`${API_BASE}/api/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ messages, mode }),
      });
      if (!response.ok) throw new ApiError(response.status, "Chat request failed");
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") return;
            try {
              yield JSON.parse(data);
            } catch {
              yield data;
            }
          }
        }
      }
    },
  },
  users: {
    list: () => get<UserInfo[]>("/api/v1/users"),
    create: (data: { email: string; full_name: string; password: string; role: string }) =>
      post<UserInfo>("/api/v1/users", data),
    update: (id: string, data: { full_name?: string; role?: string; is_active?: boolean }) =>
      put<UserInfo>(`/api/v1/users/${id}`, data),
    delete: (id: string) => del(`/api/v1/users/${id}`),
  },
  pipeline: {
    upload: (file: File) =>
      uploadFile<PipelineFileSummary>("/api/v1/pipeline/upload", file),
    getFiles: (params: Record<string, string>) =>
      get<PaginatedResponse<PipelineFileSummary>>("/api/v1/pipeline/files", params),
    getFile: (id: string) =>
      get<PipelineFile>(`/api/v1/pipeline/files/${id}`),
    deleteFile: (id: string) =>
      del(`/api/v1/pipeline/files/${id}`),
    downloadFile: async (id: string) => {
      const { url, file_name } = await get<{ url: string; file_name: string }>(
        `/api/v1/pipeline/files/${id}/download`
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = file_name;
      a.target = "_blank";
      a.click();
    },
    getSheetsPreview: (id: string) =>
      get<SheetsPreviewResponse>(`/api/v1/pipeline/files/${id}/sheets`),
    analyze: (id: string) =>
      post<AnalyzeResult>(`/api/v1/pipeline/files/${id}/analyze`),
    parse: (id: string) =>
      post<ParsePreview>(`/api/v1/pipeline/files/${id}/parse`),
    parseWithConfig: (id: string, sheets: SheetConfig[]) =>
      post<ParsePreview>(`/api/v1/pipeline/files/${id}/parse`, { sheets }),
    getPreview: (id: string) =>
      get<ParsePreview>(`/api/v1/pipeline/files/${id}/preview`),
    confirm: (id: string, tables: TableConfirmItem[], sheetConfigs?: SheetConfig[], transformScript?: string) =>
      post<PipelineJob>(`/api/v1/pipeline/files/${id}/confirm`, {
        tables,
        ...(sheetConfigs && { sheet_configs: sheetConfigs }),
        ...(transformScript && { transform_script: transformScript }),
      }),
    process: (id: string) =>
      post<PipelineJob>(`/api/v1/pipeline/files/${id}/process`),
    getJobs: (params: Record<string, string>) =>
      get<PaginatedResponse<PipelineJob>>("/api/v1/pipeline/jobs", params),
    getJob: (id: string) =>
      get<PipelineJob>(`/api/v1/pipeline/jobs/${id}`),
    retryJob: (id: string) =>
      post<PipelineJob>(`/api/v1/pipeline/jobs/${id}/retry`),
    getTableData: (tableName: string, page = 1, pageSize = 50, fileId?: string) =>
      get<TableData>(`/api/v1/pipeline/tables/${tableName}/data`, {
        page: String(page),
        page_size: String(pageSize),
        ...(fileId && { file_id: fileId }),
      }),
  },
  pricing: {
    getSources: () => get<PricingSource[]>("/api/v1/pricing/sources"),
    createSource: (data: { brand: string; website_name: string; url: string }) =>
      post<PricingSource>("/api/v1/pricing/sources", data),
    updateSource: (id: string, data: Partial<PricingSource>) =>
      put<PricingSource>(`/api/v1/pricing/sources/${id}`, data),
    deleteSource: (id: string) => del(`/api/v1/pricing/sources/${id}`),
    triggerScrape: () => post<PricingScrapeJob>("/api/v1/pricing/scrape"),
    getJobs: (page = 1, pageSize = 20) =>
      get<PaginatedResponse<PricingScrapeJob>>("/api/v1/pricing/scrape-jobs", {
        page: String(page),
        page_size: String(pageSize),
      }),
    getJob: (id: string) => get<PricingScrapeJob>(`/api/v1/pricing/scrape-jobs/${id}`),
    getData: (page = 1, pageSize = 50, brand?: string) =>
      get<PaginatedResponse<PricingDataItem>>("/api/v1/pricing/data", {
        page: String(page),
        page_size: String(pageSize),
        ...(brand && { brand }),
      }),
    getLatest: () => get<PricingDataItem[]>("/api/v1/pricing/data/latest"),
  },
};
