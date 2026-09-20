interface Props {
  points: number[];
  /** "auto" colours by direction of travel. */
  tone?: "rev" | "burn" | "auto" | "plain";
  className?: string;
  width?: number;
  height?: number;
  /** mark the latest point with a block — use when the series is "now" */
  showDot?: boolean;
  strokeWidth?: number;
}

/**
 * Stepped trend plot. Every coordinate is snapped to a whole pixel and the path
 * moves in horizontal-then-vertical steps, so the series reads as sampled data
 * on a grid rather than an interpolated curve — a smooth spline through eleven
 * revenue payments claims precision the data does not have. `crispEdges` turns
 * off antialiasing so the result is 1-bit: on pixels and off pixels, nothing in
 * between. The fill under the line is a flat wash, not a gradient.
 */
export const Sparkline = ({ points, tone = "auto", className = "", width = 96, height = 24, showDot = false, strokeWidth = 1 }: Props) => {
  const n = points.length;
  const up = n < 2 || points[n - 1]! >= points[0]!;
  const stroke =
    tone === "plain" ? "var(--color-fg-3)" : tone === "burn" || (tone === "auto" && !up) ? "var(--role-money-out)" : "var(--role-money-in)";
  /* A half-pixel stroke lands on a pixel boundary and smears across two, which
     is the one thing `crispEdges` cannot rescue. */
  const sw = Math.max(1, Math.round(strokeWidth));

  if (n === 0) {
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden shapeRendering="crispEdges">
        <line x1="0" y1={Math.round(height / 2)} x2={width} y2={Math.round(height / 2)} stroke="var(--color-line-2)" strokeWidth="2" strokeDasharray="2 4" />
      </svg>
    );
  }

  const pad = sw;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const plotW = width - pad * 2;
  const plotH = height - pad * 2;
  const stepX = n > 1 ? plotW / (n - 1) : 0;
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < n; i++) {
    xs.push(Math.round(pad + i * stepX));
    ys.push(Math.round(pad + plotH * (1 - (points[i]! - min) / span)));
  }

  /* One sample = one cell: hold the value across its own step, then jump. */
  const parts: string[] = [];
  if (n === 1) {
    const mid = Math.round(height / 2);
    parts.push(`${pad},${mid}`, `${width - pad},${mid}`);
  } else {
    for (let i = 0; i < n; i++) {
      if (i > 0) parts.push(`${xs[i]!},${ys[i - 1]!}`);
      parts.push(`${xs[i]!},${ys[i]!}`);
    }
  }
  const line = parts.join(" ");
  const floor = height - Math.round(sw / 2);
  const area = `${line} ${width - pad},${floor} ${pad},${floor}`;
  const lastX = n === 1 ? width - pad : xs[n - 1]!;
  const lastY = n === 1 ? Math.round(height / 2) : ys[n - 1]!;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden
      preserveAspectRatio="none"
      shapeRendering="crispEdges"
    >
      <polygon points={area} fill={stroke} opacity="0.14" />
      <polyline points={line} fill="none" stroke={stroke} strokeWidth={sw} vectorEffect="non-scaling-stroke" />
      {showDot && n > 1 && <rect x={lastX - 1} y={lastY - 1} width="3" height="3" fill={stroke} />}
    </svg>
  );
};
