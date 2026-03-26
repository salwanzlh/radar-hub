import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Files, ListChecks, ClipboardList, GitCompareArrows, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { FilesTab } from "./FilesTab";
import { JobsTab } from "./JobsTab";

type Tab = "files" | "jobs" | "form";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "files", label: "Files", icon: Files },
  { id: "jobs", label: "Jobs", icon: ListChecks },
  { id: "form", label: "Form", icon: ClipboardList },
];

const FORM_CARDS = [
  {
    label: "A2A Comparison",
    description: "Apple-to-Apple vehicle feature & value comparison matrix",
    icon: GitCompareArrows,
    href: "/atoa",
  },
];

function FormTab() {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {FORM_CARDS.map((card) => (
        <button
          key={card.href}
          onClick={() => navigate(card.href)}
          className="group flex items-start gap-4 p-5 rounded-xl border border-surface-200 bg-surface-50 hover:border-brand-accent/30 hover:bg-brand-accent/5 transition-all text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-surface-100 group-hover:bg-brand-accent/10 flex items-center justify-center shrink-0 transition-colors">
            <card.icon className="w-5 h-5 text-text-secondary group-hover:text-brand-accent transition-colors" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-text-primary">{card.label}</span>
              <ArrowRight className="w-3.5 h-3.5 text-text-tertiary group-hover:text-brand-accent transition-colors" />
            </div>
            <p className="text-xs text-text-tertiary mt-1 leading-relaxed">{card.description}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

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
          {activeTab === "form" && <FormTab />}
        </div>
      </div>
    </div>
  );
}
