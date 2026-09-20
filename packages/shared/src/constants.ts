/**
 * Berth economics. Every number that moves money lives here so the API, runner,
 * and web agree on a single source of truth. Percentages are in basis points.
 */

/** Curve + LP fee split (creator fees collected from pump.fun). Sums to 10_000. */
export const FEE_SPLIT_BPS = {
  BUILD_BUDGET: 6000,
  SHIP_TOKEN: 2500,
  LAUNCHER: 1500,
} as const;

/** App revenue split. Sums to 10_000. */
export const REVENUE_SPLIT_BPS = {
  BUYBACK_BURN: 8500,
  SHIP_TOKEN: 1000,
  PLATFORM_OPS: 500,
} as const;

/** Forks route this share of their fees upstream to the original app, forever. */
export const FORK_ROYALTY_BPS = 1000;

/**
 * Share of the build-budget cut physically routed to the model-credit funding wallet — the card
 * that pays Anthropic. Carved out of the 60% build budget (like the fork royalty), so the headline
 * split becomes build / credits / $BERTH / launcher. At 5000 bps the credits routed equal the build
 * budget left spendable, so the card self-funds every dollar of compute an app is allowed to spend.
 * Set to 0 to keep 100% of the build cut as spendable budget (operator funds Anthropic out of band).
 */
export const CREDITS_FUNDING_BPS = 5000;

/** Minimum accrued, unfunded credits (USD) before a SOL→USDC→card deposit is worth its fees. Zentro's floor is $15. */
export const MIN_CREDITS_FUNDING_USD = 15;

/** Merged human contributors earn this share of an app's launcher-equivalent fee stream, split among them. */
export const CONTRIBUTOR_POOL_BPS = 500;

/** Minimum accrued build budget before the first build starts. */
export const MIN_BUILD_BUDGET_USD = 50;

/** Per-iteration hard cap paid to the agent runner. */
export const ITERATION_BUDGET_USD = { MIN: 10, DEFAULT: 25, MAX: 50 } as const;

/** Global daily platform compute ceiling (USD). Runner refuses new jobs past this. */
export const GLOBAL_DAILY_COMPUTE_CEILING_USD = 2000;

/** Refundable launch stake in lamports (0.05 SOL). Returned at first build threshold. */
export const LAUNCH_STAKE_LAMPORTS = 50_000_000;

/** Tiny budget used for the intake spec generation before any coin exists. Paid by platform. */
export const SPEC_INTAKE_BUDGET_USD = 0.5;

/** Revenue milestones (USD). Each posts to feed + X automatically. */
export const REVENUE_MILESTONES_USD = [1, 1_000, 10_000, 100_000] as const;

/** Governance: token-weighted with per-wallet cap (share of circulating supply, bps). */
export const VOTE_WALLET_CAP_BPS = 200; // 2% of supply max weight per wallet
export const PROMPT_QUEUE_MIN_HOLD_BPS = 10; // hold ≥0.1% of supply to submit a task
/** Hold ≥2% of a coin's supply to be a recognized contributor (submit build prompts that steer the app). */
export const CONTRIBUTOR_MIN_HOLD_BPS = 200;
/** Hold ≥3% of $BERTH to submit a platform-improvement proposal (the meta-governance gate). */
export const PLATFORM_PROPOSAL_MIN_HOLD_BPS = 300;
/** A proposal is "backed" once its capped $BERTH vote weight reaches this share of supply. */
export const PLATFORM_PROPOSAL_QUORUM_BPS = 1000; // 10% of supply
/** OPEN, sub-quorum proposals older than this are auto-declined to keep the board current. */
export const PLATFORM_PROPOSAL_STALE_DAYS = 21;
/** Per-user daily withdrawal cap (USD): blast-radius limit if a session is compromised. */
export const WITHDRAW_DAILY_CAP_USD = 25_000;

/** Buyback executor: minimum accumulated revenue before a swap is worth the fees. */
export const MIN_BUYBACK_USD = 5;

/** Pump.fun fixed supply (1B tokens, 6 decimals). */
export const PUMP_TOTAL_SUPPLY = 1_000_000_000n;
export const PUMP_DECIMALS = 6;

/** Rate limits by launcher reputation tier (launches per 24h). */
export const LAUNCH_RATE_LIMIT_PER_DAY = { NEW: 2, TRUSTED: 10, VETERAN: 30 } as const;

/** Reputation thresholds. */
export const REPUTATION_TIERS = { TRUSTED: 20, VETERAN: 100 } as const;

/** Monitoring. */
export const HEALTHCHECK_INTERVAL_MS = 60_000;
export const HEALTHCHECK_FAILS_BEFORE_SELF_HEAL = 3;

/** Build stages in order. */
export const BUILD_STAGES = ["SCAFFOLD", "MVP", "DEPLOY", "VERIFY", "ITERATE"] as const;

/** Model routing. Cheap model for routine, expensive for architecture/fixes. Override via env. */
export const MODELS = {
  ROUTINE: "claude-sonnet-5",
  ARCHITECT: "claude-opus-5",
  REVIEWER: "claude-sonnet-5",
  INTAKE: "claude-sonnet-5",
  CLASSIFIER: "claude-haiku-4-5",
  GROWTH: "claude-sonnet-5",
} as const;

export const bps = (amount: bigint | number, b: number): bigint => {
  const a = typeof amount === "bigint" ? amount : BigInt(Math.floor(amount));
  return (a * BigInt(b)) / 10_000n;
};
