import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { X, Check, Loader2, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api-client";
import type { ParsePreview, TableConfirmItem } from "@/lib/api-client";
import toast from "react-hot-toast";

interface PreviewModalProps {
  fileId: string;
  preview: ParsePreview;
  onClose: () => void;
  onConfirm: () => void;
}

export function PreviewModal({ fileId, preview, onClose, onConfirm }: PreviewModalProps) {
  const [tableNames, setTableNames] = useState<Record<string, string>>(() => {
    const names: Record<string, string> = {};
    preview.tables.forEach((t) => {
      const key = `${t.sheet_name}::${t.detected_header}`;
      names[key] = t.schema_match || t.suggested_table_name;
    });
    return names;
  });

  // Escape key handler
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const confirmMutation = useMutation({
    mutationFn: (tables: TableConfirmItem[]) => api.pipeline.confirm(fileId, tables),
    onSuccess: () => {
      toast.success("Processing started");
      onConfirm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleConfirm = () => {
    const tables: TableConfirmItem[] = preview.tables.map((t) => {
      const key = `${t.sheet_name}::${t.detected_header}`;
      const target = tableNames[key];
      return {
        detected_header: t.detected_header,
        sheet_name: t.sheet_name,
        target_table: target === t.suggested_table_name ? "new" : target,
      };
    });
    confirmMutation.mutate(tables);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-white border border-surface-200 rounded-[20px] max-w-4xl w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-surface-200">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">XLSX Preview</h3>
            <p className="text-sm text-text-secondary mt-1">{preview.file_name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tables */}
        <div className="px-6 py-5 space-y-6">
          {preview.tables.map((table, idx) => {
            const key = `${table.sheet_name}::${table.detected_header}`;
            return (
              <div key={idx} className="border border-surface-200 rounded-xl overflow-hidden">
                {/* Table header */}
                <div className="px-5 py-3 bg-surface-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Table2 className="w-4 h-4 text-text-tertiary" />
                    <div>
                      <p className="text-sm font-medium text-text-primary">{table.detected_header}</p>
                      <p className="text-xs text-text-tertiary">
                        Sheet: {table.sheet_name} — {table.row_count} rows, {table.columns.length} columns
                      </p>
                    </div>
                  </div>
                  {table.schema_match && (
                    <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700">
                      Append to: {table.schema_match}
                    </span>
                  )}
                </div>

                {/* Table name input */}
                <div className="px-5 py-3 border-b border-surface-100 flex items-center gap-3">
                  <span className="text-xs text-text-tertiary whitespace-nowrap">Target table:</span>
                  <input
                    type="text"
                    value={tableNames[key] || ""}
                    onChange={(e) =>
                      setTableNames((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    className="flex-1 px-3 py-1.5 text-sm bg-surface-100 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent text-text-primary"
                  />
                </div>

                {/* Column schema */}
                <div className="px-5 py-3 border-b border-surface-100">
                  <p className="text-xs text-text-tertiary mb-2">Columns:</p>
                  <div className="flex flex-wrap gap-2">
                    {table.columns.map((col, ci) => (
                      <span
                        key={ci}
                        className="px-2.5 py-1 text-xs bg-surface-100 text-text-secondary rounded-full"
                      >
                        {col.name} <span className="text-text-tertiary">({col.type})</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Sample rows */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-surface-50">
                        {table.columns.map((col, ci) => (
                          <th key={ci} className="text-left px-3 py-2 font-medium text-text-tertiary whitespace-nowrap">
                            {col.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100">
                      {table.sample_rows.slice(0, 5).map((row, ri) => (
                        <tr key={ri}>
                          {row.map((cell: unknown, ci: number) => (
                            <td key={ci} className="px-3 py-2 text-text-secondary whitespace-nowrap max-w-[200px] truncate">
                              {cell != null ? String(cell) : "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-200">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium border border-surface-200 rounded-xl hover:bg-surface-100 transition-colors text-text-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={confirmMutation.isPending}
            className="px-4 py-2.5 text-sm font-medium bg-brand-accent text-black rounded-xl hover:bg-brand-accent/90 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {confirmMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Confirm & Process
          </button>
        </div>
      </div>
    </div>
  );
}
