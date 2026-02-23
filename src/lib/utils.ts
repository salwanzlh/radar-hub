import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function domainToName(domain: string): string {
  let d = domain.toLowerCase().trim();
  d = d.replace(/^https?:\/\//, "").replace(/^www\./, "");
  d = d.split("/")[0];
  d = d.replace(/\.(com|co\.id|id|net|org|co|io|news)$/i, "");
  const parts = d.split(".").filter(Boolean);
  return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
}

export function getCategoryColor(slug: string): string {
  const colors: Record<string, string> = {
    "electric-vehicles": "bg-cat-ev",
    "mitsubishi-competitors": "bg-cat-competitor",
    "market-trends": "bg-cat-market",
    "general": "bg-cat-general",
  };
  return colors[slug] || "bg-surface-300";
}

export function getCategoryTextColor(slug: string): string {
  const colors: Record<string, string> = {
    "electric-vehicles": "text-cat-ev",
    "mitsubishi-competitors": "text-cat-competitor",
    "market-trends": "text-cat-market",
    "general": "text-cat-general",
  };
  return colors[slug] || "text-surface-300";
}
