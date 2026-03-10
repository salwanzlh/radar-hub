import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock, Cog } from "lucide-react";
import { cn, formatRelativeDate } from "@/lib/utils";
import { api } from "@/lib/api-client";
import type { PipelineJob } from "@/lib/api-client";

const JOB_STATUS_STYLES: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  pending: { icon: Clock, color: "text-text-tertiary", bg: "bg-surface-200" },
  running: { icon: Cog, color: "text-yellow-600", bg: "bg-yellow-50" },
  completed: { icon: CheckCircle2, color: "text-status-success", bg: "bg-status-success-light" },
  failed: { icon: XCircle, color: "text-status-error", bg: "bg-status-error-light" },
};

function formatDuration(start: string | null, end: string | null): string {
  if (!start) return "—";
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  const sec = Math.floor((e - s) / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  return `${min}m ${sec % 60}s`;
}

function ActiveJobCard({ job }: { job: PipelineJob }) {
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
              {job.current_stage || job.status} — {formatDuration(job.started_at, job.completed_at)}
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
    </div>
  );
}

export function JobsTab() {
  const [page, setPage] = useState(1);
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

  const activeJobs = data?.items.filter((j) => j.status === "pending" || j.status === "running") || [];
  const completedJobs = data?.items.filter((j) => j.status !== "pending" && j.status !== "running") || [];
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
            <ActiveJobCard key={job.id} job={job} />
          ))}
        </div>
      )}

      {/* Completed Jobs Table */}
      {completedJobs.length > 0 && (
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
                  {completedJobs.map((job) => {
                    const statusInfo = JOB_STATUS_STYLES[job.status] || JOB_STATUS_STYLES.pending;
                    return (
                      <tr key={job.id} className="hover:bg-surface-100 transition-colors">
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
                          {job.started_at ? formatRelativeDate(job.started_at) : "—"}
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
            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, data.total)} of {data.total}
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
    </div>
  );
}
