/*
 * The flywheel, drawn in the ledger's own hand.
 *
 * Five plates in a ring, connected by hairline arrows that carry a live current.
 * Colour is spent the way it is everywhere else in the product: green on the
 * money arrows (fees generated, payroll, buyback), the agent's low-chroma violet
 * on the build itself because that is status not money, and red on the single
 * burn that closes the loop. No gradient, no glow, no rounded corner — the
 * motion is one dashed stroke walking its offset by exactly one dash period, so
 * the loop reads as circulation and never seams. `prefers-reduced-motion` stops
 * the walk globally and the diagram simply becomes a static schematic.
 */

type Role = "coin" | "money" | "stage" | "burn";

interface FlyNode {
  x: number;
  y: number;
  lines: string[];
  role: Role;
}

const CENTER = { x: 200, y: 184 };
const RADIUS = 130;
const PLATE_W = 108;
const PLATE_H = 46;

const NODE_DEFS: Array<{ lines: string[]; role: Role }> = [
  { lines: ["Coin"], role: "coin" },
  { lines: ["Trading fees"], role: "money" },
  { lines: ["AI agent", "builds app"], role: "stage" },
  { lines: ["App revenue"], role: "money" },
  { lines: ["Buyback", "& burn"], role: "burn" },
];

/** Ring positions: first plate at twelve o'clock, the rest clockwise. */
const NODES: FlyNode[] = NODE_DEFS.map((n, i) => {
  const a = (-90 + i * 72) * (Math.PI / 180);
  return { ...n, x: CENTER.x + RADIUS * Math.cos(a), y: CENTER.y + RADIUS * Math.sin(a) };
});

/** Segment i runs NODES[i] → NODES[(i + 1) % 5]; its colour names what flows. */
const SEG_COLOR: Record<number, string> = {
  0: "var(--color-rev)", // coin → trading fees   (fees generated: money)
  1: "var(--color-rev)", // trading fees → agent  (payroll: money)
  2: "var(--color-violet)", // agent → app revenue (the build: status, not money)
  3: "var(--color-rev)", // app revenue → buyback (money)
  4: "var(--color-burn)", // buyback → coin        (the burn)
};

const round = (n: number) => Math.round(n * 10) / 10;

/** Point on `from`'s plate boundary aimed at `to`, with a 2px breathing gap. */
const edge = (from: FlyNode, to: FlyNode) => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const hw = PLATE_W / 2 + 2;
  const hh = PLATE_H / 2 + 2;
  const s = Math.min(dx !== 0 ? hw / Math.abs(dx) : Infinity, dy !== 0 ? hh / Math.abs(dy) : Infinity);
  return { x: from.x + dx * s, y: from.y + dy * s };
};

interface Seg {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  head: string;
  color: string;
  delay: number;
}

/** Plate-edge to plate-edge connectors with an arrowhead seated at the target. */
const SEGMENTS: Seg[] = NODES.map((from, i) => {
  const to = NODES[(i + 1) % NODES.length]!;
  const a = edge(from, to);
  const b = edge(to, from);
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const ux = (b.x - a.x) / len;
  const uy = (b.y - a.y) / len;
  // A small solid arrowhead seated at the target edge, pointing along the flow.
  const tipX = b.x;
  const tipY = b.y;
  const baseX = b.x - ux * 9;
  const baseY = b.y - uy * 9;
  const px = -uy * 5;
  const py = ux * 5;
  const head = [
    `${round(tipX)},${round(tipY)}`,
    `${round(baseX + px)},${round(baseY + py)}`,
    `${round(baseX - px)},${round(baseY - py)}`,
  ].join(" ");
  return {
    x1: round(a.x),
    y1: round(a.y),
    x2: round(baseX),
    y2: round(baseY),
    head,
    color: SEG_COLOR[i]!,
    delay: i * 0.16,
  };
});

const LABEL_FILL: Record<Role, string> = {
  coin: "var(--color-fg)",
  money: "var(--color-rev)",
  stage: "var(--color-fg-2)",
  burn: "var(--color-burn)",
};

export const Flywheel = ({ className = "" }: { className?: string }) => (
  <svg
    viewBox="0 0 400 360"
    className={`h-auto w-full ${className}`}
    role="img"
    aria-label="The loop: a coin's trading fees pay an AI agent to build an app, the app's revenue funds a buyback, and the buyback burns the coin's supply."
  >
    {/* Connectors first, so the opaque plates seat cleanly on their endpoints. */}
    <g aria-hidden fill="none" strokeWidth={1.25} strokeLinecap="square">
      {SEGMENTS.map((s, i) => (
        <g key={i} stroke={s.color}>
          {/* A faint static rail carries the line where the dashes are gapped. */}
          <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} opacity={0.28} />
          <line
            x1={s.x1}
            y1={s.y1}
            x2={s.x2}
            y2={s.y2}
            strokeDasharray="4 8"
            className="animate-flow"
            style={{ animationDelay: `${s.delay}s` }}
          />
          <polygon points={s.head} fill={s.color} stroke="none" />
        </g>
      ))}
    </g>

    {/* Plates. */}
    <g aria-hidden>
      {NODES.map((n, i) => {
        const x = round(n.x - PLATE_W / 2);
        const y = round(n.y - PLATE_H / 2);
        const twoLine = n.lines.length > 1;
        return (
          <g key={i}>
            <rect x={x} y={y} width={PLATE_W} height={PLATE_H} fill="var(--color-bg-2)" stroke="var(--color-line-2)" strokeWidth={1} />
            {n.role === "coin" && (
              <rect
                x={x + 4}
                y={y + 4}
                width={PLATE_W - 8}
                height={PLATE_H - 8}
                fill="none"
                stroke="var(--color-line)"
                strokeWidth={1}
              />
            )}
            <text
              x={round(n.x)}
              y={round(n.y)}
              textAnchor="middle"
              fontFamily="var(--font-mono)"
              fontSize={12}
              fontWeight={600}
              letterSpacing="-0.02em"
              fill={LABEL_FILL[n.role]}
            >
              {twoLine ? (
                <>
                  <tspan x={round(n.x)} dy={-3}>
                    {n.lines[0]}
                  </tspan>
                  <tspan x={round(n.x)} dy={15}>
                    {n.lines[1]}
                  </tspan>
                </>
              ) : (
                <tspan dy={4}>{n.lines[0]}</tspan>
              )}
            </text>
          </g>
        );
      })}
    </g>
  </svg>
);
