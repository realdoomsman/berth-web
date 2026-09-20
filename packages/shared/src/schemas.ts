import { z } from "zod";

/* ─────────────────────────── Spec (intake output) ─────────────────────────── */

export const MonetizationModel = z.enum([
  "ONE_TIME", // USDC checkout, single purchase unlocks
  "SUBSCRIPTION", // USDC monthly
  "PAY_PER_REQUEST", // x402 API
  "ADS", // free app with ad slot
  "HOLDER_TIER", // free, pro gated by holding the coin
]);
export type MonetizationModel = z.infer<typeof MonetizationModel>;

export const AppSpec = z.object({
  title: z.string().min(2).max(80),
  oneLiner: z.string().min(10).max(160),
  whatItDoes: z.string().min(20).max(1200),
  whoPays: z.string().min(10).max(600),
  mvp: z.array(z.string().min(3).max(200)).min(1).max(8),
  outOfScope: z.array(z.string().max(200)).max(8).default([]),
  monetization: z.object({
    model: MonetizationModel,
    priceUsd: z.number().min(0).max(10_000).nullable(),
    priceDescription: z.string().max(200),
  }),
  holderTier: z.object({
    enabled: z.boolean(),
    minHoldTokens: z.number().int().min(0).nullable(),
    perks: z.array(z.string().max(160)).max(6).default([]),
  }),
  template: z.enum(["WEB_TOOL", "GAME", "AGENT_API"]).default("WEB_TOOL"),
  risks: z.array(z.string().max(200)).max(5).default([]),
});
export type AppSpec = z.infer<typeof AppSpec>;

/* ─────────────────────────── Moderation ─────────────────────────── */

export const ModerationVerdict = z.object({
  allowed: z.boolean(),
  category: z.enum([
    "OK",
    "SCAM",
    "PHISHING",
    "GAMBLING",
    "ILLEGAL",
    "IMPERSONATION",
    "ADULT",
    "HATE",
    "OTHER",
  ]),
  reason: z.string().max(400),
});
export type ModerationVerdict = z.infer<typeof ModerationVerdict>;

/* ─────────────────────────── Build feed events ─────────────────────────── */

export const BuildEventType = z.enum([
  "JOB_QUEUED",
  "JOB_STARTED",
  "STAGE",
  "AGENT_NOTE",
  "TOOL_CALL",
  "COMMIT",
  "TEST_RESULT",
  "SCREENSHOT",
  "LIGHTHOUSE",
  "REVIEW",
  "DEPLOY",
  "JOB_FINISHED",
  "JOB_FAILED",
  "BUDGET",
  "MILESTONE",
  "REVIVED",
  "DORMANT",
  "SELF_HEAL",
  "PR_MERGED",
  "BOUNTY_CLAIMED",
  "GROWTH_POST",
]);
export type BuildEventType = z.infer<typeof BuildEventType>;

export const BuildEventPayload = z.discriminatedUnion("type", [
  z.object({ type: z.literal("JOB_QUEUED"), stage: z.string(), budgetUsd: z.number() }),
  z.object({ type: z.literal("JOB_STARTED"), stage: z.string(), model: z.string(), sandboxId: z.string() }),
  z.object({ type: z.literal("STAGE"), stage: z.string(), status: z.enum(["START", "DONE", "FAIL"]) }),
  z.object({ type: z.literal("AGENT_NOTE"), text: z.string() }),
  z.object({ type: z.literal("TOOL_CALL"), tool: z.string(), summary: z.string() }),
  z.object({ type: z.literal("COMMIT"), sha: z.string(), message: z.string(), url: z.string().nullable() }),
  z.object({
    type: z.literal("TEST_RESULT"),
    passed: z.number(),
    failed: z.number(),
    output: z.string(),
  }),
  z.object({ type: z.literal("SCREENSHOT"), url: z.string(), label: z.string() }),
  z.object({
    type: z.literal("LIGHTHOUSE"),
    performance: z.number(),
    accessibility: z.number(),
    bestPractices: z.number(),
    seo: z.number(),
  }),
  z.object({
    type: z.literal("REVIEW"),
    verdict: z.enum(["APPROVE", "REJECT"]),
    summary: z.string(),
    findings: z.array(z.object({ severity: z.enum(["INFO", "WARN", "BLOCK"]), text: z.string() })),
  }),
  z.object({ type: z.literal("DEPLOY"), version: z.number(), url: z.string() }),
  z.object({ type: z.literal("JOB_FINISHED"), costUsd: z.number(), durationMs: z.number(), summary: z.string() }),
  z.object({ type: z.literal("JOB_FAILED"), costUsd: z.number(), error: z.string() }),
  z.object({ type: z.literal("BUDGET"), budgetUsd: z.number(), delta: z.number(), reason: z.string() }),
  z.object({ type: z.literal("MILESTONE"), milestone: z.string(), value: z.number() }),
  z.object({ type: z.literal("REVIVED"), by: z.string(), budgetUsd: z.number() }),
  z.object({ type: z.literal("DORMANT"), reason: z.string() }),
  z.object({ type: z.literal("SELF_HEAL"), error: z.string() }),
  z.object({ type: z.literal("PR_MERGED"), prNumber: z.number(), author: z.string(), url: z.string() }),
  z.object({ type: z.literal("BOUNTY_CLAIMED"), bountyId: z.string(), amountLamports: z.string(), claimant: z.string() }),
  z.object({ type: z.literal("GROWTH_POST"), url: z.string(), text: z.string() }),
]);
export type BuildEventPayload = z.infer<typeof BuildEventPayload>;

/* ─────────────────────────── Runner ⇄ API contract ─────────────────────────── */

/** Job payload placed on the `build` queue by the API. */
export const BuildJobData = z.object({
  jobId: z.string(),
  appId: z.string(),
  stage: z.enum(["SCAFFOLD", "MVP", "DEPLOY", "VERIFY", "ITERATE", "SELF_HEAL", "PR_REVIEW"]),
  budgetUsd: z.number().positive(),
  /** Prompt-queue task ids consumed by this iteration. */
  taskIds: z.array(z.string()).default([]),
  /** Optional free-text instruction (self-heal error, PR diff summary). */
  instruction: z.string().optional(),
  /** PR number for PR_REVIEW. */
  prNumber: z.number().optional(),
});
export type BuildJobData = z.infer<typeof BuildJobData>;

export const BuyybackJobData = z.object({
  appId: z.string(),
});
export type BuybackJobData = z.infer<typeof BuyybackJobData>;

/** Lines streamed by the in-sandbox runner script (JSONL on stdout). */
export const SandboxRunnerLine = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("note"), text: z.string() }),
  z.object({ kind: z.literal("tool"), name: z.string(), summary: z.string() }),
  z.object({ kind: z.literal("cost"), totalUsd: z.number() }),
  z.object({ kind: z.literal("result"), ok: z.boolean(), totalUsd: z.number(), summary: z.string(), turns: z.number() }),
  z.object({ kind: z.literal("error"), message: z.string() }),
]);
export type SandboxRunnerLine = z.infer<typeof SandboxRunnerLine>;

/* ─────────────────────────── App deployment manifest ─────────────────────────── */

/** Every app the agent builds must produce this at ship.manifest.json. */
export const ShipManifest = z.object({
  name: z.string(),
  version: z.string().default("0.0.0"),
  /** Static entry served at the app root. */
  entry: z.string().default("index.html"),
  /** Server functions exported from functions/*.js, executed in the platform sandbox runtime. */
  functions: z
    .array(
      z.object({
        name: z.string().regex(/^[a-z0-9_-]{1,40}$/),
        /** Price per call in USD (x402). 0 = free. */
        priceUsd: z.number().min(0).default(0),
        /** Require an authenticated user. */
        auth: z.boolean().default(false),
        /** Require the holder tier. */
        holderOnly: z.boolean().default(false),
      }),
    )
    .default([]),
  /** Products available in the hosted checkout. */
  products: z
    .array(
      z.object({
        id: z.string().regex(/^[a-z0-9_-]{1,40}$/),
        name: z.string().max(80),
        priceUsd: z.number().positive(),
        kind: z.enum(["ONE_TIME", "SUBSCRIPTION_MONTHLY"]),
      }),
    )
    .default([]),
  adSlot: z.boolean().default(false),
  holderTier: z.object({ minHoldTokens: z.number().int().min(0) }).nullable().default(null),
});
export type ShipManifest = z.infer<typeof ShipManifest>;

/* ─────────────────────────── Public API DTOs ─────────────────────────── */

export const CreateLaunchBody = z.object({
  name: z.string().min(2).max(32),
  ticker: z
    .string()
    .min(2)
    .max(10)
    .regex(/^[A-Z0-9]+$/),
  imageUrl: z.string().url().max(500),
  prompt: z.string().min(20).max(4000),
  twitter: z.string().url().max(200).optional(),
  website: z.string().url().max(200).optional(),
  forkOfAppId: z.string().optional(),
});
export type CreateLaunchBody = z.infer<typeof CreateLaunchBody>;

export const ApproveSpecBody = z.object({
  spec: AppSpec,
});

/** Custodial launch stake takes no amount (fixed LAUNCH_STAKE_LAMPORTS); a top-up specifies SOL. */
export const TopupBody = z.object({
  sol: z.number().positive().max(1000),
});

/** Stake $BERTH: token count (whole tokens, converted to base units server-side). */
export const ShipStakeBody = z.object({
  appId: z.string().min(1),
  amount: z.number().positive(),
});

/** Withdraw from the custodial wallet to any external address. */
export const WithdrawBody = z.object({
  asset: z.enum(["SOL", "USDC"]),
  to: z.string().min(32).max(64),
  amount: z.number().positive().finite().max(1_000_000),
});

export const PromptQueueBody = z.object({
  text: z.string().min(10).max(1000),
});

export const BountyBody = z.object({
  title: z.string().min(5).max(120),
  description: z.string().min(10).max(2000),
  sol: z.number().positive().max(1000),
});

export const CheckoutBody = z.object({
  productId: z.string(),
  successUrl: z.string().url().optional(),
});

export const LeaderboardSort = z.enum(["revenue", "buybacks", "users", "newest", "dormant", "building"]);
export type LeaderboardSort = z.infer<typeof LeaderboardSort>;
