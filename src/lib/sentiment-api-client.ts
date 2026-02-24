const SENTIMENT_API_BASE = import.meta.env.VITE_SENTIMENT_API_URL || "http://localhost:8001";

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${SENTIMENT_API_BASE}${endpoint}`;
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new ApiError(response.status, error.detail || `Request failed: ${response.statusText}`);
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

// Types
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface SocialAccount {
  id: string;
  platform: string;
  account_name: string;
  account_id: string;
  scrape_config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SentimentResultData {
  sentiment: string;
  confidence: number;
  model_used: string;
  classified_at: string;
}

export interface SentimentComment {
  id: string;
  platform_comment_id: string;
  author_name: string;
  content: string;
  likes_count: number;
  is_reply: boolean;
  commented_at: string | null;
  sentiment_result: SentimentResultData | null;
  platform: string | null;
  product_lineup_id: string | null;
  product_name: string | null;
  is_excluded: boolean;
  source_account: string | null;
  post_url: string | null;
}

export interface SentimentReport {
  id: string;
  report_type: string;
  period_start: string;
  period_end: string;
  content: string;
  summary: string;
  top_topics: TopicItem[];
  pain_points: PainPointItem[];
  platform_breakdown: Record<string, { positive: number; neutral: number; negative: number }>;
  total_analyzed: number;
  model_used: string;
  token_usage: { prompt: number; completion: number } | null;
  generated_at: string;
  created_at: string;
  product_lineup_id: string | null;
  product_name: string | null;
}

export interface ReportSummary {
  id: string;
  report_type: string;
  period_start: string;
  period_end: string;
  summary: string;
  total_analyzed: number;
  generated_at: string;
  product_lineup_id: string | null;
  product_name: string | null;
}

export interface SentimentStats {
  total_comments: number;
  positive_count: number;
  neutral_count: number;
  negative_count: number;
  positive_pct: number;
  neutral_pct: number;
  negative_pct: number;
  period_label: string;
}

export interface TrendPoint {
  date: string;
  positive: number;
  neutral: number;
  negative: number;
}

export interface TopicItem {
  topic: string;
  count: number;
  positive_pct: number;
  neutral_pct: number;
  negative_pct: number;
}

export interface PainPointItem {
  issue: string;
  frequency: number;
  example_comments: string[];
}

export interface PlatformBreakdown {
  platform: string;
  positive: number;
  neutral: number;
  negative: number;
  total: number;
}

export interface ProductBreakdownItem {
  product_lineup_id: string | null;
  product_name: string;
  positive: number;
  neutral: number;
  negative: number;
  total: number;
}

export interface ProductLineup {
  id: string;
  name: string;
  slug: string;
}

export interface ProductMapping {
  id: string;
  product_lineup_id: string;
  product_name: string | null;
  keywords: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CleansingRule {
  id: string;
  rule_type: string;
  pattern: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CleansingPreviewResult {
  original: string;
  cleaned: string | null;
  is_excluded: boolean;
  exclusion_reason: string | null;
  detected_product: string | null;
}

export interface SchedulerStatus {
  is_running: boolean;
  next_run_time: string | null;
  cron_expression: string | null;
  timezone: string | null;
  weekly_next_run_time?: string | null;
  weekly_cron_expression?: string | null;
}

export interface ScrapeLogEntry {
  timestamp: string;
  message: string;
  counts?: Record<string, number>;
}

export interface ScrapeProgress {
  status: "idle" | "running" | "completed" | "failed";
  started_at: string | null;
  finished_at: string | null;
  current_phase: string | null;
  error: string | null;
  logs: ScrapeLogEntry[];
}

export interface ScrapeLogItem {
  id: string;
  status: "completed" | "failed";
  started_at: string;
  finished_at: string;
  error: string | null;
  summary: Record<string, number>;
  log_entries: ScrapeLogEntry[];
  created_at: string;
}

function buildParams(base: Record<string, string>, productLineupId?: string | null): Record<string, string> {
  const params = { ...base };
  if (productLineupId) params.product_lineup_id = productLineupId;
  return params;
}

const PREFIX = "/api/v1/sentiment";

export const sentimentApi = {
  health: () => get<{ status: string; model_loaded: boolean }>(`${PREFIX}/health`),

  dashboard: {
    stats: (days = 7, productLineupId?: string) =>
      get<SentimentStats>(`${PREFIX}/dashboard/stats`, buildParams({ days: String(days) }, productLineupId)),
    trends: (days = 30, productLineupId?: string) =>
      get<TrendPoint[]>(`${PREFIX}/dashboard/trends`, buildParams({ days: String(days) }, productLineupId)),
    topics: (productLineupId?: string) =>
      get<TopicItem[]>(`${PREFIX}/dashboard/topics`, buildParams({}, productLineupId)),
    painPoints: (productLineupId?: string) =>
      get<PainPointItem[]>(`${PREFIX}/dashboard/pain-points`, buildParams({}, productLineupId)),
    platformBreakdown: (days = 7, productLineupId?: string) =>
      get<PlatformBreakdown[]>(`${PREFIX}/dashboard/platform-breakdown`, buildParams({ days: String(days) }, productLineupId)),
    productBreakdown: (days = 7) =>
      get<ProductBreakdownItem[]>(`${PREFIX}/dashboard/product-breakdown`, { days: String(days) }),
  },

  comments: {
    list: (params: Record<string, string>) =>
      get<PaginatedResponse<SentimentComment>>(`${PREFIX}/comments`, params),
    get: (id: string) => get<SentimentComment>(`${PREFIX}/comments/${id}`),
    deleteAll: () => del<{ deleted: number }>(`${PREFIX}/comments`),
  },

  accounts: {
    list: () => get<SocialAccount[]>(`${PREFIX}/accounts`),
    get: (id: string) => get<SocialAccount>(`${PREFIX}/accounts/${id}`),
    create: (data: { platform: string; account_name: string; account_id: string; scrape_config?: Record<string, unknown> }) =>
      post<SocialAccount>(`${PREFIX}/accounts`, data),
    update: (id: string, data: Partial<SocialAccount>) =>
      put<SocialAccount>(`${PREFIX}/accounts/${id}`, data),
    delete: (id: string) => del(`${PREFIX}/accounts/${id}`),
  },

  reports: {
    list: (params: Record<string, string>) =>
      get<PaginatedResponse<ReportSummary>>(`${PREFIX}/reports`, params),
    latest: (productLineupId?: string) =>
      get<SentimentReport | null>(`${PREFIX}/reports/latest`, buildParams({}, productLineupId)),
    get: (id: string) => get<SentimentReport>(`${PREFIX}/reports/${id}`),
    generate: (data?: { date_from?: string; date_to?: string; report_type?: string; product_lineup_id?: string }) =>
      post<SentimentReport>(`${PREFIX}/reports/generate`, data || {}),
  },

  scraping: {
    trigger: () => post<{ status: string; message: string }>(`${PREFIX}/scraping/trigger`),
    triggerWeekly: () => post<{ status: string; message: string }>(`${PREFIX}/scraping/trigger-weekly`),
    progress: () => get<ScrapeProgress>(`${PREFIX}/scraping/progress`),
    logs: (limit = 10) => get<ScrapeLogItem[]>(`${PREFIX}/scraping/logs`, { limit: String(limit) }),
  },

  scheduler: {
    status: () => get<SchedulerStatus>(`${PREFIX}/scraping/scheduler/status`),
    pause: () => post<SchedulerStatus>(`${PREFIX}/scraping/scheduler/pause`),
    resume: () => post<SchedulerStatus>(`${PREFIX}/scraping/scheduler/resume`),
  },

  products: {
    lineups: () => get<ProductLineup[]>(`${PREFIX}/products/lineups`),
    mappings: {
      list: () => get<ProductMapping[]>(`${PREFIX}/products/mappings`),
      create: (data: { product_lineup_id: string; keywords: string[] }) =>
        post<ProductMapping>(`${PREFIX}/products/mappings`, data),
      update: (id: string, data: { keywords?: string[]; is_active?: boolean }) =>
        put<ProductMapping>(`${PREFIX}/products/mappings/${id}`, data),
      delete: (id: string) => del(`${PREFIX}/products/mappings/${id}`),
    },
  },

  cleansing: {
    rules: {
      list: () => get<CleansingRule[]>(`${PREFIX}/cleansing/rules`),
      create: (data: { rule_type: string; pattern: string; description?: string }) =>
        post<CleansingRule>(`${PREFIX}/cleansing/rules`, data),
      update: (id: string, data: { pattern?: string; description?: string; is_active?: boolean }) =>
        put<CleansingRule>(`${PREFIX}/cleansing/rules/${id}`, data),
      delete: (id: string) => del(`${PREFIX}/cleansing/rules/${id}`),
    },
    preview: (text: string) =>
      post<CleansingPreviewResult>(`${PREFIX}/cleansing/preview`, { text }),
  },
};
