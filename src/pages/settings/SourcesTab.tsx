import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Globe,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Loader2,
} from "lucide-react";
import { api, type Source } from "@/lib/api-client";
import { cn, domainToName } from "@/lib/utils";
import toast from "react-hot-toast";

export default function SourcesTab() {
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
