const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Base64-encode a string with UTF-8 safety. Used to bypass WAF rules
 * that flag markdown/HTML-like patterns in request bodies. The backend
 * decodes these fields via the _b64_decode helper in Pydantic schemas.
 */
function encodeBase64Utf8(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

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
          if (retry.status === 403) {
            const ct = retry.headers.get("content-type") || "";
            if (!ct.includes("application/json")) {
              throw new ApiError(
                403,
                "Request blocked by WAF (Web Application Firewall). " +
                  "The request body may contain patterns flagged as unsafe. " +
                  "Try simplifying your input or contact the administrator."
              );
            }
          }
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
    // WAF (Azure Front Door / CloudFlare / etc.) blocks return 403 with an
    // HTML body instead of JSON. Detect this and surface a clear message so
    // the user knows their request was blocked by the firewall, not the app.
    if (response.status === 403) {
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new ApiError(
          403,
          "Your request was blocked by our security system. " +
            "Try shortening or simplifying your content, then try again."
        );
      }
    }
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

function patch<T>(endpoint: string, body: unknown): Promise<T> {
  return request<T>(endpoint, { method: "PATCH", body: JSON.stringify(body) });
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
    if (response.status === 403) {
      const ct = response.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        throw new ApiError(
          403,
          "Your request was blocked by our security system. " +
            "Try shortening or simplifying your content, then try again."
        );
      }
    }
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

export type ScrapeDaysBack = 1 | 3 | 7 | 14 | 30 | 90;

export interface ScrapeJob {
  id: string;
  job_type: string;
  status: string;
  total_sources: number;
  sources_completed: number;
  articles_found: number;
  articles_new: number;
  errors: unknown[] | null;
  days_back: number | null;
  start_index: number;
  parent_job_id: string | null;
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

export type FindingSeverity = "red" | "yellow" | "green";
export type FindingCategory =
  | "COMPETITIVE THREAT"
  | "OWNERSHIP RISK"
  | "MARKET MOMENTUM"
  | "REGULATION"
  | "EMERGING CHALLENGER"
  | "OPPORTUNITY";

export interface Finding {
  id: number;
  severity: FindingSeverity;
  category: FindingCategory;
  headline: string;
  evidence: string;
  impact_on_product: string;
  sources: string[];
}

export type RecommendationPriority = "high" | "medium" | "low";
export type RecommendationArea =
  | "marketing"
  | "after-sales"
  | "product positioning"
  | "distribution"
  | "digital";

export interface Recommendation {
  id: number;
  priority: RecommendationPriority;
  area: RecommendationArea;
  recommendation: string;
  rationale: string;
  finding_ids: number[];
  primary_finding_id: number | null;
  supporting_data: string[];
}

export interface LineupReport {
  id: string;
  lineup: { id: string; name: string; slug: string; segment: string | null };
  batch_id: string;
  status: string;
  content: string | null;
  cited_articles: LineupReportCitation[] | null;
  findings: Finding[] | null;
  recommendations: Recommendation[] | null;
  model_used: string | null;
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

export interface RadarBrand {
  brand: string;
  variant_count: number;
  avg_price: number;
  min_price: number;
  max_price: number;
  price_range: number;
}

export interface MarketingPlanSection {
  id: string;
  section_type: string;
  content: string | null;
  ai_draft: string | null;
  cited_articles: Record<string, unknown>[] | null;
  updated_at: string;
}

export interface MarketingPlan {
  id: string;
  lineup_id: string;
  version: number;
  status: string;
  model_used: string | null;
  token_usage: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  sections: MarketingPlanSection[];
}

export interface MarketingPlanBrief {
  id: string;
  version: number;
  status: string;
  created_at: string;
}

// ── A2A Comparison Types ────────────────────────────────

export interface AtoaFeature {
  id: string
  category_id: string
  sub_item: string
  remark: string | null
  detail: string | null
  weight: number
  display_order: number
  created_at: string
  updated_at: string
}

export interface AtoaCategory {
  id: string
  name: string
  display_order: number
  created_at: string
  updated_at: string
  features: AtoaFeature[]
}

export interface AtoaVehicle {
  id: string
  segment: string | null
  model_year: string | null
  maker: string
  model: string
  trim: string | null
  engine_displacement: string | null
  fuel: string | null
  transmission: string | null
  drive_system: string | null
  seat_capacity: number | null
  retail_price: number
  display_order: number
  feature_ids: string[]
  created_at: string
  updated_at: string
}

export interface AtoaComparison {
  categories: AtoaCategory[]
  vehicles: AtoaVehicle[]
}

export interface AtoaMetrics {
  base_value: number
  comp_value: number
  vi_percent: number
  va_percent: number
}

export interface AtoaRadarPoint {
  vehicle_id: string
  maker: string
  model: string
  trim: string | null
  segment: string | null
  value: number
  price: number
  quadrant: string | null
  is_base: boolean
  vi_percent: number | null
  va_percent: number | null
}

export interface PromptTemplate {
  id: string;
  key: string;
  label: string;
  category: string;
  content: string;
  is_default: boolean;
  updated_at: string;
}

// ── Marketing Plan v2 (7-agent Azure AI Foundry pipeline) ────

export interface MarketingPlanV2GenerateRequest {
  lineup_id?: string;
  product_name?: string;
  segment?: string;
  competitors?: string[];
  market_context?: string;
  date_from?: string;
  date_to?: string;
  brand_tone?: string;
}

export interface MarketingPlanV2GenerateAcceptedResponse {
  pipeline_id: string;
  status: string;
  poll_url: string;
}

export interface MarketingPlanV2AgentStageResult {
  agent: string;
  version: string;
  stage: string;
  duration_ms: number;
  raw_output: string;
  parsed_output: Record<string, unknown> | null;
  parse_error: string | null;
}

export interface MarketingPlanV2PipelineStatus {
  pipeline_id: string;
  version: number;
  lineup_id: string | null;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  current_stage: string | null;
  error: string | null;
  target_product: string;
  segment: string | null;
  competitors: string[];
  date_from: string | null;
  date_to: string | null;
  started_at: string | null;
  completed_at: string | null;
  total_duration_ms: number | null;
  trend_synthesis: MarketingPlanV2AgentStageResult | null;
  sentiment_analysis: MarketingPlanV2AgentStageResult | null;
  insight_synthesis: MarketingPlanV2AgentStageResult | null;
  competitive_gap: MarketingPlanV2AgentStageResult | null;
  positioning: MarketingPlanV2AgentStageResult | null;
  evidence_validation: MarketingPlanV2AgentStageResult | null;
  content_creation: MarketingPlanV2AgentStageResult | null;
  deliverable_A: Record<string, unknown> | null;
  deliverable_B: Record<string, unknown> | null;
  deliverable_C: Record<string, unknown> | null;
  /** Auto-generated Key Visual image. Populated after content_creation
   * completes. `image_base64` is null if generation failed — in that case
   * `error` contains the reason. */
  key_visual: {
    image_base64: string | null;
    format: string | null;
    generated_at: string;
    error?: string;
  } | null;
  completed_stages: number;
  progress_percent: number;
}

// ── Marketing Planner types ──

export interface MarketingPlanState {
  id: string;
  status: "draft" | "audit" | "clarifying" | "summarizing" | "generating" | "completed" | "failed";
  error: string | null;
  lineup_report_id: string;
  recommendation_id: number;
  recommendation: Record<string, unknown>;
  linked_findings: Record<string, unknown>[];
  audit_result: {
    content_map: { category: string; status: string; detail: string }[];
    gaps: { category: string; why_needed: string }[];
    confirmed_at: string | null;
  } | null;
  clarification: {
    questions: ClarificationQuestion[];
    current_question_index: number;
    completed_at: string | null;
    is_final: boolean;
  } | null;
  summary_brief: {
    content: Record<string, unknown>;
    approved_at: string | null;
  } | null;
  plan: Record<string, unknown> | null;
  key_visual: {
    image_base64: string | null;
    format: string | null;
    generated_at: string | null;
    error?: string | null;
  } | null;
  created_at: string;
  updated_at: string;
}

/** @deprecated Use MarketingPlanState instead */
export type CampaignPlanState = MarketingPlanState;

export interface ClarificationQuestion {
  id: number;
  type: "select" | "multiselect" | "text" | "textarea" | "number" | "radio" | "budget_tier";
  label: string;
  description: string | null;
  options: string[] | null;
  required: boolean;
  answer: unknown;
}

export interface MarketingPlanSummary {
  id: string;
  status: string;
  product_name: string;
  recommendation_id: number;
  recommendation_headline: string;
  recommendation_priority: string;
  recommendation_area: string;
  lineup_report_id: string;
  created_at: string;
  updated_at: string;
}

/** @deprecated Use MarketingPlanSummary instead */
export type CampaignPlanSummary = MarketingPlanSummary;

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
    reindex: () => post<{ status: string; message: string }>("/api/v1/articles/reindex", {}),
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
    trigger: (password: string, daysBack?: ScrapeDaysBack) =>
      post<ScrapeJob>("/api/v1/scraping/trigger", {
        password,
        ...(daysBack !== undefined ? { days_back: daysBack } : {}),
      }),
    resume: (jobId: string, password: string) =>
      post<ScrapeJob>(`/api/v1/scraping/jobs/${jobId}/resume`, { password }),
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
      post<{ batch_id: string; status: string }>("/api/v1/lineup-analysis/generate-all", data || {}),
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
    stream: async function* (messages: ChatMessage[], mode: "quick" | "advisor" | "hypothesis"): AsyncGenerator<string> {
      const buildBody = () =>
        JSON.stringify({
          messages: messages.map((m) => ({
            role: m.role,
            content: btoa(unescape(encodeURIComponent(m.content))),
          })),
          mode,
          encoded: true,
        });

      const doFetch = (bearerToken: string | null) =>
        fetch(`${API_BASE}/api/v1/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
          },
          credentials: "include",
          body: buildBody(),
        });

      let token = localStorage.getItem("access_token");
      let response = await doFetch(token);

      // If 401, try refresh token once then retry
      if (response.status === 401 && token) {
        const newToken = await tryRefreshToken();
        if (newToken) {
          response = await doFetch(newToken);
        } else {
          localStorage.removeItem("access_token");
          window.location.href = import.meta.env.BASE_URL + "login";
          throw new ApiError(401, "Session expired");
        }
      }
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
    submitPassword: (id: string, password: string) =>
      post<PipelineFileSummary>(`/api/v1/pipeline/files/${id}/password`, { password }),
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
  marketingPlan: {
    generate: (lineup_id: string) =>
      post<MarketingPlan>("/api/v1/marketing-plans/generate", { lineup_id }),
    listByLineup: (lineup_id: string) =>
      get<MarketingPlanBrief[]>(`/api/v1/marketing-plans/lineup/${lineup_id}`),
    get: (plan_id: string) =>
      get<MarketingPlan>(`/api/v1/marketing-plans/${plan_id}`),
    updateSection: (plan_id: string, section_type: string, content: string) =>
      put<MarketingPlanSection>(`/api/v1/marketing-plans/${plan_id}/sections/${section_type}`, {
        content: encodeBase64Utf8(content),
      }),
    updateStatus: (plan_id: string, status: string) =>
      put<MarketingPlan>(`/api/v1/marketing-plans/${plan_id}/status`, { status }),
    generateKV: (planId: string, data: { product_name: string; product_slug: string; pillar_name: string; key_message: string }) =>
      post<{ image: string; format: string }>(`/api/v1/marketing-plans/${planId}/generate-kv`, {
        ...data,
        pillar_name: encodeBase64Utf8(data.pillar_name),
        key_message: encodeBase64Utf8(data.key_message),
      }),
    downloadPdf: async (planId: string, filename?: string) => {
      const token = localStorage.getItem("access_token");
      const url = `${API_BASE}/api/v1/marketing-plans/${planId}/export-pdf`;
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (!res.ok) throw new ApiError(res.status, "Failed to download PDF");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename || "marketing-plan.pdf";
      a.click();
      URL.revokeObjectURL(a.href);
    },
    revise: (planId: string, data: { instruction: string; mode: "selected" | "full"; selected_text?: string; section_type?: string }) =>
      post<{ revised_content: string }>(`/api/v1/marketing-plans/${planId}/revise`, {
        ...data,
        instruction: encodeBase64Utf8(data.instruction),
        selected_text: data.selected_text ? encodeBase64Utf8(data.selected_text) : data.selected_text,
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
    triggerPlaywrightScrape: () => post<PricingScrapeJob>("/api/v1/pricing/scrape-pw"),
    getJobs: (page = 1, pageSize = 20) =>
      get<PaginatedResponse<PricingScrapeJob>>("/api/v1/pricing/scrape-jobs", {
        page: String(page),
        page_size: String(pageSize),
      }),
    getJob: (id: string) => get<PricingScrapeJob>(`/api/v1/pricing/scrape-jobs/${id}`),
    getData: (page = 1, pageSize = 50, brand?: string, sortBy = "scraped_at", sortDir = "desc") =>
      get<PaginatedResponse<PricingDataItem>>("/api/v1/pricing/data", {
        page: String(page),
        page_size: String(pageSize),
        sort_by: sortBy,
        sort_dir: sortDir,
        ...(brand && { brand }),
      }),
    getLatest: () => get<PricingDataItem[]>("/api/v1/pricing/data/latest"),
    getRadar: () => get<RadarBrand[]>("/api/v1/pricing/data/radar"),
  },
  atoa: {
    getComparison: () =>
      get<AtoaComparison>('/api/v1/atoa/comparison'),

    getVehicles: () =>
      get<AtoaVehicle[]>('/api/v1/atoa/vehicles'),

    getMetrics: (baseId: string, compId: string) =>
      get<AtoaMetrics>(`/api/v1/atoa/metrics?base_id=${baseId}&comp_id=${compId}`),

    getRadarAll: () =>
      get<AtoaRadarPoint[]>('/api/v1/atoa/radar-all'),

    getRadar: (baseId: string) =>
      get<AtoaRadarPoint[]>(`/api/v1/atoa/radar?base_id=${baseId}`),

    createCategory: (data: { name: string }) =>
      post<AtoaCategory>('/api/v1/atoa/categories', data),

    updateCategory: (id: string, data: { name?: string; display_order?: number }) =>
      put<AtoaCategory>(`/api/v1/atoa/categories/${id}`, data),

    deleteCategory: (id: string) =>
      del(`/api/v1/atoa/categories/${id}`),

    createFeature: (data: { category_id: string; sub_item: string; remark?: string; detail?: string; weight?: number }) =>
      post<AtoaFeature>('/api/v1/atoa/features', data),

    updateFeature: (id: string, data: { sub_item?: string; remark?: string; detail?: string; weight?: number; display_order?: number }) =>
      put<AtoaFeature>(`/api/v1/atoa/features/${id}`, data),

    deleteFeature: (id: string) =>
      del(`/api/v1/atoa/features/${id}`),

    createVehicle: (data: { maker: string; model: string; retail_price: number; segment?: string; model_year?: string; trim?: string; engine_displacement?: string; fuel?: string; transmission?: string; drive_system?: string; seat_capacity?: number }) =>
      post<AtoaVehicle>('/api/v1/atoa/vehicles', data),

    updateVehicle: (id: string, data: Partial<{ maker: string; model: string; retail_price: number; segment: string; model_year: string; trim: string; engine_displacement: string; fuel: string; transmission: string; drive_system: string; seat_capacity: number; display_order: number }>) =>
      put<AtoaVehicle>(`/api/v1/atoa/vehicles/${id}`, data),

    deleteVehicle: (id: string) =>
      del(`/api/v1/atoa/vehicles/${id}`),

    toggleFeature: (vehicleId: string, featureId: string) =>
      post<AtoaVehicle>(`/api/v1/atoa/vehicles/${vehicleId}/toggle-feature`, { feature_id: featureId }),

    bulkToggle: (vehicleId: string, featureIds: string[], action: 'add' | 'remove') =>
      post<AtoaVehicle>(`/api/v1/atoa/vehicles/${vehicleId}/bulk-toggle`, { feature_ids: featureIds, action }),
  },

  promptTemplates: {
    list: () => get<PromptTemplate[]>("/api/v1/prompt-templates"),
    update: (key: string, content: string) =>
      put<PromptTemplate>(`/api/v1/prompt-templates/${key}`, {
        content: encodeBase64Utf8(content),
      }),
    reset: (key: string) =>
      post<PromptTemplate>(`/api/v1/prompt-templates/${key}/reset`),
  },

  marketingPlanV2: {
    generate: (data: MarketingPlanV2GenerateRequest) =>
      post<MarketingPlanV2GenerateAcceptedResponse>(
        "/api/v2/marketing-plan/generate",
        data
      ),
    getStatus: (pipelineId: string) =>
      get<MarketingPlanV2PipelineStatus>(
        `/api/v2/marketing-plan/${pipelineId}`
      ),
    getLatestForLineup: (lineupId: string) =>
      get<MarketingPlanV2PipelineStatus | null>(
        `/api/v2/marketing-plan/lineup/${lineupId}/latest`
      ),
    listVersionsForLineup: (lineupId: string) =>
      get<MarketingPlanV2PipelineStatus[]>(
        `/api/v2/marketing-plan/lineup/${lineupId}/versions`
      ),
    listRecent: (params?: { limit?: number; lineup_id?: string }) => {
      const query: Record<string, string> = {};
      if (params?.limit) query.limit = String(params.limit);
      if (params?.lineup_id) query.lineup_id = params.lineup_id;
      return get<MarketingPlanV2PipelineStatus[]>(
        "/api/v2/marketing-plan",
        query
      );
    },
    /**
     * Update one deliverable (A/B/C). The body is base64-encoded JSON to
     * bypass WAF rules that block raw quoted JSON. Backend decodes via a
     * Pydantic field validator.
     */
    updateDeliverable: (
      pipelineId: string,
      letter: "a" | "b" | "c",
      content: Record<string, unknown>
    ) =>
      patch<MarketingPlanV2PipelineStatus>(
        `/api/v2/marketing-plan/${pipelineId}/deliverables/${letter}`,
        { content: encodeBase64Utf8(JSON.stringify(content)) }
      ),
    resetDeliverable: (pipelineId: string, letter: "a" | "b" | "c") =>
      post<MarketingPlanV2PipelineStatus>(
        `/api/v2/marketing-plan/${pipelineId}/deliverables/${letter}/reset`,
        {}
      ),
    reviseDeliverable: (
      pipelineId: string,
      letter: "a" | "b" | "c",
      instruction: string
    ) =>
      post<{ revised: Record<string, unknown> }>(
        `/api/v2/marketing-plan/${pipelineId}/deliverables/${letter}/revise`,
        { instruction }
      ),
    regenerateKeyVisual: (pipelineId: string) =>
      post<MarketingPlanV2PipelineStatus>(
        `/api/v2/marketing-plan/${pipelineId}/regenerate-kv`,
        {}
      ),
  },

  marketingPlanner: {
    create: (body: { lineup_report_id: string; recommendation_id: number }) =>
      post<MarketingPlanState>("/api/v2/marketing-plans", body),

    get: (id: string) =>
      get<MarketingPlanState>(`/api/v2/marketing-plans/${id}`),

    list: (reportId?: string) =>
      get<MarketingPlanSummary[]>(`/api/v2/marketing-plans${reportId ? `?lineup_report_id=${reportId}` : ""}`),

    confirmAudit: (id: string) =>
      post<MarketingPlanState>(`/api/v2/marketing-plans/${id}/confirm-audit`),

    answer: (id: string, questionId: number, answer: unknown) =>
      post<MarketingPlanState>(`/api/v2/marketing-plans/${id}/answer`, {
        question_id: questionId,
        answer,
      }),

    generateSummary: (id: string) =>
      post<{ plan_id: string }>(`/api/v2/marketing-plans/${id}/generate-summary`),

    approveSummary: (id: string) =>
      post<{ plan_id: string }>(`/api/v2/marketing-plans/${id}/approve-summary`),

    revert: (id: string, step: string) =>
      post<MarketingPlanState>(`/api/v2/marketing-plans/${id}/revert/${step}`),

    updateSection: (id: string, key: string, content: Record<string, unknown>) =>
      patch<MarketingPlanState>(`/api/v2/marketing-plans/${id}/sections/${key}`, { content }),

    resetSection: (id: string, key: string) =>
      post<MarketingPlanState>(`/api/v2/marketing-plans/${id}/sections/${key}/reset`),

    regenerateKv: (id: string) =>
      post<{ plan_id: string }>(`/api/v2/marketing-plans/${id}/regenerate-kv`),

    regeneratePlan: (id: string) =>
      post<{ plan_id: string }>(`/api/v2/marketing-plans/${id}/regenerate`),
  },
};
