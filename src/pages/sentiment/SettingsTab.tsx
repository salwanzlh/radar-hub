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
  Package,
  Eye,
  EyeOff,
  Zap,
  Clock,
  ChevronDown,
  Lock,
  Link,
} from "lucide-react";
import {
  sentimentApi,
  type SocialAccount,
  type ProductMapping,
  type ScrapeProgress,
  type ScrapeLogItem,
  type DirectUrlConfig,
} from "@/lib/sentiment-api-client";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { PlatformBadge } from "./SentimentPage";

function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen = false,
  rightSlot,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  rightSlot?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-surface-200 rounded-[20px] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 px-5 py-3.5 bg-surface-50 hover:bg-surface-100 transition-colors text-left"
      >
        <span className="text-text-tertiary">{icon}</span>
        <h4 className="text-sm font-semibold text-text-primary flex-1">{title}</h4>
        {rightSlot && <span onClick={(e) => e.stopPropagation()}>{rightSlot}</span>}
        <ChevronDown
          className={cn(
            "w-4 h-4 text-text-tertiary transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && <div className="px-5 pb-5 pt-3">{children}</div>}
    </div>
  );
}

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
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set());

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
    mutationFn: (platforms?: string[]) => sentimentApi.scraping.trigger(platforms),
    onSuccess: () => {
      toast.success("Scraping triggered!");
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
      await sentimentApi.scraping.verifyTriggerPassword(password);
      setShowPasswordModal(false);
      setPassword("");
      if (pendingAction === "daily") {
        const platforms = selectedPlatforms.size > 0 ? [...selectedPlatforms] : undefined;
        triggerMutation.mutate(platforms);
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
      <CollapsibleSection
        title="Social Accounts"
        icon={<MessageSquare className="w-4 h-4" />}
        defaultOpen
        rightSlot={
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="px-3 py-1.5 text-xs bg-brand-accent text-text-inverse rounded-lg hover:bg-brand-accent-hover transition-colors flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        }
      >
        <p className="text-xs text-text-tertiary mb-4">Manage social media accounts for comment scraping.</p>

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
                {accounts.filter((a) =>
                  a.platform !== "twitter_search" &&
                  a.platform !== "direct_url" &&
                  a.platform !== "instagram_search" &&
                  a.platform !== "youtube_search"
                ).map((account) => (
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
      </CollapsibleSection>

      {/* Scheduler Status */}
      <CollapsibleSection
        title="Scraping Scheduler"
        icon={<Clock className="w-4 h-4" />}
        defaultOpen
      >
        <div className="flex items-center gap-4 p-4 border border-surface-200 rounded-xl bg-surface-50">
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
      </CollapsibleSection>

      {/* Product Keyword Mappings */}
      <ProductMappingsSection />

      {/* Twitter Keyword Search */}
      <TwitterSearchSection />

      {/* Instagram Hashtag Search */}
      <InstagramSearchSection />

      {/* YouTube Keyword Search */}
      <YouTubeSearchSection />

      {/* Direct URL Scraping */}
      <DirectUrlSection />

      {/* Manual Trigger */}
      <CollapsibleSection
        title="Manual Trigger"
        icon={<Zap className="w-4 h-4" />}
      >
        <div className="p-5 border border-surface-200 rounded-xl bg-surface-50 space-y-4">
          <p className="text-sm text-text-secondary">
            Trigger an immediate scrape or weekly report generation. Select specific channels to scrape, or leave all unchecked to scrape everything.
          </p>

          {/* Platform channel selector */}
          <div className="flex flex-wrap gap-2">
            {([
              "facebook", "instagram", "twitter", "youtube", "tiktok",
              "twitter_search", "instagram_search", "youtube_search", "direct_url",
            ] as const).map((p) => {
              const labels: Record<string, string> = {
                facebook: "Facebook",
                instagram: "Instagram",
                twitter: "Twitter",
                youtube: "YouTube",
                tiktok: "TikTok",
                twitter_search: "Twitter Search",
                instagram_search: "Instagram Search",
                youtube_search: "YouTube Search",
                direct_url: "Direct URL",
              };
              const active = selectedPlatforms.has(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setSelectedPlatforms((prev) => {
                      const next = new Set(prev);
                      if (next.has(p)) next.delete(p);
                      else next.add(p);
                      return next;
                    });
                  }}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors",
                    active
                      ? "bg-brand-accent/15 text-brand-accent border-brand-accent/30"
                      : "bg-surface-white text-text-tertiary border-surface-200 hover:text-text-secondary hover:border-surface-300"
                  )}
                >
                  {labels[p]}
                </button>
              );
            })}
            {selectedPlatforms.size > 0 && (
              <button
                type="button"
                onClick={() => setSelectedPlatforms(new Set())}
                className="px-3 py-1.5 text-xs font-medium rounded-lg text-text-tertiary hover:text-text-secondary transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
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
              {isScraping
                ? "Running..."
                : selectedPlatforms.size > 0
                  ? `Scrape ${selectedPlatforms.size} Channel${selectedPlatforms.size > 1 ? "s" : ""}`
                  : "Scrape All"}
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
      </CollapsibleSection>

      {/* Run History */}
      <ScrapeHistorySection />

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
                    Enter trigger password to proceed
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
                  placeholder="Enter trigger password"
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
    <CollapsibleSection
      title="Run History"
      icon={<Clock className="w-4 h-4" />}
    >
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
    </CollapsibleSection>
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
  const [platform, setPlatform] = useState(account.platform);
  const [accountName, setAccountName] = useState(account.account_name);
  const [accountId, setAccountId] = useState(account.account_id);

  if (isEditing) {
    return (
      <tr className="bg-surface-50">
        <td className="px-5 py-3.5">
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="w-full px-2.5 py-1.5 text-sm bg-surface-100 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent/20 text-text-primary"
          >
            <option value="facebook">Facebook</option>
            <option value="instagram">Instagram</option>
            <option value="twitter">Twitter</option>
            <option value="youtube">YouTube</option>
            <option value="tiktok">TikTok</option>
          </select>
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
              onClick={() => onSave({ platform, account_name: accountName, account_id: accountId })}
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
    <CollapsibleSection
      title="Product Keyword Mappings"
      icon={<Package className="w-4 h-4" />}
    >
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
    </CollapsibleSection>
  );
}

/* --- Twitter Keyword Search Section --- */

function TwitterSearchSection() {
  const queryClient = useQueryClient();

  const { data: accounts } = useQuery<SocialAccount[]>({
    queryKey: ["sentiment-accounts"],
    queryFn: sentimentApi.accounts.list,
  });

  const { data: mappings } = useQuery<ProductMapping[]>({
    queryKey: ["sentiment-product-mappings"],
    queryFn: sentimentApi.products.mappings.list,
  });

  const twitterAccount = accounts?.find((a) => a.platform === "twitter_search");

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SocialAccount> }) =>
      sentimentApi.accounts.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sentiment-accounts"] });
      toast.success("Twitter search config updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!twitterAccount) return null;

  const config = twitterAccount.scrape_config as { days_back?: number; max_tweets_per_keyword?: number };
  const daysBack = config.days_back ?? 1;
  const maxTweets = config.max_tweets_per_keyword ?? 50;

  const activeKeywords = mappings
    ?.filter((m) => m.is_active)
    .flatMap((m) => m.keywords) ?? [];

  return (
    <CollapsibleSection
      title="Twitter Keyword Search"
      icon={<MessageSquare className="w-4 h-4" />}
      rightSlot={
        <button
          onClick={() =>
            updateMutation.mutate({
              id: twitterAccount.id,
              data: { is_active: !twitterAccount.is_active },
            })
          }
          className={cn(
            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
            twitterAccount.is_active ? "bg-status-success" : "bg-surface-200"
          )}
        >
          <span
            className={cn(
              "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
              twitterAccount.is_active ? "translate-x-6" : "translate-x-1"
            )}
          />
        </button>
      }
    >
      <p className="text-xs text-text-tertiary mb-4">
        Search Twitter/X for tweets matching product keywords. Uses the same keywords from Product Keyword Mappings above.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 border border-surface-200 rounded-xl bg-surface-50">
        <div>
          <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
            Days Back
          </label>
          <input
            type="number"
            min={1}
            max={30}
            value={daysBack}
            onChange={(e) => {
              const val = parseInt(e.target.value) || 1;
              updateMutation.mutate({
                id: twitterAccount.id,
                data: {
                  scrape_config: { ...config, days_back: val },
                },
              });
            }}
            className="w-full px-3.5 py-2.5 text-sm bg-surface-100 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/20 text-text-primary"
          />
          <p className="text-[10px] text-text-tertiary mt-1">How many days back to search (default: 1)</p>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
            Max Tweets per Keyword
          </label>
          <input
            type="number"
            min={10}
            max={500}
            value={maxTweets}
            onChange={(e) => {
              const val = parseInt(e.target.value) || 50;
              updateMutation.mutate({
                id: twitterAccount.id,
                data: {
                  scrape_config: { ...config, max_tweets_per_keyword: val },
                },
              });
            }}
            className="w-full px-3.5 py-2.5 text-sm bg-surface-100 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/20 text-text-primary"
          />
          <p className="text-[10px] text-text-tertiary mt-1">Maximum tweets per keyword search (default: 50)</p>
        </div>
      </div>

      {activeKeywords.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
            Search Keywords (from Product Mappings)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {activeKeywords.map((kw, i) => (
              <span key={i} className="px-2 py-0.5 text-xs bg-surface-100 text-text-secondary rounded-md">
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}
    </CollapsibleSection>
  );
}

/* --- Instagram Hashtag Search Section --- */

function InstagramSearchSection() {
  const queryClient = useQueryClient();

  const { data: accounts } = useQuery<SocialAccount[]>({
    queryKey: ["sentiment-accounts"],
    queryFn: sentimentApi.accounts.list,
  });

  const { data: mappings } = useQuery<ProductMapping[]>({
    queryKey: ["sentiment-product-mappings"],
    queryFn: sentimentApi.products.mappings.list,
  });

  const igAccount = accounts?.find((a) => a.platform === "instagram_search");

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SocialAccount> }) =>
      sentimentApi.accounts.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sentiment-accounts"] });
      toast.success("Instagram search config updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!igAccount) return null;

  const config = igAccount.scrape_config as {
    max_posts_per_keyword?: number;
    max_comments_per_post?: number;
  };
  const maxPosts = config.max_posts_per_keyword ?? 20;
  const maxComments = config.max_comments_per_post ?? 30;

  const activeKeywords = mappings
    ?.filter((m) => m.is_active)
    .flatMap((m) => m.keywords) ?? [];

  return (
    <CollapsibleSection
      title="Instagram Hashtag Search"
      icon={<MessageSquare className="w-4 h-4" />}
      rightSlot={
        <button
          onClick={() =>
            updateMutation.mutate({
              id: igAccount.id,
              data: { is_active: !igAccount.is_active },
            })
          }
          className={cn(
            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
            igAccount.is_active ? "bg-status-success" : "bg-surface-200"
          )}
        >
          <span
            className={cn(
              "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
              igAccount.is_active ? "translate-x-6" : "translate-x-1"
            )}
          />
        </button>
      }
    >
      <p className="text-xs text-text-tertiary mb-4">
        Search Instagram by hashtag using product keywords (treated as hashtags — # stripped, alphanumeric only). Uses the same keywords from Product Keyword Mappings above.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 border border-surface-200 rounded-xl bg-surface-50">
        <div>
          <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
            Max Posts per Hashtag
          </label>
          <input
            type="number"
            min={5}
            max={100}
            value={maxPosts}
            onChange={(e) => {
              const val = parseInt(e.target.value) || 20;
              updateMutation.mutate({
                id: igAccount.id,
                data: {
                  scrape_config: { ...config, max_posts_per_keyword: val },
                },
              });
            }}
            className="w-full px-3.5 py-2.5 text-sm bg-surface-100 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/20 text-text-primary"
          />
          <p className="text-[10px] text-text-tertiary mt-1">Maximum posts per hashtag (default: 20)</p>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
            Max Comments per Post
          </label>
          <input
            type="number"
            min={0}
            max={200}
            value={maxComments}
            onChange={(e) => {
              const val = parseInt(e.target.value) || 30;
              updateMutation.mutate({
                id: igAccount.id,
                data: {
                  scrape_config: { ...config, max_comments_per_post: val },
                },
              });
            }}
            className="w-full px-3.5 py-2.5 text-sm bg-surface-100 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/20 text-text-primary"
          />
          <p className="text-[10px] text-text-tertiary mt-1">Maximum comments per post (default: 30)</p>
        </div>
      </div>

      {activeKeywords.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
            Search Hashtags (from Product Mappings)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {activeKeywords.map((kw, i) => (
              <span key={i} className="px-2 py-0.5 text-xs bg-surface-100 text-text-secondary rounded-md">
                #{kw.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase()}
              </span>
            ))}
          </div>
        </div>
      )}
    </CollapsibleSection>
  );
}

/* --- YouTube Keyword Search Section --- */

function YouTubeSearchSection() {
  const queryClient = useQueryClient();

  const { data: accounts } = useQuery<SocialAccount[]>({
    queryKey: ["sentiment-accounts"],
    queryFn: sentimentApi.accounts.list,
  });

  const { data: mappings } = useQuery<ProductMapping[]>({
    queryKey: ["sentiment-product-mappings"],
    queryFn: sentimentApi.products.mappings.list,
  });

  const ytAccount = accounts?.find((a) => a.platform === "youtube_search");

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SocialAccount> }) =>
      sentimentApi.accounts.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sentiment-accounts"] });
      toast.success("YouTube search config updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!ytAccount) return null;

  const config = ytAccount.scrape_config as {
    max_videos_per_keyword?: number;
    max_comments_per_video?: number;
  };
  const maxVideos = config.max_videos_per_keyword ?? 15;
  const maxComments = config.max_comments_per_video ?? 50;

  const activeKeywords = mappings
    ?.filter((m) => m.is_active)
    .flatMap((m) => m.keywords) ?? [];

  return (
    <CollapsibleSection
      title="YouTube Keyword Search"
      icon={<MessageSquare className="w-4 h-4" />}
      rightSlot={
        <button
          onClick={() =>
            updateMutation.mutate({
              id: ytAccount.id,
              data: { is_active: !ytAccount.is_active },
            })
          }
          className={cn(
            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
            ytAccount.is_active ? "bg-status-success" : "bg-surface-200"
          )}
        >
          <span
            className={cn(
              "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
              ytAccount.is_active ? "translate-x-6" : "translate-x-1"
            )}
          />
        </button>
      }
    >
      <p className="text-xs text-text-tertiary mb-4">
        Pure global YouTube search using product keywords — returns videos from any channel, not limited to channels listed above.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 border border-surface-200 rounded-xl bg-surface-50">
        <div>
          <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
            Max Videos per Keyword
          </label>
          <input
            type="number"
            min={5}
            max={100}
            value={maxVideos}
            onChange={(e) => {
              const val = parseInt(e.target.value) || 15;
              updateMutation.mutate({
                id: ytAccount.id,
                data: {
                  scrape_config: { ...config, max_videos_per_keyword: val },
                },
              });
            }}
            className="w-full px-3.5 py-2.5 text-sm bg-surface-100 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/20 text-text-primary"
          />
          <p className="text-[10px] text-text-tertiary mt-1">Maximum videos per keyword search (default: 15)</p>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
            Max Comments per Video
          </label>
          <input
            type="number"
            min={0}
            max={500}
            value={maxComments}
            onChange={(e) => {
              const val = parseInt(e.target.value) || 50;
              updateMutation.mutate({
                id: ytAccount.id,
                data: {
                  scrape_config: { ...config, max_comments_per_video: val },
                },
              });
            }}
            className="w-full px-3.5 py-2.5 text-sm bg-surface-100 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/20 text-text-primary"
          />
          <p className="text-[10px] text-text-tertiary mt-1">Maximum comments per video (default: 50)</p>
        </div>
      </div>

      {activeKeywords.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
            Search Keywords (from Product Mappings)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {activeKeywords.map((kw, i) => (
              <span key={i} className="px-2 py-0.5 text-xs bg-surface-100 text-text-secondary rounded-md">
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}
    </CollapsibleSection>
  );
}

/* --- Direct URL Scraping Section --- */

const PLATFORM_PATTERNS: [string, RegExp][] = [
  ["YouTube", /(?:youtube\.com\/watch|youtu\.be\/)/],
  ["Instagram", /instagram\.com\/(p|reel)\//],
  ["TikTok", /tiktok\.com\/@.+\/video\//],
  ["Twitter/X", /(?:twitter\.com|x\.com)\/.+\/status\//],
  ["Facebook", /facebook\.com\/.+\/posts\//],
];

function detectPlatformLabel(url: string): string | null {
  for (const [label, pattern] of PLATFORM_PATTERNS) {
    if (pattern.test(url)) return label;
  }
  return null;
}

const platformBadgeColors: Record<string, string> = {
  YouTube: "bg-red-500/10 text-red-400",
  Instagram: "bg-pink-500/10 text-pink-400",
  TikTok: "bg-cyan-500/10 text-cyan-400",
  "Twitter/X": "bg-blue-500/10 text-blue-400",
  Facebook: "bg-blue-600/10 text-blue-300",
};

function DirectUrlSection() {
  const queryClient = useQueryClient();
  const [urlInput, setUrlInput] = useState("");

  const { data: config, isLoading } = useQuery<DirectUrlConfig>({
    queryKey: ["sentiment-direct-urls"],
    queryFn: sentimentApi.directUrls.get,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof sentimentApi.directUrls.update>[0]) =>
      sentimentApi.directUrls.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sentiment-direct-urls"] });
      toast.success("Direct URL config updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <CollapsibleSection
        title="Direct URL Scraping"
        icon={<Link className="w-4 h-4" />}
      >
        <div className="h-24 bg-surface-100 rounded-xl animate-pulse" />
      </CollapsibleSection>
    );
  }

  if (!config) return null;

  const handleAddUrls = () => {
    const newUrls = urlInput
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean);
    if (newUrls.length === 0) return;

    const merged = [...(config.urls || []), ...newUrls];
    updateMutation.mutate({ urls: merged });
    setUrlInput("");
  };

  const handleRemoveUrl = (url: string) => {
    updateMutation.mutate({ urls: config.urls.filter((u) => u !== url) });
  };

  return (
    <CollapsibleSection
      title="Direct URL Scraping"
      icon={<Link className="w-4 h-4" />}
      rightSlot={
        <button
          onClick={() => updateMutation.mutate({ is_active: !config.is_active })}
          className={cn(
            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
            config.is_active ? "bg-status-success" : "bg-surface-200"
          )}
        >
          <span
            className={cn(
              "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
              config.is_active ? "translate-x-6" : "translate-x-1"
            )}
          />
        </button>
      }
    >
      <p className="text-xs text-text-tertiary mb-4">
        Paste specific post/video URLs to scrape their comments directly. Supports YouTube, Instagram, TikTok, Twitter/X, and Facebook.
      </p>

      <div className="space-y-4 p-5 border border-surface-200 rounded-xl bg-surface-50">
        {/* URL List */}
        {config.urls.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
              URLs ({config.urls.length}/50)
            </p>
            <div className="max-h-[200px] overflow-y-auto space-y-1.5">
              {config.urls.map((url) => {
                const platform = detectPlatformLabel(url);
                return (
                  <div key={url} className="flex items-center gap-2 px-3 py-2 bg-surface-100 rounded-lg group">
                    {platform && (
                      <span className={cn("px-2 py-0.5 text-[10px] font-semibold rounded-md flex-shrink-0", platformBadgeColors[platform] || "bg-surface-200 text-text-tertiary")}>
                        {platform}
                      </span>
                    )}
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-text-secondary hover:text-brand-accent truncate flex-1"
                    >
                      {url}
                    </a>
                    <button
                      onClick={() => handleRemoveUrl(url)}
                      className="p-1 text-text-tertiary hover:text-status-error opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Add URLs */}
        <div>
          <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
            Add URLs (one per line)
          </label>
          <textarea
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder={"https://www.youtube.com/watch?v=...\nhttps://www.instagram.com/p/...\nhttps://www.tiktok.com/@user/video/..."}
            rows={3}
            className="w-full px-3.5 py-2.5 text-sm bg-surface-100 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/20 text-text-primary placeholder:text-text-tertiary resize-none font-mono"
          />
          <div className="flex items-center justify-between mt-2">
            <p className="text-[10px] text-text-tertiary">
              Supported: YouTube, Instagram, TikTok, Twitter/X, Facebook
            </p>
            <button
              onClick={handleAddUrls}
              disabled={!urlInput.trim() || updateMutation.isPending}
              className="px-4 py-2 text-sm bg-brand-accent text-text-inverse rounded-xl hover:bg-brand-accent-hover disabled:opacity-60 flex items-center gap-1.5 transition-colors"
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              Add URLs
            </button>
          </div>
        </div>

        {/* Max Comments */}
        <div className="max-w-xs">
          <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
            Max Comments per URL
          </label>
          <input
            type="number"
            min={10}
            max={500}
            value={config.max_comments_per_url}
            onChange={(e) => {
              const val = parseInt(e.target.value) || 100;
              updateMutation.mutate({ max_comments_per_url: val });
            }}
            className="w-full px-3.5 py-2.5 text-sm bg-surface-100 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/20 text-text-primary"
          />
          <p className="text-[10px] text-text-tertiary mt-1">Maximum comments to fetch per URL (default: 100)</p>
        </div>
      </div>
    </CollapsibleSection>
  );
}

