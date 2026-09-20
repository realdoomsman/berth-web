import { describe, expect, it } from "vitest";
import {
  LAMPORTS_PER_SOL,
  RESERVED_SLUGS,
  clamp,
  fnv1a32,
  formatUsd,
  lamportsToSol,
  shortAddr,
  slugify,
  solToLamports,
  usdFromLamports,
} from "./index.js";

describe("SOL conversions", () => {
  it("agrees with the lamport constant on whole SOL", () => {
    expect(solToLamports(1)).toBe(LAMPORTS_PER_SOL);
    expect(lamportsToSol(LAMPORTS_PER_SOL)).toBe(1);
    expect(lamportsToSol(0)).toBe(0);
  });

  it("does not leak float error into lamports", () => {
    // 0.1 * 1e9 is 100000000.00000001 in IEEE-754; rounding must absorb that.
    expect(solToLamports(0.1)).toBe(100_000_000n);
    expect(solToLamports(0.05)).toBe(50_000_000n);
    expect(solToLamports(0.002)).toBe(2_000_000n);
    expect(solToLamports(1.000000001)).toBe(1_000_000_001n);
  });

  it("round-trips SOL amounts within a lamport", () => {
    for (const sol of [0.000000001, 0.05, 0.37, 1, 1.5, 12.3456789, 1000, 123456.789]) {
      const lamports = solToLamports(sol);
      // A lamport is the smallest representable unit, so that is the whole tolerance budget.
      expect(Math.abs(lamportsToSol(lamports) - sol)).toBeLessThan(1e-9);
      expect(solToLamports(lamportsToSol(lamports))).toBe(lamports);
    }
  });

  it("accepts lamports as bigint, number or decimal string", () => {
    expect(lamportsToSol(500_000_000n)).toBe(0.5);
    expect(lamportsToSol(500_000_000)).toBe(0.5);
    expect(lamportsToSol("500000000")).toBe(0.5);
  });

  it("prices lamports in USD at the given SOL price", () => {
    expect(usdFromLamports(LAMPORTS_PER_SOL, 200)).toBeCloseTo(200, 9);
    expect(usdFromLamports(2_000_000n, 200)).toBeCloseTo(0.4, 9);
    expect(usdFromLamports(0n, 200)).toBe(0);
    // A zero price must not produce NaN/Infinity: fee sweeps run before the price feed warms up.
    expect(usdFromLamports(LAMPORTS_PER_SOL, 0)).toBe(0);
  });
});

describe("slugify", () => {
  it("normalizes ordinary names", () => {
    expect(slugify("My Cool App")).toBe("my-cool-app");
    expect(slugify("InboxZero")).toBe("inboxzero");
    expect(slugify("Deadlinks 2.0")).toBe("deadlinks-2-0");
  });

  it("strips diacritics instead of turning them into separators", () => {
    expect(slugify("Über Café")).toBe("uber-cafe");
    expect(slugify("Café Münster")).toBe("cafe-munster");
    expect(slugify("Señor Ríos")).toBe("senor-rios");
  });

  it("neutralizes hostile input", () => {
    expect(slugify("../../etc/passwd")).toBe("etc-passwd");
    expect(slugify("<script>alert(1)</script>")).toBe("script-alert-1-script");
    expect(slugify("app/../admin")).toBe("app-admin");
    expect(slugify("a?b=c#d")).toBe("a-b-c-d");
    expect(slugify("  spaced  out  ")).toBe("spaced-out");
    expect(slugify("...hello...")).toBe("hello");
  });

  it("always yields a non-empty slug", () => {
    for (const hostile of ["", "   ", "🚀🚀🚀", "!!!", "---", "。。。", "\u0000\u0001"]) {
      expect(slugify(hostile)).toBe("app");
    }
  });

  it("never produces a slug that is an invalid DNS label", () => {
    // Regression: the hyphen trim used to run before the 40-char clamp, so truncating mid-word
    // left a trailing "-" — an RFC 1123 violation that breaks `<slug>.<APP_DOMAIN>` certificates.
    const hostile = [
      `${"a".repeat(39)} b`,
      `${"a".repeat(40)} tail`,
      `${"word ".repeat(20)}end`,
      "a".repeat(200),
      `-${"x".repeat(45)}-`,
      "The Quick Brown Fox Jumps Over The Lazy Dog Again",
      "🚀 ".repeat(30),
      `${"ab-".repeat(20)}`,
    ];
    for (const name of hostile) {
      const slug = slugify(name);
      expect(slug.length).toBeGreaterThan(0);
      expect(slug.length).toBeLessThanOrEqual(40);
      expect(slug.startsWith("-")).toBe(false);
      expect(slug.endsWith("-")).toBe(false);
      expect(slug).toMatch(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/);
    }
    expect(slugify(`${"a".repeat(39)} b`)).toBe("a".repeat(39));
  });
});

describe("RESERVED_SLUGS", () => {
  it("blocks the hostnames the platform itself serves", () => {
    for (const name of ["www", "api", "app", "admin", "ship", "static", "assets", "mail", "docs", "status", "cdn", "dev"]) {
      expect(RESERVED_SLUGS[name]).toBe(true);
    }
    expect(RESERVED_SLUGS["inboxzero"]).toBeUndefined();
  });

  it("cannot be bypassed by casing or padding, because slugify maps back onto the reserved key", () => {
    // launch.ts checks RESERVED_SLUGS[slugify(name)], so every spelling that slugifies to a
    // reserved word must be caught by that single lookup.
    for (const key of Object.keys(RESERVED_SLUGS)) {
      for (const variant of [key.toUpperCase(), ` ${key} `, `${key}!`, `.${key}.`]) {
        expect(RESERVED_SLUGS[slugify(variant)]).toBe(true);
      }
    }
  });

  it("is a plain lookup table with only true values, so a missing key is falsy", () => {
    for (const value of Object.values(RESERVED_SLUGS)) expect(value).toBe(true);
    expect(RESERVED_SLUGS["definitely-not-reserved"] ?? false).toBe(false);
  });
});

describe("display helpers", () => {
  it("formats USD by magnitude without dropping the unit", () => {
    expect(formatUsd(0)).toBe("$0.00");
    expect(formatUsd(96)).toBe("$96.00");
    expect(formatUsd(4213.55)).toBe("$4213.55");
    expect(formatUsd(9999.99)).toBe("$9999.99");
    expect(formatUsd(10_000)).toBe("$10.0k");
    expect(formatUsd(999_999)).toBe("$1000.0k");
    expect(formatUsd(1_000_000)).toBe("$1.00M");
    expect(formatUsd(4_213_550)).toBe("$4.21M");
  });

  it("shortens only addresses that are actually long enough to shorten", () => {
    expect(shortAddr("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")).toBe("EPjF…Dt1v");
    expect(shortAddr("short")).toBe("short");
    // Shortening only pays off past 2n+1 characters; at exactly 2n+1 the address is left intact.
    expect(shortAddr("123456789", 4)).toBe("123456789");
    expect(shortAddr("1234567890", 4)).toBe("1234…7890");
  });

  it("clamps to the closed interval", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
    expect(clamp(0, 0, 0)).toBe(0);
  });
});

describe("fnv1a32", () => {
  it("is deterministic and stays inside uint32, since it derives Solana keypair indexes", () => {
    const a = fnv1a32("clh1q2w3e4r5t6y7u8i9o0p");
    expect(fnv1a32("clh1q2w3e4r5t6y7u8i9o0p")).toBe(a);
    expect(Number.isInteger(a)).toBe(true);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThanOrEqual(0xffffffff);
    expect(fnv1a32("")).toBe(0x811c9dc5);
  });

  it("separates ids that differ only in the last character", () => {
    const seen: Record<number, string> = {};
    for (let i = 0; i < 2000; i++) {
      const id = `app_${i}`;
      const h = fnv1a32(id);
      expect(seen[h]).toBeUndefined();
      seen[h] = id;
    }
  });
});
