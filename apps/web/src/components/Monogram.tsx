import { useState } from "react";

/**
 * Coin identity tile.
 *
 * Most coins ship a real image; the ones that do not used to fall back to a
 * generated blob avatar, which is the single clearest tell of a template. This
 * replaces it with a pixel plate: the ticker's own initials set in the bitmap
 * face, on a dithered low-chroma tint picked deterministically from the
 * ticker, inside a hard 1px edge. No coin ever changes tile between renders,
 * and no tint is the money green — a tile is identity, not a number.
 *
 * The dither is the same 2px checkerboard the product uses for loading and
 * empty states, so an imageless coin reads as "this slot is unfilled by
 * design" rather than "this image is broken".
 */

/**
 * Six low-chroma tints. Deliberately not a rainbow and deliberately not
 * `--role-money-in`: these read as paper stocks, not status. `fg` is the ink,
 * `bg` the fill, `wt` the second dither tone; every pair clears 4.5:1 on its
 * own fill.
 */
const TINTS: Array<{ bg: string; wt: string; fg: string }> = [
  { bg: "#182230", wt: "#1f2c3d", fg: "#9dc0e0" }, // slate
  { bg: "#1f1f2e", wt: "#27273a", fg: "#b1abd6" }, // indigo
  { bg: "#261e28", wt: "#2f2633", fg: "#cba4c6" }, // plum
  { bg: "#282017", wt: "#31281d", fg: "#d8ae8c" }, // clay
  { bg: "#232312", wt: "#2b2b18", fg: "#cdc285" }, // ochre
  { bg: "#16241f", wt: "#1c2d27", fg: "#94c1b1" }, // eucalyptus
];

/**
 * Silkscreen is a bitmap face: it is only crisp at whole multiples of its
 * design size, so the tile picks the largest of 8/16/24px that still fits the
 * initials instead of scaling type off the tile edge. 0.575 is the measured
 * advance of one Silkscreen glyph per px of font size.
 */
const PIXEL_STEPS = [24, 16, 8] as const;
const PIXEL_ADVANCE = 0.575;

/** FNV-ish rolling hash: same ticker, same tile, on every client and the server. */
const hash = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

/**
 * Ticker → 1–3 characters. A compound ticker ("INBOX_ZERO", "inboxZero")
 * contributes one letter per part; anything else is cut to three, which keeps
 * $DEAD and $DEMO distinguishable and reads as a ticker abbreviation rather
 * than a truncation.
 */
export const monogramInitials = (ticker: string): string => {
  const parts = ticker
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
  if (parts.length > 1) {
    return parts
      .slice(0, 3)
      .map((p) => p[0]!)
      .join("")
      .toUpperCase();
  }
  return (parts[0] ?? ticker).slice(0, 3).toUpperCase();
};

export interface MonogramProps {
  /** drives both the initials and the tint */
  ticker: string;
  /** the coin image; drawn on top of the monogram, which shows through if it never loads */
  src?: string | null;
  /** tile edge in px. The pixel type step is chosen from it; the edge stays 1px. */
  size?: number;
  /** override the derived initials */
  initials?: string;
  /** set to expose the tile to assistive tech; decorative by default */
  alt?: string;
  className?: string;
}

export const Monogram = ({ ticker, src, size = 40, initials, alt, className = "" }: MonogramProps) => {
  const [failed, setFailed] = useState<string | null>(null);
  const text = initials ?? monogramInitials(ticker);
  const tint = TINTS[hash(ticker.toUpperCase()) % TINTS.length]!;
  /* Largest whole pixel step whose initials clear the 3px inner margin on both
     sides, and that never exceeds ~62% of the tile. A tile is 26px in the
     leaderboard and 56px on a coin page, so this lands on 8/16/24 rather than
     on a fractional size that would put the bitmap grid between device pixels. */
  const fontSize =
    PIXEL_STEPS.find((step) => step <= size * 0.62 && text.length * PIXEL_ADVANCE * step <= size - 6) ?? 8;
  const showImage = !!src && failed !== src;

  /* The monogram is always rendered and the image sits on top of it. A coin
     image that is slow, hanging or dead therefore degrades to the mark instead
     of a grey void, and nothing reflows when it does arrive. */
  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden select-none ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: tint.bg,
        /* 2px dither, same texture as `skeleton`: surface without a gradient. */
        backgroundImage: `repeating-linear-gradient(45deg, ${tint.wt} 0 2px, transparent 2px 4px)`,
        border: `1px solid color-mix(in oklab, ${tint.fg} 24%, var(--color-line))`,
        color: tint.fg,
        fontFamily: "var(--font-pixel)",
        fontSize,
        /* Whole-pixel tracking only, and the trailing gap is paid back on the
           left so the plate is optically centred and still grid-aligned. */
        letterSpacing: "1px",
        paddingLeft: 1,
        lineHeight: 1,
      }}
      aria-hidden={alt === undefined ? true : undefined}
      aria-label={showImage ? undefined : alt}
      role={alt === undefined || showImage ? undefined : "img"}
    >
      {text}
      {showImage && (
        <img
          src={src}
          alt={alt ?? ""}
          loading="lazy"
          width={size}
          height={size}
          className="absolute inset-0 size-full object-cover"
          onError={() => setFailed(src)}
        />
      )}
    </span>
  );
};
