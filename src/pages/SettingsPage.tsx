import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Tags,
  Globe,
  Clock,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Loader2,
  Play,
  Pause,
  RefreshCw,
  StopCircle,
  Car,
  Newspaper,
  Database,
  Zap,
} from "lucide-react";
import { api, type Category, type Source, type ScrapeJob, type ProductLineup } from "@/lib/api-client";
import { cn, formatRelativeDate, domainToName } from "@/lib/utils";
import toast from "react-hot-toast";

type Tab = "categories" | "sources" | "lineups" | "schedule";

const TABS: { id: Tab; label: string; icon: typeof Tags }[] = [
  { id: "categories", label: "Categories & Keywords", icon: Tags },
  { id: "sources", label: "News Sources", icon: Globe },
  { id: "lineups", label: "Product Lineups", icon: Car },
  { id: "schedule", label: "Schedule & Scraping", icon: Clock },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("categories");

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-surface-white rounded-[20px] shadow-card">
        <div className="flex border-b border-surface-100">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 -mb-px",
                activeTab === tab.id
                  ? "border-brand-accent text-text-primary"
                  : "border-transparent text-text-secondary hover:text-text-primary"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-7">
          {activeTab === "categories" && <CategoriesTab />}
          {activeTab === "sources" && <SourcesTab />}
          {activeTab === "lineups" && <LineupsTab />}
          {activeTab === "schedule" && <ScheduleTab />}
        </div>
      </div>
    </div>
  );
}

/* --- Categories Tab --- */

function CategoriesTab() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", keywords: "" });

  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: api.categories.list,
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; keywords?: string[] }) =>
      api.categories.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setShowCreate(false);
      setForm({ name: "", description: "", keywords: "" });
      toast.success("Category created");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Category> }) =>
      api.categories.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setEditingId(null);
      toast.success("Category updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.categories.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleCreate = () => {
    const keywords = form.keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    createMutation.mutate({
      name: form.name,
      description: form.description || undefined,
      keywords,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-surface-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          Manage categories and their search keywords for news collection.
        </p>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 text-sm bg-brand-accent text-text-inverse rounded-xl hover:bg-brand-accent-hover transition-colors flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="rounded-2xl border border-surface-200 bg-surface-50 p-6 space-y-5">
          <div>
            <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
              Category Name
            </label>
            <input
              type="text"
              placeholder="e.g. Electric Vehicles"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm bg-surface-100 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent text-text-primary placeholder:text-text-tertiary"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
              Description
            </label>
            <input
              type="text"
              placeholder="Briefly describe this category's scope"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm bg-surface-100 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent text-text-primary placeholder:text-text-tertiary"
            />
            <p className="text-[11px] text-text-tertiary mt-1.5">Optional — helps identify this category at a glance</p>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
              Search Keywords
            </label>
            <input
              type="text"
              placeholder="mobil listrik, EV Indonesia, electric vehicle"
              value={form.keywords}
              onChange={(e) => setForm({ ...form, keywords: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm bg-surface-100 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent text-text-primary placeholder:text-text-tertiary"
            />
            <p className="text-[11px] text-text-tertiary mt-1.5">Comma-separated terms used for news collection via SerpAPI</p>
            {form.keywords.trim() && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {form.keywords.split(",").map((kw) => kw.trim()).filter(Boolean).map((kw) => (
                  <span key={kw} className="px-2.5 py-1 text-[11px] bg-brand-accent-light text-text-primary rounded-full font-medium">
                    {kw}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-100">
            <button
              onClick={() => {
                setShowCreate(false);
                setForm({ name: "", description: "", keywords: "" });
              }}
              className="px-4 py-2 text-sm border border-surface-200 rounded-xl hover:bg-surface-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!form.name || createMutation.isPending}
              className="px-5 py-2 text-sm bg-brand-accent text-text-inverse rounded-xl hover:bg-brand-accent-hover disabled:opacity-60 flex items-center gap-1.5 font-medium"
            >
              {createMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              Create Category
            </button>
          </div>
        </div>
      )}

      {/* Category List */}
      <div className="divide-y divide-surface-100">
        {categories?.map((cat) => (
          <CategoryRow
            key={cat.id}
            category={cat}
            isEditing={editingId === cat.id}
            onEdit={() => setEditingId(cat.id)}
            onCancelEdit={() => setEditingId(null)}
            onSave={(data) => updateMutation.mutate({ id: cat.id, data })}
            onDelete={() => {
              if (confirm("Delete this category? Articles in this category will lose their category.")) {
                deleteMutation.mutate(cat.id);
              }
            }}
            isSaving={updateMutation.isPending}
          />
        ))}
      </div>
    </div>
  );
}

function CategoryRow({
  category,
  isEditing,
  onEdit,
  onCancelEdit,
  onSave,
  onDelete,
  isSaving,
}: {
  category: Category;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (data: Partial<Category>) => void;
  onDelete: () => void;
  isSaving: boolean;
}) {
  const [name, setName] = useState(category.name);
  const [description, setDescription] = useState(category.description || "");
  const [keywords, setKeywords] = useState(category.keywords.join(", "));
  const [isActive, setIsActive] = useState(category.is_active);

  if (isEditing) {
    const parsedKeywords = keywords.split(",").map((k) => k.trim()).filter(Boolean);

    return (
      <div className="py-5 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
              Category Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-surface-100 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent text-text-primary"
            />
          </div>
          <div className="flex flex-col justify-end">
            <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
              Status
            </label>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={cn(
                "relative inline-flex h-[38px] items-center gap-2 rounded-xl px-3.5 text-sm font-medium transition-colors border",
                isActive
                  ? "border-status-success/30 bg-status-success-light text-status-success"
                  : "border-surface-200 bg-surface-100 text-text-tertiary"
              )}
            >
              <span className={cn("w-2 h-2 rounded-full", isActive ? "bg-status-success" : "bg-surface-300")} />
              {isActive ? "Active" : "Inactive"}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Briefly describe this category's scope"
            className="w-full px-3.5 py-2.5 text-sm bg-surface-100 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent text-text-primary placeholder:text-text-tertiary"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
            Search Keywords
          </label>
          <input
            type="text"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="Comma-separated search terms"
            className="w-full px-3.5 py-2.5 text-sm bg-surface-100 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent text-text-primary placeholder:text-text-tertiary"
          />
          {parsedKeywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {parsedKeywords.map((kw) => (
                <span key={kw} className="px-2.5 py-1 text-[11px] bg-brand-accent-light text-text-primary rounded-full font-medium">
                  {kw}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-100">
          <button
            onClick={onCancelEdit}
            className="px-4 py-2 text-sm border border-surface-200 rounded-xl hover:bg-surface-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              onSave({
                name,
                description: description || undefined,
                keywords: parsedKeywords,
                is_active: isActive,
              } as Partial<Category>)
            }
            disabled={isSaving}
            className="px-5 py-2 text-sm bg-brand-accent text-text-inverse rounded-xl hover:bg-brand-accent-hover disabled:opacity-60 flex items-center gap-1.5 font-medium"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Save Changes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-4 flex items-start justify-between">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h4 className="text-sm font-medium text-text-primary">{category.name}</h4>
          {!category.is_active && (
            <span className="px-2 py-0.5 text-[10px] bg-surface-100 text-text-tertiary rounded-lg">
              Inactive
            </span>
          )}
        </div>
        {category.description && (
          <p className="text-xs text-text-secondary mb-1">{category.description}</p>
        )}
        <div className="flex flex-wrap gap-1.5 mt-1">
          {category.keywords.map((kw) => (
            <span
              key={kw}
              className="px-2.5 py-1 text-[11px] bg-surface-100 text-text-secondary rounded-full"
            >
              {kw}
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0 ml-4">
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
    </div>
  );
}

/* --- Sources Tab --- */

function SourcesTab() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDomain, setEditDomain] = useState("");

  const { data: sources, isLoading } = useQuery({
    queryKey: ["sources"],
    queryFn: api.sources.list,
  });

  const createMutation = useMutation({
    mutationFn: (data: { site_domain: string }) => api.sources.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      setShowCreate(false);
      setNewDomain("");
      toast.success("Source added");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Source> }) =>
      api.sources.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      setEditingId(null);
      setEditDomain("");
      toast.success("Source updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.sources.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      toast.success("Source deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const startEdit = (source: Source) => {
    setEditingId(source.id);
    setEditDomain(source.site_domain);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-14 bg-surface-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          Manage news sources for article collection. Toggle, edit, or remove sources.
        </p>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 text-sm bg-brand-accent text-text-inverse rounded-xl hover:bg-brand-accent-hover transition-colors flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Add Source
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="border border-surface-200 rounded-xl p-5 space-y-3 bg-surface-50">
          <div>
            <input
              type="text"
              placeholder="Enter domain (e.g. detik.com)"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newDomain.trim()) createMutation.mutate({ site_domain: newDomain.trim() });
              }}
              className="w-full px-3.5 py-2.5 text-sm bg-surface-100 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/20 text-text-primary placeholder:text-text-tertiary"
            />
            {newDomain.trim() && (
              <p className="text-xs text-text-tertiary mt-1.5">
                Name: <span className="font-medium text-text-secondary">{domainToName(newDomain.trim())}</span>
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => createMutation.mutate({ site_domain: newDomain.trim() })}
              disabled={!newDomain.trim() || createMutation.isPending}
              className="px-4 py-2 text-sm bg-brand-accent text-text-inverse rounded-xl hover:bg-brand-accent-hover disabled:opacity-60 flex items-center gap-1.5"
            >
              {createMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              Add
            </button>
            <button
              onClick={() => { setShowCreate(false); setNewDomain(""); }}
              className="px-4 py-2 text-sm border border-surface-200 rounded-xl hover:bg-surface-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Sources Table */}
      <div className="border border-surface-200 rounded-[20px] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-100 border-b border-surface-200">
              <th className="text-left px-5 py-3 font-medium text-text-secondary">Source Name</th>
              <th className="text-left px-5 py-3 font-medium text-text-secondary">Domain</th>
              <th className="text-center px-5 py-3 font-medium text-text-secondary">Active</th>
              <th className="text-right px-5 py-3 font-medium text-text-secondary">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100">
            {sources?.map((source) => (
              <tr key={source.id} className="hover:bg-surface-100 transition-colors">
                <td className="px-5 py-3.5 font-medium text-text-primary">
                  {editingId === source.id ? (
                    <span className="text-xs text-text-tertiary">
                      {editDomain.trim() ? domainToName(editDomain.trim()) : source.name}
                    </span>
                  ) : (
                    source.name
                  )}
                </td>
                <td className="px-5 py-3.5 text-text-secondary">
                  {editingId === source.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editDomain}
                        onChange={(e) => setEditDomain(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && editDomain.trim())
                            updateMutation.mutate({ id: source.id, data: { site_domain: editDomain.trim() } });
                          if (e.key === "Escape") { setEditingId(null); setEditDomain(""); }
                        }}
                        autoFocus
                        className="w-full px-2.5 py-1.5 text-sm bg-surface-100 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent/20 text-text-primary"
                      />
                      <button
                        onClick={() => updateMutation.mutate({ id: source.id, data: { site_domain: editDomain.trim() } })}
                        disabled={!editDomain.trim() || updateMutation.isPending}
                        className="p-1.5 text-status-success hover:bg-status-success-light rounded-lg transition-colors disabled:opacity-60"
                      >
                        {updateMutation.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => { setEditingId(null); setEditDomain(""); }}
                        className="p-1.5 text-text-tertiary hover:text-text-primary hover:bg-surface-100 rounded-lg transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    source.site_domain
                  )}
                </td>
                <td className="px-5 py-3.5 text-center">
                  <button
                    onClick={() =>
                      updateMutation.mutate({
                        id: source.id,
                        data: { is_active: !source.is_active },
                      })
                    }
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                      source.is_active ? "bg-status-success" : "bg-surface-200"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                        source.is_active ? "translate-x-6" : "translate-x-1"
                      )}
                    />
                  </button>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => startEdit(source)}
                      disabled={editingId !== null}
                      className="p-2 text-text-tertiary hover:text-text-primary hover:bg-surface-100 rounded-xl transition-colors disabled:opacity-40"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete source "${source.name}"? Sources with articles cannot be deleted.`))
                          deleteMutation.mutate(source.id);
                      }}
                      disabled={deleteMutation.isPending}
                      className="p-2 text-text-tertiary hover:text-status-error hover:bg-status-error-light rounded-xl transition-colors disabled:opacity-40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sources?.length === 0 && (
        <div className="text-center py-8 border border-surface-200 rounded-[20px]">
          <Globe className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
          <p className="text-sm text-text-tertiary">No sources configured yet.</p>
        </div>
      )}
    </div>
  );
}

/* --- Product Lineups Tab --- */

function LineupsTab() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: "",
    segment: "",
    competitors: "",
    market_context: "",
    display_order: "0",
  });

  const { data: lineups, isLoading } = useQuery({
    queryKey: ["lineups"],
    queryFn: api.lineupAnalysis.lineups,
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; segment?: string; competitors?: string[]; market_context?: string; display_order?: number }) =>
      api.lineupAnalysis.createLineup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lineups"] });
      setShowCreate(false);
      setForm({ name: "", segment: "", competitors: "", market_context: "", display_order: "0" });
      toast.success("Product lineup created");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProductLineup> }) =>
      api.lineupAnalysis.updateLineup(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lineups"] });
      setEditingId(null);
      toast.success("Product lineup updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.lineupAnalysis.deleteLineup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lineups"] });
      toast.success("Product lineup deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleCreate = () => {
    const competitors = form.competitors
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    createMutation.mutate({
      name: form.name,
      segment: form.segment || undefined,
      competitors,
      market_context: form.market_context || undefined,
      display_order: parseInt(form.display_order) || 0,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-surface-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          Manage product lineups for AI analysis — segment, competitors, and market context.
        </p>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 text-sm bg-brand-accent text-text-inverse rounded-xl hover:bg-brand-accent-hover transition-colors flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Add Lineup
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="rounded-2xl border border-surface-200 bg-surface-50 p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
                Product Name
              </label>
              <input
                type="text"
                placeholder="e.g. Destinator"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm bg-surface-100 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent text-text-primary placeholder:text-text-tertiary"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
                Segment
              </label>
              <input
                type="text"
                placeholder="e.g. Premium Family SUV"
                value={form.segment}
                onChange={(e) => setForm({ ...form, segment: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm bg-surface-100 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent text-text-primary placeholder:text-text-tertiary"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
              Competitors
            </label>
            <input
              type="text"
              placeholder="Toyota Fortuner, Honda CR-V, Hyundai Tucson"
              value={form.competitors}
              onChange={(e) => setForm({ ...form, competitors: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm bg-surface-100 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent text-text-primary placeholder:text-text-tertiary"
            />
            <p className="text-[11px] text-text-tertiary mt-1.5">Comma-separated list of direct competitors</p>
            {form.competitors.trim() && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {form.competitors.split(",").map((c) => c.trim()).filter(Boolean).map((c) => (
                  <span key={c} className="px-2.5 py-1 text-[11px] bg-brand-accent-light text-text-primary rounded-full font-medium">
                    {c}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
              Market Context
            </label>
            <textarea
              placeholder="Describe the market dynamics, pricing, trends affecting this product..."
              value={form.market_context}
              onChange={(e) => setForm({ ...form, market_context: e.target.value })}
              rows={3}
              className="w-full px-3.5 py-2.5 text-sm bg-surface-100 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent text-text-primary placeholder:text-text-tertiary resize-none"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-100">
            <button
              onClick={() => {
                setShowCreate(false);
                setForm({ name: "", segment: "", competitors: "", market_context: "", display_order: "0" });
              }}
              className="px-4 py-2 text-sm border border-surface-200 rounded-xl hover:bg-surface-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!form.name || createMutation.isPending}
              className="px-5 py-2 text-sm bg-brand-accent text-text-inverse rounded-xl hover:bg-brand-accent-hover disabled:opacity-60 flex items-center gap-1.5 font-medium"
            >
              {createMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              Create Lineup
            </button>
          </div>
        </div>
      )}

      {/* Lineup List */}
      <div className="divide-y divide-surface-100">
        {lineups?.map((lineup) => (
          <LineupRow
            key={lineup.id}
            lineup={lineup}
            isEditing={editingId === lineup.id}
            onEdit={() => setEditingId(lineup.id)}
            onCancelEdit={() => setEditingId(null)}
            onSave={(data) => updateMutation.mutate({ id: lineup.id, data })}
            onDelete={() => {
              if (confirm(`Delete lineup "${lineup.name}"? Lineups with reports cannot be deleted.`)) {
                deleteMutation.mutate(lineup.id);
              }
            }}
            isSaving={updateMutation.isPending}
          />
        ))}
      </div>

      {lineups?.length === 0 && (
        <div className="text-center py-8 border border-surface-200 rounded-[20px]">
          <Car className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
          <p className="text-sm text-text-tertiary">No product lineups configured yet.</p>
        </div>
      )}
    </div>
  );
}

function LineupRow({
  lineup,
  isEditing,
  onEdit,
  onCancelEdit,
  onSave,
  onDelete,
  isSaving,
}: {
  lineup: ProductLineup;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (data: Partial<ProductLineup>) => void;
  onDelete: () => void;
  isSaving: boolean;
}) {
  const [name, setName] = useState(lineup.name);
  const [segment, setSegment] = useState(lineup.segment || "");
  const [competitors, setCompetitors] = useState(lineup.competitors.join(", "));
  const [marketContext, setMarketContext] = useState(lineup.market_context || "");
  const [isActive, setIsActive] = useState(lineup.is_active);

  if (isEditing) {
    const parsedCompetitors = competitors.split(",").map((c) => c.trim()).filter(Boolean);

    return (
      <div className="py-5 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
              Product Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-surface-100 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent text-text-primary"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
              Segment
            </label>
            <input
              type="text"
              value={segment}
              onChange={(e) => setSegment(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-surface-100 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent text-text-primary"
            />
          </div>
          <div className="flex flex-col justify-end">
            <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
              Status
            </label>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={cn(
                "relative inline-flex h-[38px] items-center gap-2 rounded-xl px-3.5 text-sm font-medium transition-colors border",
                isActive
                  ? "border-status-success/30 bg-status-success-light text-status-success"
                  : "border-surface-200 bg-surface-100 text-text-tertiary"
              )}
            >
              <span className={cn("w-2 h-2 rounded-full", isActive ? "bg-status-success" : "bg-surface-300")} />
              {isActive ? "Active" : "Inactive"}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
            Competitors
          </label>
          <input
            type="text"
            value={competitors}
            onChange={(e) => setCompetitors(e.target.value)}
            placeholder="Comma-separated competitor names"
            className="w-full px-3.5 py-2.5 text-sm bg-surface-100 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent text-text-primary placeholder:text-text-tertiary"
          />
          {parsedCompetitors.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {parsedCompetitors.map((c) => (
                <span key={c} className="px-2.5 py-1 text-[11px] bg-brand-accent-light text-text-primary rounded-full font-medium">
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
            Market Context
          </label>
          <textarea
            value={marketContext}
            onChange={(e) => setMarketContext(e.target.value)}
            placeholder="Describe the market dynamics, pricing, trends affecting this product..."
            rows={3}
            className="w-full px-3.5 py-2.5 text-sm bg-surface-100 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent text-text-primary placeholder:text-text-tertiary resize-none"
          />
        </div>
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-100">
          <button
            onClick={onCancelEdit}
            className="px-4 py-2 text-sm border border-surface-200 rounded-xl hover:bg-surface-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              onSave({
                name,
                segment: segment || undefined,
                competitors: parsedCompetitors,
                market_context: marketContext || undefined,
                is_active: isActive,
              } as Partial<ProductLineup>)
            }
            disabled={isSaving}
            className="px-5 py-2 text-sm bg-brand-accent text-text-inverse rounded-xl hover:bg-brand-accent-hover disabled:opacity-60 flex items-center gap-1.5 font-medium"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Save Changes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-4 flex items-start justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="text-sm font-medium text-text-primary">{lineup.name}</h4>
          {lineup.segment && (
            <span className="px-2.5 py-0.5 text-[10px] bg-surface-100 text-text-secondary rounded-lg font-medium">
              {lineup.segment}
            </span>
          )}
          {!lineup.is_active && (
            <span className="px-2 py-0.5 text-[10px] bg-surface-100 text-text-tertiary rounded-lg">
              Inactive
            </span>
          )}
        </div>
        {lineup.competitors.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {lineup.competitors.map((c) => (
              <span
                key={c}
                className="px-2.5 py-1 text-[11px] bg-surface-100 text-text-secondary rounded-full"
              >
                {c}
              </span>
            ))}
          </div>
        )}
        {lineup.market_context && (
          <p className="text-xs text-text-tertiary mt-2 line-clamp-2">{lineup.market_context}</p>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0 ml-4">
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
    </div>
  );
}

/* --- Scrape Progress Panel --- */

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

/* --- Schedule & Scraping Tab --- */

function ScheduleTab() {
  const queryClient = useQueryClient();

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
    mutationFn: api.scraping.trigger,
    onSuccess: () => {
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
                Next run: {new Date(schedulerStatus.next_run_time).toLocaleString("id-ID")}
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
              onClick={() => triggerMutation.mutate()}
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
                      <td className="px-5 py-3.5 text-text-secondary">
                        {job.sources_completed}/{job.total_sources}
                      </td>
                      <td className="px-5 py-3.5 text-text-secondary">
                        {job.articles_new} new / {job.articles_found} found
                      </td>
                      <td className="px-5 py-3.5 text-text-tertiary text-xs">
                        {job.started_at ? formatRelativeDate(job.started_at) : "—"}
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
    </div>
  );
}
