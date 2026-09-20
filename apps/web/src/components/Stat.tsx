import type { ReactNode } from "react";

export type StatTone = "rev" | "burn" | "plain" | "warn" | "info";
export type StatSize = "sm" | "md" | "lg" | "xl";

const TONE: Record<StatTone, string> = {
  rev: "text-rev",
  burn: "text-burn",
  plain: "text-fg",
  warn: "text-warn",
  info: "text-info",
};

/** sm/md sit in the text scale; lg/xl are clamp-based display figures. */
const SIZE: Record<StatSize, string> = {
  sm: "text-sm",
  md: "figure-md",
  lg: "figure-lg",
  xl: "figure-xl",
};

interface StatProps {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  tone?: StatTone;
  size?: StatSize;
  align?: "left" | "right";
  className?: string;
  /** small glyph rendered before the caption */
  icon?: ReactNode;
  /** signed percent change; rendered as a money-in / money-out delta next to the caption */
  delta?: number | null;
}

/**
 * A figure and what it measures. The caption is the machine's own label — 8px
 * pixel, uppercase — and the figure is monospace, so a band of them reads as
 * instrument panel rather than as prose with numbers in it. The caption is
 * deliberately quiet: the number is the thing worth looking at.
 */
export const Stat = ({
  label,
  value,
  sub,
  tone = "plain",
  size = "md",
  align = "left",
  className = "",
  icon,
  delta = null,
}: StatProps) => (
  <div className={`group/stat ${align === "right" ? "text-right" : ""} ${className}`}>
    <div className={`flex items-center gap-1.5 ${align === "right" ? "justify-end" : ""}`}>
      {icon && (
        <span className="text-fg-2" aria-hidden>
          {icon}
        </span>
      )}
      <span className="label">{label}</span>
      {delta !== null && Number.isFinite(delta) && (
        <span className={`num text-[10.5px] font-semibold ${delta >= 0 ? "text-rev" : "text-burn"}`}>
          {delta >= 0 ? "▲" : "▼"}
          {Math.abs(delta) >= 100 ? Math.round(Math.abs(delta)) : Math.abs(delta).toFixed(1)}%
        </span>
      )}
    </div>
    <div className={`figure mt-1.5 ${SIZE[size]} ${TONE[tone]}`}>{value}</div>
    {sub !== undefined && sub !== null && <div className="micro mt-1.5 text-fg-2">{sub}</div>}
  </div>
);

interface StatRowProps {
  children: ReactNode;
  cols?: 2 | 3 | 4 | 5 | 6;
  className?: string;
  /** recess the band into a data well — for a dense block inside a panel */
  boxed?: boolean;
}

const COLS: Record<NonNullable<StatRowProps["cols"]>, string> = {
  2: "grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
  6: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
};

/**
 * A band of figures. Once the row is wide enough to hold them side by side the
 * cells are divided by a single hairline and sit flush with the page column; on
 * a narrow screen the rules are dropped and whitespace does the work, because a
 * 1px rule between two stacked numbers is just noise. `boxed` recesses the band
 * into a data well for use inside a panel.
 */
export const StatRow = ({ children, cols = 4, className = "", boxed = false }: StatRowProps) => (
  <div
    className={`grid ${COLS[cols]} ${
      boxed
        ? "panel-inset gap-px overflow-hidden bg-line [&>*]:bg-bg-1 [&>*]:px-4 [&>*]:py-3.5 [&>*]:transition-colors [&>*:hover]:bg-bg-2"
        : "gap-x-5 gap-y-5 sm:gap-x-0 sm:[&>*]:border-l sm:[&>*]:border-line sm:[&>*]:pl-5 sm:[&>*:first-child]:border-l-0 sm:[&>*:first-child]:pl-0"
    } ${className}`}
  >
    {children}
  </div>
);
