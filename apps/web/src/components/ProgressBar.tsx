import type { ReactNode } from "react";

export type BarTone = "rev" | "burn" | "warn" | "info" | "agent";
export type BarSize = "xs" | "sm" | "md";

/** Track fills are flat role colours: a bar is a level, not a light source. */
const TONE: Record<BarTone, string> = {
  rev: "bg-rev",
  burn: "bg-burn",
  warn: "bg-warn",
  info: "bg-info",
  agent: "bg-violet",
};

/** Border-box heights, so the 1px frame is included in the figure. */
const HEIGHT: Record<BarSize, string> = { xs: "h-1.5", sm: "h-2", md: "h-3" };

/** Cell pitch per size: cell width, then gutter. Both integers — a gauge with a
    fractional cell pitch strobes as the bar grows. */
const CELL: Record<BarSize, [number, number]> = { xs: [4, 2], sm: [6, 2], md: [8, 2] };

interface Props {
  value: number;
  max?: number;
  tone?: BarTone;
  size?: BarSize;
  className?: string;
  label?: ReactNode;
  /** announced to screen readers in place of the bare percentage */
  ariaLabel?: string;
}

/**
 * Segmented gauge. The fill is still a single element animating its width — so
 * the value stays continuous and cheap to update — and a comb of page-coloured
 * gutters is painted over the top, which cuts both track and fill into discrete
 * cells. That reads as a machine gauge stepping up rather than a liquid bar
 * sliding, and it needs no measurement of the container to do it.
 */
export const ProgressBar = ({ value, max = 100, tone = "rev", size = "sm", className = "", label, ariaLabel }: Props) => {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const [cell, gap] = CELL[size];
  // A bar with a visible string label reuses it; an unnamed, purely visual bar
  // is marked decorative rather than announced as a nameless "0%".
  const named = ariaLabel ?? (typeof label === "string" ? label : undefined);
  return (
    <div className={className}>
      {label && <div className="mb-1.5 flex items-center justify-between gap-2 text-xs text-fg-2">{label}</div>}
      <div
        className={`relative ${HEIGHT[size]} w-full overflow-hidden border border-line bg-bg-3`}
        {...(named
          ? {
              role: "progressbar" as const,
              "aria-label": named,
              "aria-valuenow": Math.round(pct),
              "aria-valuemin": 0,
              "aria-valuemax": 100,
            }
          : { "aria-hidden": true })}
      >
        <div
          className={`absolute inset-y-0 left-0 transition-[width] duration-700 ease-out ${TONE[tone]}`}
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `repeating-linear-gradient(90deg, transparent 0 ${cell}px, var(--color-bg) ${cell}px ${cell + gap}px)`,
          }}
          aria-hidden
        />
      </div>
    </div>
  );
};
