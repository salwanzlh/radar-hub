import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, ChevronLeft, ChevronRight, Loader2, Database, Table2, FileText, Search, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api-client";
import type { PipelineFile } from "@/lib/api-client";

interface DataPreviewModalProps {
  file: PipelineFile;
  onClose: () => void;
}

const TYPE_COLORS: Record<string, string> = {
  text: "text-blue-600",
  bigint: "text-purple-600",
  float: "text-orange-600",
  date: "text-green-600",
};

export function DataPreviewModal({ file, onClose }: DataPreviewModalProps) {
  const tables = file.structured_tables || [];
  const refs = file.unstructured_refs || [];
  const [activeTable, setActiveTable] = useState(tables[0]?.table_name || "");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const { data, isLoading, error } = useQuery({
    queryKey: ["table-data", activeTable, page, file.id],
    queryFn: () => api.pipeline.getTableData(activeTable, page, pageSize, file.id),
    enabled: !!activeTable,
  });

  const handleTableChange = (tableName: string) => {
    setActiveTable(tableName);
    setPage(1);
  };

  const hasStructured = tables.length > 0;
  const hasUnstructured = refs.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-white border border-surface-200 rounded-[20px] max-w-6xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-surface-200 flex-shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <Database className="w-5 h-5 text-text-tertiary" />
              {file.file_name}
            </h3>
            <p className="text-xs text-text-tertiary mt-1">
              {hasStructured && `${tables.length} table${tables.length !== 1 ? "s" : ""}`}
              {hasStructured && hasUnstructured && " | "}
              {hasUnstructured && `${refs.reduce((s, r) => s + r.chunk_count, 0)} chunks indexed`}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => api.pipeline.downloadFile(file.id)}
              className="p-1.5 hover:bg-surface-100 rounded-lg text-text-tertiary hover:text-text-primary transition-colors"
              title="Download file"
            >
              <Download className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-surface-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Structured tables */}
        {hasStructured && (
          <>
            {/* Table tabs */}
            {tables.length > 1 && (
              <div className="flex items-center border-b border-surface-200 px-6 flex-shrink-0 overflow-x-auto gap-1">
                <div className="flex items-center gap-1.5 pr-3 border-r border-surface-200 mr-1">
                  <Table2 className="w-4 h-4 text-text-tertiary" />
                  <span className="text-xs font-medium text-text-tertiary uppercase tracking-wide">Tables</span>
                </div>
                {tables.map((t) => (
                  <button
                    key={t.table_name}
                    onClick={() => handleTableChange(t.table_name)}
                    className={cn(
                      "px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors",
                      activeTable === t.table_name
                        ? "border-brand-accent text-text-primary"
                        : "border-transparent text-text-tertiary hover:text-text-secondary"
                    )}
                  >
                    {t.table_name}
                    <span className="ml-2 text-xs text-text-tertiary">
                      ({t.row_count.toLocaleString()})
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Single table info */}
            {tables.length === 1 && (
              <div className="px-6 py-2.5 border-b border-surface-100 flex-shrink-0">
                <span className="text-xs text-text-tertiary">
                  {activeTable} -- {data ? data.total.toLocaleString() : tables[0].row_count.toLocaleString()} rows, {tables[0].column_schema.length} columns
                </span>
              </div>
            )}

            {/* Data table */}
            <div className="flex-1 overflow-auto min-h-0">
              {error ? (
                <div className="flex items-center justify-center py-20">
                  <p className="text-sm text-status-error">{(error as Error).message}</p>
                </div>
              ) : isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 text-text-tertiary animate-spin" />
                </div>
              ) : data ? (
                <table className="w-full text-xs border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-surface-100 border-b border-surface-200">
                      <th className="px-3 py-2.5 text-right text-text-tertiary font-medium w-10 border-r border-surface-200">
                        #
                      </th>
                      {data.columns.map((col) => (
                        <th
                          key={col.name}
                          className="px-3 py-2.5 text-left font-medium text-text-secondary whitespace-nowrap"
                        >
                          <div className="flex flex-col gap-0.5">
                            <span>{col.name}</span>
                            <span className={cn("text-[10px] font-normal", TYPE_COLORS[col.type] || "text-text-tertiary")}>
                              {col.type}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((row, rowIdx) => (
                      <tr key={rowIdx} className="border-b border-surface-100 hover:bg-surface-50 transition-colors">
                        <td className="px-3 py-2 text-right text-text-tertiary border-r border-surface-200 select-none">
                          {(data.page - 1) * data.page_size + rowIdx + 1}
                        </td>
                        {row.map((cell, colIdx) => (
                          <td
                            key={colIdx}
                            className="px-3 py-2 text-text-primary whitespace-nowrap max-w-[250px] truncate"
                            title={cell != null ? String(cell) : ""}
                          >
                            {cell != null ? String(cell) : (
                              <span className="text-text-tertiary italic">null</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {data.rows.length === 0 && (
                      <tr>
                        <td
                          colSpan={data.columns.length + 1}
                          className="px-3 py-10 text-center text-text-tertiary"
                        >
                          No data in this table
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : null}
            </div>

            {/* Pagination */}
            {data && data.total_pages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-surface-200 flex-shrink-0">
                <p className="text-xs text-text-tertiary">
                  {((data.page - 1) * data.page_size + 1).toLocaleString()}--
                  {Math.min(data.page * data.page_size, data.total).toLocaleString()} of{" "}
                  {data.total.toLocaleString()} rows
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-lg border border-surface-200 hover:bg-surface-100 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-text-secondary px-2">
                    Page {data.page} of {data.total_pages.toLocaleString()}
                  </span>
                  <button
                    onClick={() => setPage(Math.min(data.total_pages, page + 1))}
                    disabled={page === data.total_pages}
                    className="p-2 rounded-lg border border-surface-200 hover:bg-surface-100 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Unstructured content */}
        {!hasStructured && hasUnstructured && (() => {
          const transcript = refs.find((r) => r.transcript_text)?.transcript_text;
          const totalChunks = refs.reduce((s, r) => s + r.chunk_count, 0);

          return transcript ? (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Info bar */}
              <div className="px-6 py-2.5 border-b border-surface-100 flex-shrink-0 flex items-center gap-4">
                <span className="text-xs text-text-tertiary flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  Transcript
                </span>
                <span className="text-xs text-text-tertiary flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5" />
                  {totalChunks} chunks indexed
                </span>
              </div>
              {/* Transcript content */}
              <div className="flex-1 overflow-auto min-h-0 px-6 py-4">
                <div className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                  {transcript}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center py-16">
              <div className="text-center">
                <p className="text-sm text-text-secondary">
                  {totalChunks} chunks indexed in Azure AI Search
                </p>
                <p className="text-xs text-text-tertiary mt-1">
                  Unstructured content is searchable via the chat interface
                </p>
              </div>
            </div>
          );
        })()}

        {/* No data */}
        {!hasStructured && !hasUnstructured && (
          <div className="flex-1 flex items-center justify-center py-16">
            <p className="text-sm text-text-tertiary">No data associated with this file</p>
          </div>
        )}
      </div>
    </div>
  );
}
