import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, CheckCircle2, XCircle, Loader2, RotateCcw, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api-client";
import toast from "react-hot-toast";

interface JobTrackerProps {
  jobId: string;
  onClose: () => void;
}

const STAGE_LABELS: Record<string, string> = {
  downloading: "Downloading file",
  executing_script: "Running AI transform",
  creating_tables: "Creating tables",
  extracting: "Extracting text",
  chunking: "Chunking content",
  embedding_and_indexing: "Embedding & indexing",
  completed: "Completed",
};

function StageNode({
  label,
  status,
  isLast,
}: {
  label: string;
  status: "done" | "running" | "waiting" | "failed";
  isLast: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      {/* Connector line + icon */}
      <div className="flex flex-col items-center">
        <div className="relative">
          {status === "done" && (
            <CheckCircle2 className="w-6 h-6 text-status-success" />
          )}
          {status === "running" && (
            <div className="relative">
              <div className="absolute inset-0 w-6 h-6 rounded-full bg-brand-accent/20 animate-ping" />
              <Loader2 className="w-6 h-6 text-brand-accent animate-spin relative" />
            </div>
          )}
          {status === "waiting" && (
            <Circle className="w-6 h-6 text-surface-300" />
          )}
          {status === "failed" && (
            <XCircle className="w-6 h-6 text-status-error" />
          )}
        </div>
        {!isLast && (
          <div
            className={cn(
              "w-0.5 h-8 mt-1",
              status === "done" ? "bg-status-success" : "bg-surface-200"
            )}
          />
        )}
      </div>

      {/* Label */}
      <div className="pt-0.5">
        <p
          className={cn(
            "text-sm font-medium",
            status === "done" && "text-status-success",
            status === "running" && "text-text-primary",
            status === "waiting" && "text-text-tertiary",
            status === "failed" && "text-status-error"
          )}
        >
          {label}
        </p>
      </div>
    </div>
  );
}

export function JobTracker({ jobId, onClose }: JobTrackerProps) {
  const queryClient = useQueryClient();

  const { data: job } = useQuery({
    queryKey: ["pipeline-job-track", jobId],
    queryFn: () => api.pipeline.getJob(jobId),
    refetchInterval: (query) => {
      const j = query.state.data;
      if (!j) return 1000;
      if (j.status === "completed" || j.status === "failed") return false;
      return 1500;
    },
  });

  const retryMutation = useMutation({
    mutationFn: () => api.pipeline.retryJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-job-track"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-jobs"] });
      toast.success("Job restarted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Invalidate lists when job finishes
  useEffect(() => {
    if (job?.status === "completed" || job?.status === "failed") {
      queryClient.invalidateQueries({ queryKey: ["pipeline-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-files"] });
    }
  }, [job?.status, queryClient]);

  if (!job) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-accent animate-spin" />
      </div>
    );
  }

  // Build pipeline stages from stages_detail
  const stageKeys = job.stages_detail.map((s) => s.stage);
  // Ensure we always have the completed stage
  if (!stageKeys.includes("completed") && job.status === "completed") {
    stageKeys.push("completed");
  }

  // Determine status for each stage
  const getStageStatus = (
    stage: string,
    _idx: number
  ): "done" | "running" | "waiting" | "failed" => {
    const detail = job.stages_detail.find((s) => s.stage === stage);
    if (!detail) {
      if (job.status === "completed") return "done";
      return "waiting";
    }
    if (detail.status === "done" || detail.status === "completed") return "done";
    if (detail.status === "running") {
      // If job failed and this is the last running stage, mark as failed
      if (job.status === "failed") return "failed";
      return "running";
    }
    if (detail.status === "failed") return "failed";
    return "waiting";
  };

  const isFinished = job.status === "completed" || job.status === "failed";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={isFinished ? onClose : undefined}
    >
      <div
        className="bg-surface-white border border-surface-200 rounded-[20px] w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-surface-200">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">
              {job.status === "completed"
                ? "Job Completed"
                : job.status === "failed"
                  ? "Job Failed"
                  : "Processing..."}
            </h3>
            <p className="text-xs text-text-tertiary mt-0.5 capitalize">
              {job.job_type} pipeline
            </p>
          </div>
          {isFinished && (
            <button onClick={onClose} className="p-1.5 hover:bg-surface-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="px-6 pt-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-tertiary">
              {job.current_stage && STAGE_LABELS[job.current_stage]
                ? STAGE_LABELS[job.current_stage]
                : job.current_stage || "Starting..."}
            </span>
            <span className="text-xs font-semibold text-text-primary">{job.progress_pct}%</span>
          </div>
          <div className="w-full bg-surface-100 rounded-full h-2 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700 ease-out",
                job.status === "failed"
                  ? "bg-status-error"
                  : job.status === "completed"
                    ? "bg-status-success"
                    : "bg-brand-accent"
              )}
              style={{ width: `${job.progress_pct}%` }}
            />
          </div>
        </div>

        {/* Pipeline stages */}
        <div className="px-6 py-5">
          {stageKeys.map((stage, idx) => (
            <StageNode
              key={stage}
              label={STAGE_LABELS[stage] || stage}
              status={getStageStatus(stage, idx)}
              isLast={idx === stageKeys.length - 1}
            />
          ))}
        </div>

        {/* Error message */}
        {job.status === "failed" && job.error_message && (
          <div className="px-6 pb-4">
            <div className="bg-status-error-light rounded-xl p-4">
              <p className="text-xs text-status-error font-mono whitespace-pre-wrap break-all leading-relaxed">
                {job.error_message}
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-200">
          {job.status === "failed" && (
            <button
              onClick={() => retryMutation.mutate()}
              disabled={retryMutation.isPending}
              className="px-4 py-2.5 text-sm font-medium border border-surface-200 rounded-xl hover:bg-surface-100 transition-colors text-text-secondary flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Retry
            </button>
          )}
          {isFinished && (
            <button
              onClick={onClose}
              className={cn(
                "px-4 py-2.5 text-sm font-medium rounded-xl transition-colors",
                job.status === "completed"
                  ? "bg-status-success text-white hover:bg-status-success/90"
                  : "bg-surface-200 text-text-primary hover:bg-surface-300"
              )}
            >
              {job.status === "completed" ? "Done" : "Close"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
