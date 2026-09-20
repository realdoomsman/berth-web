export const LAMPORTS_PER_SOL = 1_000_000_000n;

export const lamportsToSol = (l: bigint | number | string): number => Number(BigInt(l)) / 1e9;
export const solToLamports = (s: number): bigint => BigInt(Math.round(s * 1e9));

export const usdFromLamports = (lamports: bigint | number | string, solPriceUsd: number): number =>
  lamportsToSol(lamports) * solPriceUsd;

/**
 * Slug used for `<slug>.berth.fun` and `/a/<slug>`, so the result must be a valid
 * RFC 1123 DNS label: the hyphen trim runs AFTER the length clamp, because
 * truncating mid-word can otherwise re-introduce a trailing hyphen and break
 * certificate issuance for the app's subdomain. Combining marks are dropped so
 * "Über Café" becomes "uber-cafe" rather than "u-ber-cafe".
 */
export const slugify = (name: string): string =>
  name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 40)
    .replace(/^-+|-+$/g, "") || "app";

export const RESERVED_SLUGS: Record<string, true> = {
  www: true,
  api: true,
  app: true,
  admin: true,
  ship: true,
  static: true,
  assets: true,
  mail: true,
  docs: true,
  status: true,
  cdn: true,
  dev: true,
};

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export const formatUsd = (n: number): string =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(2)}M`
    : n >= 10_000
      ? `$${(n / 1000).toFixed(1)}k`
      : `$${n.toFixed(2)}`;

export const shortAddr = (a: string, n = 4) => (a.length > n * 2 + 1 ? `${a.slice(0, n)}…${a.slice(-n)}` : a);

/** Deterministic app-scoped derivation index from a cuid — used for per-app Solana keypairs. */
export const fnv1a32 = (s: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
};
