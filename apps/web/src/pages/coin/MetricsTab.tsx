import { useMemo } from "react";
import type { AppDetail } from "../../api/types.js";
import { useLedger, useTopHolders } from "../../api/queries.js";
import { InfoTip } from "../../components/InfoTip.js";
import { Money } from "../../components/Money.js";
import { Skeleton } from "../../components/Skeleton.js";
import { Sparkline } from "../../components/Sparkline.js";
import { Stat } from "../../components/Stat.js";
import { TxLink } from "../../components/TxLink.js";
import { formatDate, formatNum, formatPct, formatRatio, formatSol } from "../../lib/format.js";

const P_REV_TIP = "Market cap ÷ annualized revenue. The multiple you are paying for a dollar of the app's earnings.";

export const MetricsTab = ({ app }: { app: AppDetail }) => {
  const ledger = useLedger(app.slug);
  const holders = useTopHolders(app.slug);

  const curve = useMemo(() => {
    const events = (ledger.data?.buybacks ?? []).flatMap((b) => b.revenueEvents);
    if (events.length === 0) return [];
    events.sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));
    let total = 0;
    return events.map((e) => (total += e.usd));
  }, [ledger.data]);

  return (
    <div className="flex min-w-0 flex-col gap-9">
      <div className="grid grid-cols-2 gap-x-8 gap-y-6 border-b border-line pb-6 sm:grid-cols-3 lg:grid-cols-5">
        <Stat
          label="revenue"
          value={<Money usd={app.revenueUsd} exact />}
          tone="rev"
          size="lg"
          sub={app.firstRevenueAt ? `first dollar ${formatDate(app.firstRevenueAt)}` : "no revenue yet"}
        />
        <Stat label="users" value={<span className="num">{formatNum(app.users)}</span>} size="lg" sub="unique, all-time" />
        <Stat
          label="uptime"
          value={<span className="num">{app.liveVersion > 0 ? formatPct(app.uptimeBps) : "—"}</span>}
          size="lg"
          tone={app.liveVersion > 0 && app.uptimeBps < 9900 ? "warn" : "plain"}
          sub={app.liveVersion > 0 ? (app.healthy ? "healthcheck ok" : "healthcheck failing") : "not deployed"}
        />
        <Stat label="build spend" value={<Money usd={app.spentUsd} exact />} size="lg" sub="paid to the agent, lifetime" />
        <Stat
          label="budget remaining"
          value={<Money usd={app.budgetUsd} exact />}
          tone={app.budgetUsd > 0 ? "rev" : "plain"}
          size="lg"
          sub={app.budgetUsd > 0 ? "funds the next job" : "dormant until refunded"}
        />
        <Stat
          label="fees collected"
          value={<span className="num">{formatSol(app.feesSol)}</span>}
          size="lg"
          sub="creator fees from trading"
        />
        <Stat
          label="versions shipped"
          value={<span className="num">v{app.liveVersion}</span>}
          size="lg"
          sub={app.firstBuildAt ? `first build ${formatDate(app.firstBuildAt)}` : "not built yet"}
        />
        <Stat
          label="first deploy"
          value={<span className="num text-base">{formatDate(app.mvpLiveAt)}</span>}
          size="lg"
          sub={app.mvpLiveAt ? "mvp went live" : "pending"}
        />
        <Stat
          label={
            <span className="inline-flex items-center gap-1">
              price / revenue
              <InfoTip text={P_REV_TIP} />
            </span>
          }
          value={<span className="num">{formatRatio(app.priceToRevenue)}</span>}
          size="lg"
          sub={
            <>
              <Money usd={app.marketCapUsd} className="text-fg-2" /> market cap
            </>
          }
        />
      </div>

      <div className="grid gap-x-10 gap-y-9 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section className="min-w-0">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line pb-2.5">
            <h3 className="h3">Cumulative revenue</h3>
            <p className="small text-fg-2">every attested payment, in the order it arrived</p>
          </div>
          {ledger.isPending ? (
            <Skeleton className="mt-4 h-28 w-full" />
          ) : curve.length > 1 ? (
            <>
              <Sparkline points={curve} tone="rev" width={600} height={110} className="mt-4 h-28 w-full" />
              <div className="mt-2 flex items-baseline justify-between text-xs text-fg-2">
                <span className="num">{curve.length} payments</span>
                <span className="num">
                  <Money usd={curve[curve.length - 1] ?? 0} tone="rev" exact /> settled into buybacks
                </span>
              </div>
            </>
          ) : (
            <p className="small mt-4 text-fg-2">
              {curve.length === 1
                ? "One payment so far. The curve needs a second one to have a shape."
                : "No settled revenue events yet."}
            </p>
          )}
          {app.milestones.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5 border-t border-line pt-3">
              {app.milestones.map((m) => (
                <span key={m} className="chip text-rev border-rev/40">
                  {m.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          )}
        </section>

        <section className="min-w-0 lg:border-l lg:border-line lg:pl-10">
          <h3 className="h3 border-b border-line pb-2.5">Market and identity</h3>
          <dl className="text-sm">
            <div className="flex items-baseline justify-between gap-3 border-b border-line/50 py-2">
              <dt className="small text-fg-2">stage</dt>
              <dd className="num text-xs">{app.curveStage === "GRADUATED" ? "graduated · pumpswap" : "bonding curve"}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 border-b border-line/50 py-2">
              <dt className="small text-fg-2">24h volume</dt>
              <dd>
                <Money usd={app.volume24hUsd} />
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 border-b border-line/50 py-2">
              <dt className="small text-fg-2">liquidity</dt>
              <dd>
                <Money usd={app.liquidityUsd} />
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 border-b border-line/50 py-2">
              <dt className="small text-fg-2">sol spent on buybacks</dt>
              <dd className="num">{formatSol(app.buybackSol)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 border-b border-line/50 py-2">
              <dt className="small text-fg-2">tokens burned</dt>
              <dd className="num text-burn">{app.burnedTokens > 0 ? formatNum(app.burnedTokens) : "—"}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 border-b border-line/50 py-2">
              <dt className="small text-fg-2">mint</dt>
              <dd>
                <TxLink address={app.mint} />
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 border-b border-line/50 py-2">
              <dt className="small text-fg-2">creator wallet</dt>
              <dd>
                <TxLink address={app.creatorWallet} />
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 py-2">
              <dt className="small text-fg-2">launch tx</dt>
              <dd>
                <TxLink sig={app.launchTx} />
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="min-w-0">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line pb-2.5">
          <h3 className="h3">Top holders</h3>
          <p className="small text-fg-2">on-chain snapshot, refreshed with the market data</p>
        </div>
        {holders.isPending ? (
          <div className="flex flex-col gap-2 pt-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        ) : holders.data?.items.length ? (
          <ul>
            {holders.data.items.slice(0, 10).map((h, i) => (
              <li key={h.wallet} className="flex items-baseline gap-3 border-b border-line/50 py-2 text-sm">
                <span className="num w-5 shrink-0 text-fg-2">{i + 1}</span>
                <TxLink address={h.wallet} />
                <span className="num ml-auto text-fg-2">{formatNum(h.amount)}</span>
                <span className="num w-16 shrink-0 text-right">{h.pct.toFixed(2)}%</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="small pt-3 text-fg-2">
            No holder snapshot yet. It is taken once the coin's first trades are indexed.
          </p>
        )}
      </section>
    </div>
  );
};
