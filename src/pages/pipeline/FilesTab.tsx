import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, Trash2, Eye, Loader2, ChevronLeft, ChevronRight, Search, Database, Lock, X } from "lucide-react";
import { cn, formatRelativeDate } from "@/lib/utils";
import { api } from "@/lib/api-client";
import type { PipelineFileSummary, PipelineFile, ParsePreview, SheetsPreviewResponse, SheetConfig } from "@/lib/api-client";
import toast from "react-hot-toast";
import { PreviewModal } from "./PreviewModal";
import { SheetSelector } from "./SheetSelector";
import { JobTracker } from "./JobTracker";
import { DataPreviewModal } from "./DataPreviewModal";

const ACCEPTED_EXTENSIONS = ".xlsx,.docx,.pptx,.pdf,.mp3,.mp4";

const FILE_TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "xlsx", label: "XLSX" },
  { value: "docx", label: "DOCX" },
  { value: "pptx", label: "PPTX" },
  { value: "pdf", label: "PDF" },
  { value: "mp3", label: "MP3" },
  { value: "mp4", label: "MP4" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "uploaded", label: "Uploaded" },
  { value: "password_required", label: "Password Required" },
  { value: "parsing", label: "Parsing" },
  { value: "preview_ready", label: "Preview Ready" },
  { value: "processing", label: "Processing" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
];

const STATUS_COLORS: Record<string, string> = {
  uploaded: "bg-surface-200 text-text-secondary",
  password_required: "bg-orange-50 text-orange-700",
  parsing: "bg-yellow-50 text-yellow-700",
  preview_ready: "bg-blue-50 text-blue-700",
  processing: "bg-yellow-50 text-yellow-700",
  completed: "bg-status-success-light text-status-success",
  failed: "bg-status-error-light text-status-error",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FilesTab() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [fileType, setFileType] = useState("");
  const [status, setStatus] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ fileId: string; preview: ParsePreview; sheetConfigs?: SheetConfig[]; transformScript?: string } | null>(null);
  const [sheetSelector, setSheetSelector] = useState<{ fileId: string; data: SheetsPreviewResponse } | null>(null);
  const [trackingJobId, setTrackingJobId] = useState<string | null>(null);
  const [dataPreviewFile, setDataPreviewFile] = useState<PipelineFile | null>(null);
  const [passwordModal, setPasswordModal] = useState<{ fileId: string; fileName: string } | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [transcriptionProviders, setTranscriptionProviders] = useState<Record<string, 'gemini' | 'assemblyai'>>({});
  const pageSize = 20;

  // Fetch files
  const { data, isLoading } = useQuery({
    queryKey: ["pipeline-files", page, fileType, status],
    queryFn: () =>
      api.pipeline.getFiles({
        page: String(page),
        page_size: String(pageSize),
        ...(fileType && { file_type: fileType }),
        ...(status && { status }),
      }),
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.pipeline.upload(file),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-files"] });
      if (result.status === "password_required") {
        setPasswordModal({ fileId: result.id, fileName: result.file_name });
        setPasswordInput("");
      } else {
        toast.success(`Uploaded: ${result.file_name}`);
        if (result.file_type === "xlsx") {
          openSheetSelector(result.id);
        }
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Password mutation
  const passwordMutation = useMutation({
    mutationFn: ({ fileId, password }: { fileId: string; password: string }) =>
      api.pipeline.submitPassword(fileId, password),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-files"] });
      toast.success(`Password accepted: ${result.file_name}`);
      setPasswordModal(null);
      setPasswordInput("");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Open sheet selector (fetch raw sheets data)
  const openSheetSelector = async (fileId: string) => {
    try {
      const sheetsData = await api.pipeline.getSheetsPreview(fileId);
      setSheetSelector({ fileId, data: sheetsData });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load sheets");
    }
  };

  // Process mutation (unstructured)
  const processMutation = useMutation({
    mutationFn: ({ fileId, provider }: { fileId: string; provider?: 'gemini' | 'assemblyai' }) =>
      api.pipeline.process(fileId, provider ? { transcription_provider: provider } : undefined),
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-files"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-jobs"] });
      setTrackingJobId(job.id);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (fileId: string) => api.pipeline.deleteFile(fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-files"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-jobs"] });
      toast.success("File deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Drag & drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) {
        uploadMutation.mutate(file);
      }
    },
    [uploadMutation]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        uploadMutation.mutate(file);
      }
      e.target.value = "";
    },
    [uploadMutation]
  );

  // SheetSelector → parsed result → open PreviewModal
  const handleSheetsParsed = (preview: ParsePreview, sheetConfigs: SheetConfig[], transformScript?: string) => {
    queryClient.invalidateQueries({ queryKey: ["pipeline-files"] });
    const fileId = sheetSelector!.fileId;
    setSheetSelector(null);
    setPreviewFile({ fileId, preview, sheetConfigs, transformScript });
  };

  // Preview modal handlers
  const handleOpenPreview = async (fileId: string) => {
    try {
      const preview = await api.pipeline.getPreview(fileId);
      setPreviewFile({ fileId, preview });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load preview");
    }
  };

  const handleConfirm = (jobId?: string) => {
    queryClient.invalidateQueries({ queryKey: ["pipeline-files"] });
    queryClient.invalidateQueries({ queryKey: ["pipeline-jobs"] });
    setPreviewFile(null);
    if (jobId) {
      setTrackingJobId(jobId);
    }
  };

  // Open data preview (fetch full file detail with structured_tables)
  const openDataPreview = async (fileId: string) => {
    try {
      const fileDetail = await api.pipeline.getFile(fileId);
      setDataPreviewFile(fileDetail);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load file data");
    }
  };

  // Action buttons per file
  const getActions = (file: PipelineFileSummary) => {
    const actions: React.ReactNode[] = [];

    if (file.file_type === "xlsx" && file.status === "uploaded") {
      actions.push(
        <button
          key="parse"
          onClick={() => openSheetSelector(file.id)}
          className="p-1.5 hover:bg-surface-100 rounded-lg text-text-secondary hover:text-text-primary transition-colors"
          title="Select Headers & Parse"
        >
          <Search className="w-4 h-4" />
        </button>
      );
    }

    if (file.file_type === "xlsx" && file.status === "preview_ready") {
      actions.push(
        <button
          key="preview"
          onClick={() => handleOpenPreview(file.id)}
          className="p-1.5 hover:bg-surface-100 rounded-lg text-blue-500 hover:text-blue-600 transition-colors"
          title="View Preview"
        >
          <Eye className="w-4 h-4" />
        </button>
      );
    }

    if (file.status === "completed") {
      actions.push(
        <button
          key="data"
          onClick={() => openDataPreview(file.id)}
          className="p-1.5 hover:bg-surface-100 rounded-lg text-status-success hover:text-status-success/80 transition-colors"
          title="View Data"
        >
          <Database className="w-4 h-4" />
        </button>
      );
    }

    if (file.status === "password_required") {
      actions.push(
        <button
          key="password"
          onClick={() => { setPasswordModal({ fileId: file.id, fileName: file.file_name }); setPasswordInput(""); }}
          className="p-1.5 hover:bg-orange-50 rounded-lg text-orange-600 hover:text-orange-700 transition-colors"
          title="Enter Password"
        >
          <Lock className="w-4 h-4" />
        </button>
      );
    }

    if (file.file_type !== "xlsx" && file.status === "uploaded") {
      const isAudioVideo = file.file_type === "mp3" || file.file_type === "mp4";
      if (isAudioVideo) {
        const provider = transcriptionProviders[file.id] ?? "gemini";
        actions.push(
          <select
            key="provider"
            value={provider}
            onChange={(e) =>
              setTranscriptionProviders((prev) => ({
                ...prev,
                [file.id]: e.target.value as 'gemini' | 'assemblyai',
              }))
            }
            className="px-2 py-1 text-xs border border-surface-200 rounded-lg bg-surface-50 text-text-secondary focus:outline-none"
            title="Transcription provider"
          >
            <option value="gemini">Gemini</option>
            <option value="assemblyai">AssemblyAI</option>
          </select>
        );
      }
      actions.push(
        <button
          key="process"
          onClick={() => {
            const provider = isAudioVideo ? (transcriptionProviders[file.id] ?? "gemini") : undefined;
            processMutation.mutate({ fileId: file.id, provider });
          }}
          disabled={processMutation.isPending}
          className="p-1.5 hover:bg-surface-100 rounded-lg text-brand-accent hover:text-brand-accent/80 transition-colors"
          title="Start Processing"
        >
          <Upload className="w-4 h-4" />
        </button>
      );
    }

    actions.push(
      <button
        key="delete"
        onClick={() => {
          if (confirm(`Delete "${file.file_name}"? This will remove all associated data.`)) {
            deleteMutation.mutate(file.id);
          }
        }}
        disabled={deleteMutation.isPending}
        className="p-1.5 hover:bg-status-error-light rounded-lg text-text-tertiary hover:text-status-error transition-colors"
        title="Delete"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    );

    return actions;
  };

  const totalPages = data ? data.total_pages : 1;

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-[20px] p-10 text-center transition-colors cursor-pointer",
          dragOver
            ? "border-brand-accent bg-brand-accent/5"
            : "border-surface-200 hover:border-surface-300",
          uploadMutation.isPending && "opacity-50 pointer-events-none"
        )}
        onClick={() => document.getElementById("pipeline-file-input")?.click()}
      >
        <input
          id="pipeline-file-input"
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          onChange={handleFileSelect}
          className="hidden"
        />
        {uploadMutation.isPending ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-brand-accent animate-spin" />
            <p className="text-sm text-text-secondary">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-surface-100 flex items-center justify-center">
              <Upload className="w-6 h-6 text-text-tertiary" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">
                Drop file here or click to browse
              </p>
              <p className="text-xs text-text-tertiary mt-1">
                Supports XLSX, DOCX, PPTX, PDF, MP3, MP4
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <select
          value={fileType}
          onChange={(e) => { setFileType(e.target.value); setPage(1); }}
          className="px-3.5 py-2.5 text-sm border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/20 bg-surface-100 text-text-primary"
        >
          {FILE_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="px-3.5 py-2.5 text-sm border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/20 bg-surface-100 text-text-primary"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* File List Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-text-tertiary animate-spin" />
        </div>
      ) : data && data.items.length > 0 ? (
        <>
          <div className="border border-surface-200 rounded-[20px] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-100 border-b border-surface-200">
                    <th className="text-left px-5 py-3 font-medium text-text-secondary">Name</th>
                    <th className="text-left px-5 py-3 font-medium text-text-secondary">Type</th>
                    <th className="text-left px-5 py-3 font-medium text-text-secondary">Size</th>
                    <th className="text-left px-5 py-3 font-medium text-text-secondary">Status</th>
                    <th className="text-right px-5 py-3 font-medium text-text-secondary">Uploaded</th>
                    <th className="text-right px-5 py-3 font-medium text-text-secondary">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {data.items.map((file) => (
                    <tr key={file.id} className="hover:bg-surface-100 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-text-primary max-w-[300px] truncate">
                        {file.file_name}
                      </td>
                      <td className="px-5 py-3.5 text-text-secondary uppercase text-xs font-semibold">
                        {file.file_type}
                      </td>
                      <td className="px-5 py-3.5 text-text-secondary">
                        {formatFileSize(file.file_size)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={cn(
                          "px-2.5 py-1 text-xs font-semibold rounded-full",
                          STATUS_COLORS[file.status] || "bg-surface-200 text-text-secondary"
                        )}>
                          {file.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right text-text-tertiary text-xs">
                        {formatRelativeDate(file.created_at)}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          {getActions(file)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-surface-200">
              <p className="text-xs text-text-tertiary">
                {(page - 1) * pageSize + 1}--{Math.min(page * pageSize, data.total)} of {data.total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="p-2.5 rounded-xl border border-surface-200 hover:bg-surface-white disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-text-secondary px-4">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="p-2.5 rounded-xl border border-surface-200 hover:bg-surface-white disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16 text-text-tertiary text-sm">
          No files uploaded yet. Drop a file above to get started.
        </div>
      )}

      {/* Sheet Selector Modal (Step 1: pick header rows) */}
      {sheetSelector && (
        <SheetSelector
          fileId={sheetSelector.fileId}
          sheetsData={sheetSelector.data}
          onClose={() => setSheetSelector(null)}
          onParsed={handleSheetsParsed}
        />
      )}

      {/* XLSX Preview Modal (Step 2: review parsed tables & confirm) */}
      {previewFile && (
        <PreviewModal
          fileId={previewFile.fileId}
          preview={previewFile.preview}
          sheetConfigs={previewFile.sheetConfigs}
          transformScript={previewFile.transformScript}
          onClose={() => setPreviewFile(null)}
          onConfirm={handleConfirm}
        />
      )}

      {/* Job progress tracker */}
      {trackingJobId && (
        <JobTracker
          jobId={trackingJobId}
          onClose={() => setTrackingJobId(null)}
        />
      )}

      {/* Data preview modal */}
      {dataPreviewFile && (
        <DataPreviewModal
          file={dataPreviewFile}
          onClose={() => setDataPreviewFile(null)}
        />
      )}

      {/* Password modal */}
      {passwordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-surface-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">Password Required</h3>
                  <p className="text-xs text-text-tertiary mt-0.5 truncate max-w-[200px]">{passwordModal.fileName}</p>
                </div>
              </div>
              <button
                onClick={() => { setPasswordModal(null); setPasswordInput(""); }}
                className="p-1.5 hover:bg-surface-100 rounded-lg text-text-tertiary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-text-secondary mb-4">
              This PDF is password-protected. Please enter the password to continue.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (passwordInput.trim()) {
                  passwordMutation.mutate({ fileId: passwordModal.fileId, password: passwordInput });
                }
              }}
            >
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter PDF password"
                autoFocus
                className="w-full px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-accent/50 transition-colors"
              />
              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => { setPasswordModal(null); setPasswordInput(""); }}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-text-secondary bg-surface-50 hover:bg-surface-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!passwordInput.trim() || passwordMutation.isPending}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-text-inverse bg-brand-accent hover:bg-brand-accent/90 rounded-xl transition-colors disabled:opacity-50"
                >
                  {passwordMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    "Unlock"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
