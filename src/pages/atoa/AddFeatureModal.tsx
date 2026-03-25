import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Loader2, Check } from "lucide-react";
import { api, type AtoaCategory } from "@/lib/api-client";
import toast from "react-hot-toast";

interface AddFeatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryId?: string;
  categories: AtoaCategory[];
}

interface FeatureForm {
  category_id: string;
  sub_item: string;
  remark: string;
  detail: string;
  weight: string;
}

const INITIAL_FORM: FeatureForm = {
  category_id: "",
  sub_item: "",
  remark: "",
  detail: "",
  weight: "0",
};

const inputClass =
  "w-full px-3.5 py-2.5 text-sm bg-surface-100 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent text-text-primary placeholder:text-text-tertiary";

const labelClass =
  "block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2";

export function AddFeatureModal({ isOpen, onClose, categoryId, categories }: AddFeatureModalProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FeatureForm>(INITIAL_FORM);

  useEffect(() => {
    if (isOpen) {
      setForm({
        ...INITIAL_FORM,
        category_id: categoryId ?? "",
      });
    }
  }, [isOpen, categoryId]);

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof api.atoa.createFeature>[0]) =>
      api.atoa.createFeature(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atoa-comparison"] });
      toast.success("Feature created");
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.category_id || !form.sub_item.trim()) return;

    const weightValue = parseInt(form.weight, 10);

    createMutation.mutate({
      category_id: form.category_id,
      sub_item: form.sub_item.trim(),
      remark: form.remark.trim() || undefined,
      detail: form.detail.trim() || undefined,
      weight: isNaN(weightValue) ? 0 : weightValue,
    });
  }

  function setField(field: keyof FeatureForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  if (!isOpen) return null;

  const isValid = form.category_id && form.sub_item.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-surface-white rounded-2xl shadow-dropdown w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
          <h2 className="text-base font-semibold text-text-primary">Add Feature</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-text-tertiary hover:text-text-primary hover:bg-surface-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Category */}
          <div>
            <label className={labelClass}>
              Category <span className="text-status-error">*</span>
            </label>
            <select
              value={form.category_id}
              onChange={(e) => setField("category_id", e.target.value)}
              className={inputClass}
            >
              <option value="">-- Select Category --</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sub Item */}
          <div>
            <label className={labelClass}>
              Feature Name (Sub Item) <span className="text-status-error">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. ABS"
              value={form.sub_item}
              onChange={(e) => setField("sub_item", e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Remark + Weight */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className={labelClass}>Remark</label>
              <input
                type="text"
                placeholder="e.g. Anti-lock Braking System"
                value={form.remark}
                onChange={(e) => setField("remark", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Weight</label>
              <input
                type="number"
                placeholder="0"
                value={form.weight}
                onChange={(e) => setField("weight", e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Detail */}
          <div>
            <label className={labelClass}>Detail</label>
            <input
              type="text"
              placeholder="Additional specification detail"
              value={form.detail}
              onChange={(e) => setField("detail", e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-surface-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border border-surface-200 rounded-xl hover:bg-surface-100 transition-colors text-text-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid || createMutation.isPending}
              className="px-5 py-2 text-sm bg-brand-accent text-text-inverse rounded-xl hover:bg-brand-accent-hover disabled:opacity-60 flex items-center gap-1.5 font-medium"
            >
              {createMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              Create Feature
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
