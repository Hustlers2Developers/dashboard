import { Fragment, type ReactNode } from "react";

// Minimal, safe subset of markdown-style formatting for community posts/replies
// — **bold**, *italic* / _italic_, `code`, and "- "/"* " bullet lines. Builds
// React nodes directly (no dangerouslySetInnerHTML), so there's no HTML/XSS
// surface to worry about — worst case an unmatched token renders literally.
const INLINE_PATTERN = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|_[^_\n]+_|`[^`\n]+`)/g;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(INLINE_PATTERN);
  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code key={key} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em]">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (
      part.length > 2 &&
      ((part.startsWith("*") && part.endsWith("*")) || (part.startsWith("_") && part.endsWith("_")))
    ) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }
    return <Fragment key={key}>{part}</Fragment>;
  });
}

/** Renders post/reply content with a minimal safe formatting subset instead
 * of showing literal `**`/`*`/`` ` `` characters as plain text. */
export function RichText({ text, className }: { text: string; className?: string }) {
  const lines = text.split("\n");

  return (
    <div className={className}>
      {lines.map((line, i) => {
        const bulletMatch = /^[-*]\s+(.*)$/.exec(line);
        if (bulletMatch) {
          return (
            <div key={i} className="flex gap-2 pl-1">
              <span className="select-none text-muted-foreground">•</span>
              <span>{renderInline(bulletMatch[1], String(i))}</span>
            </div>
          );
        }
        if (line.trim() === "") {
          return <div key={i} className="h-2" />;
        }
        return <div key={i}>{renderInline(line, String(i))}</div>;
      })}
    </div>
  );
}
