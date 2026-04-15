import type { ReactNode } from "react";

/**
 * Render a source string with clickable links.
 *
 * Parses:
 *   - Markdown anchors: `[Title](https://example.com)`
 *   - Bare URLs: `https://example.com`
 *
 * Everything else is rendered as plain text. Links open in a new tab
 * and stop propagation so clicking them doesn't toggle the card.
 */
export default function SourceText({ text }: { text: string }) {
  if (!text) return null;

  // Match markdown anchors first (non-greedy text, non-greedy URL).
  // Then plain URLs. We keep a single pass using a combined regex and
  // interleave segments.
  const mdAnchor = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  const bareUrl = /(?<![\]\(])(https?:\/\/[^\s<>)]+)/g;

  // First replace markdown anchors with a placeholder, then bare URLs.
  // Simpler: do a two-pass tokenisation.
  type Token = { type: "text" | "link"; content: string; href?: string };
  const tokens: Token[] = [];

  let cursor = 0;
  // Gather markdown anchors
  const anchors: Array<{ index: number; length: number; title: string; url: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = mdAnchor.exec(text)) !== null) {
    anchors.push({ index: m.index, length: m[0].length, title: m[1], url: m[2] });
  }

  anchors.forEach((a) => {
    if (a.index > cursor) {
      tokens.push({ type: "text", content: text.slice(cursor, a.index) });
    }
    tokens.push({ type: "link", content: a.title, href: a.url });
    cursor = a.index + a.length;
  });
  if (cursor < text.length) {
    tokens.push({ type: "text", content: text.slice(cursor) });
  }

  // Now for each text token, scan for bare URLs.
  const finalTokens: Token[] = [];
  tokens.forEach((tok) => {
    if (tok.type === "link") {
      finalTokens.push(tok);
      return;
    }
    let c = 0;
    let um: RegExpExecArray | null;
    const str = tok.content;
    bareUrl.lastIndex = 0;
    while ((um = bareUrl.exec(str)) !== null) {
      if (um.index > c) {
        finalTokens.push({ type: "text", content: str.slice(c, um.index) });
      }
      finalTokens.push({ type: "link", content: um[1], href: um[1] });
      c = um.index + um[0].length;
    }
    if (c < str.length) {
      finalTokens.push({ type: "text", content: str.slice(c) });
    }
  });

  const nodes: ReactNode[] = finalTokens.map((tok, i) => {
    if (tok.type === "link" && tok.href) {
      return (
        <a
          key={i}
          href={tok.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-accent hover:underline break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {tok.content}
        </a>
      );
    }
    return <span key={i}>{tok.content}</span>;
  });

  return <>{nodes}</>;
}
