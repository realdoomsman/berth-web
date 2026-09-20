import { describe, expect, it } from "vitest";
import {
  CONTRIBUTOR_POOL_BPS,
  FEE_SPLIT_BPS,
  FORK_ROYALTY_BPS,
  GLOBAL_DAILY_COMPUTE_CEILING_USD,
  ITERATION_BUDGET_USD,
  MIN_BUILD_BUDGET_USD,
  MIN_BUYBACK_USD,
  PLATFORM_PROPOSAL_MIN_HOLD_BPS,
  PROMPT_QUEUE_MIN_HOLD_BPS,
  PUMP_DECIMALS,
  PUMP_TOTAL_SUPPLY,
  REVENUE_SPLIT_BPS,
  VOTE_WALLET_CAP_BPS,
  bps,
} from "./index.js";

/** Deterministic PRNG so the property checks below are reproducible across machines and runs. */
const mulberry32 = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Amounts that actually occur: dust, single lamports, whole SOL, and whale-sized sweeps. */
const randomAmounts = (count: number, seed: number): bigint[] => {
  const rand = mulberry32(seed);
  const out: bigint[] = [0n, 1n, 2n, 3n, 9999n, 10_000n, 10_001n, 1_000_000_000n];
  for (let i = out.length; i < count; i++) {
    const magnitude = 1 + Math.floor(rand() * 19); // 10^1 .. 10^19 lamports/micros
    out.push(BigInt(Math.floor(rand() * 1e15)) * 10n ** BigInt(magnitude) + BigInt(Math.floor(rand() * 9973)));
  }
  return out;
};

describe("split tables", () => {
  it("fee split sums to exactly 10_000 bps", () => {
    const total = FEE_SPLIT_BPS.BUILD_BUDGET + FEE_SPLIT_BPS.SHIP_TOKEN + FEE_SPLIT_BPS.LAUNCHER;
    expect(total).toBe(10_000);
  });

  it("revenue split sums to exactly 10_000 bps", () => {
    const total = REVENUE_SPLIT_BPS.BUYBACK_BURN + REVENUE_SPLIT_BPS.SHIP_TOKEN + REVENUE_SPLIT_BPS.PLATFORM_OPS;
    expect(total).toBe(10_000);
  });

  it("every share is a positive share of the whole", () => {
    for (const share of [...Object.values(FEE_SPLIT_BPS), ...Object.values(REVENUE_SPLIT_BPS)]) {
      expect(share).toBeGreaterThan(0);
      expect(share).toBeLessThan(10_000);
    }
  });

  it("derived-cut tables stay inside the pool they are carved out of", () => {
    // Fork royalty is taken out of the build budget, the contributor pool out of the launcher cut.
    expect(FORK_ROYALTY_BPS).toBeLessThan(FEE_SPLIT_BPS.BUILD_BUDGET);
    expect(CONTRIBUTOR_POOL_BPS).toBeLessThan(FEE_SPLIT_BPS.LAUNCHER);
    // A wallet cap above the submission floor is what makes governance meaningful.
    expect(PROMPT_QUEUE_MIN_HOLD_BPS).toBeLessThan(VOTE_WALLET_CAP_BPS);
  });

  it("budget thresholds are ordered so a first build can always fund at least one iteration", () => {
    expect(ITERATION_BUDGET_USD.MIN).toBeLessThanOrEqual(ITERATION_BUDGET_USD.DEFAULT);
    expect(ITERATION_BUDGET_USD.DEFAULT).toBeLessThanOrEqual(ITERATION_BUDGET_USD.MAX);
    expect(MIN_BUILD_BUDGET_USD).toBeGreaterThanOrEqual(ITERATION_BUDGET_USD.MIN);
    expect(GLOBAL_DAILY_COMPUTE_CEILING_USD).toBeGreaterThan(ITERATION_BUDGET_USD.MAX);
    expect(MIN_BUYBACK_USD).toBeGreaterThan(0);
  });
});

describe("bps()", () => {
  it("is exact on bigints far beyond Number.MAX_SAFE_INTEGER", () => {
    const huge = 123_456_789_012_345_678_901_234_567_890n;
    expect(bps(huge, FEE_SPLIT_BPS.BUILD_BUDGET)).toBe((huge * 6000n) / 10_000n);
    // Float math on this amount is off by orders of magnitude; the bigint path must not be.
    expect(bps(huge, 10_000)).toBe(huge);
    expect(bps(huge, 0)).toBe(0n);
  });

  it("floors rather than rounding, so a split can never invent value", () => {
    expect(bps(1n, 5000)).toBe(0n);
    expect(bps(3n, 5000)).toBe(1n);
    expect(bps(9_999n, 10_000)).toBe(9_999n);
    expect(bps(10_001n, 1)).toBe(1n);
  });

  it("truncates fractional number inputs instead of rounding them up", () => {
    expect(bps(1.999, 10_000)).toBe(1n);
    expect(bps(10_000.75, 2500)).toBe(2500n);
  });

  it("never loses or invents a unit across the three-way fee split", () => {
    for (const amount of randomAmounts(400, 0x5719)) {
      const build = bps(amount, FEE_SPLIT_BPS.BUILD_BUDGET);
      const ship = bps(amount, FEE_SPLIT_BPS.SHIP_TOKEN);
      const launcher = amount - build - ship;
      expect(build + ship + launcher).toBe(amount);
      expect(launcher).toBeGreaterThanOrEqual(0n);
      // The remainder lands on the launcher cut, and is never more than the rounding dust.
      expect(launcher - bps(amount, FEE_SPLIT_BPS.LAUNCHER)).toBeLessThanOrEqual(2n);
    }
  });

  it("never loses or invents a micro across the three-way revenue split", () => {
    for (const amount of randomAmounts(400, 0xbeef)) {
      const buyback = bps(amount, REVENUE_SPLIT_BPS.BUYBACK_BURN);
      const ship = bps(amount, REVENUE_SPLIT_BPS.SHIP_TOKEN);
      const ops = amount - buyback - ship;
      expect(buyback + ship + ops).toBe(amount);
      expect(ops).toBeGreaterThanOrEqual(0n);
    }
  });

  it("shows why the last leg must be a remainder: three bps() calls can drop up to 2 units", () => {
    // 10_001 splits to 6000/2500/1500 -> 6000 + 2500 + 1500 = 10_000, one unit vanishes.
    const amount = 10_001n;
    const naive =
      bps(amount, FEE_SPLIT_BPS.BUILD_BUDGET) + bps(amount, FEE_SPLIT_BPS.SHIP_TOKEN) + bps(amount, FEE_SPLIT_BPS.LAUNCHER);
    expect(naive).toBeLessThan(amount);
    expect(amount - naive).toBe(1n);
  });
});

describe("fork royalty base", () => {
  it("is charged on the build cut, not on the gross fee", () => {
    const gross = 1_000_000_000n; // $1,000 in micros
    const build = bps(gross, FEE_SPLIT_BPS.BUILD_BUDGET);
    const royalty = bps(build, FORK_ROYALTY_BPS);
    // 10% of the 60% build cut == 6% of gross, i.e. 60_000_000 micros ($60) not $100.
    expect(royalty).toBe(bps(gross, 600));
    expect(royalty).toBeLessThan(bps(gross, FORK_ROYALTY_BPS));
    // The fork keeps the rest of its build budget; the royalty never eats the $SHIP or launcher cut.
    expect(build - royalty).toBe(bps(gross, 5400));
  });

  it("leaves the parent nothing when the fee is too small to carve a royalty from", () => {
    for (const gross of [0n, 1n, 16n]) {
      expect(bps(bps(gross, FEE_SPLIT_BPS.BUILD_BUDGET), FORK_ROYALTY_BPS)).toBe(0n);
    }
    // First amount whose build cut reaches 10 micros, the point where the parent earns its first micro.
    expect(bps(bps(17n, FEE_SPLIT_BPS.BUILD_BUDGET), FORK_ROYALTY_BPS)).toBe(1n);
    expect(bps(bps(16_667n, FEE_SPLIT_BPS.BUILD_BUDGET), FORK_ROYALTY_BPS)).toBe(1_000n);
  });
});

describe("supply constants", () => {
  it("describe pump.fun's fixed 1B supply with 6 decimals", () => {
    const baseUnits = PUMP_TOTAL_SUPPLY * 10n ** BigInt(PUMP_DECIMALS);
    expect(baseUnits).toBe(1_000_000_000_000_000n);
    // A 2% wallet cap on that supply is 20M tokens; regressing the cap to a percentage would 100x it.
    expect((baseUnits * BigInt(VOTE_WALLET_CAP_BPS)) / 10_000n).toBe(20_000_000_000_000n);
    // The ≥3% platform-governance submission gate on the same supply is 30M tokens in base units.
    expect((baseUnits * BigInt(PLATFORM_PROPOSAL_MIN_HOLD_BPS)) / 10_000n).toBe(30_000_000_000_000n);
  });
});
