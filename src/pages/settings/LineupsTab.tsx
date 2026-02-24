import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Check,
  Car,
} from "lucide-react";
import { api, type ProductLineup } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function LineupsTab() {
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
