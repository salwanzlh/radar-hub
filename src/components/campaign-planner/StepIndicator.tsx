import { Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

// NOTE: `key` is passed verbatim to POST /revert/{step} (see MarketingPlannerPage's
// handleStepClick), so it must match the backend's REVERTABLE_STEPS names exactly —
// not just be a UI-friendly slug.
const STEPS = [
  { key: "audit", label: "Situation", statusMatch: ["audit"] },
  {
    key: "strategic_recommendation",
    label: "Strategic Recommendation",
    // "clarifying" is included for plans created before this step existed —
    // they're still mid-flow in the old Clarification UI, which occupied
    // this exact pipeline slot. Without this alias those legacy plans read
    // as no step active (every circle renders "locked").
    statusMatch: ["recommending", "clarifying"],
  },
  { key: "summary", label: "Strategy", statusMatch: ["summarizing"] },
  { key: "plan", label: "Tactics & Action", statusMatch: ["generating", "completed"] },
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
    <div className="flex items-center w-full">
      {STEPS.map((step, i) => {
        const isCompleted = i < activeIndex;
        const isActive = i === activeIndex;
        const isLocked = i > activeIndex;
        const clickable = isCompleted;

        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            {/* Step circle + label */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => clickable && onStepClick(step.key)}
                disabled={isLocked || isActive}
                className={cn(
                  "relative flex items-center justify-center w-9 h-9 rounded-full text-xs font-bold transition-all duration-300",
                  isCompleted &&
                    "bg-brand-accent text-text-inverse shadow-md cursor-pointer hover:scale-105",
                  isActive &&
                    "bg-brand-accent text-text-inverse shadow-lg",
                  isLocked &&
                    "border-2 border-surface-300 bg-transparent text-text-tertiary cursor-not-allowed"
                )}
                aria-label={`Step ${i + 1}: ${step.label}`}
              >
                {/* Active pulsing ring */}
                {isActive && (
                  <span
                    className="absolute inset-0 rounded-full bg-brand-accent/30 animate-pulse"
                    aria-hidden="true"
                  />
                )}

                {/* Inner content */}
                <span className="relative z-10">
                  {isCompleted ? (
                    <Check className="w-4 h-4" strokeWidth={3} />
                  ) : isLocked ? (
                    <Lock className="w-3.5 h-3.5" />
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </span>
              </button>

              {/* Label */}
              <span
                className={cn(
                  "text-[11px] font-semibold tracking-wide transition-colors duration-300",
                  isActive && "text-brand-accent font-bold",
                  isCompleted && "text-text-primary",
                  isLocked && "text-text-tertiary"
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {i < STEPS.length - 1 && (
              <div className="flex-1 mx-3 h-0.5 rounded-full relative overflow-hidden self-start mt-[18px]">
                {i < activeIndex ? (
                  /* Completed connector: solid accent */
                  <div className="absolute inset-0 bg-brand-accent rounded-full" />
                ) : i === activeIndex ? (
                  /* Active connector: gradient fade from accent to grey */
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background:
                        "linear-gradient(to right, var(--color-brand-accent), var(--color-surface-300))",
                    }}
                  />
                ) : (
                  /* Locked connector: dashed grey */
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(to right, var(--color-surface-300) 0, var(--color-surface-300) 6px, transparent 6px, transparent 12px)",
                    }}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
