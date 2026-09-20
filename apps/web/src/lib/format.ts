export { formatUsd, shortAddr } from "@ship/shared";

export const formatSol = (sol: number): string =>
  sol >= 1000 ? `${(sol / 1000).toFixed(2)}k SOL` : sol >= 1 ? `${sol.toFixed(3)} SOL` : `${sol.toFixed(4)} SOL`;

export const formatNum = (n: number): string =>
  n >= 1_000_000_000
    ? `${(n / 1_000_000_000).toFixed(2)}B`
    : n >= 1_000_000
      ? `${(n / 1_000_000).toFixed(2)}M`
      : n >= 10_000
        ? `${(n / 1000).toFixed(1)}k`
        : n >= 1000
          ? n.toLocaleString("en-US", { maximumFractionDigits: 0 })
          : n.toLocaleString("en-US", { maximumFractionDigits: n % 1 === 0 ? 0 : 2 });

export const formatPct = (bps: number): string => `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 2)}%`;

/** Tiny prices need more precision than formatUsd offers. */
export const formatPrice = (usd: number): string =>
  usd === 0
    ? "$0"
    : usd >= 1
      ? `$${usd.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
      : usd >= 0.01
        ? `$${usd.toFixed(4)}`
        : `$${usd.toPrecision(3)}`;

export const formatRatio = (r: number | null): string =>
  r === null || !Number.isFinite(r) ? "—" : r >= 1000 ? `${(r / 1000).toFixed(1)}k×` : `${r.toFixed(r >= 100 ? 0 : 1)}×`;

export const timeAgo = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return `${Math.floor(s)}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86_400 * 30) return `${Math.floor(s / 86_400)}d ago`;
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  return new Date(t).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

export const formatDuration = (ms: number): string => {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
};
