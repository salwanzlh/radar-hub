export const SEVERITY_CLASSES = {
  red: {
    dot: "bg-status-error",
    text: "text-status-error",
    bg: "bg-status-error/10",
    bgActive: "bg-status-error/15",
    border: "border-status-error",
    borderSoft: "border-status-error/40",
    tag: "bg-status-error/10 text-status-error",
  },
  yellow: {
    dot: "bg-status-warning",
    text: "text-status-warning",
    bg: "bg-status-warning/10",
    bgActive: "bg-status-warning/15",
    border: "border-status-warning",
    borderSoft: "border-status-warning/40",
    tag: "bg-status-warning/10 text-status-warning",
  },
  green: {
    dot: "bg-status-success",
    text: "text-status-success",
    bg: "bg-status-success/10",
    bgActive: "bg-status-success/15",
    border: "border-status-success",
    borderSoft: "border-status-success/40",
    tag: "bg-status-success/10 text-status-success",
  },
} as const;
