import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, RotateCcw, Save, X, Pencil, Wand2 } from "lucide-react";
import { api, type PromptTemplate } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const CATEGORY_LABELS: Record<string, string> = {
  chat: "Chat / Discovery",
  marketing_plan: "Marketing Plan",
  kv_generation: "KV Image Generation",
};

const CATEGORY_ORDER = ["chat", "marketing_plan", "kv_generation"];

export default function PromptsTab() {
  const queryClient = useQueryClient();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const { data: templates, isLoading } = useQuery({
    queryKey: ["prompt-templates"],
    queryFn: api.promptTemplates.list,
  });

  const updateMutation = useMutation({
    mutationFn: ({ key, content }: { key: string; content: string }) =>
      api.promptTemplates.update(key, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompt-templates"] });
      setEditingKey(null);
      setEditContent("");
      toast.success("Prompt updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetMutation = useMutation({
    mutationFn: (key: string) => api.promptTemplates.reset(key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompt-templates"] });
      setEditingKey(null);
      setEditContent("");
      toast.success("Prompt reset to default");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleEdit(template: PromptTemplate) {
    setEditingKey(template.key);
    setEditContent(template.content);
  }

  function handleCancel() {
    setEditingKey(null);
    setEditContent("");
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-text-tertiary" />
      </div>
    );
  }

  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat] || cat,
    templates: (templates || []).filter((t) => t.category === cat),
  })).filter((g) => g.templates.length > 0);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-text-secondary">
          Customize AI prompts used across the system. Changes take effect immediately.
        </p>
      </div>

      {grouped.map((group) => (
        <div key={group.category}>
          <div className="flex items-center gap-2 mb-4">
            <Wand2 className="w-4 h-4 text-brand-accent" />
            <h4 className="text-sm font-semibold text-text-primary">{group.label}</h4>
          </div>
          <div className="space-y-3">
            {group.templates.map((template) => {
              const isEditing = editingKey === template.key;
              const isBusy = (updateMutation.isPending || resetMutation.isPending) && editingKey === template.key;

              return (
                <div
                  key={template.key}
                  className="border border-surface-200 rounded-xl overflow-hidden"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-5 py-3 bg-surface-50">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-text-primary">
                        {template.label}
                      </span>
                      {!template.is_default && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-brand-accent/10 text-brand-accent">
                          Customized
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isEditing ? (
                        <>
                          {!template.is_default && (
                            <button
                              onClick={() => resetMutation.mutate(template.key)}
                              disabled={isBusy}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-status-error hover:bg-status-error-light transition-colors disabled:opacity-50"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Reset Default
                            </button>
                          )}
                          <button
                            onClick={handleCancel}
                            disabled={isBusy}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-surface-100 text-text-secondary hover:bg-surface-200 transition-colors disabled:opacity-50"
                          >
                            <X className="w-3 h-3" />
                            Cancel
                          </button>
                          <button
                            onClick={() => updateMutation.mutate({ key: template.key, content: editContent })}
                            disabled={isBusy || editContent === template.content}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-brand-accent text-text-inverse hover:bg-brand-accent-hover transition-colors disabled:opacity-50"
                          >
                            {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                            Save
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleEdit(template)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-surface-100 text-text-secondary hover:bg-surface-200 transition-colors"
                        >
                          <Pencil className="w-3 h-3" />
                          Edit
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="px-5 py-4">
                    {isEditing ? (
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        disabled={isBusy}
                        rows={Math.min(20, Math.max(6, editContent.split("\n").length + 2))}
                        className="w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-xl text-sm text-text-primary font-mono leading-relaxed resize-y focus:outline-none focus:border-brand-accent/50 focus:ring-1 focus:ring-brand-accent/25 disabled:opacity-60 transition-colors"
                      />
                    ) : (
                      <pre className="text-xs text-text-secondary font-mono leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
                        {template.content}
                      </pre>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
