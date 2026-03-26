import { useState } from "react";
import { Files, ListChecks, GitCompareArrows } from "lucide-react";
import { cn } from "@/lib/utils";
import { FilesTab } from "./FilesTab";
import { JobsTab } from "./JobsTab";
import { AtoaPage } from "../atoa";

type Tab = "files" | "jobs" | "form";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "files", label: "Files", icon: Files },
  { id: "jobs", label: "Jobs", icon: ListChecks },
  { id: "form", label: "Form", icon: GitCompareArrows },
];

export default function DataPipelinePage() {
  const [activeTab, setActiveTab] = useState<Tab>("files");

  return (
    <div className="space-y-6">
      <div className="bg-surface-white rounded-[20px] shadow-card">
        {/* Tab navigation */}
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

        {/* Tab content */}
        <div className="p-7">
          {activeTab === "files" && <FilesTab />}
          {activeTab === "jobs" && <JobsTab />}
          {activeTab === "form" && <AtoaPage />}
        </div>
      </div>
    </div>
  );
}
