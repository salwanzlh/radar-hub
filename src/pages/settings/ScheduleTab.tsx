import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Globe,
  Clock,
  Loader2,
  Play,
  Pause,
  RefreshCw,
  StopCircle,
  Newspaper,
  Database,
  Zap,
  Lock,
  X,
  Eye,
  EyeOff,
} from "lucide-react";
import { api, type ScrapeDaysBack, type ScrapeJob } from "@/lib/api-client";
import { cn, formatRelativeDate } from "@/lib/utils";
import toast from "react-hot-toast";

function ScrapeProgressPanel({ job }: { job: ScrapeJob }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startTime = job.started_at ? new Date(job.started_at).getTime() : Date.now();
    const tick = () => setElapsed(Math.floor((Date.now() - startTime) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [job.started_at]);

  const progress = job.total_sources > 0
    ? Math.round((job.sources_completed / job.total_sources) * 100)
    : 0;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  const isPending = job.status === "pending";

  return (
    <div className="relative overflow-hidden border border-brand-accent/30 rounded-2xl bg-gradient-to-br from-brand-accent/5 via-surface-50 to-status-info/5">
      {/* Animated top border */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-surface-200 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-brand-accent via-status-info to-brand-accent transition-all duration-700 ease-out"
          style={{ width: isPending ? "100%" : `${Math.max(progress, 5)}%` }}
        />
        {isPending && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-brand-accent/60 to-transparent animate-[shimmer_1.5s_ease-in-out_infinite]" />
        )}
      </div>

      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-brand-accent" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-accent opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-brand-accent" />
              </span>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-text-primary">
                {isPending ? "Preparing scrape..." : "Scraping in progress"}
              </h4>
              <p className="text-xs text-text-tertiary mt-0.5">
                Elapsed: {formatTime(elapsed)}
              </p>
            </div>
          </div>
          {!isPending && job.total_sources > 0 && (
            <span className="text-2xl font-bold text-brand-accent tabular-nums">
              {progress}%
            </span>
          )}
        </div>

        {/* Progress Bar */}
        {!isPending && job.total_sources > 0 && (
          <div className="mb-5">
            <div className="h-2.5 bg-surface-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-accent to-status-info transition-all duration-700 ease-out relative"
                style={{ width: `${Math.max(progress, 3)}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_ease-in-out_infinite]" />
              </div>
            </div>
          </div>
        )}

        {/* Indeterminate bar for pending */}
        {isPending && (
          <div className="mb-5">
            <div className="h-2.5 bg-surface-200 rounded-full overflow-hidden">
              <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-brand-accent/40 via-brand-accent to-brand-accent/40 animate-[indeterminate_1.5s_ease-in-out_infinite]" />
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/80 rounded-xl p-3.5 border border-surface-100">
            <div className="flex items-center gap-2 mb-1.5">
              <Globe className="w-3.5 h-3.5 text-status-info" />
              <span className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider">Sources</span>
            </div>
            <p className="text-lg font-bold text-text-primary tabular-nums">
              {job.sources_completed}
              <span className="text-sm font-normal text-text-tertiary">/{job.total_sources}</span>
            </p>
          </div>
          <div className="bg-white/80 rounded-xl p-3.5 border border-surface-100">
            <div className="flex items-center gap-2 mb-1.5">
              <Newspaper className="w-3.5 h-3.5 text-status-success" />
              <span className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider">Found</span>
            </div>
            <p className="text-lg font-bold text-text-primary tabular-nums">
              {job.articles_found}
            </p>
          </div>
          <div className="bg-white/80 rounded-xl p-3.5 border border-surface-100">
            <div className="flex items-center gap-2 mb-1.5">
              <Database className="w-3.5 h-3.5 text-brand-accent" />
              <span className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider">New</span>
            </div>
            <p className="text-lg font-bold text-text-primary tabular-nums">
              {job.articles_new}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const DAYS_BACK_OPTIONS: { value: ScrapeDaysBack; label: string }[] = [
  { value: 1, label: "Last 24 hours" },
  { value: 3, label: "Last 3 days" },
  { value: 7, label: "Last 7 days" },
  { value: 14, label: "Last 14 days" },
  { value: 30, label: "Last 30 days" },
  { value: 90, label: "Last 90 days" },
];

export default function ScheduleTab() {
  const queryClient = useQueryClient();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [daysBack, setDaysBack] = useState<ScrapeDaysBack>(1);

  const { data: schedulerStatus, isLoading: statusLoading } = useQuery({
    queryKey: ["scheduler-status"],
    queryFn: api.scheduler.status,
    refetchInterval: 10000,
  });

  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ["scrape-jobs"],
    queryFn: api.scraping.jobs,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      const hasActive = data.items.some(
        (j) => j.status === "running" || j.status === "pending"
      );
      return hasActive ? 3000 : false;
    },
  });

  const pauseMutation = useMutation({
    mutationFn: api.scheduler.pause,
    onSuccess: (data) => {
      queryClient.setQueryData(["scheduler-status"], data);
      toast.success("Scheduler paused");
    },
    onError: (err: Error) => toast.error(`Failed to pause: ${err.message}`),
  });

  const resumeMutation = useMutation({
    mutationFn: api.scheduler.resume,
    onSuccess: (data) => {
      queryClient.setQueryData(["scheduler-status"], data);
      toast.success("Scheduler resumed");
    },
    onError: (err: Error) => toast.error(`Failed to resume: ${err.message}`),
  });

  const triggerMutation = useMutation({
    mutationFn: (args: { password: string; daysBack: ScrapeDaysBack }) =>
      api.scraping.trigger(args.password, args.daysBack),
    onSuccess: () => {
      setShowPasswordModal(false);
      setPassword("");
      queryClient.invalidateQueries({ queryKey: ["scrape-jobs"] });
      toast.success("Scrape job triggered!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const cancelMutation = useMutation({
    mutationFn: (jobId: string) => api.scraping.cancel(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scrape-jobs"] });
      toast.success("Scrape job cancelled");
    },
    onError: (err: Error) => toast.error(`Failed to cancel: ${err.message}`),
  });

  const isSchedulerRunning = schedulerStatus?.is_running;
  const hasActiveJob = jobs?.items.some(
    (j) => j.status === "running" || j.status === "pending"
  );

  return (
    <div className="space-y-6">
      {/* Scheduler Status */}
      <div>
        <h4 className="text-sm font-semibold text-text-primary mb-3">Scheduler</h4>
        <div className="flex items-center gap-4 p-5 border border-surface-200 rounded-xl bg-surface-50">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span
                  className={cn(
                    "absolute inline-flex h-full w-full rounded-full opacity-75",
                    isSchedulerRunning ? "bg-status-success animate-ping" : "hidden"
                  )}
                />
                <span
                  className={cn(
                    "relative inline-flex h-2.5 w-2.5 rounded-full",
                    isSchedulerRunning ? "bg-status-success" : "bg-surface-300"
                  )}
                />
              </span>
              <span className="text-sm font-medium text-text-primary">
                {statusLoading
                  ? "Loading..."
                  : isSchedulerRunning
                  ? "Running"
                  : "Paused"}
              </span>
            </div>
            {schedulerStatus?.jobs && schedulerStatus.jobs.length > 0 && (
              <div className="ml-5 space-y-2 mt-1">
                {schedulerStatus.jobs.map((job: { id: string; name: string; frequency: string; schedule: string; next_run_time: string | null; last_run_time: string | null; is_active: boolean }) => (
                  <div key={job.id} className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className={cn("inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider", job.is_active ? "bg-status-success-light text-status-success" : "bg-surface-200 text-text-tertiary")}>
                        {job.frequency}
                      </span>
                      <span className="text-xs font-medium text-text-secondary">{job.name}</span>
                    </div>
                    <div className="flex items-center gap-3 ml-0.5">
                      {job.last_run_time && (
                        <span className="text-[11px] text-text-tertiary">
                          Last run: {new Date(job.last_run_time).toLocaleString("id-ID")}
                        </span>
                      )}
                      {job.next_run_time && (
                        <span className="text-[11px] text-text-tertiary">
                          Next: {new Date(job.next_run_time).toLocaleString("id-ID")}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {isSchedulerRunning ? (
              <button
                onClick={() => pauseMutation.mutate()}
                disabled={pauseMutation.isPending}
                className="px-4 py-2 text-sm border border-surface-200 rounded-xl hover:bg-surface-100 flex items-center gap-1.5 transition-colors disabled:opacity-60"
              >
                {pauseMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Pause className="w-3.5 h-3.5" />
                )}
                Pause
              </button>
            ) : (
              <button
                onClick={() => resumeMutation.mutate()}
                disabled={resumeMutation.isPending}
                className="px-4 py-2 text-sm bg-status-success text-white rounded-xl hover:opacity-90 flex items-center gap-1.5 transition-colors disabled:opacity-60"
              >
                {resumeMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                Resume
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Manual Trigger */}
      <div>
        <h4 className="text-sm font-semibold text-text-primary mb-3">Manual Scrape</h4>
        <div className="flex items-center gap-4 p-5 border border-surface-200 rounded-xl bg-surface-50">
          <div className="flex-1">
            <p className="text-sm text-text-secondary">
              Trigger an immediate scrape of all active sources and categories.
            </p>
          </div>
          <div className="flex gap-2">
            {hasActiveJob && (
              <button
                onClick={() => {
                  const activeJob = jobs?.items.find(
                    (j) => j.status === "running" || j.status === "pending"
                  );
                  if (activeJob) cancelMutation.mutate(activeJob.id);
                }}
                disabled={cancelMutation.isPending}
                className="px-4 py-2.5 text-sm border border-status-error text-status-error rounded-xl hover:bg-status-error-light flex items-center gap-1.5 transition-colors disabled:opacity-60"
              >
                {cancelMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <StopCircle className="w-3.5 h-3.5" />
                )}
                Cancel
              </button>
            )}
            <button
              onClick={() => {
                setPassword("");
                setShowPassword(false);
                setDaysBack(1);
                setShowPasswordModal(true);
              }}
              disabled={triggerMutation.isPending || !!hasActiveJob}
              className="px-5 py-2.5 text-sm bg-brand-accent text-text-inverse rounded-xl hover:bg-brand-accent-hover disabled:opacity-60 flex items-center gap-1.5 transition-colors"
            >
              {triggerMutation.isPending || hasActiveJob ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              {hasActiveJob ? "Scraping..." : "Trigger Scrape"}
            </button>
          </div>
        </div>
      </div>

      {/* Live Scrape Progress Panel */}
      {hasActiveJob && <ScrapeProgressPanel job={jobs!.items.find(
        (j) => j.status === "running" || j.status === "pending"
      )!} />}

      {/* Scrape Job History */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-text-primary">Scrape History</h4>
          {hasActiveJob && (
            <span className="flex items-center gap-1.5 text-xs text-status-info font-medium">
              <Loader2 className="w-3 h-3 animate-spin" />
              Live updating
            </span>
          )}
        </div>
        {jobsLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 bg-surface-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : jobs && jobs.items.length > 0 ? (
          <div className="border border-surface-200 rounded-[20px] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-100 border-b border-surface-200">
                  <th className="text-left px-5 py-3 font-medium text-text-secondary">Type</th>
                  <th className="text-left px-5 py-3 font-medium text-text-secondary">Status</th>
                  <th className="text-left px-5 py-3 font-medium text-text-secondary">Range</th>
                  <th className="text-left px-5 py-3 font-medium text-text-secondary">Sources</th>
                  <th className="text-left px-5 py-3 font-medium text-text-secondary">Articles</th>
                  <th className="text-left px-5 py-3 font-medium text-text-secondary">Started</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {jobs.items.map((job) => {
                  const isJobActive = job.status === "running" || job.status === "pending";
                  return (
                    <tr
                      key={job.id}
                      className={cn(
                        "transition-colors",
                        isJobActive ? "bg-status-info-light/50" : "hover:bg-surface-100"
                      )}
                    >
                      <td className="px-5 py-3.5 capitalize text-text-primary">{job.job_type}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium",
                            job.status === "completed"
                              ? "bg-status-success-light text-status-success"
                              : isJobActive
                              ? "bg-status-info-light text-status-info"
                              : job.status === "failed"
                              ? "bg-status-error-light text-status-error"
                              : "bg-surface-100 text-text-secondary"
                          )}
                        >
                          {isJobActive && (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          )}
                          {job.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-text-secondary text-xs">
                        {job.days_back ? `${job.days_back}d` : "default"}
                      </td>
                      <td className="px-5 py-3.5 text-text-secondary">
                        {job.sources_completed}/{job.total_sources}
                      </td>
                      <td className="px-5 py-3.5 text-text-secondary">
                        {job.articles_new} new / {job.articles_found} found
                      </td>
                      <td className="px-5 py-3.5 text-text-tertiary text-xs">
                        {job.started_at ? formatRelativeDate(job.started_at) : "\u2014"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 border border-surface-200 rounded-[20px]">
            <Clock className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
            <p className="text-sm text-text-tertiary">No scrape jobs yet.</p>
          </div>
        )}
      </div>

      {/* Password Confirmation Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              if (!triggerMutation.isPending) {
                setShowPasswordModal(false);
                setPassword("");
              }
            }}
          />
          <div className="relative bg-surface-white border border-surface-200 rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-brand-accent" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">
                    Confirm Manual Scrape
                  </h3>
                  <p className="text-xs text-text-tertiary mt-0.5">
                    Enter trigger password to proceed
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPassword("");
                }}
                disabled={triggerMutation.isPending}
                className="p-1.5 rounded-lg hover:bg-surface-100 text-text-tertiary transition-colors disabled:opacity-60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (password.trim()) triggerMutation.mutate({ password, daysBack });
              }}
            >
              {/* Date range selector */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Date range
                </label>
                <select
                  value={daysBack}
                  onChange={(e) => setDaysBack(Number(e.target.value) as ScrapeDaysBack)}
                  disabled={triggerMutation.isPending}
                  className="w-full px-4 py-2.5 bg-surface-100 border border-surface-200 rounded-xl text-sm text-text-primary focus:outline-none focus:border-brand-accent/50 focus:ring-1 focus:ring-brand-accent/25 disabled:opacity-60 transition-colors"
                >
                  {DAYS_BACK_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-text-tertiary mt-1.5">
                  How far back SerpAPI should look for news articles.
                </p>
              </div>

              {/* Password input */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Trigger password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter trigger password"
                    autoFocus
                    disabled={triggerMutation.isPending}
                    className="w-full px-4 py-2.5 pr-10 bg-surface-100 border border-surface-200 rounded-xl text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-accent/50 focus:ring-1 focus:ring-brand-accent/25 disabled:opacity-60 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPassword("");
                  }}
                  disabled={triggerMutation.isPending}
                  className="px-4 py-2.5 text-sm text-text-secondary border border-surface-200 rounded-xl hover:bg-surface-100 transition-colors disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!password.trim() || triggerMutation.isPending}
                  className="px-5 py-2.5 text-sm bg-brand-accent text-text-inverse font-semibold rounded-xl hover:bg-brand-accent-hover disabled:opacity-60 transition-colors flex items-center gap-1.5"
                >
                  {triggerMutation.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      Trigger Scrape
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
