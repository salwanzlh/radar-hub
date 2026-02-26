import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  MessageSquare,
  Hash,
  FileText,
  Package,
} from "lucide-react";
import {
  sentimentApi,
  type ProductLineup,
} from "@/lib/sentiment-api-client";
import { cn } from "@/lib/utils";
import { OverviewTab } from "./OverviewTab";
import { CommentsTab } from "./CommentsTab";
import { TopicsTab } from "./TopicsTab";
import { ReportsTab } from "./ReportsTab";
type Tab = "overview" | "comments" | "topics" | "reports";

const TABS: { id: Tab; label: string; icon: typeof BarChart3 }[] = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "comments", label: "Comments", icon: MessageSquare },
  { id: "topics", label: "Topics", icon: Hash },
  { id: "reports", label: "Reports", icon: FileText },
];

/* --- Shared Badge Components --- */

export function SentimentBadge({ sentiment, confidence }: { sentiment: string; confidence?: number }) {
  const styles: Record<string, string> = {
    positive: "bg-status-success-light text-status-success",
    neutral: "bg-blue-50 text-blue-600",
    negative: "bg-status-error-light text-status-error",
  };
  return (
    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${styles[sentiment] || "bg-surface-100 text-text-tertiary"}`}>
      {sentiment}{confidence !== undefined ? ` ${(confidence * 100).toFixed(0)}%` : ""}
    </span>
  );
}

export function PlatformBadge({ platform }: { platform: string }) {
  const colors: Record<string, string> = {
    facebook: "bg-blue-50 text-blue-600",
    instagram: "bg-pink-50 text-pink-600",
    twitter: "bg-sky-50 text-sky-600",
    youtube: "bg-red-50 text-red-600",
    tiktok: "bg-gray-50 text-gray-800",
  };
  return (
    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full capitalize ${colors[platform] || "bg-surface-100 text-text-tertiary"}`}>
      {platform}
    </span>
  );
}

/* --- Main Page Component --- */

export default function SentimentPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [selectedProduct, setSelectedProduct] = useState<string | undefined>(undefined);

  const { data: productLineups } = useQuery<ProductLineup[]>({
    queryKey: ["sentiment-product-lineups"],
    queryFn: sentimentApi.products.lineups,
  });

  return (
    <div className="space-y-6">
      {/* Product Selector */}
      <div className="bg-surface-white rounded-[20px] shadow-card p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Package className="w-4 h-4 text-text-tertiary shrink-0" />
          <span className="text-xs font-medium text-text-tertiary mr-1">Product:</span>
          <button
            onClick={() => setSelectedProduct(undefined)}
            className={cn(
              "px-3.5 py-1.5 text-xs font-medium rounded-full transition-colors",
              !selectedProduct
                ? "bg-brand-accent text-text-inverse"
                : "bg-surface-100 text-text-secondary hover:bg-surface-200"
            )}
          >
            All Products
          </button>
          {productLineups?.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedProduct(p.id)}
              className={cn(
                "px-3.5 py-1.5 text-xs font-medium rounded-full transition-colors",
                selectedProduct === p.id
                  ? "bg-brand-accent text-text-inverse"
                  : "bg-surface-100 text-text-secondary hover:bg-surface-200"
              )}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-surface-white rounded-[20px] shadow-card">
        <div className="flex border-b border-surface-100">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 -mb-px",
                activeTab === tab.id
                  ? "border-brand-accent text-text-primary"
                  : "border-transparent text-text-secondary hover:text-text-primary"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-7">
          {activeTab === "overview" && <OverviewTab selectedProduct={selectedProduct} />}
          {activeTab === "comments" && <CommentsTab selectedProduct={selectedProduct} />}
          {activeTab === "topics" && <TopicsTab selectedProduct={selectedProduct} />}
          {activeTab === "reports" && <ReportsTab selectedProduct={selectedProduct} />}
        </div>
      </div>
    </div>
  );
}
