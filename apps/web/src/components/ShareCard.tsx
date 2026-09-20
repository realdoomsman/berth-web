import type { CSSProperties, ReactNode } from "react";
import { formatUsd } from "../lib/format.js";
import { Monogram } from "./Monogram.js";
import { ShipMark } from "./icons.js";

/**
 * Share compositions: a fixed 1200×630 canvas with zero page chrome, built to
 * be screenshotted (OG images, X cards, decks). Everything is sized in absolute
 * pixels rather than the responsive type scale, because the only two viewports
 * that matter are "1200×630" and "1200×630 shrunk to a 260px-wide card in a
 * timeline". That second one dictates the whole design: three legible things
 * per row, no body copy smaller than 17px, and money in the largest type on
 * the canvas.
 *
 * No glows. A dark canvas with two coloured radial washes across it is the
 * clearest possible signal that nobody chose anything; what carries this image
 * is the size of the dollar figures and the space around them.
 */

/** One ranked coin in the `leaderboard` variant. */
export interface ShareRow {
  /** 1-based rank; rendered as the row's left gutter figure */
  rank: number;
  ticker: string;
  name: string;
  revenueUsd: number;
  imageUrl?: string | null;
  /** `AppStatus`; only `LIVE` earns the dot, the rest are dimmed text */
  status?: string | null;
}

/** One figure in the `coin` variant's stat band. */
export interface ShareStat {
  label: string;
  value: ReactNode;
  /** `in` = revenue/money arriving, `out` = burns/spend, `agent` = the agent's state */
  tone?: "in" | "out" | "agent";
}

export interface ShareCardProps {
  /** `leaderboard` (default) renders `rows`; `coin` renders `title` as the hero and `stats` as the band. */
  variant?: "leaderboard" | "coin";
  title: string;
  subtitle?: ReactNode;
  rows?: ShareRow[];
  stats?: ShareStat[];
  /** replaces the default strapline in the footer bar */
  footnote?: ReactNode;
  className?: string;
}

export const SHARE_WIDTH = 1200;
export const SHARE_HEIGHT = 630;

const ROLE: Record<NonNullable<ShareStat["tone"]>, string> = {
  in: "var(--role-money-in)",
  out: "var(--role-money-out)",
  agent: "var(--role-agent)",
};

/** Cents matter on a share card: "$4,213.55" is evidence, "$4.2k" is marketing. */
const shareUsd = (usd: number): string =>
  usd >= 1_000_000
    ? formatUsd(usd)
    : `$${usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * 2px dither, doubled to 4px for this canvas because the share image is read
 * at roughly half size in a timeline. Same texture as `skeleton`: it gives a
 * surface tone without a gradient.
 */
const DITHER = (tone: string) => `repeating-linear-gradient(45deg, ${tone} 0 4px, transparent 4px 8px)`;

/** A pixel label: the machine's own voice, 16px here because the canvas is 2x a page. */
const LABEL: CSSProperties = {
  fontFamily: "var(--font-pixel)",
  fontSize: 16,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--color-fg-3)",
  lineHeight: 1,
};

/** Shared chrome: a hard grid for texture, the wordmark, the date, one strapline. */
const Frame = ({ children, footnote, className = "" }: { children: ReactNode; footnote?: ReactNode; className?: string }) => (
  <div
    className={`relative flex flex-col overflow-hidden ${className}`}
    style={{
      width: SHARE_WIDTH,
      height: SHARE_HEIGHT,
      background: "var(--color-bg)",
      color: "var(--color-fg)",
      fontFeatureSettings: '"cv11" 1, "ss01" 1',
    }}
    data-share-card
  >
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage: [
          "linear-gradient(to right, color-mix(in oklab, var(--color-line) 55%, transparent) 1px, transparent 1px)",
          "linear-gradient(to bottom, color-mix(in oklab, var(--color-line) 55%, transparent) 1px, transparent 1px)",
        ].join(","),
        backgroundSize: "60px 60px, 60px 60px",
      }}
      aria-hidden
    />

    <div className="relative flex min-h-0 flex-1 flex-col" style={{ padding: "44px 56px 0" }}>
      <header
        className="flex shrink-0 items-baseline justify-between"
        style={{ paddingBottom: 22, borderBottom: "2px solid var(--color-line-2)" }}
      >
        <div className="flex items-baseline" style={{ gap: 14 }}>
          <ShipMark size={32} className="text-rev" style={{ transform: "translateY(4px)" }} />
          <span style={{ fontFamily: "var(--font-pixel)", fontSize: 32, letterSpacing: "0.01em", lineHeight: 1 }}>berth</span>
          <span style={{ fontSize: 18, color: "var(--color-fg-2)", lineHeight: 1 }}>coins that build apps</span>
        </div>
        <div className="num" style={{ fontSize: 16, color: "var(--color-fg-3)", letterSpacing: "0.02em" }}>
          {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase()}
        </div>
      </header>

      {children}
    </div>

    <footer
      className="relative flex shrink-0 items-center justify-between"
      style={{ padding: "0 56px", height: 84, borderTop: "1px solid var(--color-line)" }}
    >
      <span style={{ fontSize: 19, color: "var(--color-fg-2)" }}>
        {footnote ?? (
          <>
            Fees fund the build. <span style={{ color: "var(--role-money-in)" }}>Revenue funds the burn.</span>
          </>
        )}
      </span>
      <span style={{ fontFamily: "var(--font-pixel)", fontSize: 20, letterSpacing: "0.02em" }}>
        berth.fun
      </span>
    </footer>
  </div>
);

const Rows = ({ rows }: { rows: ShareRow[] }) => {
  if (rows.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col justify-center" style={{ gap: 18, paddingBottom: 24 }}>
        {[1, 2, 3].map((r) => (
          <div key={r} className="flex items-center" style={{ gap: 24 }}>
            <span className="num" style={{ width: 46, fontSize: 34, fontWeight: 700, color: "var(--color-fg-3)" }}>
              {r}
            </span>
            {/* Nothing here yet, and that is on purpose: dithered plates with a
                hard edge read as an unfilled slot, not as a failed render. */}
            <div
              style={{
                width: 48,
                height: 48,
                border: "1px solid var(--color-line-2)",
                backgroundColor: "var(--color-bg-1)",
                backgroundImage: DITHER("var(--color-bg-3)"),
              }}
            />
            <div
              style={{
                flex: 1,
                height: 16,
                border: "1px solid var(--color-line)",
                backgroundColor: "var(--color-bg-1)",
                backgroundImage: DITHER("var(--color-bg-2)"),
              }}
            />
            <span className="num" style={{ fontSize: 30, color: "var(--color-fg-3)" }}>
              $0.00
            </span>
          </div>
        ))}
      </div>
    );
  }

  const top = rows.slice(0, 6);
  return (
    <div className="flex min-h-0 flex-1 flex-col justify-center">
      {/* Column legend, in the label voice: the board reads as a ledger the
          machine printed, not as a list of cards. */}
      <div className="flex shrink-0 items-center" style={{ gap: 22, paddingTop: 24, paddingBottom: 14 }}>
        <span style={{ ...LABEL, width: 44, textAlign: "right" }}>#</span>
        <span style={{ ...LABEL, flex: 1, paddingLeft: 70 }}>coin</span>
        <span style={LABEL}>revenue earned</span>
      </div>
      {top.map((row, i) => (
        <div
          key={`${row.ticker}-${row.rank}`}
          className="flex items-center"
          style={{
            gap: 22,
            /* Rows share the remaining canvas, so a 3-coin board is not mostly empty. */
            height: Math.min(82, Math.floor(320 / top.length)),
            borderTop: "1px solid var(--color-line)",
          }}
        >
          <span
            className="num shrink-0 text-right"
            style={{
              width: 44,
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: "-0.04em",
              color: i === 0 ? "var(--color-fg)" : "var(--color-fg-3)",
            }}
          >
            {row.rank}
          </span>
          <Monogram ticker={row.ticker} src={row.imageUrl} size={48} />
          <div className="flex min-w-0 flex-1 items-baseline" style={{ gap: 14 }}>
            <span className="num shrink-0" style={{ fontSize: 31, fontWeight: 700, letterSpacing: "-0.035em", lineHeight: 1 }}>
              ${row.ticker}
            </span>
            <span className="truncate" style={{ fontSize: 19, color: "var(--color-fg-2)", lineHeight: 1 }}>
              {row.name}
            </span>
            {row.status === "LIVE" && (
              <span
                className="inline-block shrink-0"
                style={{ width: 8, height: 8, background: "var(--role-money-in)" }}
                aria-hidden
              />
            )}
          </div>
          <span
            className="num shrink-0"
            style={{
              fontSize: i === 0 ? 40 : 33,
              fontWeight: 700,
              letterSpacing: "-0.04em",
              color: row.revenueUsd > 0 ? "var(--role-money-in)" : "var(--color-fg-3)",
              lineHeight: 1,
            }}
          >
            {shareUsd(row.revenueUsd)}
          </span>
        </div>
      ))}
    </div>
  );
};

/** Figures sit on a hairline, not in boxes: four numbers, one rule, nothing else. */
const StatBand = ({ stats }: { stats: ShareStat[] }) => (
  <div
    className="grid shrink-0"
    style={{
      gridTemplateColumns: `repeat(${Math.min(Math.max(stats.length, 1), 4)}, minmax(0, 1fr))`,
      borderTop: "2px solid var(--color-line-2)",
      marginBottom: 44,
    }}
  >
    {stats.slice(0, 4).map((s, i) => (
      <div key={s.label} style={{ padding: "26px 0 4px", paddingLeft: i === 0 ? 0 : 28, borderLeft: i === 0 ? undefined : "1px solid var(--color-line)" }}>
        {/* Two label lines are reserved whether or not this label needs them,
            so every figure in the band sits on the same line. */}
        <div style={{ ...LABEL, height: 34 }}>{s.label}</div>
        <div
          className="num truncate"
          style={{
            marginTop: 14,
            fontSize: 40,
            fontWeight: 700,
            letterSpacing: "-0.04em",
            lineHeight: 1.05,
            color: s.tone ? ROLE[s.tone] : "var(--color-fg)",
          }}
        >
          {s.value}
        </div>
      </div>
    ))}
  </div>
);

/**
 * The share canvas. `leaderboard` ranks coins by the dollars their apps earned;
 * `coin` puts one ticker and its four load-bearing figures on the screen.
 */
export const ShareCard = ({ variant = "leaderboard", title, subtitle, rows, stats, footnote, className }: ShareCardProps) => {
  if (variant === "coin") {
    return (
      <Frame footnote={footnote} className={className}>
        <div className="flex min-h-0 flex-1 flex-col justify-center">
          {/* Silkscreen is a bitmap face: sizes stay whole multiples of 8 so the
              glyph grid lands on device pixels instead of between them. */}
          <h1 style={{ fontFamily: "var(--font-pixel)", fontSize: 96, letterSpacing: "0.01em", lineHeight: 1.05, margin: 0 }}>{title}</h1>
          {subtitle !== undefined && subtitle !== null && (
            <p style={{ margin: "22px 0 0", fontSize: 27, lineHeight: 1.3, color: "var(--color-fg-2)", maxWidth: 940 }}>{subtitle}</p>
          )}
        </div>
        {stats && stats.length > 0 && <StatBand stats={stats} />}
      </Frame>
    );
  }

  return (
    <Frame footnote={footnote} className={className}>
      <div className="shrink-0" style={{ paddingTop: 34 }}>
        <h1 style={{ fontFamily: "var(--font-pixel)", fontSize: 32, letterSpacing: "0.015em", lineHeight: 1.3, margin: 0, maxWidth: 1000 }}>
          {title}
        </h1>
        {subtitle !== undefined && subtitle !== null && (
          <p style={{ margin: "14px 0 0", fontSize: 21, lineHeight: 1.35, color: "var(--color-fg-2)", maxWidth: 820 }}>{subtitle}</p>
        )}
      </div>
      <Rows rows={rows ?? []} />
    </Frame>
  );
};
