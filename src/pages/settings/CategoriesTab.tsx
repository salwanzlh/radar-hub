import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Check,
} from "lucide-react";
import { api, type Category } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function CategoriesTab() {
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
