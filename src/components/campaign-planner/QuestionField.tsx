import { useState } from "react";

interface Question {
  id: number;
  type: "select" | "multiselect" | "text" | "textarea" | "number" | "radio" | "budget_tier";
  label: string;
  description: string | null;
  options: string[] | null;
  required: boolean;
}

interface Props {
  question: Question;
  value: unknown;
  onChange: (value: unknown) => void;
}

const BUDGET_TIERS = ["< Rp 50M", "Rp 50-200M", "Rp 200M-1B", "> Rp 1B"];

export default function QuestionField({ question, value, onChange }: Props) {
  const [showExact, setShowExact] = useState(false);

  switch (question.type) {
    case "select":
      return (
        <select
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-surface-200 bg-surface-white px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
        >
          <option value="" disabled>Select an option</option>
          {(question.options ?? []).map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );

    case "multiselect": {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="space-y-2">
          {(question.options ?? []).map((opt) => (
            <label key={opt} className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => {
                  const next = selected.includes(opt)
                    ? selected.filter((s) => s !== opt)
                    : [...selected, opt];
                  onChange(next);
                }}
                className="w-4 h-4 rounded border-surface-300 text-brand-accent focus:ring-brand-accent/40"
              />
              <span className="text-sm text-text-primary group-hover:text-brand-accent transition-colors">{opt}</span>
            </label>
          ))}
        </div>
      );
    }

    case "radio":
      return (
        <div className="space-y-2">
          {(question.options ?? []).map((opt) => (
            <label key={opt} className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="radio"
                name={`q-${question.id}`}
                checked={value === opt}
                onChange={() => onChange(opt)}
                className="w-4 h-4 border-surface-300 text-brand-accent focus:ring-brand-accent/40"
              />
              <span className="text-sm text-text-primary group-hover:text-brand-accent transition-colors">{opt}</span>
            </label>
          ))}
        </div>
      );

    case "text":
      return (
        <input
          type="text"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type your answer..."
          className="w-full rounded-lg border border-surface-200 bg-surface-white px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
        />
      );

    case "textarea":
      return (
        <textarea
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type your answer..."
          rows={4}
          className="w-full rounded-lg border border-surface-200 bg-surface-white px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-accent/40 resize-y"
        />
      );

    case "number":
      return (
        <input
          type="number"
          value={(value as number) ?? ""}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
          placeholder="Enter amount..."
          className="w-full rounded-lg border border-surface-200 bg-surface-white px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
        />
      );

    case "budget_tier": {
      const budgetVal = value as { tier: string; exact?: number } | null;
      const selectedTier = budgetVal?.tier ?? "";
      return (
        <div className="space-y-3">
          <div className="space-y-2">
            {BUDGET_TIERS.map((tier) => (
              <label key={tier} className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="radio"
                  name={`q-${question.id}-tier`}
                  checked={selectedTier === tier}
                  onChange={() => onChange({ tier, exact: budgetVal?.exact })}
                  className="w-4 h-4 border-surface-300 text-brand-accent focus:ring-brand-accent/40"
                />
                <span className="text-sm text-text-primary group-hover:text-brand-accent transition-colors">{tier}</span>
              </label>
            ))}
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showExact}
              onChange={() => setShowExact(!showExact)}
              className="w-4 h-4 rounded border-surface-300 text-brand-accent focus:ring-brand-accent/40"
            />
            <span className="text-xs text-text-secondary">Specify exact amount</span>
          </label>
          {showExact && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-secondary">Rp</span>
              <input
                type="number"
                value={budgetVal?.exact ?? ""}
                onChange={(e) =>
                  onChange({
                    tier: selectedTier,
                    exact: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                placeholder="e.g. 75000000"
                className="flex-1 rounded-lg border border-surface-200 bg-surface-white px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
              />
            </div>
          )}
        </div>
      );
    }

    default:
      return null;
  }
}
