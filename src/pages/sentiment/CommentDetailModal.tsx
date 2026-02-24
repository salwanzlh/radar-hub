import { useEffect } from "react";
import {
  X,
  Shield,
} from "lucide-react";
import {
  type SentimentComment,
} from "@/lib/sentiment-api-client";
import { formatRelativeDate } from "@/lib/utils";
import { SentimentBadge, PlatformBadge } from "./SentimentPage";

export function CommentDetailModal({
  comment,
  onClose,
}: {
  comment: SentimentComment;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-white border border-surface-200 rounded-[20px] max-w-2xl w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-surface-200">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">{comment.author_name}</h3>
            {comment.commented_at && (
              <p className="text-xs text-text-tertiary mt-0.5">{formatRelativeDate(comment.commented_at)}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-text-tertiary hover:text-brand-accent hover:bg-surface-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Full comment text */}
        <div className="px-6 py-5 border-b border-surface-200">
          <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap break-words">{comment.content}</p>
          {comment.post_url && (
            <a
              href={comment.post_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-3 text-xs text-brand-accent hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              View original post
            </a>
          )}
        </div>

        {/* Metadata grid */}
        <div className="px-6 py-5 grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-text-tertiary text-xs font-medium uppercase tracking-wide">Platform</span>
            <div className="mt-1.5">
              <PlatformBadge platform={comment.platform || "unknown"} />
            </div>
          </div>
          <div>
            <span className="text-text-tertiary text-xs font-medium uppercase tracking-wide">Source Account</span>
            <p className="mt-1.5 text-text-primary">{comment.source_account || <span className="text-text-tertiary">--</span>}</p>
          </div>
          <div>
            <span className="text-text-tertiary text-xs font-medium uppercase tracking-wide">Sentiment</span>
            <div className="mt-1.5">
              {comment.is_excluded ? (
                <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-surface-200 text-text-tertiary">excluded</span>
              ) : comment.sentiment_result ? (
                <SentimentBadge
                  sentiment={comment.sentiment_result.sentiment}
                  confidence={comment.sentiment_result.confidence}
                />
              ) : (
                <span className="text-xs text-text-tertiary">Pending</span>
              )}
            </div>
          </div>
          <div>
            <span className="text-text-tertiary text-xs font-medium uppercase tracking-wide">Product</span>
            <p className="mt-1.5 text-text-primary">{comment.product_name || <span className="text-text-tertiary">--</span>}</p>
          </div>
          <div>
            <span className="text-text-tertiary text-xs font-medium uppercase tracking-wide">Likes</span>
            <p className="mt-1.5 text-text-primary">{comment.likes_count}</p>
          </div>
          {comment.sentiment_result && (
            <>
              <div>
                <span className="text-text-tertiary text-xs font-medium uppercase tracking-wide">Classified at</span>
                <p className="mt-1.5 text-text-primary">{formatRelativeDate(comment.sentiment_result.classified_at)}</p>
              </div>
              <div>
                <span className="text-text-tertiary text-xs font-medium uppercase tracking-wide">Model used</span>
                <p className="mt-1.5 text-text-primary">{comment.sentiment_result.model_used}</p>
              </div>
            </>
          )}
        </div>

        {/* Excluded badge */}
        {comment.is_excluded && (
          <div className="px-6 pb-5">
            <div className="flex items-center gap-2 px-4 py-3 bg-surface-100 border border-surface-200 rounded-xl">
              <Shield className="w-4 h-4 text-text-tertiary flex-shrink-0" />
              <span className="text-xs text-text-tertiary font-medium">This comment has been excluded from analysis</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
