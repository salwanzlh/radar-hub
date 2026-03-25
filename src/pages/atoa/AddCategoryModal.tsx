import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Loader2, Check } from "lucide-react";
import { api } from "@/lib/api-client";
import toast from "react-hot-toast";

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const inputClass =
  "w-full px-3.5 py-2.5 text-sm bg-surface-100 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent text-text-primary placeholder:text-text-tertiary";

const labelClass =
  "block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2";

export function AddCategoryModal({ isOpen, onClose }: AddCategoryModalProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");

  const createMutation = useMutation({
    mutationFn: (data: { name: string }) => api.atoa.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atoa-comparison"] });
      toast.success("Category created");
      setName("");
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate({ name: name.trim() });
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-surface-white rounded-2xl shadow-dropdown w-full max-w-sm mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
          <h2 className="text-base font-semibold text-text-primary">Add Category</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-text-tertiary hover:text-text-primary hover:bg-surface-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className={labelClass}>
              Category Name <span className="text-status-error">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Safety"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              autoFocus
            />
          </div>

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
              disabled={!name.trim() || createMutation.isPending}
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
        </form>
      </div>
    </div>
  );
}
