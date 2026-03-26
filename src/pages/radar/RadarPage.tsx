// import { useState } from "react";
// import { cn } from "@/lib/utils";
// import { PricingRadarContent } from "../PositioningRadarPage";
import { CompetitiveRadarTab } from "./CompetitiveRadarTab";

// type Tab = "pricing" | "competitive";

export function RadarPage() {
  return (
    <div className="space-y-6">
      <CompetitiveRadarTab />
    </div>
  );
}
