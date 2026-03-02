import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import {
  FileText,
  Loader2,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import {
  sentimentApi,
  type SentimentReport,
  type ReportSummary,
  type PaginatedResponse,
} from "@/lib/sentiment-api-client";
import { formatRelativeDate } from "@/lib/utils";
import toast from "react-hot-toast";

function ReportDetailModal({ reportId, onClose }: { reportId: string; onClose: () => void }) {
  const { data: report, isLoading } = useQuery<SentimentReport>({
    queryKey: ["sentiment-report-detail", reportId],
    queryFn: () => sentimentApi.reports.get(reportId),
  });

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-white border border-surface-200 rounded-[20px] max-w-3xl w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-text-tertiary" />
          </div>
        ) : report ? (
          <>
            <div className="sticky top-0 bg-surface-white border-b border-surface-200 px-6 py-4 flex items-start justify-between rounded-t-[20px]">
              <div>
                <h3 className="text-base font-semibold text-text-primary">
                  {report.report_type.charAt(0).toUpperCase() + report.report_type.slice(1)} Report
                </h3>
                <p className="text-xs text-text-tertiary mt-1">
                  {new Date(report.period_start).toLocaleDateString()} - {new Date(report.period_end).toLocaleDateString()}
                  {" | "}{report.total_analyzed} comments analyzed
                  {report.product_name && ` | ${report.product_name}`}
                </p>
                <p className="text-xs text-text-tertiary mt-0.5">
                  Generated {formatRelativeDate(report.generated_at)}
                  {report.model_used && ` | Model: ${report.model_used}`}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-text-tertiary hover:text-text-primary hover:bg-surface-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 prose prose-sm max-w-none text-text-secondary">
              <ReactMarkdown>{report.content}</ReactMarkdown>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-sm text-text-tertiary">Report not found.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function ReportsTab({ selectedProduct }: { selectedProduct?: string }) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  const { data: latestReport, isLoading: latestLoading } = useQuery<SentimentReport | null>({
    queryKey: ["sentiment-latest-report", selectedProduct],
    queryFn: () => sentimentApi.reports.latest(selectedProduct),
  });

  const params: Record<string, string> = { page: String(page), page_size: "10" };
  if (selectedProduct) params.product_lineup_id = selectedProduct;

  const { data: reportHistory, isLoading: historyLoading } = useQuery<PaginatedResponse<ReportSummary>>({
    queryKey: ["sentiment-report-history", page, selectedProduct],
    queryFn: () => sentimentApi.reports.list(params),
  });

  const generateMutation = useMutation({
    mutationFn: () => sentimentApi.reports.generate({
      product_lineup_id: selectedProduct,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sentiment-latest-report"] });
      queryClient.invalidateQueries({ queryKey: ["sentiment-report-history"] });
      queryClient.invalidateQueries({ queryKey: ["sentiment-topics"] });
      queryClient.invalidateQueries({ queryKey: ["sentiment-pain-points"] });
      toast.success("Report generated successfully");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      {/* Generate Button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          AI-generated sentiment analysis reports.
        </p>
        <button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          className="px-5 py-2 text-sm bg-brand-accent text-text-inverse rounded-xl hover:bg-brand-accent-hover disabled:opacity-60 flex items-center gap-1.5 font-medium transition-colors"
        >
          {generateMutation.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <FileText className="w-3.5 h-3.5" />
          )}
          Generate Report
        </button>
      </div>

      {/* Latest Report */}
      {latestLoading ? (
        <div className="h-64 bg-surface-100 rounded-[20px] animate-pulse" />
      ) : latestReport ? (
        <div className="border border-surface-200 rounded-[20px] p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-semibold text-text-primary">Latest Report</h4>
              <p className="text-xs text-text-tertiary mt-0.5">
                {latestReport.report_type} | {new Date(latestReport.period_start).toLocaleDateString()} - {new Date(latestReport.period_end).toLocaleDateString()} | {latestReport.total_analyzed} comments analyzed
                {latestReport.product_name && ` | ${latestReport.product_name}`}
              </p>
            </div>
            <span className="text-xs text-text-tertiary">
              Generated {formatRelativeDate(latestReport.generated_at)}
            </span>
          </div>
          <div className="prose prose-sm max-w-none text-text-secondary">
            <ReactMarkdown>{latestReport.content}</ReactMarkdown>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 border border-surface-200 rounded-[20px]">
          <FileText className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
          <p className="text-sm text-text-tertiary">No reports generated yet. Click "Generate Report" to create one.</p>
        </div>
      )}

      {/* Report History */}
      <div>
        <h4 className="text-sm font-semibold text-text-primary mb-3">Report History</h4>
        {historyLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 bg-surface-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : reportHistory && reportHistory.items.length > 0 ? (
          <>
            <div className="border border-surface-200 rounded-[20px] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-100 border-b border-surface-200">
                    <th className="text-left px-5 py-3 font-medium text-text-secondary">Date</th>
                    <th className="text-left px-5 py-3 font-medium text-text-secondary">Type</th>
                    <th className="text-left px-5 py-3 font-medium text-text-secondary">Product</th>
                    <th className="text-left px-5 py-3 font-medium text-text-secondary">Summary</th>
                    <th className="text-right px-5 py-3 font-medium text-text-secondary">Analyzed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {reportHistory.items.map((report) => (
                    <tr
                      key={report.id}
                      className="hover:bg-surface-100 transition-colors cursor-pointer"
                      onClick={() => setSelectedReportId(report.id)}
                    >
                      <td className="px-5 py-3.5 text-text-tertiary text-xs whitespace-nowrap">
                        {new Date(report.generated_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5 text-text-primary capitalize">{report.report_type}</td>
                      <td className="px-5 py-3.5 text-text-secondary text-xs whitespace-nowrap">
                        {report.product_name || "All Products"}
                      </td>
                      <td className="px-5 py-3.5 text-text-secondary max-w-[400px]">
                        <p className="truncate">{report.summary}</p>
                      </td>
                      <td className="px-5 py-3.5 text-right text-text-secondary">
                        {report.total_analyzed}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {reportHistory.total_pages > 1 && (
              <div className="flex items-center justify-end gap-2 mt-3">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="p-2 text-text-tertiary hover:text-text-primary hover:bg-surface-100 rounded-xl transition-colors disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-text-secondary px-2">
                  Page {page} of {reportHistory.total_pages}
                </span>
                <button
                  onClick={() => setPage(Math.min(reportHistory.total_pages, page + 1))}
                  disabled={page >= reportHistory.total_pages}
                  className="p-2 text-text-tertiary hover:text-text-primary hover:bg-surface-100 rounded-xl transition-colors disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 border border-surface-200 rounded-[20px]">
            <FileText className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
            <p className="text-sm text-text-tertiary">No report history yet.</p>
          </div>
        )}
      </div>

      {selectedReportId && (
        <ReportDetailModal
          reportId={selectedReportId}
          onClose={() => setSelectedReportId(null)}
        />
      )}
    </div>
  );
}
