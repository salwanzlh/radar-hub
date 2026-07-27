import { useState } from "react";
import { Loader2, ArrowRight, AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface FitBadge {
  status: "good" | "warn" | "bad";
  text: string;
}

interface RecommendationFramework {
  business_stake: string;
  avoid: string;
  lever: string;
  recommendation: string;
}

interface RecommendationDirection {
  option_label: string;
  title: string;
  fit_badges: FitBadge[];
  framework: RecommendationFramework;
  vs_competitor: string;
  confidence_flag: string | null;
}

interface ConfidenceFlagResponse {
  option_index: number;
  response: "will_verify" | "accept_risk";
}

interface SubmitPayload {
  selected_primary_option: number;
  selected_secondary_options: number[];
  confidence_flag_responses: ConfidenceFlagResponse[];
  user_note?: string;
}

interface Props {
  strategicRecommendation: {
    directions: RecommendationDirection[];
    confirmed_at: string | null;
  } | null;
  onSubmit: (payload: SubmitPayload) => void;
  onRegenerate: (note: string) => void;
  isSubmitting: boolean;
  isRegenerating: boolean;
}

const FIT_BADGE_CLASSES: Record<FitBadge["status"], string> = {
  good: "bg-emerald-500/10 text-emerald-500",
  warn: "bg-amber-500/10 text-amber-500",
  bad: "bg-red-500/10 text-red-500",
};

export default function StrategicRecommendationStep({
  strategicRecommendation,
  onSubmit,
  onRegenerate,
  isSubmitting,
  isRegenerating,
}: Props) {
  const directions = strategicRecommendation?.directions ?? [];

  const [primaryIndex, setPrimaryIndex] = useState<number | null>(null);
  const [secondaryIndices, setSecondaryIndices] = useState<number[]>([]);
  const [confidenceResponses, setConfidenceResponses] = useState<
    Record<number, "will_verify" | "accept_risk">
  >({});
  const [userNote, setUserNote] = useState("");
  const [redirectNote, setRedirectNote] = useState("");

  const selectedIndices = primaryIndex !== null ? [primaryIndex, ...secondaryIndices] : secondaryIndices;

  const unansweredConfidenceIndex = selectedIndices.find(
    (i) => directions[i]?.confidence_flag && !confidenceResponses[i]
  );

  const canProceed = primaryIndex !== null && unansweredConfidenceIndex === undefined;

  function toggleSecondary(index: number) {
    if (index === primaryIndex) return;
    setSecondaryIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  }

  function selectPrimary(index: number) {
    setPrimaryIndex(index);
    setSecondaryIndices((prev) => prev.filter((i) => i !== index));
  }

  function handleSubmit() {
    if (!canProceed || primaryIndex === null) return;
    onSubmit({
      selected_primary_option: primaryIndex,
      selected_secondary_options: secondaryIndices,
      confidence_flag_responses: selectedIndices
        .filter((i) => directions[i]?.confidence_flag)
        .map((i) => ({ option_index: i, response: confidenceResponses[i] })),
      user_note: userNote.trim() || undefined,
    });
  }

  function handleRegenerate() {
    if (!redirectNote.trim() || isRegenerating) return;
    onRegenerate(redirectNote.trim());
  }

  if (directions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 rounded-2xl bg-red-500/5 border border-red-500/10">
        <AlertTriangle className="w-10 h-10 text-red-500 mb-4" />
        <p className="text-sm font-semibold text-text-primary mb-1">
          Strategic Recommendation gagal dijalankan
        </p>
        <p className="text-xs text-text-tertiary text-center max-w-md">
          Sistem tidak berhasil menghasilkan arah strategi untuk finding ini. Coba generate ulang
          lewat tombol di bawah, atau buat ulang Marketing Plan dari rekomendasi yang sama.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Gate note */}
      <div className="inline-flex items-center gap-2 text-xs font-bold text-red-500 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg w-fit">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        Wajib pilih 1 arah utama (Primer) — tidak bisa dilewati tanpa keputusan
      </div>

      {/* Option cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
        {directions.map((direction, index) => {
          const isPrimary = index === primaryIndex;
          const isSecondary = secondaryIndices.includes(index);
          const needsConfidenceAnswer =
            (isPrimary || isSecondary) && direction.confidence_flag && !confidenceResponses[index];

          return (
            <div
              key={index}
              onClick={() => selectPrimary(index)}
              className={cn(
                "relative flex flex-col rounded-xl border-2 p-5 cursor-pointer transition-all duration-200 shadow-card bg-surface-white",
                isPrimary && "border-brand-accent ring-2 ring-brand-accent/15",
                isSecondary && "border-text-tertiary border-dashed",
                !isPrimary && !isSecondary && "border-surface-200 hover:border-surface-300 hover:shadow-card-hover"
              )}
            >
              {/* Selection badge */}
              <div
                className={cn(
                  "absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center text-[9px] font-extrabold text-text-inverse",
                  isPrimary && "border-brand-accent bg-brand-accent",
                  isSecondary && "border-text-tertiary bg-text-tertiary",
                  !isPrimary && !isSecondary && "border-surface-300 bg-transparent"
                )}
              >
                {isPrimary ? "1°" : isSecondary ? "2°" : ""}
              </div>

              <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary bg-surface-100 rounded-full px-2.5 py-1 w-fit mb-2.5">
                {direction.option_label}
              </span>
              <p className="text-[15px] font-extrabold text-text-primary leading-snug pr-6 mb-3">
                {direction.title}
              </p>

              <div className="flex flex-wrap gap-1.5 mb-3">
                {direction.fit_badges.map((badge, i) => (
                  <span
                    key={i}
                    className={cn(
                      "text-[10.5px] font-bold px-2.5 py-1 rounded-full",
                      FIT_BADGE_CLASSES[badge.status]
                    )}
                  >
                    {badge.text}
                  </span>
                ))}
              </div>

              <div className="space-y-1.5 mb-3">
                <p className="text-xs leading-relaxed">
                  <b className="font-bold text-text-primary">Business stake:</b>{" "}
                  <span className="text-text-secondary">{direction.framework.business_stake}</span>
                </p>
                <p className="text-xs leading-relaxed">
                  <b className="font-bold text-text-primary">Avoid:</b>{" "}
                  <span className="text-text-secondary">{direction.framework.avoid}</span>
                </p>
                <p className="text-xs leading-relaxed">
                  <b className="font-bold text-text-primary">Lever:</b>{" "}
                  <span className="text-text-secondary">{direction.framework.lever}</span>
                </p>
                <p className="text-xs leading-relaxed">
                  <b className="font-bold text-text-primary">Recommendation:</b>{" "}
                  <span className="text-text-secondary">{direction.framework.recommendation}</span>
                </p>
              </div>

              <p className="text-[11.5px] text-text-secondary bg-surface-100 rounded-lg px-2.5 py-2 leading-relaxed">
                {direction.vs_competitor}
              </p>

              {direction.confidence_flag && (isPrimary || isSecondary) && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    "mt-3 text-[11px] text-amber-600 bg-amber-500/10 border border-dashed border-amber-500/30 rounded-lg p-2.5 leading-relaxed",
                    needsConfidenceAnswer && "ring-2 ring-brand-accent/40"
                  )}
                >
                  <AlertTriangle className="w-3 h-3 inline mr-1 -mt-0.5" />
                  {direction.confidence_flag}
                  <div className="mt-2 flex flex-col gap-1.5">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="radio"
                        name={`confidence-${index}`}
                        checked={confidenceResponses[index] === "will_verify"}
                        onChange={() =>
                          setConfidenceResponses((prev) => ({ ...prev, [index]: "will_verify" }))
                        }
                        className="w-3.5 h-3.5 border-surface-300 text-brand-accent focus:ring-brand-accent/40"
                      />
                      <span className="text-[11px] font-semibold text-text-secondary group-hover:text-brand-accent transition-colors">
                        Akan verifikasi manual sebelum eksekusi
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="radio"
                        name={`confidence-${index}`}
                        checked={confidenceResponses[index] === "accept_risk"}
                        onChange={() =>
                          setConfidenceResponses((prev) => ({ ...prev, [index]: "accept_risk" }))
                        }
                        className="w-3.5 h-3.5 border-surface-300 text-brand-accent focus:ring-brand-accent/40"
                      />
                      <span className="text-[11px] font-semibold text-text-secondary group-hover:text-brand-accent transition-colors">
                        Paham, lanjut dengan risiko ini
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {!isPrimary && (
                <div className="mt-auto pt-3 border-t border-dashed border-surface-200">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSecondary(index);
                    }}
                    className="text-[11.5px] font-bold text-text-secondary hover:text-brand-accent transition-colors"
                  >
                    {isSecondary ? "− Lepas elemen ini" : "+ Selipkan elemen opsi lain ke arah ini"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Escape valve */}
      <div className="bg-surface-white border border-dashed border-surface-300 rounded-xl p-4">
        <p className="text-[13px] font-bold text-text-primary mb-0.5">
          Tidak ada yang pas — saya mau arah lain
        </p>
        <p className="text-xs text-text-tertiary mb-2.5">
          Jelaskan arah yang Anda mau. Sistem akan generate ulang 2-3 opsi baru berdasarkan arah ini.
        </p>
        <textarea
          value={redirectNote}
          onChange={(e) => setRedirectNote(e.target.value)}
          placeholder="mis. saya mau fokus ke dealer activation karena kita punya jaringan 45 outlet aktif yang belum dipakai maksimal..."
          rows={2}
          className="w-full rounded-lg border border-surface-200 bg-surface-white px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-accent/40 resize-y"
        />
        <div className="flex justify-end mt-2.5">
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={!redirectNote.trim() || isRegenerating}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg border border-surface-200 text-text-secondary hover:bg-surface-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {isRegenerating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            {isRegenerating ? "Generating..." : "Generate ulang opsi"}
          </button>
        </div>
      </div>

      {/* Optional rationale note */}
      <div>
        <label className="block text-xs font-semibold text-text-secondary mb-1.5">
          Catatan kenapa Anda pilih ini{" "}
          <span className="font-normal text-text-tertiary">(opsional, untuk jejak keputusan)</span>
        </label>
        <textarea
          value={userNote}
          onChange={(e) => setUserNote(e.target.value)}
          placeholder="mis. lebih realistis untuk tim eksekusi kita dalam 4 minggu ke depan..."
          rows={2}
          className="w-full rounded-lg border border-surface-200 bg-surface-white px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-accent/40 resize-y"
        />
      </div>

      {/* Sticky footer */}
      <div className="sticky bottom-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-white border border-surface-100 rounded-xl px-5 py-4 shadow-card">
        <div className="text-[13px] text-text-secondary leading-relaxed min-w-0">
          Primer:{" "}
          <b className="text-text-primary">
            {primaryIndex !== null
              ? `${directions[primaryIndex].option_label} — ${directions[primaryIndex].title}`
              : "belum dipilih"}
          </b>
          <span className="block text-[11.5px] text-text-tertiary">
            {secondaryIndices.length > 0
              ? `Sekunder: elemen dari ${secondaryIndices.map((i) => directions[i].option_label).join(", ")} ikut diselipkan`
              : "Sekunder: tidak ada elemen tambahan dipilih"}
          </span>
        </div>
        <button
          onClick={handleSubmit}
          disabled={!canProceed || isSubmitting}
          className={cn(
            "inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl text-sm font-bold text-white shadow-lg transition-all duration-200 shrink-0",
            "bg-gradient-to-r from-brand-accent to-red-600",
            "hover:shadow-xl hover:-translate-y-0.5",
            "disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-lg"
          )}
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
          {isSubmitting ? "Submitting..." : "Lanjut ke Strategy"}
        </button>
      </div>
    </div>
  );
}
