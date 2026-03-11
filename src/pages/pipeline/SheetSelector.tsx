import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { X, Loader2, ArrowRight, Check, Sheet, AlertTriangle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api-client";
import type { SheetsPreviewResponse, SheetConfig, ParsePreview } from "@/lib/api-client";
import toast from "react-hot-toast";

interface SheetSelectorProps {
  fileId: string;
  sheetsData: SheetsPreviewResponse;
  onClose: () => void;
  onParsed: (preview: ParsePreview, sheetConfigs: SheetConfig[], transformScript?: string) => void;
}

interface SheetSelection {
  enabled: boolean;
  headerRow: number | null;
  tableName: string;
  normalize: boolean;
  skipRows: number[];
}

export function SheetSelector({ fileId, sheetsData, onClose, onParsed }: SheetSelectorProps) {
  const [activeSheet, setActiveSheet] = useState(sheetsData.sheets[0]?.sheet_name || "");
  const [selections, setSelections] = useState<Record<string, SheetSelection>>(() => {
    const sel: Record<string, SheetSelection> = {};
    sheetsData.sheets.forEach((s) => {
      sel[s.sheet_name] = {
        enabled: false,
        headerRow: null,
        tableName: "",
        normalize: s.total_cols > 1600,
        skipRows: [],
      };
    });
    return sel;
  });
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const configsRef = useRef<SheetConfig[]>([]);

  const analyzeMutation = useMutation({
    mutationFn: () => api.pipeline.analyze(fileId),
    onSuccess: (result) => {
      // AI generated script and executed it — go directly to PreviewModal
      const preview: ParsePreview = {
        file_id: result.file_id,
        file_name: result.file_name,
        tables: result.tables,
      };
      toast.success(`AI: ${result.summary}`);
      onParsed(preview, [], result.script);
    },
    onError: (err: Error) => toast.error(`Analysis failed: ${err.message}`),
  });

  const parseMutation = useMutation({
    mutationFn: (configs: SheetConfig[]) => {
      configsRef.current = configs;
      return api.pipeline.parseWithConfig(fileId, configs);
    },
    onSuccess: (preview) => onParsed(preview, configsRef.current),
    onError: (err: Error) => toast.error(`Parse failed: ${err.message}`),
  });

  const handleRowClick = (sheetName: string, rowIdx: number) => {
    setSelections((prev) => {
      const current = prev[sheetName];
      const isDeselecting = current.headerRow === rowIdx;
      return {
        ...prev,
        [sheetName]: {
          ...current,
          enabled: !isDeselecting,
          headerRow: isDeselecting ? null : rowIdx,
        },
      };
    });
  };

  const handleSkipRowToggle = (sheetName: string, rowIdx: number) => {
    setSelections((prev) => {
      const current = prev[sheetName];
      const skipRows = current.skipRows.includes(rowIdx)
        ? current.skipRows.filter((r) => r !== rowIdx)
        : [...current.skipRows, rowIdx];
      return {
        ...prev,
        [sheetName]: { ...current, skipRows },
      };
    });
  };

  const handleParse = () => {
    const configs: SheetConfig[] = [];
    for (const [sheetName, sel] of Object.entries(selections)) {
      if (sel.enabled && sel.headerRow !== null) {
        configs.push({
          sheet_name: sheetName,
          header_row: sel.headerRow,
          table_name: sel.tableName,
          ...(sel.normalize && { normalize: true }),
          ...(sel.skipRows.length > 0 && { skip_rows: sel.skipRows }),
        });
      }
    }
    if (configs.length === 0) {
      toast.error("Select at least one header row");
      return;
    }
    parseMutation.mutate(configs);
  };

  const selectedCount = Object.values(selections).filter((s) => s.enabled && s.headerRow !== null).length;
  const currentSheet = sheetsData.sheets.find((s) => s.sheet_name === activeSheet);
  const currentSelection = selections[activeSheet];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-white border border-surface-200 rounded-[20px] max-w-5xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-surface-200 flex-shrink-0">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-text-primary">Select Header Rows</h3>
              <button
                onClick={() => analyzeMutation.mutate()}
                disabled={analyzeMutation.isPending}
                className="px-3 py-1.5 text-xs font-medium bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {analyzeMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                AI Analyze
              </button>
            </div>
            <p className="text-sm text-text-secondary mt-1">
              {sheetsData.file_name} -- Click on the row that contains column headers for each sheet you want to import.
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sheet tabs */}
        <div className="flex items-center border-b border-surface-200 px-6 flex-shrink-0 overflow-x-auto gap-1">
          <div className="flex items-center gap-1.5 pr-3 border-r border-surface-200 mr-1">
            <Sheet className="w-4 h-4 text-text-tertiary" />
            <span className="text-xs font-medium text-text-tertiary uppercase tracking-wide">Sheets</span>
          </div>
          {sheetsData.sheets.map((sheet) => {
            const sel = selections[sheet.sheet_name];
            const isActive = activeSheet === sheet.sheet_name;
            return (
              <button
                key={sheet.sheet_name}
                onClick={() => setActiveSheet(sheet.sheet_name)}
                className={cn(
                  "px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-2",
                  isActive
                    ? "border-brand-accent text-text-primary"
                    : "border-transparent text-text-tertiary hover:text-text-secondary"
                )}
              >
                {sheet.sheet_name}
                {sel?.enabled && sel?.headerRow !== null && (
                  <Check className="w-3.5 h-3.5 text-status-success" />
                )}
              </button>
            );
          })}
        </div>

        {/* Sheet info + table name + AI info */}
        {currentSheet && currentSelection && (
          <div className="flex flex-col gap-2 px-6 py-3 border-b border-surface-100 flex-shrink-0">
            <div className="flex items-center gap-4">
              <span className="text-xs text-text-tertiary">
                {currentSheet.total_rows} rows, {currentSheet.total_cols} cols
              </span>
              {currentSelection.headerRow !== null && (
                <>
                  <span className="text-xs text-text-tertiary">|</span>
                  <span className="text-xs text-status-success font-medium">
                    Header: row {currentSelection.headerRow + 1}
                  </span>
                  <span className="text-xs text-text-tertiary">|</span>
                  <span className="text-xs text-text-tertiary">Table name:</span>
                  <input
                    type="text"
                    maxLength={63}
                    placeholder="auto-generated"
                    value={currentSelection.tableName}
                    onChange={(e) =>
                      setSelections((prev) => ({
                        ...prev,
                        [activeSheet]: { ...prev[activeSheet], tableName: e.target.value },
                      }))
                    }
                    className="px-2 py-1 text-xs bg-surface-100 border border-surface-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-accent/20 text-text-primary w-48"
                  />
                </>
              )}
            </div>
            {/* Normalize toggle for wide sheets */}
            {currentSheet.total_cols > 100 && currentSelection.headerRow !== null && (
              <div className="flex items-center gap-3">
                {currentSheet.total_cols > 1600 && (
                  <span className="flex items-center gap-1.5 text-xs text-yellow-600">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Exceeds 1600 column limit
                  </span>
                )}
                <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={currentSelection.normalize}
                    onChange={(e) =>
                      setSelections((prev) => ({
                        ...prev,
                        [activeSheet]: { ...prev[activeSheet], normalize: e.target.checked },
                      }))
                    }
                    className="w-3.5 h-3.5 rounded accent-[#D4FF00] cursor-pointer"
                  />
                  Normalize (EAV) -- Convert wide format to long format (entity, variable, value)
                </label>
              </div>
            )}
            {/* Skip rows info */}
            {currentSelection.skipRows.length > 0 && (
              <p className="text-xs text-text-tertiary">
                Skipping rows: {currentSelection.skipRows.map((r) => r + 1).join(", ")}
                {" "}(right-click row to toggle skip)
              </p>
            )}
          </div>
        )}

        {/* Raw data table */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {currentSheet && (
            <table className="w-full text-xs border-collapse">
              <tbody>
                {currentSheet.rows.map((row, rowIdx) => {
                  const isHeader = currentSelection?.headerRow === rowIdx;
                  const isSkipped = currentSelection?.skipRows.includes(rowIdx);
                  const isDataRow = currentSelection?.headerRow !== null && rowIdx > currentSelection.headerRow && !isSkipped;
                  return (
                    <tr
                      key={rowIdx}
                      onClick={() => handleRowClick(activeSheet, rowIdx)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        // Only allow skip toggle for rows after header
                        if (currentSelection?.headerRow !== null && rowIdx > currentSelection.headerRow) {
                          handleSkipRowToggle(activeSheet, rowIdx);
                        }
                      }}
                      className={cn(
                        "cursor-pointer transition-colors border-b border-surface-100",
                        isHeader
                          ? "bg-brand-accent/20 hover:bg-brand-accent/30"
                          : isSkipped
                            ? "bg-red-50/50 hover:bg-red-50/80 line-through opacity-50"
                            : isDataRow
                              ? "bg-blue-50/30 hover:bg-blue-50/50"
                              : "hover:bg-surface-100"
                      )}
                    >
                      {/* Row number */}
                      <td className="px-2 py-1.5 text-text-tertiary text-right w-10 select-none border-r border-surface-200">
                        <div className="flex items-center justify-end gap-1">
                          {isSkipped && <X className="w-3 h-3 text-status-error" />}
                          {rowIdx + 1}
                        </div>
                      </td>
                      {row.map((cell, colIdx) => (
                        <td
                          key={colIdx}
                          className={cn(
                            "px-2 py-1.5 whitespace-nowrap max-w-[180px] truncate",
                            isHeader ? "font-bold text-text-primary" : "text-text-secondary"
                          )}
                          title={cell != null ? String(cell) : ""}
                        >
                          {cell != null ? String(cell) : ""}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {currentSheet && currentSheet.total_rows > currentSheet.rows.length && (
            <p className="text-xs text-text-tertiary text-center mt-3">
              Showing first {currentSheet.rows.length} of {currentSheet.total_rows} rows
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-surface-200 flex-shrink-0">
          <p className="text-xs text-text-tertiary">
            {selectedCount} sheet{selectedCount !== 1 ? "s" : ""} selected
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium border border-surface-200 rounded-xl hover:bg-surface-100 transition-colors text-text-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleParse}
              disabled={parseMutation.isPending || selectedCount === 0}
              className="px-4 py-2.5 text-sm font-medium bg-brand-accent text-black rounded-xl hover:bg-brand-accent/90 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {parseMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
              Parse Selected ({selectedCount})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
