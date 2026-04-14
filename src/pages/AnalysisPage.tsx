import { useState, useRef, type ComponentPropsWithoutRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BrainCircuit, Loader2, RefreshCw, Calendar, Quote, Download } from "lucide-react";
import { api, type LineupReport } from "@/lib/api-client";
import { cn, formatRelativeDate } from "@/lib/utils";
import toast from "react-hot-toast";
import ReactMarkdown, { type Components } from "react-markdown";
import { LineupDashboard } from "@/components/lineup-dashboard";

/* -- Consulting-style markdown components for report rendering -- */

function useReportComponents(): Components {
  const counterRef = useRef(0);

  return {
    h2({ children }: ComponentPropsWithoutRef<"h2">) {
      const text = String(children);
      const isSummary = /summary/i.test(text);
      counterRef.current = 0;
      return (
        <div className={cn("mb-4", !isSummary && "mt-10")}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-1 h-6 rounded-full shrink-0",
              isSummary ? "bg-status-info" : "bg-brand-accent"
            )} />
            <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-text-tertiary">
              {children}
            </h2>
          </div>
        </div>
      );
    },

    h3({ children }: ComponentPropsWithoutRef<"h3">) {
      counterRef.current++;
      return (
        <div className="mt-6 mb-3">
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 bg-brand-accent/15 text-text-primary rounded-md flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
              {counterRef.current}
            </span>
            <h3 className="text-[15px] font-semibold text-text-primary leading-snug">
              {children}
            </h3>
          </div>
        </div>
      );
    },

    p({ children }: ComponentPropsWithoutRef<"p">) {
      return (
        <p className="text-sm text-text-secondary leading-relaxed mb-3 pl-9">
          {children}
        </p>
      );
    },

    blockquote({ children }: ComponentPropsWithoutRef<"blockquote">) {
      return (
        <div className="ml-9 mb-5 rounded-xl bg-surface-50 border border-surface-100 px-4 py-3 flex gap-3">
          <Quote className="w-4 h-4 text-text-tertiary shrink-0 mt-0.5 rotate-180" />
          <div className="text-xs text-text-tertiary leading-relaxed [&>p]:mb-1 [&>p]:pl-0 [&>p]:text-xs [&>p]:text-text-tertiary">
            {children}
          </div>
        </div>
      );
    },

    hr() {
      return <hr className="my-6 border-none h-px bg-surface-100" />;
    },

    strong({ children }: ComponentPropsWithoutRef<"strong">) {
      return <strong className="font-semibold text-text-primary">{children}</strong>;
    },

    a({ children, href }: ComponentPropsWithoutRef<"a">) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-status-info hover:underline">
          {children}
        </a>
      );
    },

    ul({ children }: ComponentPropsWithoutRef<"ul">) {
      return <ul className="text-sm text-text-secondary pl-9 mb-3 space-y-1 list-disc list-outside ml-4">{children}</ul>;
    },
    ol({ children }: ComponentPropsWithoutRef<"ol">) {
      return <ol className="text-sm text-text-secondary pl-9 mb-3 space-y-1 list-decimal list-outside ml-4">{children}</ol>;
    },
    li({ children }: ComponentPropsWithoutRef<"li">) {
      return <li className="leading-relaxed">{children}</li>;
    },
  };
}

export default function AnalysisPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const reportComponents = useReportComponents();

  // Fetch lineups
  const { data: lineups, isLoading: lineupsLoading } = useQuery({
    queryKey: ["lineups"],
    queryFn: api.lineupAnalysis.lineups,
  });

  // Fetch latest reports — poll while any report is generating
  const { data: latestReports, isLoading: reportsLoading } = useQuery({
    queryKey: ["lineup-reports-latest"],
    queryFn: api.lineupAnalysis.latestReports,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      return data.some((r) => r.status === "generating") ? 3000 : false;
    },
  });

  // Set default active tab to first lineup
  const effectiveTab = activeTab || lineups?.[0]?.id || null;

  // Generate all mutation
  const generateAllMutation = useMutation({
    mutationFn: () => api.lineupAnalysis.generateAll(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lineup-reports-latest"] });
      toast.success("Report generation started");
    },
    onError: (err: Error) => {
      toast.error(`Failed to generate reports: ${err.message}`);
    },
  });

  // Generate single mutation
  const generateSingleMutation = useMutation({
    mutationFn: (lineupId: string) =>
      api.lineupAnalysis.generate({ lineup_id: lineupId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lineup-reports-latest"] });
      toast.success("Report generation started");
    },
    onError: (err: Error) => {
      toast.error(`Failed to generate report: ${err.message}`);
    },
  });

  const hasAnyGenerating = latestReports?.some((r) => r.status === "generating") ?? false;
  const isGenerating = generateAllMutation.isPending || generateSingleMutation.isPending || hasAnyGenerating;

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const handleDownloadPdf = async (report: LineupReport) => {
    setIsDownloadingPdf(true);
    try {
      const filename = `RadarHub_${report.lineup.slug}_${report.date_from}_${report.date_to}.pdf`;
      await api.lineupAnalysis.downloadPdf(report.id, filename);
      toast.success("PDF downloaded!");
    } catch (err) {
      toast.error(`Failed to download PDF: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Find report for active tab
  const activeReport = latestReports?.find((r) => r.lineup.id === effectiveTab);
  const activeLineup = lineups?.find((l) => l.id === effectiveTab);

  // Build report map for status indicators
  const reportMap = new Map<string, LineupReport>();
  latestReports?.forEach((r) => reportMap.set(r.lineup.id, r));

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-surface-white rounded-[20px] shadow-card p-7">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-text-primary tracking-tight">
              Product Lineup Analysis
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              AI-powered impact assessment per Mitsubishi product lineup
            </p>
          </div>
          <button
            onClick={() => generateAllMutation.mutate()}
            disabled={isGenerating}
            className="px-5 py-2.5 bg-brand-accent text-text-inverse text-sm font-semibold rounded-xl hover:bg-brand-accent-hover disabled:opacity-60 transition-colors flex items-center gap-2 shrink-0"
          >
            {generateAllMutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Generating All...</>
            ) : (
              <><BrainCircuit className="w-4 h-4" /> Generate All Reports</>
            )}
          </button>
        </div>

        {/* Date range info */}
        {activeReport && (
          <div className="mt-4 flex items-center gap-2 text-xs text-text-tertiary">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              Covering {activeReport.date_from} to {activeReport.date_to}
            </span>
          </div>
        )}
      </div>

      {/* Tab Navigation + Report Content */}
      <div className="bg-surface-white rounded-[20px] shadow-card overflow-hidden">
        {/* Product Tabs */}
        {lineupsLoading ? (
          <div className="p-4 border-b border-surface-100">
            <div className="flex gap-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-10 w-28 bg-surface-100 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        ) : lineups && lineups.length > 0 ? (
          <div className="border-b border-surface-100">
            <div className="flex overflow-x-auto px-4 pt-4 pb-0 gap-1 scrollbar-hide">
              {lineups.map((lineup) => {
                const isActive = lineup.id === effectiveTab;
                const hasReport = reportMap.has(lineup.id);

                return (
                  <button
                    key={lineup.id}
                    onClick={() => setActiveTab(lineup.id)}
                    className={cn(
                      "relative px-4 py-2.5 text-sm font-medium rounded-t-xl transition-all duration-200 whitespace-nowrap shrink-0",
                      isActive
                        ? "bg-surface-100 text-text-primary"
                        : "text-text-tertiary hover:text-text-secondary hover:bg-surface-50"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      {lineup.name}
                      {hasReport && reportMap.get(lineup.id)?.status === "generating" ? (
                        <Loader2 className="w-3 h-3 animate-spin text-brand-accent" />
                      ) : hasReport && (
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          isActive ? "bg-status-success" : "bg-surface-300"
                        )} />
                      )}
                    </span>
                    {isActive && (
                      <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-brand-accent rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Report Content Area */}
        <div className="p-7">
          {reportsLoading ? (
            <ReportSkeleton />
          ) : activeReport?.status === "generating" ? (
            <div className="text-center py-16">
              <div className="w-14 h-14 bg-brand-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Loader2 className="w-7 h-7 animate-spin text-brand-accent" />
              </div>
              <h4 className="text-sm font-semibold text-text-primary mb-1">
                Generating Report for {activeLineup?.name}
              </h4>
              <p className="text-xs text-text-tertiary max-w-sm mx-auto">
                AI is analyzing news articles and market data. This page will update automatically when ready.
              </p>
            </div>
          ) : activeReport?.status === "failed" ? (
            <div className="text-center py-16">
              <div className="w-14 h-14 bg-status-error-light rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BrainCircuit className="w-7 h-7 text-status-error" />
              </div>
              <h4 className="text-sm font-semibold text-text-primary mb-1">
                Report Generation Failed
              </h4>
              <p className="text-xs text-text-tertiary mb-5">
                Something went wrong. Try regenerating the report.
              </p>
              <button
                onClick={() => generateSingleMutation.mutate(activeReport.lineup.id)}
                disabled={isGenerating}
                className="px-5 py-2.5 bg-brand-accent text-text-inverse text-sm font-semibold rounded-xl hover:bg-brand-accent-hover disabled:opacity-60 transition-colors inline-flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Retry
              </button>
            </div>
          ) : activeReport ? (
            <div>
              {/* Report Header */}
              <div className="flex items-start justify-between mb-8 pb-6 border-b border-surface-100">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-text-primary tracking-tight">
                      {activeLineup?.name}
                    </h3>
                    <span className="text-xs font-medium text-text-tertiary bg-surface-100 rounded-full px-3 py-1">
                      {activeLineup?.segment}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-text-tertiary">
                    <span>Updated {formatRelativeDate(activeReport.generated_at)}</span>
                    <span className="w-1 h-1 rounded-full bg-surface-300" />
                    <span>{activeReport.model_used}</span>
                    {activeReport.token_usage && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-surface-300" />
                        <span>{activeReport.token_usage.prompt + activeReport.token_usage.completion} tokens</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleDownloadPdf(activeReport)}
                    disabled={isDownloadingPdf}
                    className="px-4 py-2 text-sm text-text-secondary border border-surface-200 rounded-xl hover:bg-surface-50 hover:text-text-primary disabled:opacity-60 transition-colors flex items-center gap-2"
                  >
                    {isDownloadingPdf ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Exporting...</>
                    ) : (
                      <><Download className="w-3.5 h-3.5" /> PDF</>
                    )}
                  </button>
                  <button
                    onClick={() => generateSingleMutation.mutate(activeReport.lineup.id)}
                    disabled={isGenerating}
                    className="px-4 py-2 text-sm text-text-secondary border border-surface-200 rounded-xl hover:bg-surface-50 hover:text-text-primary disabled:opacity-60 transition-colors flex items-center gap-2"
                  >
                    {generateSingleMutation.isPending && generateSingleMutation.variables === activeReport.lineup.id ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Regenerating...</>
                    ) : (
                      <><RefreshCw className="w-3.5 h-3.5" /> Regenerate</>
                    )}
                  </button>
                </div>
              </div>

              {/* Interactive Dashboard (new) OR Markdown Report (fallback) */}
              {activeReport.findings && activeReport.recommendations ? (
                <LineupDashboard
                  findings={activeReport.findings}
                  recommendations={activeReport.recommendations}
                  productName={activeReport.lineup.name}
                  dateFrom={activeReport.date_from}
                  dateTo={activeReport.date_to}
                />
              ) : (
                <div className="report-content">
                  <ReactMarkdown components={reportComponents}>
                    {activeReport.content || ""}
                  </ReactMarkdown>
                </div>
              )}

              {/* Sources Appendix */}
              {activeReport.cited_articles && activeReport.cited_articles.length > 0 && (
                <div className="mt-10 pt-6 border-t-2 border-surface-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-1 h-6 rounded-full bg-text-tertiary shrink-0" />
                    <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-tertiary">
                      Sources Appendix
                    </h4>
                    <span className="text-[10px] font-medium text-text-tertiary bg-surface-100 rounded-full px-2.5 py-0.5">
                      {activeReport.cited_articles.length} cited
                    </span>
                  </div>
                  <div className="grid gap-3">
                    {activeReport.cited_articles.map((citation, i) => (
                      <div
                        key={`${citation.title}-${i}`}
                        className="flex items-start gap-4 p-4 bg-surface-50 rounded-xl border border-surface-100"
                      >
                        <span className="w-7 h-7 bg-surface-100 border border-surface-200 rounded-lg flex items-center justify-center text-xs font-bold text-text-tertiary shrink-0">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          {citation.url ? (
                            <a
                              href={citation.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-text-primary leading-snug hover:text-brand-accent transition-colors"
                            >
                              {citation.title} ↗
                            </a>
                          ) : (
                            <p className="text-sm font-medium text-text-primary leading-snug">
                              {citation.title}
                            </p>
                          )}
                          <p className="text-xs text-text-tertiary mt-1">
                            {citation.source}
                          </p>
                          {citation.relevance_reason && (
                            <p className="text-xs text-text-secondary mt-2 leading-relaxed border-l-2 border-surface-200 pl-3">
                              {citation.relevance_reason}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : activeLineup ? (
            /* Empty State */
            <div className="text-center py-16">
              <div className="w-14 h-14 bg-surface-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BrainCircuit className="w-7 h-7 text-text-tertiary" />
              </div>
              <h4 className="text-sm font-medium text-text-primary mb-1">
                No report generated yet
              </h4>
              <p className="text-xs text-text-tertiary mb-5 max-w-sm mx-auto">
                Generate an impact assessment for {activeLineup.name} to see how recent news affects this product lineup.
              </p>
              <button
                onClick={() => generateSingleMutation.mutate(activeLineup!.id)}
                disabled={isGenerating}
                className="px-5 py-2.5 bg-brand-accent text-text-inverse text-sm font-semibold rounded-xl hover:bg-brand-accent-hover disabled:opacity-60 transition-colors inline-flex items-center gap-2"
              >
                {generateSingleMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                ) : (
                  <><BrainCircuit className="w-4 h-4" /> Generate Report</>
                )}
              </button>
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-sm text-text-tertiary">No product lineups configured.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex justify-between">
        <div>
          <div className="h-5 w-40 bg-surface-100 rounded-lg" />
          <div className="h-3 w-56 bg-surface-100 rounded-lg mt-2" />
        </div>
        <div className="h-9 w-28 bg-surface-100 rounded-xl" />
      </div>
      <div className="h-px bg-surface-100 my-5" />
      <div className="space-y-3">
        <div className="h-4 w-3/4 bg-surface-100 rounded-lg" />
        <div className="h-4 w-full bg-surface-100 rounded-lg" />
        <div className="h-4 w-5/6 bg-surface-100 rounded-lg" />
        <div className="h-4 w-2/3 bg-surface-100 rounded-lg" />
      </div>
      <div className="h-24 bg-surface-100 rounded-xl mt-6" />
      <div className="space-y-3 mt-4">
        <div className="h-4 w-full bg-surface-100 rounded-lg" />
        <div className="h-4 w-4/5 bg-surface-100 rounded-lg" />
        <div className="h-4 w-3/4 bg-surface-100 rounded-lg" />
      </div>
    </div>
  );
}
