import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateLaunchBody, AppSpec } from "@ship/shared";
import { api, qs } from "./client.js";
import type {
  AdminJob,
  AdminOps,
  AppDetail,
  AppSummary,
  AuditPageEntry,
  BountyDto,
  BuildEvent,
  Candle,
  CandleRes,
  HolderDashboard,
  LauncherDashboard,
  LaunchDto,
  LeaderboardSort,
  LedgerResponse,
  Me,
  Page,
  Proposal,
  ProposalStatus,
  ProposalsResponse,
  PrsResponse,
  QueueItemDto,
  QueueResponse,
  ShipInfo,
  ShipStakeDto,
  Stats,
  TopHolder,
} from "./types.js";

export const keys = {
  stats: ["stats"] as const,
  apps: (sort: LeaderboardSort) => ["apps", sort] as const,
  app: (slug: string) => ["app", slug] as const,
  feed: (slug: string) => ["feed", slug] as const,
  ledger: (slug: string) => ["ledger", slug] as const,
  candles: (slug: string, res: CandleRes) => ["candles", slug, res] as const,
  queue: (slug: string) => ["queue", slug] as const,
  bounties: (slug: string) => ["bounties", slug] as const,
  prs: (slug: string) => ["prs", slug] as const,
  holders: (slug: string) => ["holders", slug] as const,
  ship: ["ship"] as const,
  proposals: ["proposals"] as const,
  me: ["me"] as const,
  launcher: ["me", "launcher"] as const,
  holder: ["me", "holder"] as const,
  launch: (id: string) => ["launch", id] as const,
  adminOps: ["admin", "ops"] as const,
  adminJobs: (status: string) => ["admin", "jobs", status] as const,
  adminAudit: ["admin", "audit"] as const,
};

export const useStats = () =>
  useQuery({ queryKey: keys.stats, queryFn: ({ signal }) => api.get<Stats>("/v1/stats", signal), refetchInterval: 30_000 });

export const useApps = (sort: LeaderboardSort) =>
  useInfiniteQuery({
    queryKey: keys.apps(sort),
    queryFn: ({ pageParam, signal }) =>
      api.get<Page<AppSummary>>(`/v1/apps${qs({ sort, cursor: pageParam, limit: 30 })}`, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    refetchInterval: 20_000,
  });

export const useApp = (slug: string | undefined) =>
  useQuery({
    queryKey: keys.app(slug ?? ""),
    queryFn: ({ signal }) => api.get<AppDetail>(`/v1/apps/${slug}`, signal),
    enabled: !!slug,
    refetchInterval: 15_000,
  });

export const useFeedBackfill = (slug: string | undefined) =>
  useQuery({
    queryKey: keys.feed(slug ?? ""),
    queryFn: ({ signal }) => api.get<Page<BuildEvent>>(`/v1/apps/${slug}/feed${qs({ limit: 200 })}`, signal),
    enabled: !!slug,
    staleTime: Infinity,
  });

export const useLedger = (slug: string | undefined) =>
  useQuery({
    queryKey: keys.ledger(slug ?? ""),
    queryFn: ({ signal }) => api.get<LedgerResponse>(`/v1/apps/${slug}/ledger`, signal),
    enabled: !!slug,
    refetchInterval: 30_000,
  });

export const useCandles = (slug: string | undefined, res: CandleRes) =>
  useQuery({
    queryKey: keys.candles(slug ?? "", res),
    queryFn: ({ signal }) => api.get<Candle[]>(`/v1/apps/${slug}/candles${qs({ res })}`, signal),
    enabled: !!slug,
    refetchInterval: res === "1m" ? 15_000 : 60_000,
  });

export const useQueue = (slug: string | undefined) =>
  useQuery({
    queryKey: keys.queue(slug ?? ""),
    queryFn: ({ signal }) => api.get<QueueResponse>(`/v1/apps/${slug}/queue`, signal),
    enabled: !!slug,
  });

export const useBounties = (slug: string | undefined) =>
  useQuery({
    queryKey: keys.bounties(slug ?? ""),
    queryFn: ({ signal }) => api.get<Page<BountyDto>>(`/v1/apps/${slug}/bounties`, signal),
    enabled: !!slug,
  });

export const usePrs = (slug: string | undefined) =>
  useQuery({
    queryKey: keys.prs(slug ?? ""),
    queryFn: ({ signal }) => api.get<PrsResponse>(`/v1/apps/${slug}/prs`, signal),
    enabled: !!slug,
  });

export const useTopHolders = (slug: string | undefined) =>
  useQuery({
    queryKey: keys.holders(slug ?? ""),
    queryFn: ({ signal }) => api.get<{ items: TopHolder[] }>(`/v1/apps/${slug}/holders/top`, signal),
    enabled: !!slug,
    refetchInterval: 60_000,
  });

export const useShip = (authed: boolean) =>
  useQuery({
    queryKey: [...keys.ship, authed],
    queryFn: ({ signal }) => api.get<ShipInfo>("/v1/ship", signal),
    refetchInterval: 30_000,
  });

export const useProposals = () =>
  useQuery({
    queryKey: keys.proposals,
    queryFn: ({ signal }) => api.get<ProposalsResponse>("/v1/proposals", signal),
    refetchInterval: 30_000,
  });

export const useMe = (authed: boolean) =>
  useQuery({
    queryKey: keys.me,
    queryFn: ({ signal }) => api.get<Me>("/v1/me", signal),
    enabled: authed,
    staleTime: 60_000,
    retry: false,
  });

export const useClaimFees = () =>
  useMutation({ mutationFn: () => api.post<{ claimedUsd: number; lamports: number; payoutTx: string }>("/v1/me/claim", {}) });

export const useWithdraw = () =>
  useMutation({
    mutationFn: (body: { asset: "SOL" | "USDC"; to: string; amount: number }) =>
      api.post<{ signature: string; asset: string; amount: number }>("/v1/me/withdraw", body),
  });

export const useLauncherDashboard = (authed: boolean) =>
  useQuery({
    queryKey: keys.launcher,
    queryFn: ({ signal }) => api.get<LauncherDashboard>("/v1/me/launcher", signal),
    enabled: authed,
    refetchInterval: 30_000,
  });

export const useHolderDashboard = (authed: boolean) =>
  useQuery({
    queryKey: keys.holder,
    queryFn: ({ signal }) => api.get<HolderDashboard>("/v1/me/holder", signal),
    enabled: authed,
    refetchInterval: 30_000,
  });

const LAUNCH_TERMINAL: Record<string, true> = { LIVE: true, DORMANT: true, FAILED: true, KILLED: true };
const LAUNCH_WAITING: Record<string, true> = { DRAFT: true, LAUNCHING: true };

export const useLaunch = (id: string | null) =>
  useQuery({
    queryKey: keys.launch(id ?? ""),
    queryFn: ({ signal }) => api.get<LaunchDto>(`/v1/launches/${id}`, signal),
    enabled: !!id,
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      return !s || LAUNCH_WAITING[s] ? 2000 : LAUNCH_TERMINAL[s] ? false : 10_000;
    },
  });

export const useAdminOps = (enabled: boolean) =>
  useQuery({
    queryKey: keys.adminOps,
    queryFn: ({ signal }) => api.get<AdminOps>("/v1/admin/ops", signal),
    enabled,
    refetchInterval: 10_000,
  });

export const useAdminJobs = (status: string, enabled: boolean) =>
  useQuery({
    queryKey: keys.adminJobs(status),
    queryFn: ({ signal }) => api.get<{ items: AdminJob[] }>(`/v1/admin/jobs${qs({ status })}`, signal),
    enabled,
    refetchInterval: 10_000,
  });

/** Privileged-action log, newest first, id-cursor paginated. */
export const useAdminAudit = (enabled: boolean) =>
  useInfiniteQuery({
    queryKey: keys.adminAudit,
    queryFn: ({ pageParam, signal }) => api.get<Page<AuditPageEntry>>(`/v1/admin/audit${qs({ cursor: pageParam, limit: 50 })}`, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled,
  });

/* ─────────── mutations ─────────── */

export const useCreateLaunch = () =>
  useMutation({ mutationFn: (body: CreateLaunchBody) => api.post<LaunchDto>("/v1/launches", body) });

export const useApproveSpec = (id: string) =>
  useMutation({
    mutationFn: (spec: AppSpec) => api.post<{ payTo: string; lamports: number }>(`/v1/launches/${id}/approve`, { spec }),
  });

export const useConfirmStake = (id: string) =>
  useMutation({ mutationFn: () => api.post<LaunchDto>(`/v1/launches/${id}/stake`, {}) });

export const useSubmitQueue = (slug: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (text: string) => api.post<QueueItemDto>(`/v1/apps/${slug}/queue`, { text }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.queue(slug) }),
  });
};

export const useVote = (slug: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => api.post<QueueItemDto>(`/v1/queue/${itemId}/vote`),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.queue(slug) }),
  });
};

export const useCreateBounty = (slug: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { title: string; description: string; sol: number }) =>
      api.post<BountyDto>(`/v1/apps/${slug}/bounties`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.bounties(slug) }),
  });
};

export const useClaimBounty = (slug: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { bountyId: string; prNumber: number }) =>
      api.post<BountyDto>(`/v1/bounties/${p.bountyId}/claim`, { prNumber: p.prNumber }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.bounties(slug) }),
  });
};

export const useMaintainerVote = (slug: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (candidateWallet: string) =>
      api.post<{ candidateWallet: string; weight: number; elected: boolean }>(`/v1/apps/${slug}/maintainer-vote`, {
        candidateWallet,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.prs(slug) }),
  });
};

export const useTopup = (slug: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sol: number) => api.post<{ budgetUsd: number; status: string }>(`/v1/apps/${slug}/topup`, { sol }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.app(slug) }),
  });
};

export const useFork = (slug: string) =>
  useMutation({
    mutationFn: (body: Omit<CreateLaunchBody, "prompt"> & { prompt?: string }) => api.post<LaunchDto>(`/v1/apps/${slug}/fork`, body),
  });

export const useShipStake = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { appId: string; amount: number }) => api.post<ShipStakeDto>("/v1/ship/stake", p),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.ship }),
  });
};

export const useShipUnstake = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (stakeId: string) => api.post<ShipStakeDto>("/v1/ship/unstake", { stakeId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.ship }),
  });
};

export const useClaimStakerRewards = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ claimedUsd: number; lamports: number; payoutTx: string }>("/v1/ship/claim", {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.ship });
      void qc.invalidateQueries({ queryKey: keys.me });
    },
  });
};

export const useReport = () =>
  useMutation({
    mutationFn: (p: { slug: string; reporter: string; kind: "ABUSE" | "DMCA" | "IMPERSONATION" | "OTHER"; details: string }) =>
      api.post<{ id: string }>("/v1/reports", p),
  });

export const useAdminAction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { path: string; body?: unknown }) => api.post<unknown>(p.path, p.body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin"] }),
  });
};

export const useSubmitProposal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { title: string; body: string }) => api.post<Proposal>("/v1/proposals", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.proposals }),
  });
};

export const useVoteProposal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<{ ok: boolean; weight: string }>(`/v1/proposals/${id}/vote`),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.proposals }),
  });
};

export const useUnvoteProposal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<{ ok: boolean }>(`/v1/proposals/${id}/vote`),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.proposals }),
  });
};

export const useSetProposalStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { id: string; status: ProposalStatus; note?: string }) =>
      api.post<{ ok: boolean; status: ProposalStatus }>(`/v1/proposals/${p.id}/status`, {
        status: p.status,
        ...(p.note !== undefined ? { note: p.note } : {}),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.proposals }),
  });
};
