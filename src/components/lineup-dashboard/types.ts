import type { Finding } from "@/lib/api-client";

export type { Finding };

export interface LineupDashboardProps {
  findings: Finding[];
  productName: string;
  dateFrom: string;
  dateTo: string;
  lineupReportId?: string;
}
