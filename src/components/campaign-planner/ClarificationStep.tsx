import { useState, useEffect } from "react";
import { Check, Loader2, ArrowRight, MessageSquare } from "lucide-react";
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

  const currentQuestion = questions[current_question_index] ?? null;

  useEffect(() => {
    setCurrentAnswer(null);
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
        <div className="flex items-center gap-2 mb-3">
          <div className="w-0.5 h-4 bg-status-success rounded-full" />
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-text-secondary">
            Clarification Complete
          </span>
        </div>

        <div className="space-y-2">
          {questions.map((q) => (
            <div
              key={q.id}
              className="bg-surface-white rounded-lg border border-surface-100 px-4 py-3"
            >
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 mt-0.5 text-status-success shrink-0" />
                <div className="min-w-0">
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

        <div className="flex justify-end pt-2">
          <button
            onClick={onGenerateSummary}
            disabled={isGeneratingSummary}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-accent text-white text-sm font-semibold hover:bg-brand-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isGeneratingSummary ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
            {isGeneratingSummary ? "Generating Summary..." : "Proceed to Summary"}
          </button>
        </div>
      </div>
    );
  }

  // Active Q&A flow
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-0.5 h-4 bg-brand-accent rounded-full" />
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-text-secondary">
            Clarification
          </span>
        </div>
        <span className="text-xs text-text-tertiary">
          Question {current_question_index + 1} of ~{questions.length}
        </span>
      </div>

      {/* Previously answered questions */}
      {answeredQuestions.length > 0 && (
        <div className="space-y-1.5">
          {answeredQuestions.map((q) => (
            <div
              key={q.id}
              className="flex items-center gap-2.5 rounded-lg bg-surface-50 border border-surface-100 px-3 py-2"
            >
              <Check className="w-3.5 h-3.5 text-status-success shrink-0" />
              <span className="text-xs text-text-tertiary truncate">
                {q.label}
              </span>
              <span className="ml-auto text-xs font-medium text-text-secondary truncate max-w-[50%] text-right">
                {formatAnswer(q.answer)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Current question card */}
      {currentQuestion && (
        <div className="bg-surface-white rounded-xl border border-surface-100 p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-brand-accent/10 flex items-center justify-center shrink-0">
              <MessageSquare className="w-4 h-4 text-brand-accent" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary">
                {currentQuestion.label}
                {currentQuestion.required && (
                  <span className="text-red-500 ml-0.5">*</span>
                )}
              </p>
              {currentQuestion.description && (
                <p className="text-xs text-text-secondary mt-1">
                  {currentQuestion.description}
                </p>
              )}
            </div>
          </div>

          <div className="mb-4">
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
                "inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors",
                submitDisabled
                  ? "bg-surface-100 text-text-tertiary cursor-not-allowed"
                  : "bg-brand-accent text-white hover:bg-brand-accent/90",
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
      )}
    </div>
  );
}
