import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { X, Check, Loader2, Table2, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api-client";
import type { ParsePreview, DetectedTable, TableConfirmItem, SheetConfig } from "@/lib/api-client";
import toast from "react-hot-toast";

interface PreviewModalProps {
  fileId: string;
  preview: ParsePreview;
  sheetConfigs?: SheetConfig[];
  transformScript?: string;
  onClose: () => void;
  onConfirm: (jobId?: string) => void;
}

function QualityBadge({ score }: { score: number }) {
  if (score >= 70) {
    return (
      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-status-success-light text-status-success">
        High ({score})
      </span>
    );
  }
  if (score >= 40) {
    return (
      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-50 text-yellow-700">
        Medium ({score})
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-status-error-light text-status-error">
      Low ({score})
    </span>
  );
}

export function PreviewModal({ fileId, preview, sheetConfigs, transformScript, onClose, onConfirm }: PreviewModalProps) {
  // Auto-select tables with quality >= 50
  const [selected, setSelected] = useState<Record<string, boolean>>(() => {
    const sel: Record<string, boolean> = {};
    preview.tables.forEach((t) => {
      const key = `${t.sheet_name}::${t.detected_header}`;
      sel[key] = t.quality_score >= 50;
    });
    return sel;
  });

  const [tableNames, setTableNames] = useState<Record<string, string>>(() => {
    const names: Record<string, string> = {};
    preview.tables.forEach((t) => {
      const key = `${t.sheet_name}::${t.detected_header}`;
      names[key] = t.schema_match || t.suggested_table_name;
    });
    return names;
  });

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const exp: Record<string, boolean> = {};
    preview.tables.forEach((t) => {
      const key = `${t.sheet_name}::${t.detected_header}`;
      // Auto-expand selected tables, collapse unselected
      exp[key] = t.quality_score >= 50;
    });
    return exp;
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
    mutationFn: (tables: TableConfirmItem[]) => api.pipeline.confirm(fileId, tables, sheetConfigs, transformScript),
    onSuccess: (job) => {
      onConfirm(job.id);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const selectedCount = Object.values(selected).filter(Boolean).length;

  const handleConfirm = () => {
    const tables: TableConfirmItem[] = preview.tables
      .filter((t) => {
        const key = `${t.sheet_name}::${t.detected_header}`;
        return selected[key];
      })
      .map((t) => {
        const key = `${t.sheet_name}::${t.detected_header}`;
        const target = tableNames[key];
        return {
          detected_header: t.detected_header,
          sheet_name: t.sheet_name,
          target_table: target === t.suggested_table_name ? "new" : target,
        };
      });

    if (tables.length === 0) {
      toast.error("Select at least one table to import");
      return;
    }

    // Validate table name lengths
    const tooLong = preview.tables
      .filter((t) => selected[`${t.sheet_name}::${t.detected_header}`])
      .find((t) => (tableNames[`${t.sheet_name}::${t.detected_header}`]?.length || 0) > 63);
    if (tooLong) {
      toast.error(`Table name too long (max 63 chars): ${tooLong.detected_header}`);
      return;
    }

    // Validate no duplicate target table names
    const nameCount: Record<string, string[]> = {};
    for (const t of tables) {
      const name = t.target_table === "new"
        ? preview.tables.find(
            (p) => p.sheet_name === t.sheet_name && p.detected_header === t.detected_header
          )?.suggested_table_name || ""
        : t.target_table;
      if (!nameCount[name]) nameCount[name] = [];
      nameCount[name].push(t.detected_header);
    }
    const duplicate = Object.entries(nameCount).find(([, headers]) => headers.length > 1);
    if (duplicate) {
      toast.error(`Duplicate table name "${duplicate[0]}": ${duplicate[1].join(", ")}`);
      return;
    }

    confirmMutation.mutate(tables);
  };

  const toggleAll = (checked: boolean) => {
    setSelected((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        next[key] = checked;
      }
      return next;
    });
  };

  const toggleExpand = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const renderTable = (table: DetectedTable, idx: number) => {
    const key = `${table.sheet_name}::${table.detected_header}`;
    const isSelected = selected[key] ?? false;
    const isExpanded = expanded[key] ?? false;

    return (
      <div
        key={idx}
        className={cn(
          "border rounded-xl overflow-hidden transition-colors",
          isSelected ? "border-brand-accent/40" : "border-surface-200 opacity-60"
        )}
      >
        {/* Table header with checkbox */}
        <div
          className="px-5 py-3 bg-surface-100 flex items-center gap-3 cursor-pointer select-none"
          onClick={() => toggleExpand(key)}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              setSelected((prev) => ({ ...prev, [key]: !prev[key] }));
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 rounded accent-[#D4FF00] cursor-pointer"
          />
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-text-tertiary flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-text-tertiary flex-shrink-0" />
          )}
          <Table2 className="w-4 h-4 text-text-tertiary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">{table.detected_header}</p>
            <p className="text-xs text-text-tertiary">
              Sheet: {table.sheet_name} -- {table.row_count} rows, {table.columns.length} columns
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <QualityBadge score={table.quality_score} />
            {table.schema_match && (
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700">
                Append to: {table.schema_match}
              </span>
            )}
          </div>
        </div>

        {/* Expandable content */}
        {isExpanded && (
          <>
            {/* Table name input */}
            <div className="px-5 py-3 border-b border-surface-100">
              <div className="flex items-center gap-3">
                <span className="text-xs text-text-tertiary whitespace-nowrap">Target table:</span>
                <input
                  type="text"
                  maxLength={63}
                  value={tableNames[key] || ""}
                  onChange={(e) =>
                    setTableNames((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  className={cn(
                    "flex-1 px-3 py-1.5 text-sm bg-surface-100 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent/20 text-text-primary",
                    (tableNames[key]?.length || 0) > 63
                      ? "border-status-error focus:border-status-error"
                      : "border-surface-200 focus:border-brand-accent"
                  )}
                />
                <span className={cn(
                  "text-xs tabular-nums whitespace-nowrap",
                  (tableNames[key]?.length || 0) > 50 ? "text-yellow-600" : "text-text-tertiary",
                  (tableNames[key]?.length || 0) > 63 && "text-status-error"
                )}>
                  {tableNames[key]?.length || 0}/63
                </span>
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
                          {cell != null ? String(cell) : <span className="text-text-tertiary">--</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-white border border-surface-200 rounded-[20px] max-w-4xl w-full max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-surface-200 flex-shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">XLSX Preview</h3>
            <p className="text-sm text-text-secondary mt-1">
              {preview.file_name} -- {preview.tables.length} tables detected
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Select all / none */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-surface-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={selectedCount === preview.tables.length}
                onChange={(e) => toggleAll(e.target.checked)}
                className="w-4 h-4 rounded accent-[#D4FF00]"
              />
              Select all ({selectedCount}/{preview.tables.length})
            </label>
          </div>
          <p className="text-xs text-text-tertiary">
            Tables with quality score &gt;= 50 are auto-selected
          </p>
        </div>

        {/* Tables */}
        <div className="px-6 py-5 space-y-3 overflow-y-auto flex-1">
          {preview.tables.map((table, idx) => renderTable(table, idx))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-200 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium border border-surface-200 rounded-xl hover:bg-surface-100 transition-colors text-text-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={confirmMutation.isPending || selectedCount === 0}
            className="px-4 py-2.5 text-sm font-medium bg-brand-accent text-black rounded-xl hover:bg-brand-accent/90 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {confirmMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Confirm & Process ({selectedCount})
          </button>
        </div>
      </div>
    </div>
  );
}
