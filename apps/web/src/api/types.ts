/**
 * Response DTOs for the Berth API (`/v1/*`). Money is serialized as plain
 * numbers: `*Usd` in dollars, `*Sol` in SOL, token amounts in whole tokens
 * (6 decimals already divided out). Dates are ISO strings.
 */
import type { AppSpec, BuildEventPayload, BuildEventType, LeaderboardSort, MonetizationModel } from "@ship/shared";

export type { AppSpec, BuildEventPayload, BuildEventType, LeaderboardSort, MonetizationModel };

export type AppStatus =
  | "DRAFT"
  | "SPEC_READY"
  | "AWAITING_STAKE"
  | "LAUNCHING"
  | "LIVE"
  | "DORMANT"
  | "KILLED"
  | "FAILED";

export type JobStage = "SCAFFOLD" | "MVP" | "DEPLOY" | "VERIFY" | "ITERATE" | "SELF_HEAL" | "PR_REVIEW";
export type JobStatus = "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface BuildEvent {
  id: string;
  appId: string;
  jobId: string | null;
  type: BuildEventType;
  payload: BuildEventPayload;
  createdAt: string;
}

export interface RunningJob {
  id: string;
  stage: JobStage;
  status: JobStatus;
  model: string | null;
  budgetUsd: number;
  costUsd: number;
  startedAt: string | null;
}

/** Leaderboard row / card. */
export interface AppSummary {
  id: string;
  slug: string;
  name: string;
  ticker: string;
  imageUrl: string;
  status: AppStatus;
  template: "WEB_TOOL" | "GAME" | "AGENT_API";
  oneLiner: string | null;
  mint: string | null;
  priceUsd: number;
  marketCapUsd: number;
  holders: number;
  users: number;
  revenueUsd: number;
  buybackSol: number;
  burnedTokens: number;
  priceToRevenue: number | null;
  budgetUsd: number;
  liveVersion: number;
  liveUrl: string | null;
  pumpUrl: string | null;
  runningJob: RunningJob | null;
  lastEvent: BuildEvent | null;
  createdAt: string;
}

export interface AppDetail extends AppSummary {
  prompt: string;
  spec: AppSpec | null;
  launcher: { id: string; displayName: string | null; xHandle: string | null; wallet: string | null };
  maintainer: { id: string; displayName: string | null; wallet: string | null } | null;
  creatorWallet: string | null;
  curveStage: "BONDING" | "GRADUATED";
  poolAddress: string | null;
  launchTx: string | null;
  twitterUrl: string | null;
  websiteUrl: string | null;
  repoUrl: string | null;
  forkOf: { id: string; slug: string; name: string; ticker: string } | null;
  forksCount: number;
  spentUsd: number;
  feesSol: number;
  pendingRevenueUsd: number;
  uptimeBps: number;
  healthy: boolean;
  volume24hUsd: number;
  liquidityUsd: number;
  firstBuildAt: string | null;
  mvpLiveAt: string | null;
  firstRevenueAt: string | null;
  milestones: string[];
  killedReason: string | null;
  xAccount: string | null;
  stakeSol: number;
  stakeRefundedAt: string | null;
}

export type RevenueSource = "CHECKOUT" | "SUBSCRIPTION" | "X402" | "AD" | "EXTERNAL_SDK";

export interface RevenueEventDto {
  id: string;
  source: RevenueSource;
  usd: number;
  payer: string | null;
  reference: string | null;
  createdAt: string;
}

export interface BuybackDto {
  id: string;
  status: "PENDING" | "SWAPPED" | "BURNED" | "FAILED";
  revenueUsd: number;
  solSpent: number;
  tokensBought: number;
  tokensBurned: number;
  shipUsd: number;
  opsUsd: number;
  attestHash: string;
  swapTx: string | null;
  burnTx: string | null;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
  revenueEvents: RevenueEventDto[];
}

export interface LedgerResponse {
  buybacks: BuybackDto[];
  totals: { revenueUsd: number; buybackSol: number; burnedTokens: number; pendingRevenueUsd: number };
}

export interface Candle {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export type CandleRes = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

export interface QueueItemDto {
  id: string;
  text: string;
  status: "OPEN" | "SCHEDULED" | "DONE" | "REJECTED";
  weight: number;
  votes: number;
  author: { id: string; displayName: string | null; wallet: string | null };
  votedByMe: boolean;
  jobId: string | null;
  createdAt: string;
}

export interface QueueResponse {
  items: QueueItemDto[];
  minHoldTokens: number;
  canSubmit: boolean;
  myWeight: number;
}

export interface BountyDto {
  id: string;
  title: string;
  description: string;
  sol: number;
  status: "OPEN" | "CLAIMED" | "PAID" | "CANCELLED";
  author: { id: string; displayName: string | null; wallet: string | null };
  claimantWallet: string | null;
  prNumber: number | null;
  escrowTx: string;
  payoutTx: string | null;
  createdAt: string;
}

export interface PullRequestDto {
  id: string;
  number: number;
  title: string;
  url: string;
  authorLogin: string;
  authorWallet: string | null;
  status: "OPEN" | "REVIEWING" | "APPROVED" | "REJECTED" | "MERGED";
  reviewSummary: string | null;
  mergeSha: string | null;
  createdAt: string;
}

export interface PrsResponse {
  items: PullRequestDto[];
  contributors: Array<{ userId: string; displayName: string | null; wallet: string | null; mergedPrs: number; earnedUsd: number }>;
  maintainer: { wallet: string | null; displayName: string | null } | null;
  maintainerVotes: Array<{ candidateWallet: string; weight: number; voters: number }>;
  myMaintainerVote: string | null;
}

export interface TopHolder {
  wallet: string;
  amount: number;
  pct: number;
}

export interface Stats {
  revenueUsd: number;
  buybackSol: number;
  buybackUsd: number;
  shipBurned: number;
  appsLive: number;
  appsBuilding: number;
  appsTotal: number;
  feesSol: number;
  feesUsd: number;
  solPriceUsd: number;
  appsKilled: number;
  launchesReachingBuildGate: number;
  medianBuildCostUsd: number;
  firstDeploySuccessRate: number;
  uptimeAvgBps: number;
}

export interface ShipStakeDto {
  id: string;
  appId: string;
  appSlug: string;
  appName: string;
  appTicker: string;
  wallet: string;
  amount: number;
  earnedUsd: number;
  depositTx: string;
  withdrawTx: string | null;
  createdAt: string;
  withdrawnAt: string | null;
}

export interface ShipInfo {
  mint: string | null;
  treasury: string;
  priceUsd: number;
  marketCapUsd: number;
  volume24hUsd: number;
  holders: number;
  feesReceivedUsd: number;
  revenueReceivedUsd: number;
  burned: number;
  totalStaked: number;
  stakers: number;
  pumpUrl: string | null;
  myStakes: ShipStakeDto[];
  topStakes: Array<{ appSlug: string; appName: string; appTicker: string; amount: number; stakers: number }>;
}

export interface Me {
  id: string;
  wallet: string | null;
  displayName: string | null;
  xHandle: string | null;
  avatarUrl: string | null;
  reputation: number;
  reputationTier: "NEW" | "TRUSTED" | "VETERAN";
  isAdmin: boolean;
  launchesToday: number;
  launchesPerDay: number;
  claimableUsd: number;
}

/** Session user returned by the login endpoints (a subset of `Me`). */
export interface AuthUser {
  id: string;
  wallet: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  xHandle: string | null;
  isAdmin: boolean;
}

/** `{ token, user }` returned by `POST /v1/auth/google` and `POST /v1/auth/wallet`. */
export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface LauncherDashboard {
  apps: Array<
    AppSummary & {
      feeShareUsd: number;
      spentUsd: number;
      healthy: boolean;
      uptimeBps: number;
      stakeSol: number;
      stakeRefundedAt: string | null;
      stakeRefundTx: string | null;
    }
  >;
  totals: { feeShareUsd: number; revenueUsd: number; apps: number; live: number };
}

export interface HolderDashboard {
  positions: Array<{
    app: AppSummary;
    balance: number;
    pctSupply: number;
    valueUsd: number;
    buybackShareUsd: number;
    burnedShare: number;
  }>;
  votes: Array<{ id: string; appSlug: string; appTicker: string; text: string; weight: number; status: QueueItemDto["status"]; createdAt: string }>;
  contributions: Array<{ appSlug: string; appTicker: string; mergedPrs: number; earnedUsd: number }>;
  bounties: Array<BountyDto & { appSlug: string; appTicker: string }>;
  totals: { valueUsd: number; buybackShareUsd: number; earnedUsd: number };
}

export interface LaunchDto {
  id: string;
  slug: string;
  name: string;
  ticker: string;
  imageUrl: string;
  prompt: string;
  status: AppStatus;
  spec: AppSpec | null;
  moderation: { allowed: boolean; reason: string | null } | null;
  payTo: string | null;
  lamports: number;
  stakeTx: string | null;
  mint: string | null;
  launchTx: string | null;
  error: string | null;
  forkOfId: string | null;
  createdAt: string;
}

export interface AdminJob {
  id: string;
  appId: string;
  appSlug: string;
  appTicker: string;
  stage: JobStage;
  status: JobStatus;
  model: string | null;
  budgetUsd: number;
  costUsd: number;
  sandboxId: string | null;
  error: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

/**
 * One reconcile check's most recent run. `findings` elements always carry
 * `code` + `detail`; the remaining keys are check-specific context
 * (`slug`, `jobId`, `ledgerMicros`, …).
 */
export interface ReconcileFinding {
  code: string;
  detail: string;
  [key: string]: unknown;
}

export interface ReconcileRun {
  kind: string;
  ok: boolean;
  checked: number;
  drifted: number;
  repaired: number;
  durationMs: number;
  createdAt: string;
  findings: ReconcileFinding[];
}

/** Append-only privileged-action log. `actor` is `admin:<id>` / `worker:<queue>` / `system`. */
export interface AuditEntry {
  id: string;
  actor: string;
  actorId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  meta: unknown;
  createdAt: string;
}

/** `/v1/admin/audit` resolves the actor, so its rows carry a display name. */
export interface AuditPageEntry extends AuditEntry {
  actorName: string | null;
  actorWallet: string | null;
}

export interface AdminOps {
  compute: { todayUsd: number; ceilingUsd: number; yesterdayUsd: number };
  running: AdminJob[];
  failed: AdminJob[];
  queued: number;
  flags: Array<{ id: string; appId: string; appSlug: string; source: string; category: string; reason: string; createdAt: string }>;
  reports: Array<{ id: string; appId: string; appSlug: string; reporter: string; kind: string; details: string; status: string; createdAt: string }>;
  killed: Array<{ id: string; slug: string; ticker: string; killedReason: string | null }>;
  settings: Record<string, unknown>;
  counts: { live: number; dormant: number; building: number; killed: number; users: number };
  /** Latest run per check, unordered. */
  reconcile: ReconcileRun[];
  /** 25 most recent privileged actions, newest first. */
  audit: AuditEntry[];
}

export interface ApiError {
  error: string;
  status: number;
}

export type ProposalStatus = "OPEN" | "PLANNED" | "BUILDING" | "SHIPPED" | "DECLINED";

/** Public author reference on a governance proposal. */
export interface ProposalAuthor {
  id: string;
  displayName: string | null;
  wallet: string | null;
  xHandle: string | null;
}

/**
 * A $BERTH platform-governance proposal. `weight` and `minHoldBaseUnits` are
 * $BERTH base units (6 decimals) as strings; divide by 1e6 for whole tokens.
 * `mine` is true when the caller has voted on this proposal.
 */
export interface Proposal {
  id: string;
  title: string;
  body: string;
  status: ProposalStatus;
  ownerNote: string | null;
  author: ProposalAuthor;
  weight: string;
  voters: number;
  mine: boolean;
  createdAt: string;
}

/** `GET /v1/proposals` — the public governance board. */
export interface ProposalsResponse {
  shipLaunched: boolean;
  minHoldBaseUnits: string;
  items: Proposal[];
}
