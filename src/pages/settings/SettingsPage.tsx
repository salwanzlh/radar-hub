import { useState, useMemo } from "react";
import { Tags, Globe, Car, Clock, MessageSquare, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import CategoriesTab from "./CategoriesTab";
import SourcesTab from "./SourcesTab";
import LineupsTab from "./LineupsTab";
import ScheduleTab from "./ScheduleTab";
import { SettingsTab as SentimentSettingsTab } from "@/pages/sentiment/SettingsTab";
import UsersTab from "./UsersTab";

type Tab = "categories" | "sources" | "lineups" | "schedule" | "sentiment" | "users";

const BASE_TABS: { id: Tab; label: string; icon: typeof Tags }[] = [
  { id: "categories", label: "Categories & Keywords", icon: Tags },
  { id: "sources", label: "News Sources", icon: Globe },
  { id: "lineups", label: "Product Lineups", icon: Car },
  { id: "schedule", label: "Schedule & Scraping", icon: Clock },
  { id: "sentiment", label: "Sentiment", icon: MessageSquare },
];

export default function SettingsPage() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("categories");

  const TABS = useMemo(() => {
    if (isAdmin) {
      return [...BASE_TABS, { id: "users" as Tab, label: "Users", icon: Users }];
    }
    return BASE_TABS;
  }, [isAdmin]);

  return (
    <div className="space-y-6">
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
          {activeTab === "categories" && <CategoriesTab />}
          {activeTab === "sources" && <SourcesTab />}
          {activeTab === "lineups" && <LineupsTab />}
          {activeTab === "schedule" && <ScheduleTab />}
          {activeTab === "sentiment" && <SentimentSettingsTab />}
          {activeTab === "users" && isAdmin && <UsersTab />}
        </div>
      </div>
    </div>
  );
}
