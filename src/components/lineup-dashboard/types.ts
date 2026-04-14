import type { Finding, Recommendation } from "@/lib/api-client";

export type { Finding, Recommendation };

export interface LineupDashboardProps {
  findings: Finding[];
  recommendations: Recommendation[];
  productName: string;
  dateFrom: string;
  dateTo: string;
}

export interface CardClickHandlers {
  onFindingClick: (id: number) => void;
  onRecommendationClick: (id: number) => void;
}

export interface ActiveState {
  activeFindingId: number | null;
  activeRecommendationId: number | null;
}
