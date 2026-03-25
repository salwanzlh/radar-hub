import { useState } from "react";
import { cn } from "@/lib/utils";
import { PricingRadarContent } from "../PositioningRadarPage";
import { CompetitiveRadarTab } from "./CompetitiveRadarTab";

type Tab = "pricing" | "competitive";

export function RadarPage() {
  const [activeTab, setActiveTab] = useState<Tab>("pricing");

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("pricing")}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            activeTab === "pricing"
              ? "bg-brand-accent text-black"
              : "bg-surface-100 text-text-secondary hover:bg-surface-200",
          )}
        >
          Pricing Radar
        </button>
        <button
          onClick={() => setActiveTab("competitive")}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            activeTab === "competitive"
              ? "bg-brand-accent text-black"
              : "bg-surface-100 text-text-secondary hover:bg-surface-200",
          )}
        >
          Competitive Radar
        </button>
      </div>
      {activeTab === "pricing" && <PricingRadarContent />}
      {activeTab === "competitive" && <CompetitiveRadarTab />}
    </div>
  );
}
