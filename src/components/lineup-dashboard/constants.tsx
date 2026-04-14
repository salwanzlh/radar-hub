import type { ReactElement } from "react";
import { Megaphone, Wrench, Target, Truck, Smartphone } from "lucide-react";

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

export const SEVERITY_STROKE = {
  red: "#EF4444",
  yellow: "#EAB308",
  green: "#22C55E",
} as const;

export const PRIORITY_TO_SEVERITY = {
  high: "red",
  medium: "yellow",
  low: "green",
} as const;

export const CATEGORY_ICONS: Record<string, ReactElement> = {
  marketing: <Megaphone className="w-3 h-3" />,
  "after-sales": <Wrench className="w-3 h-3" />,
  "product positioning": <Target className="w-3 h-3" />,
  distribution: <Truck className="w-3 h-3" />,
  digital: <Smartphone className="w-3 h-3" />,
};
