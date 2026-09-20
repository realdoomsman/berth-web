import type { SVGProps } from "react";

/**
 * Inline SVG icon set — 1-bit pixel sprites.
 *
 * Every glyph is literally drawn in this file: sixteen rows of sixteen
 * characters, `#` for ink. `glyph()` compiles that art into a single `<path>`
 * of integer-coordinate rectangles once, at module load, so a render is one
 * element with a constant string — no per-render geometry, no icon library, no
 * runtime grid walking.
 *
 * Rules the whole set obeys, because they are what makes it read as one
 * machine and not as clip art:
 *   - 16x16 grid, whole units only. No sub-pixel coordinates anywhere.
 *   - `fill: currentColor`, never a stroke. A 1.5px stroke is the tell of a
 *     generic line-icon set and it blurs the moment the icon is not on a
 *     device-pixel boundary.
 *   - `shape-rendering: crispEdges`, so the renderer snaps edges instead of
 *     anti-aliasing them. Abutting rects share a snapped edge, so a glyph
 *     never seams at fractional scales.
 *   - Pixel-exact at integer multiples of 16 (16, 32, 48). Everything in
 *     between still has hard edges; the step widths just go uneven.
 */
export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  /** px, square. Defaults to 16. */
  size?: number;
}

/** Grid edge. Every sprite below is this wide and this tall. */
const ART = 16;

/**
 * Art rows → one path of merged rectangles.
 *
 * Greedy 2D decomposition: take the longest horizontal run, extend it down as
 * far as the identical run repeats, emit that rectangle and clear it. A 16x16
 * sprite collapses to a handful of rects (a vertical bar is one rect, not
 * sixteen), which keeps the path short and keeps large flat areas from
 * showing hairlines between rows.
 */
const glyph = (rows: string[]): string => {
  const h = rows.length;
  const on: Uint8Array = new Uint8Array(ART * h);
  for (let y = 0; y < h; y++) {
    const row = rows[y]!;
    for (let x = 0; x < ART; x++) if (row[x] === "#") on[y * ART + x] = 1;
  }
  let d = "";
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < ART; x++) {
      if (!on[y * ART + x]) continue;
      let w = 1;
      while (x + w < ART && on[y * ART + x + w]) w++;
      let run = 1;
      outer: while (y + run < h) {
        for (let k = 0; k < w; k++) if (!on[(y + run) * ART + x + k]) break outer;
        run++;
      }
      for (let yy = y; yy < y + run; yy++) for (let k = 0; k < w; k++) on[yy * ART + x + k] = 0;
      d += `M${x} ${y}h${w}v${run}h-${w}z`;
    }
  }
  return d;
};

const base = ({ size = 16, className = "", ...rest }: IconProps) => ({
  width: size,
  height: size,
  viewBox: "0 0 16 16",
  fill: "currentColor",
  shapeRendering: "crispEdges" as const,
  "aria-hidden": true,
  focusable: false,
  className: `shrink-0 ${className}`,
  ...rest,
});

/*
 * ── the mark ──────────────────────────────────────────────────────────────
 *
 * "Berth it", drawn as one sprite: a block arrow with stepped shoulders that
 * has already left a launch pad, and the pad has a hatch open under it. The
 * two empty rows between shaft and pad are the whole idea — the payload is
 * gone, the machine is still standing there with its doors open.
 *
 * Why this and not a rounded tile with an arrow in it: a tile is a container,
 * and a container says nothing. This says departure, it is symmetric about the
 * grid's centre line so it never looks off-centre, and its smallest feature is
 * a full 1/16 of the mark — so at 16px every part of it survives as a whole
 * device pixel. Solid `currentColor`, no knockout, so it works on any surface
 * (the old mark punched `--color-bg` through itself and broke on panels).
 */
const MARK = glyph([
  "................",
  ".......##.......",
  "......####......",
  ".....######.....",
  "....########....",
  "...##########...",
  "..############..",
  "..##..####..##..",
  "......####......",
  "......####......",
  "......####......",
  "................",
  "................",
  ".######..######.",
  ".######..######.",
  "................",
]);

export const ShipMark = ({ size = 24, className = "", ...rest }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="currentColor"
    shapeRendering="crispEdges"
    aria-hidden
    focusable={false}
    className={`shrink-0 ${className}`}
    {...rest}
  >
    <path d={MARK} />
  </svg>
);

/* ── data ─────────────────────────────────────────────────────────────── */

const CHART = glyph([
  "................",
  "................",
  "...........##...",
  "...........##...",
  ".......##..##...",
  ".......##..##...",
  ".......##..##...",
  "...##..##..##...",
  "...##..##..##...",
  "...##..##..##...",
  "...##..##..##...",
  "...##..##..##...",
  "...##..##..##...",
  "..############..",
  "................",
  "................",
]);

export const IconChart = (p: IconProps) => (
  <svg {...base(p)}>
    <path d={CHART} />
  </svg>
);

const FEED = glyph([
  "................",
  "................",
  "..##..########..",
  "..##..########..",
  "................",
  "................",
  "................",
  "..##..########..",
  "..##..########..",
  "................",
  "................",
  "................",
  "..##..########..",
  "..##..########..",
  "................",
  "................",
]);

export const IconFeed = (p: IconProps) => (
  <svg {...base(p)}>
    <path d={FEED} />
  </svg>
);

const BURN = glyph([
  "................",
  ".......##.......",
  "......###.......",
  ".....###........",
  ".....##.........",
  "....###...##....",
  "....###..###....",
  "...####.####....",
  "...#########....",
  "..##########....",
  "..##########....",
  "..##########....",
  "...########.....",
  "....######......",
  "................",
  "................",
]);

export const IconBurn = (p: IconProps) => (
  <svg {...base(p)}>
    <path d={BURN} />
  </svg>
);

const USERS = glyph([
  "................",
  "...##.......##..",
  "..####....####..",
  "..####....####..",
  "...##.......##..",
  "................",
  "..####....####..",
  ".######..######.",
  ".######..######.",
  ".######..######.",
  ".######..######.",
  "................",
  "................",
  "................",
  "................",
  "................",
]);

export const IconUsers = (p: IconProps) => (
  <svg {...base(p)}>
    <path d={USERS} />
  </svg>
);

const CLOCK = glyph([
  "................",
  ".....######.....",
  "...##......##...",
  "..#..........#..",
  ".#............#.",
  "#..............#",
  "#......#.......#",
  "#......#.......#",
  "#......####....#",
  "#..............#",
  "#..............#",
  ".#............#.",
  "..#..........#..",
  "...##......##...",
  ".....######.....",
  "................",
]);

export const IconClock = (p: IconProps) => (
  <svg {...base(p)}>
    <path d={CLOCK} />
  </svg>
);

/* ── verdicts ─────────────────────────────────────────────────────────── */

const CHECK = glyph([
  "................",
  "................",
  "................",
  "................",
  ".............##.",
  "............##..",
  "...........##...",
  "..##......##....",
  "...##....##.....",
  "....##..##......",
  ".....##.##......",
  "......###.......",
  "................",
  "................",
  "................",
  "................",
]);

export const IconCheck = (p: IconProps) => (
  <svg {...base(p)}>
    <path d={CHECK} />
  </svg>
);

const CLOSE = glyph([
  "................",
  "................",
  "..##........##..",
  ".####......####.",
  "..####....####..",
  "...####..####...",
  "....########....",
  ".....######.....",
  ".....######.....",
  "....########....",
  "...####..####...",
  "..####....####..",
  ".####......####.",
  "..##........##..",
  "................",
  "................",
]);

export const IconX = (p: IconProps) => (
  <svg {...base(p)}>
    <path d={CLOSE} />
  </svg>
);

const ALERT = glyph([
  "................",
  "................",
  ".......##.......",
  "......####......",
  "......####......",
  ".....##..##.....",
  "....###..###....",
  "....###..###....",
  "...####..####...",
  "...##########...",
  "..#####..#####..",
  "..############..",
  ".##############.",
  ".##############.",
  "................",
  "................",
]);

export const IconAlert = (p: IconProps) => (
  <svg {...base(p)}>
    <path d={ALERT} />
  </svg>
);

/* ── actions ──────────────────────────────────────────────────────────── */

const EXTERNAL = glyph([
  "................",
  "................",
  ".........#####..",
  "..........####..",
  ".........#####..",
  "........##..##..",
  ".......##...##..",
  ".#######....##..",
  ".#.....#....##..",
  ".#.....#........",
  ".#.....#........",
  ".#.....#........",
  ".#.....#........",
  ".#######........",
  "................",
  "................",
]);

export const IconExternal = (p: IconProps) => (
  <svg {...base(p)}>
    <path d={EXTERNAL} />
  </svg>
);

const COPY = glyph([
  "................",
  "................",
  "..########......",
  "..#......#......",
  "..#......#......",
  "..#..#########..",
  "..#..#.......#..",
  "..#..#.......#..",
  "..####.......#..",
  ".....#.......#..",
  ".....#.......#..",
  ".....#.......#..",
  ".....#.......#..",
  ".....#########..",
  "................",
  "................",
]);

export const IconCopy = (p: IconProps) => (
  <svg {...base(p)}>
    <path d={COPY} />
  </svg>
);

const GITHUB = glyph([
  "................",
  "................",
  "..##........##..",
  "..###......###..",
  "..####....####..",
  "..############..",
  ".##############.",
  ".###..####..###.",
  ".##############.",
  ".##############.",
  "..############..",
  "..############..",
  "...##########...",
  ".....######.....",
  "................",
  "................",
]);

export const IconGithub = (p: IconProps) => (
  <svg {...base(p)}>
    <path d={GITHUB} />
  </svg>
);

const VOTE = glyph([
  "................",
  "................",
  ".......##.......",
  "......####......",
  ".....##..##.....",
  "....##....##....",
  "...##......##...",
  "..##........##..",
  "......####......",
  "......####......",
  "......####......",
  "......####......",
  "......####......",
  "......####......",
  "................",
  "................",
]);

export const IconVote = (p: IconProps) => (
  <svg {...base(p)}>
    <path d={VOTE} />
  </svg>
);

const REFRESH = glyph([
  "................",
  "................",
  ".....####.......",
  "....########....",
  "...###....###...",
  "..###.....####..",
  "..##......###...",
  "..##......##....",
  "..##........##..",
  "..##........##..",
  "..###......###..",
  "...###....###...",
  "....########....",
  ".....######.....",
  "................",
  "................",
]);

export const IconRefresh = (p: IconProps) => (
  <svg {...base(p)}>
    <path d={REFRESH} />
  </svg>
);

const CHEVRON_ART = glyph([
  "................",
  "................",
  "................",
  "................",
  "................",
  "...##......##...",
  "....##....##....",
  ".....##..##.....",
  "......####......",
  ".......##.......",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
]);

const CHEVRON: Record<string, string> = {
  up: "rotate(180deg)",
  down: "none",
  left: "rotate(90deg)",
  right: "rotate(-90deg)",
};

export const IconChevron = ({ dir = "down", style, ...p }: IconProps & { dir?: "up" | "down" | "left" | "right" }) => (
  /* Quarter turns only, so a rotated sprite lands back on the pixel grid. */
  <svg {...base(p)} style={{ transform: CHEVRON[dir], transition: "transform 0.12s steps(3, end)", ...style }}>
    <path d={CHEVRON_ART} />
  </svg>
);

const MENU = glyph([
  "................",
  "................",
  "................",
  "..############..",
  "..############..",
  "................",
  "................",
  "..############..",
  "..############..",
  "................",
  "................",
  "..############..",
  "..############..",
  "................",
  "................",
  "................",
]);

export const IconMenu = (p: IconProps) => (
  <svg {...base(p)}>
    <path d={MENU} />
  </svg>
);

/* ── the machine ──────────────────────────────────────────────────────── */

const IMAGE = glyph([
  "................",
  "................",
  "..############..",
  "..#..........#..",
  "..#..##......#..",
  "..#..##......#..",
  "..#.......##.#..",
  "..#......#####..",
  "..#..##..######.",
  "..#.####.######.",
  "..############..",
  "..############..",
  "..############..",
  "................",
  "................",
  "................",
]);

export const IconImage = (p: IconProps) => (
  <svg {...base(p)}>
    <path d={IMAGE} />
  </svg>
);

const ROCKET = glyph([
  "................",
  "......####......",
  ".....######.....",
  ".....######.....",
  ".....##..##.....",
  ".....##..##.....",
  ".....######.....",
  ".....######.....",
  "...##########...",
  "...##########...",
  "...##.####.##...",
  "......####......",
  ".......##.......",
  "................",
  ".......##.......",
  "................",
]);

export const IconRocket = (p: IconProps) => (
  <svg {...base(p)}>
    <path d={ROCKET} />
  </svg>
);

const TERMINAL = glyph([
  "................",
  "................",
  "................",
  "..##............",
  "...##...........",
  "....##..........",
  ".....##.........",
  "......##........",
  ".....##.........",
  "....##..........",
  "...##...........",
  "..##............",
  "................",
  "......########..",
  "......########..",
  "................",
]);

export const IconTerminal = (p: IconProps) => (
  <svg {...base(p)}>
    <path d={TERMINAL} />
  </svg>
);

const GAUGE = glyph([
  "................",
  "................",
  "................",
  ".....######.....",
  "...##......##...",
  "..##......##.##.",
  ".##......##...##",
  ".##.....##....##",
  ".##..####.....##",
  ".##..####.....##",
  ".##...........##",
  ".##...........##",
  "..############..",
  "..############..",
  "................",
  "................",
]);

export const IconGauge = (p: IconProps) => (
  <svg {...base(p)}>
    <path d={GAUGE} />
  </svg>
);

const LOCK = glyph([
  "................",
  "................",
  "......####......",
  ".....##..##.....",
  ".....##..##.....",
  ".....##..##.....",
  "..############..",
  "..############..",
  "..############..",
  "..####....####..",
  "..####....####..",
  "..####....####..",
  "..############..",
  "..############..",
  "................",
  "................",
]);

export const IconLock = (p: IconProps) => (
  <svg {...base(p)}>
    <path d={LOCK} />
  </svg>
);

const SPARK = glyph([
  "................",
  "......##........",
  "......##........",
  ".....####.......",
  "..##########....",
  "..##########....",
  ".....####.......",
  "......##........",
  "......##........",
  "................",
  "...........##...",
  "..........####..",
  ".........######.",
  "..........####..",
  "...........##...",
  "................",
]);

export const IconSpark = (p: IconProps) => (
  <svg {...base(p)}>
    <path d={SPARK} />
  </svg>
);

/* ── money ────────────────────────────────────────────────────────────── */

const DOLLAR = glyph([
  "................",
  ".......##.......",
  "....########....",
  "...##..##..##...",
  "...##..##.......",
  "...##..##.......",
  "....########....",
  "....########....",
  ".......##..##...",
  ".......##..##...",
  "...##..##..##...",
  "....########....",
  ".......##.......",
  "................",
  "................",
  "................",
]);

export const IconDollar = (p: IconProps) => (
  <svg {...base(p)}>
    <path d={DOLLAR} />
  </svg>
);

/* ── signals ──────────────────────────────────────────────────────────── */

const BELL = glyph([
  "................",
  ".......##.......",
  ".......##.......",
  "......####......",
  ".....#....#.....",
  ".....#....#.....",
  "....#......#....",
  "....#......#....",
  "...#........#...",
  "...#........#...",
  "..#..........#..",
  ".##############.",
  "................",
  "......####......",
  ".......##.......",
  "................",
]);

export const IconBell = (p: IconProps) => (
  <svg {...base(p)}>
    <path d={BELL} />
  </svg>
);
