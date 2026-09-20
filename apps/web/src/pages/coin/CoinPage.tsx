import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import type { BuildEvent, CandleRes } from "../../api/types.js";
import { keys, useApp, useCandles } from "../../api/queries.js";
import { isHttpError } from "../../api/client.js";
import { Chart } from "../../components/Chart.js";
import { EmptyState } from "../../components/EmptyState.js";
import { Feed } from "../../components/Feed.js";
import { Skeleton } from "../../components/Skeleton.js";
import { Tabs } from "../../components/Tabs.js";
import { pumpCoinUrl } from "../../env.js";
import { BudgetPanel } from "./BudgetPanel.js";
import { CoinHeader } from "./CoinHeader.js";
import { JobPanel } from "./JobPanel.js";
import { LedgerTab } from "./LedgerTab.js";
import { MetricsTab } from "./MetricsTab.js";
import { MetricStrip } from "./MetricStrip.js";
import { MoneyBlock } from "./MoneyBlock.js";
import { QueueSection } from "./QueueSection.js";
import { BountiesSection } from "./BountiesSection.js";
import { PrsSection } from "./PrsSection.js";
import { SpecTab } from "./SpecTab.js";
import { HolderTierTab } from "./HolderTierTab.js";
import { TopupModal } from "./TopupModal.js";
import { ReportModal } from "./ReportModal.js";

const TABS = ["ledger", "metrics", "governance", "spec", "holders"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = {
  ledger: "Ledger",
  metrics: "Metrics",
  governance: "Governance",
  spec: "Spec",
  holders: "Holder tier",
};
const TAB_OF: Record<string, Tab> = { ledger: "ledger", metrics: "metrics", governance: "governance", spec: "spec", holders: "holders" };

/** Events that change app-level numbers → refetch the app + ledger. */
const REFRESH_ON: Record<string, true> = {
  DEPLOY: true,
  JOB_FINISHED: true,
  JOB_FAILED: true,
  JOB_STARTED: true,
  BUDGET: true,
  MILESTONE: true,
  REVIVED: true,
  DORMANT: true,
  PR_MERGED: true,
  BOUNTY_CLAIMED: true,
};

export const CoinPage = () => {
  const { slug = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const tab: Tab = TAB_OF[params.get("tab") ?? ""] ?? "ledger";
  const [res, setRes] = useState<CandleRes>("15m");
  const [topup, setTopup] = useState(false);
  const [report, setReport] = useState(false);
  const app = useApp(slug);
  const candles = useCandles(slug, res);
  const qc = useQueryClient();

  useEffect(() => {
    if (app.data) document.title = `$${app.data.ticker} · ${app.data.name} — Berth`;
  }, [app.data]);

  const onEvent = useCallback(
    (e: BuildEvent) => {
      if (!REFRESH_ON[e.type]) return;
      void qc.invalidateQueries({ queryKey: keys.app(slug) });
      void qc.invalidateQueries({ queryKey: keys.ledger(slug) });
      if (e.type === "PR_MERGED" || e.type === "BOUNTY_CLAIMED") {
        void qc.invalidateQueries({ queryKey: keys.prs(slug) });
        void qc.invalidateQueries({ queryKey: keys.bounties(slug) });
        void qc.invalidateQueries({ queryKey: keys.queue(slug) });
      }
      if (e.type === "JOB_FINISHED") void qc.invalidateQueries({ queryKey: keys.queue(slug) });
    },
    [qc, slug],
  );

  const selectTab = useCallback(
    (t: Tab) => {
      const next = new URLSearchParams(params);
      if (t === "ledger") next.delete("tab");
      else next.set("tab", t);
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  if (app.isPending) return <CoinSkeleton />;

  if (app.isError) {
    const missing = isHttpError(app.error) && app.error.status === 404;
    return (
      <EmptyState
        className="mx-auto mt-12 max-w-lg"
        title={missing ? "No coin at this address" : "Could not load this coin"}
        body={
          missing
            ? `Nothing on Berth uses the ticker or slug "${slug}". It may have been delisted, or the link is mistyped.`
            : app.error.message
        }
        action={
          <Link to="/" className="btn btn-primary">
            Back to the leaderboard
          </Link>
        }
      />
    );
  }

  const a = app.data;
  const pump = a.pumpUrl ?? (a.mint ? pumpCoinUrl(a.mint) : null);
  const traded = a.status === "LIVE" || a.status === "DORMANT" || a.status === "KILLED";

  return (
    <div className="flex min-w-0 flex-col gap-12 pb-16">
      <CoinHeader app={a} onReport={() => setReport(true)} onTopup={() => setTopup(true)} />

      {/* Movement one: the money. The raised block and the market numbers it is
          measured against read as a single object, so they sit tight together. */}
      <div className="flex min-w-0 flex-col gap-4">
        <MoneyBlock app={a} onVerify={() => selectTab("ledger")} />
        <MetricStrip app={a} traded={traded} />
      </div>

      <section aria-labelledby="built-h" className="flex min-w-0 flex-col gap-5">
        <div className="flex flex-col gap-1 border-b border-line pb-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8">
          <h2 id="built-h" className="h2">
            Is it being built?
          </h2>
          <p className="small max-w-md text-fg-2 sm:text-right">
            Trading fees land in the budget. When the budget clears the gate the agent takes a job, and every step it
            takes shows up in the feed.
          </p>
        </div>

        <div className="grid gap-x-8 gap-y-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-7">
            {traded ? (
              <Chart
                candles={candles.data ?? []}
                res={res}
                onResChange={setRes}
                loading={candles.isPending}
                priceUsd={a.priceUsd}
                ticker={a.ticker}
                tradeUrl={pump}
                height={400}
              />
            ) : (
              <section aria-label="Market status" className="min-w-0 border-y border-line py-10">
                <h3 className="h3">No market yet</h3>
                <p className="body mt-1.5 max-w-md text-fg-2">
                  ${a.ticker} is minted on pump.fun when the launch completes. There is nothing to trade until then.
                  The spec is what the fees will pay to build, and the only thing worth reading here yet.
                </p>
                <button type="button" className="btn btn-ghost mt-3" onClick={() => selectTab("spec")}>
                  Read the spec
                </button>
              </section>
            )}

            <BudgetPanel app={a} onTopup={() => setTopup(true)} />
          </div>

          <div className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-4 lg:self-start">
            <JobPanel app={a} />
            <Feed slug={slug} className="h-[440px] lg:h-[600px]" onEvent={onEvent} />
          </div>
        </div>
      </section>

      <section aria-labelledby="verify-h" className="flex min-w-0 flex-col gap-5">
        <div className="flex flex-col gap-1 border-b border-line pb-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8">
          <h2 id="verify-h" className="h2">
            Can I verify it?
          </h2>
          <p className="small max-w-md text-fg-2 sm:text-right">
            Every payment, swap, burn and attestation hash, plus the spec the agent was told to build.
          </p>
        </div>

        <Tabs
          items={TABS.map((t) => ({ id: t, label: TAB_LABEL[t] }))}
          active={tab}
          onChange={selectTab}
          ariaLabel="Coin detail sections"
        />

        {tab === "ledger" && <LedgerTab app={a} />}
        {tab === "metrics" && <MetricsTab app={a} />}
        {tab === "governance" && (
          <div className="flex min-w-0 flex-col gap-10">
            <QueueSection slug={slug} ticker={a.ticker} />
            <BountiesSection app={a} />
            <PrsSection app={a} />
          </div>
        )}
        {tab === "spec" && <SpecTab app={a} />}
        {tab === "holders" && <HolderTierTab app={a} buyUrl={pump} />}
      </section>

      <TopupModal app={a} open={topup} onClose={() => setTopup(false)} />
      <ReportModal slug={slug} open={report} onClose={() => setReport(false)} />
    </div>
  );
};

/**
 * Heights here are not decorative: they are the measured heights of the real
 * regions at each breakpoint (header 210/158/82, money 462/410/252, metrics
 * 220/117/66 at 390/768/1440), so the content lands in space that already
 * exists instead of shoving the page down when the request resolves. Gaps match
 * the loaded layout for the same reason.
 */
const CoinSkeleton = () => (
  <div className="flex min-w-0 flex-col gap-12 pb-16" aria-busy="true" aria-label="Loading coin">
    <div className="flex h-[13.1rem] flex-wrap items-start gap-4 overflow-hidden sm:h-[9.9rem] lg:h-[5.1rem]">
      <Skeleton className="size-14 sm:size-16" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-72 max-w-full" />
        <Skeleton className="h-3 w-40" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
    <div className="flex min-w-0 flex-col gap-4">
      <Skeleton className="h-[28.9rem] w-full sm:h-[25.6rem] lg:h-[15.75rem]" />
      <Skeleton className="h-[13.75rem] w-full sm:h-[7.3rem] lg:h-[4.1rem]" />
    </div>
    <div className="grid gap-x-8 gap-y-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-7">
        <Skeleton className="h-[372px] w-full lg:h-[460px]" />
        <Skeleton className="h-56 w-full" />
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-[74px] w-full" />
        <Skeleton className="h-[440px] w-full lg:h-[600px]" />
      </div>
    </div>
  </div>
);
