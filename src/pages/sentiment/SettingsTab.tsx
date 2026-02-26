import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MessageSquare,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Loader2,
  Play,
  Pause,
  RefreshCw,
  AlertTriangle,
  Shield,
  Package,
  Eye,
  EyeOff,
  Zap,
  Clock,
  ChevronDown,
  Lock,
  Tag,
  ExternalLink,
} from "lucide-react";
import {
  sentimentApi,
  type SocialAccount,
  type ProductMapping,
  type CleansingRule,
  type ScrapeProgress,
  type ScrapeLogItem,
} from "@/lib/sentiment-api-client";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { PlatformBadge } from "./SentimentPage";

export function SettingsTab() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ platform: "facebook", account_name: "", account_id: "" });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pendingAction, setPendingAction] = useState<"daily" | "weekly" | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const { data: accounts, isLoading: accountsLoading } = useQuery<SocialAccount[]>({
    queryKey: ["sentiment-accounts"],
    queryFn: sentimentApi.accounts.list,
  });

  const { data: schedulerStatus, isLoading: statusLoading } = useQuery({
    queryKey: ["sentiment-scheduler-status"],
    queryFn: sentimentApi.scheduler.status,
    refetchInterval: 10000,
  });

  const createMutation = useMutation({
    mutationFn: (data: { platform: string; account_name: string; account_id: string }) =>
      sentimentApi.accounts.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sentiment-accounts"] });
      setShowCreate(false);
      setForm({ platform: "facebook", account_name: "", account_id: "" });
      toast.success("Account added");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SocialAccount> }) =>
      sentimentApi.accounts.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sentiment-accounts"] });
      setEditingId(null);
      toast.success("Account updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => sentimentApi.accounts.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sentiment-accounts"] });
      toast.success("Account deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const pauseMutation = useMutation({
    mutationFn: sentimentApi.scheduler.pause,
    onSuccess: (data) => {
      queryClient.setQueryData(["sentiment-scheduler-status"], data);
      toast.success("Scheduler paused");
    },
    onError: (err: Error) => toast.error(`Failed to pause: ${err.message}`),
  });

  const resumeMutation = useMutation({
    mutationFn: sentimentApi.scheduler.resume,
    onSuccess: (data) => {
      queryClient.setQueryData(["sentiment-scheduler-status"], data);
      toast.success("Scheduler resumed");
    },
    onError: (err: Error) => toast.error(`Failed to resume: ${err.message}`),
  });

  const triggerMutation = useMutation({
    mutationFn: sentimentApi.scraping.trigger,
    onSuccess: () => {
      toast.success("Daily scrape triggered!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const triggerWeeklyMutation = useMutation({
    mutationFn: sentimentApi.scraping.triggerWeekly,
    onSuccess: () => {
      toast.success("Weekly report generation triggered!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const openPasswordModal = (action: "daily" | "weekly") => {
    setPendingAction(action);
    setPassword("");
    setShowPassword(false);
    setShowPasswordModal(true);
  };

  const handlePasswordSubmit = async () => {
    if (!password.trim() || !pendingAction) return;
    setIsVerifying(true);
    try {
      await api.auth.verifyPassword(password);
      setShowPasswordModal(false);
      setPassword("");
      if (pendingAction === "daily") {
        triggerMutation.mutate();
        queryClient.invalidateQueries({ queryKey: ["scrape-progress"] });
      } else {
        triggerWeeklyMutation.mutate();
      }
    } catch {
      toast.error("Incorrect password");
    } finally {
      setIsVerifying(false);
    }
  };

  const { data: scrapeProgress } = useQuery<ScrapeProgress>({
    queryKey: ["scrape-progress"],
    queryFn: sentimentApi.scraping.progress,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "running" ? 2000 : false;
    },
  });

  const isScraping = scrapeProgress?.status === "running";

  const isSchedulerRunning = schedulerStatus?.is_running;

  return (
    <div className="space-y-6">
      {/* Social Accounts */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-semibold text-text-primary">Social Accounts</h4>
            <p className="text-xs text-text-tertiary mt-0.5">Manage social media accounts for comment scraping.</p>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="px-4 py-2 text-sm bg-brand-accent text-text-inverse rounded-xl hover:bg-brand-accent-hover transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add Account
          </button>
        </div>

        {/* Create Form */}
        {showCreate && (
          <div className="rounded-2xl border border-surface-200 bg-surface-50 p-6 space-y-5 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
                  Platform
                </label>
                <select
                  value={form.platform}
                  onChange={(e) => setForm({ ...form, platform: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-surface-100 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent text-text-primary"
                >
                  <option value="facebook">Facebook</option>
                  <option value="instagram">Instagram</option>
                  <option value="twitter">Twitter</option>
                  <option value="youtube">YouTube</option>
                  <option value="tiktok">TikTok</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
                  Account Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mitsubishi Motors ID"
                  value={form.account_name}
                  onChange={(e) => setForm({ ...form, account_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-surface-100 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent text-text-primary placeholder:text-text-tertiary"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
                  Account ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. @mitsubishimotorsid"
                  value={form.account_id}
                  onChange={(e) => setForm({ ...form, account_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-surface-100 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent text-text-primary placeholder:text-text-tertiary"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-100">
              <button
                onClick={() => {
                  setShowCreate(false);
                  setForm({ platform: "facebook", account_name: "", account_id: "" });
                }}
                className="px-4 py-2 text-sm border border-surface-200 rounded-xl hover:bg-surface-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => createMutation.mutate(form)}
                disabled={!form.account_name || !form.account_id || createMutation.isPending}
                className="px-5 py-2 text-sm bg-brand-accent text-text-inverse rounded-xl hover:bg-brand-accent-hover disabled:opacity-60 flex items-center gap-1.5 font-medium"
              >
                {createMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                Add Account
              </button>
            </div>
          </div>
        )}

        {/* Accounts Table */}
        {accountsLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 bg-surface-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : accounts && accounts.length > 0 ? (
          <div className="border border-surface-200 rounded-[20px] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-100 border-b border-surface-200">
                  <th className="text-left px-5 py-3 font-medium text-text-secondary">Platform</th>
                  <th className="text-left px-5 py-3 font-medium text-text-secondary">Account Name</th>
                  <th className="text-left px-5 py-3 font-medium text-text-secondary">Account ID</th>
                  <th className="text-center px-5 py-3 font-medium text-text-secondary">Status</th>
                  <th className="text-right px-5 py-3 font-medium text-text-secondary">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {accounts.map((account) => (
                  <AccountRow
                    key={account.id}
                    account={account}
                    isEditing={editingId === account.id}
                    onEdit={() => setEditingId(account.id)}
                    onCancelEdit={() => setEditingId(null)}
                    onSave={(data) => updateMutation.mutate({ id: account.id, data })}
                    onToggle={() =>
                      updateMutation.mutate({
                        id: account.id,
                        data: { is_active: !account.is_active },
                      })
                    }
                    onDelete={() => {
                      if (confirm(`Delete account "${account.account_name}"?`)) {
                        deleteMutation.mutate(account.id);
                      }
                    }}
                    isSaving={updateMutation.isPending}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 border border-surface-200 rounded-[20px]">
            <MessageSquare className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
            <p className="text-sm text-text-tertiary">No social accounts configured yet.</p>
          </div>
        )}
      </div>

      {/* Scheduler Status */}
      <div>
        <h4 className="text-sm font-semibold text-text-primary mb-3">Scraping Scheduler</h4>
        <div className="flex items-center gap-4 p-5 border border-surface-200 rounded-xl bg-surface-50">
          <div className="flex-1">
            <div className="flex items-center gap-2.5 mb-1">
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
            {schedulerStatus?.next_run_time && (
              <p className="text-xs text-text-tertiary ml-5">
                Daily next run: {new Date(schedulerStatus.next_run_time).toLocaleString("id-ID")}
              </p>
            )}
            {schedulerStatus?.weekly_next_run_time && (
              <p className="text-xs text-text-tertiary ml-5">
                Weekly next run: {new Date(schedulerStatus.weekly_next_run_time).toLocaleString("id-ID")}
              </p>
            )}
            {schedulerStatus?.cron_expression && (
              <p className="text-xs text-text-tertiary ml-5">
                Schedule: {schedulerStatus.cron_expression}
              </p>
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

      {/* Trigger Scrape */}
      <div>
        <h4 className="text-sm font-semibold text-text-primary mb-3">Manual Trigger</h4>
        <div className="p-5 border border-surface-200 rounded-xl bg-surface-50 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-sm text-text-secondary">
                Trigger an immediate scrape or weekly report generation.
              </p>
            </div>
            <button
              onClick={() => openPasswordModal("daily")}
              disabled={triggerMutation.isPending || isScraping}
              className="px-5 py-2.5 text-sm bg-brand-accent text-text-inverse rounded-xl hover:bg-brand-accent-hover disabled:opacity-60 flex items-center gap-1.5 transition-colors"
            >
              {isScraping ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              {isScraping ? "Running..." : "Daily Scrape"}
            </button>
            <button
              onClick={() => openPasswordModal("weekly")}
              disabled={triggerWeeklyMutation.isPending}
              className="px-5 py-2.5 text-sm border border-brand-accent text-brand-accent rounded-xl hover:bg-brand-accent/10 disabled:opacity-60 flex items-center gap-1.5 transition-colors"
            >
              {triggerWeeklyMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Zap className="w-3.5 h-3.5" />
              )}
              Weekly Report
            </button>
          </div>

          {/* Scrape Progress Panel */}
          {scrapeProgress && scrapeProgress.status !== "idle" && (
            <div className="border border-surface-200 rounded-xl overflow-hidden">
              {/* Status header */}
              <div className={cn(
                "flex items-center gap-2.5 px-4 py-3",
                scrapeProgress.status === "running" && "bg-blue-500/10 border-b border-surface-200",
                scrapeProgress.status === "completed" && "bg-status-success-light border-b border-surface-200",
                scrapeProgress.status === "failed" && "bg-status-error-light border-b border-surface-200",
              )}>
                {scrapeProgress.status === "running" && <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />}
                {scrapeProgress.status === "completed" && <Check className="w-4 h-4 text-status-success flex-shrink-0" />}
                {scrapeProgress.status === "failed" && <AlertTriangle className="w-4 h-4 text-status-error flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-text-primary capitalize">{scrapeProgress.status}</span>
                  {scrapeProgress.current_phase && (
                    <span className="text-xs text-text-tertiary ml-2">- {scrapeProgress.current_phase}</span>
                  )}
                </div>
                {scrapeProgress.started_at && (
                  <span className="text-[10px] text-text-tertiary flex-shrink-0">
                    {new Date(scrapeProgress.started_at).toLocaleTimeString("id-ID")}
                    {scrapeProgress.finished_at && ` - ${new Date(scrapeProgress.finished_at).toLocaleTimeString("id-ID")}`}
                  </span>
                )}
              </div>

              {/* Log entries */}
              <div className="max-h-[240px] overflow-y-auto">
                {scrapeProgress.logs.map((log, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-start gap-3 px-4 py-2 text-xs",
                      i < scrapeProgress.logs.length - 1 && "border-b border-surface-50"
                    )}
                  >
                    <span className="text-text-tertiary flex-shrink-0 w-16 text-[10px] pt-0.5">
                      {new Date(log.timestamp).toLocaleTimeString("id-ID")}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-text-secondary">{log.message}</span>
                      {log.counts && (
                        <div className="flex gap-3 mt-1 flex-wrap">
                          {Object.entries(log.counts).map(([key, val]) => (
                            <span key={key} className="text-[10px] font-medium px-1.5 py-0.5 bg-surface-100 rounded text-text-tertiary">
                              {key.replace(/_/g, " ")}: <span className="text-text-primary">{val}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Error detail */}
              {scrapeProgress.error && (
                <div className="px-4 py-3 border-t border-surface-200 bg-status-error-light">
                  <p className="text-xs text-status-error font-mono break-all">{scrapeProgress.error}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Run History */}
      <ScrapeHistorySection />

      {/* Product Keyword Mappings */}
      <ProductMappingsSection />

      {/* Cleansing Rules */}
      <CleansingRulesSection />

      {/* Annotation Studio */}
      <AnnotationStudioSection />

      {/* Password Confirmation Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              if (!isVerifying) {
                setShowPasswordModal(false);
                setPassword("");
              }
            }}
          />
          <div className="relative bg-surface-white border border-surface-200 rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-brand-accent" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">
                    {pendingAction === "daily" ? "Confirm Daily Scrape" : "Confirm Weekly Report"}
                  </h3>
                  <p className="text-xs text-text-tertiary mt-0.5">
                    Enter your password to proceed
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPassword("");
                }}
                disabled={isVerifying}
                className="p-1.5 rounded-lg hover:bg-surface-100 text-text-tertiary transition-colors disabled:opacity-60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handlePasswordSubmit();
              }}
            >
              <div className="relative mb-4">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoFocus
                  disabled={isVerifying}
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

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPassword("");
                  }}
                  disabled={isVerifying}
                  className="px-4 py-2.5 text-sm text-text-secondary border border-surface-200 rounded-xl hover:bg-surface-100 transition-colors disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!password.trim() || isVerifying}
                  className="px-5 py-2.5 text-sm bg-brand-accent text-text-inverse font-semibold rounded-xl hover:bg-brand-accent-hover disabled:opacity-60 transition-colors flex items-center gap-1.5"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Verifying...
                    </>
                  ) : pendingAction === "daily" ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      Daily Scrape
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5" />
                      Weekly Report
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

/* --- Scrape Run History Section --- */

function ScrapeHistorySection() {
  const { data: logs, isLoading } = useQuery<ScrapeLogItem[]>({
    queryKey: ["scrape-logs"],
    queryFn: () => sentimentApi.scraping.logs(10),
  });

  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-text-tertiary" />
        <h4 className="text-sm font-semibold text-text-primary">Run History</h4>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-surface-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : logs && logs.length > 0 ? (
        <div className="border border-surface-200 rounded-[20px] overflow-hidden divide-y divide-surface-100">
          {logs.map((log) => {
            const duration = Math.round(
              (new Date(log.finished_at).getTime() - new Date(log.started_at).getTime()) / 1000
            );
            const isExpanded = expandedId === log.id;
            return (
              <div key={log.id}>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-50 transition-colors text-left"
                >
                  {log.status === "completed" ? (
                    <Check className="w-4 h-4 text-status-success flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-status-error flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-text-primary">
                      {new Date(log.started_at).toLocaleString("id-ID")}
                    </span>
                    <div className="flex gap-2 mt-0.5 flex-wrap">
                      {Object.entries(log.summary).map(([key, val]) => (
                        <span key={key} className="text-[10px] px-1.5 py-0.5 bg-surface-100 rounded text-text-tertiary">
                          {key.replace(/_/g, " ")}: <span className="text-text-primary font-medium">{val}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="text-xs text-text-tertiary flex-shrink-0">
                    {duration < 60 ? `${duration}s` : `${Math.floor(duration / 60)}m ${duration % 60}s`}
                  </span>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 text-text-tertiary transition-transform flex-shrink-0",
                      isExpanded && "rotate-180"
                    )}
                  />
                </button>
                {isExpanded && (
                  <div className="border-t border-surface-100 bg-surface-50 max-h-[200px] overflow-y-auto">
                    {log.error && (
                      <div className="px-4 py-2 bg-status-error-light">
                        <p className="text-xs text-status-error font-mono break-all">{log.error}</p>
                      </div>
                    )}
                    {log.log_entries.map((entry, i) => (
                      <div key={i} className="flex items-start gap-3 px-4 py-1.5 text-xs">
                        <span className="text-text-tertiary flex-shrink-0 w-16 text-[10px] pt-0.5">
                          {new Date(entry.timestamp).toLocaleTimeString("id-ID")}
                        </span>
                        <span className="text-text-secondary">{entry.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-6 border border-surface-200 rounded-[20px]">
          <p className="text-sm text-text-tertiary">No scrape runs recorded yet.</p>
        </div>
      )}
    </div>
  );
}

/* --- Account Row (inline edit) --- */

function AccountRow({
  account,
  isEditing,
  onEdit,
  onCancelEdit,
  onSave,
  onToggle,
  onDelete,
  isSaving,
}: {
  account: SocialAccount;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (data: Partial<SocialAccount>) => void;
  onToggle: () => void;
  onDelete: () => void;
  isSaving: boolean;
}) {
  const [accountName, setAccountName] = useState(account.account_name);
  const [accountId, setAccountId] = useState(account.account_id);

  if (isEditing) {
    return (
      <tr className="bg-surface-50">
        <td className="px-5 py-3.5">
          <PlatformBadge platform={account.platform} />
        </td>
        <td className="px-5 py-3.5">
          <input
            type="text"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            className="w-full px-2.5 py-1.5 text-sm bg-surface-100 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent/20 text-text-primary"
          />
        </td>
        <td className="px-5 py-3.5">
          <input
            type="text"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="w-full px-2.5 py-1.5 text-sm bg-surface-100 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent/20 text-text-primary"
          />
        </td>
        <td className="px-5 py-3.5 text-center">
          <button
            onClick={onToggle}
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
              account.is_active ? "bg-status-success" : "bg-surface-200"
            )}
          >
            <span
              className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                account.is_active ? "translate-x-6" : "translate-x-1"
              )}
            />
          </button>
        </td>
        <td className="px-5 py-3.5 text-right">
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => onSave({ account_name: accountName, account_id: accountId })}
              disabled={isSaving}
              className="p-1.5 text-status-success hover:bg-status-success-light rounded-lg transition-colors disabled:opacity-60"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onCancelEdit}
              className="p-1.5 text-text-tertiary hover:text-text-primary hover:bg-surface-100 rounded-lg transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-surface-100 transition-colors">
      <td className="px-5 py-3.5">
        <PlatformBadge platform={account.platform} />
      </td>
      <td className="px-5 py-3.5 font-medium text-text-primary">{account.account_name}</td>
      <td className="px-5 py-3.5 text-text-secondary">{account.account_id}</td>
      <td className="px-5 py-3.5 text-center">
        <button
          onClick={onToggle}
          className={cn(
            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
            account.is_active ? "bg-status-success" : "bg-surface-200"
          )}
        >
          <span
            className={cn(
              "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
              account.is_active ? "translate-x-6" : "translate-x-1"
            )}
          />
        </button>
      </td>
      <td className="px-5 py-3.5 text-right">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={onEdit}
            className="p-2 text-text-tertiary hover:text-text-primary hover:bg-surface-100 rounded-xl transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-text-tertiary hover:text-status-error hover:bg-status-error-light rounded-xl transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

/* --- Product Keyword Mappings Section --- */

function ProductMappingsSection() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKeywords, setEditKeywords] = useState("");

  const { data: mappings, isLoading } = useQuery<ProductMapping[]>({
    queryKey: ["sentiment-product-mappings"],
    queryFn: sentimentApi.products.mappings.list,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, keywords }: { id: string; keywords: string[] }) =>
      sentimentApi.products.mappings.update(id, { keywords }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sentiment-product-mappings"] });
      setEditingId(null);
      toast.success("Keywords updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      sentimentApi.products.mappings.update(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sentiment-product-mappings"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Package className="w-4 h-4 text-text-tertiary" />
        <h4 className="text-sm font-semibold text-text-primary">Product Keyword Mappings</h4>
      </div>
      <p className="text-xs text-text-tertiary mb-4">
        Keywords used to detect which product a comment/post is about. Separate multiple keywords with commas.
      </p>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 bg-surface-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : mappings && mappings.length > 0 ? (
        <div className="border border-surface-200 rounded-[20px] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-100 border-b border-surface-200">
                <th className="text-left px-5 py-3 font-medium text-text-secondary">Product</th>
                <th className="text-left px-5 py-3 font-medium text-text-secondary">Keywords</th>
                <th className="text-center px-5 py-3 font-medium text-text-secondary">Active</th>
                <th className="text-right px-5 py-3 font-medium text-text-secondary">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {mappings.map((mapping) => (
                <tr key={mapping.id} className="hover:bg-surface-100 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-text-primary whitespace-nowrap">
                    {mapping.product_name || mapping.product_lineup_id}
                  </td>
                  <td className="px-5 py-3.5">
                    {editingId === mapping.id ? (
                      <input
                        type="text"
                        value={editKeywords}
                        onChange={(e) => setEditKeywords(e.target.value)}
                        placeholder="keyword1, keyword2, ..."
                        className="w-full px-2.5 py-1.5 text-sm bg-surface-100 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent/20 text-text-primary"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            updateMutation.mutate({
                              id: mapping.id,
                              keywords: editKeywords.split(",").map((k) => k.trim()).filter(Boolean),
                            });
                          }
                          if (e.key === "Escape") setEditingId(null);
                        }}
                      />
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {mapping.keywords.map((kw, i) => (
                          <span key={i} className="px-2 py-0.5 text-xs bg-surface-100 text-text-secondary rounded-md">
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <button
                      onClick={() => toggleMutation.mutate({ id: mapping.id, is_active: !mapping.is_active })}
                      className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                        mapping.is_active ? "bg-status-success" : "bg-surface-200"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                          mapping.is_active ? "translate-x-6" : "translate-x-1"
                        )}
                      />
                    </button>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {editingId === mapping.id ? (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            updateMutation.mutate({
                              id: mapping.id,
                              keywords: editKeywords.split(",").map((k) => k.trim()).filter(Boolean),
                            });
                          }}
                          disabled={updateMutation.isPending}
                          className="p-1.5 text-status-success hover:bg-status-success-light rounded-lg transition-colors disabled:opacity-60"
                        >
                          {updateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1.5 text-text-tertiary hover:text-text-primary hover:bg-surface-100 rounded-lg transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingId(mapping.id);
                          setEditKeywords(mapping.keywords.join(", "));
                        }}
                        className="p-2 text-text-tertiary hover:text-text-primary hover:bg-surface-100 rounded-xl transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 border border-surface-200 rounded-[20px]">
          <Package className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
          <p className="text-sm text-text-tertiary">No product mappings configured. Run migration to seed defaults.</p>
        </div>
      )}
    </div>
  );
}

/* --- Cleansing Rules Section --- */

function CleansingRulesSection() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ pattern: "", description: "" });
  const [createForm, setCreateForm] = useState({ rule_type: "exclusion_keyword", pattern: "", description: "" });
  const [previewText, setPreviewText] = useState("");

  const { data: rules, isLoading } = useQuery<CleansingRule[]>({
    queryKey: ["sentiment-cleansing-rules"],
    queryFn: sentimentApi.cleansing.rules.list,
  });

  const createMutation = useMutation({
    mutationFn: (data: { rule_type: string; pattern: string; description?: string }) =>
      sentimentApi.cleansing.rules.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sentiment-cleansing-rules"] });
      setShowCreate(false);
      setCreateForm({ rule_type: "exclusion_keyword", pattern: "", description: "" });
      toast.success("Rule added");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { pattern?: string; description?: string } }) =>
      sentimentApi.cleansing.rules.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sentiment-cleansing-rules"] });
      setEditingId(null);
      toast.success("Rule updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      sentimentApi.cleansing.rules.update(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sentiment-cleansing-rules"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => sentimentApi.cleansing.rules.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sentiment-cleansing-rules"] });
      toast.success("Rule deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const previewMutation = useMutation({
    mutationFn: (text: string) => sentimentApi.cleansing.preview(text),
  });

  const ruleTypeLabels: Record<string, string> = {
    exclusion_keyword: "Keyword",
    exclusion_regex: "Regex",
    min_length: "Min Length",
    max_emoji_ratio: "Max Emoji",
    mention_only: "Mention Only",
    sales_promo: "Sales Promo",
    duplicate: "Duplicate",
  };

  const ruleTypeHelp: Record<string, string> = {
    exclusion_keyword: "Comments containing this keyword will be excluded",
    exclusion_regex: "Comments matching this regex pattern will be excluded",
    min_length: "Comments shorter than this length will be excluded",
    max_emoji_ratio: "Comments with emoji ratio above this value will be excluded",
    mention_only: "Filter comments that are just @mentions (no other content)",
    sales_promo: "Filter dealer/sales promotions: comments with phone number + any of these keywords",
    duplicate: "Filter exact duplicate comments during scraping",
  };

  const getPlaceholder = (ruleType: string) => {
    switch (ruleType) {
      case "min_length": return "e.g. 10";
      case "max_emoji_ratio": return "e.g. 0.5";
      case "sales_promo": return "comma-separated keywords, e.g. konsultasi,test drive,pembelian";
      case "mention_only":
      case "duplicate":
        return "enabled";
      default: return "e.g. sholawat";
    }
  };

  const isToggleOnlyRule = (ruleType: string) =>
    ruleType === "mention_only" || ruleType === "duplicate";

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-text-tertiary" />
          <h4 className="text-sm font-semibold text-text-primary">Data Cleansing Rules</h4>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 text-sm bg-brand-accent text-text-inverse rounded-xl hover:bg-brand-accent-hover transition-colors flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Add Rule
        </button>
      </div>
      <p className="text-xs text-text-tertiary mb-4">
        Rules to filter and clean comments before sentiment analysis.
      </p>

      {/* Preview */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 relative">
          <Eye className="w-4 h-4 text-text-tertiary absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value)}
            placeholder="Test cleansing: paste a comment here..."
            className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-surface-100 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/20 text-text-primary placeholder:text-text-tertiary"
            onKeyDown={(e) => {
              if (e.key === "Enter" && previewText.trim()) {
                previewMutation.mutate(previewText);
              }
            }}
          />
        </div>
        <button
          onClick={() => previewText.trim() && previewMutation.mutate(previewText)}
          disabled={!previewText.trim() || previewMutation.isPending}
          className="px-4 py-2.5 text-sm border border-surface-200 rounded-xl hover:bg-surface-100 flex items-center gap-1.5 transition-colors disabled:opacity-60"
        >
          {previewMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
          Preview
        </button>
      </div>

      {/* Preview Result */}
      {previewMutation.data && (
        <div className="mb-4 p-4 border border-surface-200 rounded-xl bg-surface-50 space-y-2">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-text-tertiary font-medium">Cleaned:</span>
              <p className="text-text-secondary mt-1">{previewMutation.data.cleaned || "(empty)"}</p>
            </div>
            <div className="space-y-1">
              <p>
                <span className="text-text-tertiary font-medium">Excluded:</span>{" "}
                <span className={previewMutation.data.is_excluded ? "text-status-error font-semibold" : "text-status-success"}>
                  {previewMutation.data.is_excluded ? "Yes" : "No"}
                </span>
              </p>
              {previewMutation.data.exclusion_reason && (
                <p>
                  <span className="text-text-tertiary font-medium">Reason:</span>{" "}
                  <span className="text-text-secondary">{previewMutation.data.exclusion_reason}</span>
                </p>
              )}
              {previewMutation.data.detected_product && (
                <p>
                  <span className="text-text-tertiary font-medium">Product:</span>{" "}
                  <span className="text-text-secondary">{previewMutation.data.detected_product}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Form */}
      {showCreate && (
        <div className="rounded-2xl border border-surface-200 bg-surface-50 p-5 space-y-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
                Rule Type
              </label>
              <select
                value={createForm.rule_type}
                onChange={(e) => setCreateForm({ ...createForm, rule_type: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm bg-surface-100 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/20 text-text-primary"
              >
                <option value="exclusion_keyword">Exclusion Keyword</option>
                <option value="exclusion_regex">Exclusion Regex</option>
                <option value="min_length">Min Length</option>
                <option value="max_emoji_ratio">Max Emoji Ratio</option>
                <option value="mention_only">Mention Only</option>
                <option value="sales_promo">Sales Promo</option>
                <option value="duplicate">Duplicate</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
                Pattern / Value
              </label>
              <input
                type="text"
                placeholder={getPlaceholder(createForm.rule_type)}
                value={isToggleOnlyRule(createForm.rule_type) ? "enabled" : createForm.pattern}
                onChange={(e) => setCreateForm({ ...createForm, pattern: e.target.value })}
                disabled={isToggleOnlyRule(createForm.rule_type)}
                className="w-full px-3.5 py-2.5 text-sm bg-surface-100 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/20 text-text-primary placeholder:text-text-tertiary disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
                Description
              </label>
              <input
                type="text"
                placeholder="Optional description"
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm bg-surface-100 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/20 text-text-primary placeholder:text-text-tertiary"
              />
            </div>
          </div>
          {ruleTypeHelp[createForm.rule_type] && (
            <p className="text-xs text-text-tertiary px-1">
              {ruleTypeHelp[createForm.rule_type]}
            </p>
          )}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-100">
            <button
              onClick={() => {
                setShowCreate(false);
                setCreateForm({ rule_type: "exclusion_keyword", pattern: "", description: "" });
              }}
              className="px-4 py-2 text-sm border border-surface-200 rounded-xl hover:bg-surface-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                const pattern = isToggleOnlyRule(createForm.rule_type) ? "enabled" : createForm.pattern;
                createMutation.mutate({
                  rule_type: createForm.rule_type,
                  pattern,
                  description: createForm.description || undefined,
                });
              }}
              disabled={(!isToggleOnlyRule(createForm.rule_type) && !createForm.pattern) || createMutation.isPending}
              className="px-5 py-2 text-sm bg-brand-accent text-text-inverse rounded-xl hover:bg-brand-accent-hover disabled:opacity-60 flex items-center gap-1.5 font-medium"
            >
              {createMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Add Rule
            </button>
          </div>
        </div>
      )}

      {/* Rules Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 bg-surface-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : rules && rules.length > 0 ? (
        <div className="border border-surface-200 rounded-[20px] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-100 border-b border-surface-200">
                <th className="text-left px-5 py-3 font-medium text-text-secondary">Type</th>
                <th className="text-left px-5 py-3 font-medium text-text-secondary">Pattern</th>
                <th className="text-left px-5 py-3 font-medium text-text-secondary">Description</th>
                <th className="text-center px-5 py-3 font-medium text-text-secondary">Active</th>
                <th className="text-right px-5 py-3 font-medium text-text-secondary">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {rules.map((rule) => (
                <tr key={rule.id} className="hover:bg-surface-100 transition-colors">
                  <td className="px-5 py-3.5">
                    <span className="px-2 py-0.5 text-xs bg-surface-100 text-text-secondary rounded-md font-medium">
                      {ruleTypeLabels[rule.rule_type] || rule.rule_type}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {editingId === rule.id ? (
                      <input
                        type="text"
                        value={editForm.pattern}
                        onChange={(e) => setEditForm({ ...editForm, pattern: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-sm bg-surface-100 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent/20 text-text-primary"
                      />
                    ) : (
                      <code className="text-xs text-text-secondary bg-surface-100 px-1.5 py-0.5 rounded">
                        {rule.pattern}
                      </code>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-text-tertiary text-xs">
                    {editingId === rule.id ? (
                      <input
                        type="text"
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-sm bg-surface-100 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent/20 text-text-primary"
                      />
                    ) : (
                      rule.description || "--"
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <button
                      onClick={() => toggleMutation.mutate({ id: rule.id, is_active: !rule.is_active })}
                      className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                        rule.is_active ? "bg-status-success" : "bg-surface-200"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                          rule.is_active ? "translate-x-6" : "translate-x-1"
                        )}
                      />
                    </button>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {editingId === rule.id ? (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            updateMutation.mutate({
                              id: rule.id,
                              data: { pattern: editForm.pattern, description: editForm.description },
                            });
                          }}
                          disabled={updateMutation.isPending}
                          className="p-1.5 text-status-success hover:bg-status-success-light rounded-lg transition-colors disabled:opacity-60"
                        >
                          {updateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1.5 text-text-tertiary hover:text-text-primary hover:bg-surface-100 rounded-lg transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditingId(rule.id);
                            setEditForm({ pattern: rule.pattern, description: rule.description || "" });
                          }}
                          className="p-2 text-text-tertiary hover:text-text-primary hover:bg-surface-100 rounded-xl transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete rule "${rule.pattern}"?`)) {
                              deleteMutation.mutate(rule.id);
                            }
                          }}
                          className="p-2 text-text-tertiary hover:text-status-error hover:bg-status-error-light rounded-xl transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 border border-surface-200 rounded-[20px]">
          <Shield className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
          <p className="text-sm text-text-tertiary">No cleansing rules configured. Run migration to seed defaults.</p>
        </div>
      )}
    </div>
  );
}

/* --- Annotation Studio Section --- */

function AnnotationStudioSection() {
  const labelStudioUrl = import.meta.env.VITE_LABEL_STUDIO_URL || "http://localhost:8080";

  const exportMutation = useMutation({
    mutationFn: sentimentApi.annotation.exportJson,
    onSuccess: () => {
      toast.success("JSON file downloaded — import it in Label Studio");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Tag className="w-4 h-4 text-text-tertiary" />
        <h4 className="text-sm font-semibold text-text-primary">Annotation Studio</h4>
      </div>
      <p className="text-xs text-text-tertiary mb-4">
        Download comments as Label Studio JSON, then import via Label Studio UI.
      </p>

      <div className="flex items-center gap-3">
        <button
          onClick={() => exportMutation.mutate()}
          disabled={exportMutation.isPending}
          className="px-5 py-2.5 text-sm bg-brand-accent text-text-inverse rounded-xl hover:bg-brand-accent-hover disabled:opacity-60 flex items-center gap-2 font-medium transition-colors"
        >
          {exportMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Tag className="w-4 h-4" />
          )}
          Download JSON
        </button>
        <a
          href={labelStudioUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-5 py-2.5 text-sm border border-surface-200 rounded-xl hover:bg-surface-100 flex items-center gap-2 font-medium transition-colors text-text-primary"
        >
          <ExternalLink className="w-4 h-4" />
          Open Label Studio
        </a>
      </div>
    </div>
  );
}
