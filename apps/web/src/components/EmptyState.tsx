import type { ReactNode } from "react";

interface Props {
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  /** small glyph set before the title */
  icon?: ReactNode;
  /** tighter padding for dense in-panel states */
  compact?: boolean;
  /** colours the leading rule when the emptiness means something: a failure or a wait on a human */
  tone?: "in" | "out" | "agent" | "warn";
  className?: string;
}

/** Only a failure or a blocked state earns colour here; "nothing yet" is not an event. */
const RULE: Record<NonNullable<Props["tone"]>, string> = {
  in: "bg-line-2",
  agent: "bg-line-2",
  out: "bg-burn/70",
  warn: "bg-warn/70",
};

/**
 * Four 4x2 cells with 2px gutters, fading out — the same comb the progress
 * gauge uses, so an empty region and an unfilled gauge are recognisably the
 * same idea. It replaces a solid 1px rule, which on a pixel grid is just a
 * hairline borrowed from a different design language.
 */
const CELLS = ["", "", "opacity-60", "opacity-30"];

/**
 * An empty region says what is missing and what happens next, in two lines of
 * type and nothing else. No illustration: a drawing of an absent chart is
 * decoration standing in for information, and it is the first thing that makes
 * a product look generated.
 */
export const EmptyState = ({ title, body, action, icon, compact = false, tone = "in", className = "" }: Props) => (
  <div className={`${compact ? "px-3.5 py-5" : "px-4 py-8"} ${className}`}>
    <span className="flex gap-0.5" aria-hidden>
      {CELLS.map((fade, i) => (
        <span key={i} className={`block h-0.5 w-1 ${RULE[tone]} ${fade}`} />
      ))}
    </span>
    <div className={`mt-3 flex items-baseline gap-1.5 font-semibold tracking-tight ${compact ? "small" : ""}`}>
      {icon && (
        <span className="self-center text-fg-2" aria-hidden>
          {icon}
        </span>
      )}
      {title}
    </div>
    {body && <p className={`mt-1.5 max-w-prose leading-relaxed text-fg-2 ${compact ? "micro" : "small"}`}>{body}</p>}
    {action && <div className="mt-3.5">{action}</div>}
  </div>
);
