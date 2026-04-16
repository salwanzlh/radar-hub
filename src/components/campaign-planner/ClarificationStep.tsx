import { useState, useEffect, useRef } from "react";
import {
  Check,
  Loader2,
  ArrowRight,
  MessageSquare,
  CircleCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import QuestionField from "./QuestionField";

interface ClarificationQuestion {
  id: number;
  type: "select" | "multiselect" | "text" | "textarea" | "number" | "radio" | "budget_tier";
  label: string;
  description: string | null;
  options: string[] | null;
  required: boolean;
  answer: unknown;
}

interface Clarification {
  questions: ClarificationQuestion[];
  current_question_index: number;
  completed_at: string | null;
  is_final: boolean;
}

interface Props {
  clarification: Clarification;
  onAnswer: (questionId: number, answer: unknown) => void;
  onGenerateSummary: () => void;
  isSubmitting: boolean;
  isGeneratingSummary: boolean;
}

function formatAnswer(answer: unknown): string {
  if (answer == null) return "";
  if (Array.isArray(answer)) return answer.join(", ");
  if (typeof answer === "object") {
    const budget = answer as { tier: string; exact?: number };
    return budget.exact
      ? `${budget.tier} (Rp ${budget.exact.toLocaleString("id-ID")})`
      : budget.tier;
  }
  return String(answer);
}

function isAnswerEmpty(answer: unknown): boolean {
  if (answer == null) return true;
  if (typeof answer === "string") return answer.trim() === "";
  if (Array.isArray(answer)) return answer.length === 0;
  if (typeof answer === "object") {
    const budget = answer as { tier?: string };
    return !budget.tier;
  }
  return false;
}

export default function ClarificationStep({
  clarification,
  onAnswer,
  onGenerateSummary,
  isSubmitting,
  isGeneratingSummary,
}: Props) {
  const { questions, current_question_index, completed_at } = clarification;
  const [currentAnswer, setCurrentAnswer] = useState<unknown>(null);
  const [animateIn, setAnimateIn] = useState(false);
  const prevIndexRef = useRef(current_question_index);

  const currentQuestion = questions[current_question_index] ?? null;

  useEffect(() => {
    setCurrentAnswer(null);

    // Trigger slide-in animation when question changes
    if (prevIndexRef.current !== current_question_index) {
      setAnimateIn(true);
      const timer = setTimeout(() => setAnimateIn(false), 400);
      prevIndexRef.current = current_question_index;
      return () => clearTimeout(timer);
    }
  }, [current_question_index]);

  const answeredQuestions = questions.filter(
    (q) => q.answer != null && q.answer !== "",
  );

  const isCompleted = !!completed_at;

  const submitDisabled =
    isSubmitting ||
    (currentQuestion?.required && isAnswerEmpty(currentAnswer));

  function handleSubmit() {
    if (!currentQuestion || submitDisabled) return;
    onAnswer(currentQuestion.id, currentAnswer);
  }

  // Completed: review all answers + proceed button
  if (isCompleted) {
    return (
      <div className="space-y-6">
        {/* Header with green badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CircleCheck className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary">
                Clarification Complete
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                All questions have been answered
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20 text-emerald-500 text-[10px] font-bold uppercase tracking-wider">
            <Check className="w-3 h-3" />
            Complete
          </span>
        </div>

        {/* All answers as checklist */}
        <div className="space-y-2">
          {questions.map((q) => (
            <div
              key={q.id}
              className="bg-surface-white rounded-xl border border-surface-100 border-l-[3px] border-l-emerald-500 px-4 py-3 transition-all duration-200 hover:shadow-card-hover"
            >
              <div className="flex items-start gap-2.5">
                <Check className="w-4 h-4 mt-0.5 text-emerald-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-text-primary">
                    {q.label}
                  </p>
                  <p className="text-xs text-text-secondary mt-1">
                    {formatAnswer(q.answer)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Proceed to Summary button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onGenerateSummary}
            disabled={isGeneratingSummary}
            className={cn(
              "group inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-sm font-bold text-white shadow-lg transition-all duration-200",
              "bg-gradient-to-r from-brand-accent to-red-600",
              "hover:shadow-xl hover:-translate-y-0.5",
              "disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-lg",
              "relative overflow-hidden"
            )}
          >
            {/* Shimmer overlay on hover */}
            <span
              className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
              aria-hidden="true"
            />
            {isGeneratingSummary ? (
              <Loader2 className="w-4 h-4 animate-spin relative z-10" />
            ) : (
              <ArrowRight className="w-4 h-4 relative z-10" />
            )}
            <span className="relative z-10">
              {isGeneratingSummary ? "Generating Summary..." : "Proceed to Summary"}
            </span>
          </button>
        </div>
      </div>
    );
  }

  // Active Q&A flow
  return (
    <div className="space-y-6">
      {/* Header + progress pill */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-0.5 h-4 bg-brand-accent rounded-full" />
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-text-secondary">
            Clarification
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-accent/10 ring-1 ring-brand-accent/20 text-brand-accent text-[10px] font-bold tracking-wider">
          Question {current_question_index + 1} of ~{questions.length}
        </span>
      </div>

      {/* Previously answered questions - collapsed cards with green left bar */}
      {answeredQuestions.length > 0 && (
        <div className="space-y-1.5">
          {answeredQuestions.map((q) => (
            <div
              key={q.id}
              className="group flex items-center gap-2.5 rounded-xl bg-surface-white border border-surface-100 border-l-[3px] border-l-emerald-500 px-4 py-2.5 transition-all duration-200 hover:py-3 hover:shadow-card-hover"
            >
              <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="text-xs font-semibold text-text-primary truncate">
                {q.label}
              </span>
              <span className="ml-auto text-xs text-text-secondary truncate max-w-[50%] text-right">
                {formatAnswer(q.answer)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Current question card */}
      {currentQuestion && (
        <div
          className={cn(
            "bg-surface-white rounded-xl border border-surface-100 shadow-md overflow-hidden transition-all duration-300",
            animateIn && "animate-[slideInRight_0.35s_ease-out_both]"
          )}
          style={{
            borderLeft: "4px solid",
            borderImage:
              "linear-gradient(to bottom, var(--color-brand-accent), var(--color-brand-accent-hover)) 1",
          }}
        >
          <div className="p-6">
            <div className="flex items-start gap-3 mb-5">
              {/* Accent circle icon */}
              <div className="w-9 h-9 rounded-full bg-brand-accent/10 flex items-center justify-center shrink-0">
                <MessageSquare className="w-4 h-4 text-brand-accent" />
              </div>
              <div className="min-w-0">
                <p className="text-base font-semibold text-text-primary leading-snug">
                  {currentQuestion.label}
                  {currentQuestion.required && (
                    <span className="text-red-500 ml-0.5">*</span>
                  )}
                </p>
                {currentQuestion.description && (
                  <p className="text-sm text-text-secondary mt-1.5 leading-relaxed">
                    {currentQuestion.description}
                  </p>
                )}
              </div>
            </div>

            <div className="mb-5 pl-12">
              <QuestionField
                question={currentQuestion}
                value={currentAnswer}
                onChange={setCurrentAnswer}
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={!!submitDisabled}
                className={cn(
                  "inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200",
                  submitDisabled
                    ? "bg-surface-100 text-text-tertiary cursor-not-allowed"
                    : "bg-gradient-to-r from-brand-accent to-red-600 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                )}
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                {isSubmitting ? "Submitting..." : "Submit Answer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
