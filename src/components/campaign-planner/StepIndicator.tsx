import { Check, CircleDot, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "audit", label: "Audit", statusMatch: ["audit"] },
  { key: "clarification", label: "Clarification", statusMatch: ["clarifying"] },
  { key: "summary", label: "Summary", statusMatch: ["summarizing"] },
  { key: "plan", label: "Plan", statusMatch: ["generating", "completed"] },
] as const;

interface Props {
  currentStep: string;
  onStepClick: (step: string) => void;
}

export default function StepIndicator({ currentStep, onStepClick }: Props) {
  const activeIndex = STEPS.findIndex((s) =>
    s.statusMatch.includes(currentStep as never)
  );

  return (
    <div className="flex items-center gap-2">
      {STEPS.map((step, i) => {
        const isCompleted = i < activeIndex;
        const isActive = i === activeIndex;
        const isLocked = i > activeIndex;
        const clickable = isCompleted || isActive;

        return (
          <div key={step.key} className="flex items-center gap-2">
            {i > 0 && (
              <div
                className={cn(
                  "h-px w-8",
                  isCompleted || isActive ? "bg-brand-accent" : "bg-surface-200"
                )}
              />
            )}
            <button
              onClick={() => clickable && onStepClick(step.key)}
              disabled={isLocked}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all",
                isCompleted && "bg-status-success/10 text-status-success cursor-pointer hover:bg-status-success/15",
                isActive && "bg-brand-accent/10 text-brand-accent cursor-default",
                isLocked && "bg-surface-50 text-text-tertiary cursor-not-allowed"
              )}
            >
              {isCompleted ? (
                <Check className="w-3.5 h-3.5" />
              ) : isActive ? (
                <CircleDot className="w-3.5 h-3.5" />
              ) : (
                <Lock className="w-3.5 h-3.5" />
              )}
              {step.label}
            </button>
          </div>
        );
      })}
    </div>
  );
}
