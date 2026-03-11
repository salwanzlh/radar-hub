import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock, Cog, RotateCcw, X } from "lucide-react";
import { cn, formatRelativeDate } from "@/lib/utils";
import { api } from "@/lib/api-client";
import type { PipelineJob } from "@/lib/api-client";
import toast from "react-hot-toast";

const JOB_STATUS_STYLES: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  pending: { icon: Clock, color: "text-text-tertiary", bg: "bg-surface-200" },
  running: { icon: Cog, color: "text-yellow-600", bg: "bg-yellow-50" },
  completed: { icon: CheckCircle2, color: "text-status-success", bg: "bg-status-success-light" },
  failed: { icon: XCircle, color: "text-status-error", bg: "bg-status-error-light" },
};

function formatDuration(start: string | null, end: string | null): string {
  if (!start) return "--";
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  const sec = Math.floor((e - s) / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  return `${min}m ${sec % 60}s`;
}

function ErrorModal({ job, onClose }: { job: PipelineJob; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-white border border-surface-200 rounded-[20px] max-w-lg w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-surface-200">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Job Failed</h3>
            <p className="text-xs text-text-tertiary mt-1">
              {job.job_type} -- {job.started_at ? formatRelativeDate(job.started_at) : "--"}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5">
          {/* Stages */}
          {job.stages_detail.length > 0 && (
            <div className="space-y-1.5 mb-4">
              {job.stages_detail.map((stage, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  {stage.status === "done" ? (
                    <CheckCircle2 className="w-3 h-3 text-status-success shrink-0" />
                  ) : stage.status === "running" ? (
                    <Cog className="w-3 h-3 text-yellow-600 shrink-0" />
                  ) : (
                    <XCircle className="w-3 h-3 text-status-error shrink-0" />
                  )}
                  <span className="text-text-secondary">{stage.stage}</span>
                </div>
              ))}
            </div>
          )}

          {/* Error message */}
          <div className="bg-status-error-light rounded-xl p-4">
            <p className="text-xs font-medium text-status-error mb-1">Error</p>
            <p className="text-xs text-status-error whitespace-pre-wrap break-all font-mono leading-relaxed">
              {job.error_message || "Unknown error"}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-200">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium border border-surface-200 rounded-xl hover:bg-surface-100 transition-colors text-text-secondary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function ActiveJobCard({ job, onRetry }: { job: PipelineJob; onRetry?: (id: string) => void }) {
  const statusInfo = JOB_STATUS_STYLES[job.status] || JOB_STATUS_STYLES.pending;
  const StatusIcon = statusInfo.icon;

  return (
    <div className="border border-surface-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-xl", statusInfo.bg)}>
            <StatusIcon className={cn("w-4 h-4", statusInfo.color, job.status === "running" && "animate-spin")} />
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">
              Job: {job.job_type}
            </p>
            <p className="text-xs text-text-tertiary">
              {job.current_stage || job.status} -- {formatDuration(job.started_at, job.completed_at)}
            </p>
          </div>
        </div>
        <span className="text-sm font-semibold text-text-primary">{job.progress_pct}%</span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-surface-100 rounded-full h-2 overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            job.status === "failed" ? "bg-status-error" : "bg-brand-accent"
          )}
          style={{ width: `${job.progress_pct}%` }}
        />
      </div>

      {/* Stage details */}
      {job.stages_detail.length > 0 && (
        <div className="mt-3 space-y-1">
          {job.stages_detail.map((stage, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              {stage.status === "completed" ? (
                <CheckCircle2 className="w-3 h-3 text-status-success shrink-0" />
              ) : stage.status === "running" ? (
                <Loader2 className="w-3 h-3 text-yellow-600 animate-spin shrink-0" />
              ) : stage.status === "failed" ? (
                <XCircle className="w-3 h-3 text-status-error shrink-0" />
              ) : (
                <Clock className="w-3 h-3 text-text-tertiary shrink-0" />
              )}
              <span className={cn(
                stage.status === "running" ? "text-text-primary font-medium" : "text-text-tertiary"
              )}>
                {stage.stage}
              </span>
              {stage.message && (
                <span className="text-text-tertiary ml-auto">{stage.message}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Error message */}
      {job.error_message && (
        <p className="mt-3 text-xs text-status-error bg-status-error-light rounded-lg px-3 py-2">
          {job.error_message}
        </p>
      )}

      {/* Retry button for failed jobs */}
      {job.status === "failed" && onRetry && (
        <button
          onClick={() => onRetry(job.id)}
          className="mt-3 flex items-center gap-2 px-3 py-2 text-xs font-medium border border-surface-200 rounded-lg hover:bg-surface-100 transition-colors text-text-secondary"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Retry
        </button>
      )}
    </div>
  );
}

export function JobsTab() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [errorJob, setErrorJob] = useState<PipelineJob | null>(null);
  const pageSize = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["pipeline-jobs", page],
    queryFn: () =>
      api.pipeline.getJobs({
        page: String(page),
        page_size: String(pageSize),
      }),
    refetchInterval: (query) => {
      const jobs = query.state.data?.items;
      if (!jobs) return false;
      const hasActive = jobs.some((j) => j.status === "pending" || j.status === "running");
      return hasActive ? 3000 : false;
    },
  });

  const retryMutation = useMutation({
    mutationFn: (jobId: string) => api.pipeline.retryJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-files"] });
      setErrorJob(null);
      toast.success("Job restarted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleRetry = (jobId: string) => {
    retryMutation.mutate(jobId);
  };

  const activeJobs = data?.items.filter((j) => j.status === "pending" || j.status === "running") || [];
  const historyJobs = data?.items.filter((j) => j.status === "completed" || j.status === "failed") || [];
  const totalPages = data ? data.total_pages : 1;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-text-tertiary animate-spin" />
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="text-center py-16 text-text-tertiary text-sm">
        No pipeline jobs yet. Upload and process a file to get started.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Jobs */}
      {activeJobs.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-text-secondary">Active Jobs</h3>
          {activeJobs.map((job) => (
            <ActiveJobCard key={job.id} job={job} onRetry={handleRetry} />
          ))}
        </div>
      )}

      {/* Job History Table */}
      {historyJobs.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-text-secondary">Job History</h3>
          <div className="border border-surface-200 rounded-[20px] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-100 border-b border-surface-200">
                    <th className="text-left px-5 py-3 font-medium text-text-secondary">Type</th>
                    <th className="text-left px-5 py-3 font-medium text-text-secondary">Status</th>
                    <th className="text-left px-5 py-3 font-medium text-text-secondary">Progress</th>
                    <th className="text-right px-5 py-3 font-medium text-text-secondary">Started</th>
                    <th className="text-right px-5 py-3 font-medium text-text-secondary">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {historyJobs.map((job) => {
                    const statusInfo = JOB_STATUS_STYLES[job.status] || JOB_STATUS_STYLES.pending;
                    const isFailed = job.status === "failed";
                    return (
                      <tr
                        key={job.id}
                        onClick={isFailed ? () => setErrorJob(job) : undefined}
                        className={cn(
                          "hover:bg-surface-100 transition-colors",
                          isFailed && "cursor-pointer"
                        )}
                      >
                        <td className="px-5 py-3.5 text-text-primary capitalize">{job.job_type}</td>
                        <td className="px-5 py-3.5">
                          <span className={cn(
                            "px-2.5 py-1 text-xs font-semibold rounded-full",
                            statusInfo.bg, statusInfo.color
                          )}>
                            {job.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-text-secondary">{job.progress_pct}%</td>
                        <td className="px-5 py-3.5 text-right text-text-tertiary text-xs">
                          {job.started_at ? formatRelativeDate(job.started_at) : "--"}
                        </td>
                        <td className="px-5 py-3.5 text-right text-text-tertiary text-xs">
                          {formatDuration(job.started_at, job.completed_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-surface-200">
          <p className="text-xs text-text-tertiary">
            {(page - 1) * pageSize + 1}--{Math.min(page * pageSize, data.total)} of {data.total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="p-2.5 rounded-xl border border-surface-200 hover:bg-surface-white disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-text-secondary px-4">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="p-2.5 rounded-xl border border-surface-200 hover:bg-surface-white disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Error detail modal */}
      {errorJob && (
        <ErrorModal job={errorJob} onClose={() => setErrorJob(null)} />
      )}
    </div>
  );
}
