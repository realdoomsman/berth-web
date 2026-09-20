import { Link } from "react-router-dom";
import { FEE_SPLIT_BPS, REVENUE_SPLIT_BPS } from "@ship/shared";
import { useLauncherDashboard } from "../../api/queries.js";
import type { LauncherDashboard as Dashboard, Me } from "../../api/types.js";
import { Money } from "../../components/Money.js";
import { Monogram } from "../../components/Monogram.js";
import { Section } from "../../components/Section.js";
import { Skeleton } from "../../components/Skeleton.js";
import { StatusBadge } from "../../components/StatusBadge.js";
import { EmptyState } from "../../components/EmptyState.js";
import { TxLink } from "../../components/TxLink.js";
import { formatNum, formatPct, formatSol, timeAgo } from "../../lib/format.js";

type Row = Dashboard["apps"][number];

const RESUMABLE: Record<string, true> = { DRAFT: true, SPEC_READY: true, AWAITING_STAKE: true, LAUNCHING: true };

/* No `font-semibold`: Silkscreen ships 400 and 700 only, so a 600 request makes
   the browser synthesise bold by smearing the bitmap. The pixel label is already
   the loudest thing in a table header. */
const HEAD = "label py-2 pr-3";
const CELL = "py-2.5 pr-3";

const Health = ({ app }: { app: Row }) => (
  <span className={`num ${app.healthy ? "text-rev" : "text-burn"}`}>
    {app.healthy ? "ok" : "down"} <span className="text-fg-3">{formatPct(app.uptimeBps)}</span>
  </span>
);

const Stake = ({ app }: { app: Row }) => {
  if (app.stakeSol <= 0) return <span className="text-fg-3">—</span>;
  if (app.stakeRefundedAt)
    return (
      <span className="text-rev">
        refunded <TxLink sig={app.stakeRefundTx} />
      </span>
    );
  return <span className="num text-fg-2">{formatSol(app.stakeSol)} held</span>;
};

const AppLink = ({ app }: { app: Row }) => {
  const resume = RESUMABLE[app.status] === true;
  // Only minted coins have a live coin page; pre-mint/failed apps route back to the launch wizard.
  const minted = app.status === "LIVE" || app.status === "DORMANT" || app.status === "KILLED";
  return (
    <Link to={minted ? `/c/${app.slug}` : `/launch?id=${app.id}`} className="flex min-w-0 items-center gap-2.5 hover:text-rev">
      <Monogram ticker={app.ticker} src={app.imageUrl} size={28} />
      <span className="min-w-0">
        <span className="block truncate font-semibold">{app.name}</span>
        <span className="num text-xs text-fg-3">${app.ticker}</span>
      </span>
      {resume && <span className="num shrink-0 text-xs text-warn">resume</span>}
    </Link>
  );
};

export const LauncherDashboard = ({ me }: { me: Me | undefined }) => {
  const q = useLauncherDashboard(true);

  if (q.isPending) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }
  if (q.isError)
    return (
      <div role="alert" className="border-l-2 border-burn py-1 pl-3 text-sm text-burn">
        {q.error.message}
      </div>
    );

  const { apps, totals } = q.data;

  return (
    <div className="flex flex-col gap-8">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-b border-line pb-6 sm:grid-cols-4">
        <div>
          <dt className="label">apps launched</dt>
          <dd className="figure figure-lg mt-1.5">{totals.apps}</dd>
          <dd className="micro mt-1 text-fg-3">{totals.live} live</dd>
        </div>
        <div>
          <dt className="label">fee share paid to you</dt>
          <dd className="mt-1.5">
            <Money usd={totals.feeShareUsd} tone="rev" size="lg" exact />
          </dd>
          <dd className="micro mt-1 text-fg-3">
            <span className="num">{formatPct(FEE_SPLIT_BPS.LAUNCHER)}</span> of creator fees
          </dd>
        </div>
        <div>
          <dt className="label">revenue your apps made</dt>
          <dd className="mt-1.5">
            <Money usd={totals.revenueUsd} size="lg" />
          </dd>
          <dd className="micro mt-1 text-fg-3">
            <span className="num">{formatPct(REVENUE_SPLIT_BPS.BUYBACK_BURN)}</span> of it burns your coins
          </dd>
        </div>
        <div>
          <dt className="label">reputation</dt>
          <dd className="figure figure-lg mt-1.5">{me ? me.reputation : "—"}</dd>
          <dd className="micro mt-1 text-fg-3">
            {me ? `${me.reputationTier.toLowerCase()} · ${me.launchesToday}/${me.launchesPerDay} launches today` : "—"}
          </dd>
        </div>
      </dl>

      <Section
        title="Your apps"
        right={
          apps.length > 0 ? (
            <span className="num text-xs text-fg-3">
              {totals.apps} total · {totals.live} live
            </span>
          ) : undefined
        }
      >
        {apps.length === 0 ? (
          <EmptyState
            title="You haven't launched anything yet"
            body="A launch needs a prompt, a ticker, and a refundable 0.05 SOL stake."
            action={
              <Link to="/launch" className="btn btn-primary">
                Launch a coin
              </Link>
            }
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left">
                    <th className={HEAD}>app</th>
                    <th className={HEAD}>status</th>
                    <th className={`${HEAD} text-right`}>revenue</th>
                    <th className={`${HEAD} text-right`}>fee share</th>
                    <th className={`${HEAD} text-right`}>budget</th>
                    <th className={`${HEAD} text-right`}>spent</th>
                    <th className={`${HEAD} text-right`}>users</th>
                    <th className={`${HEAD} text-right`}>health</th>
                    <th className={HEAD}>stake</th>
                    <th className={`${HEAD} pr-0 text-right`}>last event</th>
                  </tr>
                </thead>
                <tbody>
                  {apps.map((a) => (
                    <tr key={a.id} className="border-b border-line transition-colors hover:bg-bg-2/50">
                      <td className={CELL}>
                        <AppLink app={a} />
                      </td>
                      <td className={CELL}>
                        <StatusBadge status={a.status} runningStage={a.runningJob?.stage ?? null} />
                      </td>
                      <td className={`${CELL} text-right`}>
                        <Money usd={a.revenueUsd} tone="rev" />
                      </td>
                      <td className={`${CELL} text-right`}>
                        <Money usd={a.feeShareUsd} tone="rev" exact />
                      </td>
                      <td className={`${CELL} text-right`}>
                        <Money usd={a.budgetUsd} />
                      </td>
                      <td className={`${CELL} text-right`}>
                        <Money usd={a.spentUsd} className="text-fg-2" />
                      </td>
                      <td className={`${CELL} num text-right text-fg-2`}>{formatNum(a.users)}</td>
                      <td className={`${CELL} text-right text-xs`}>
                        <Health app={a} />
                      </td>
                      <td className={`${CELL} text-xs`}>
                        <Stake app={a} />
                      </td>
                      <td className={`${CELL} num pr-0 text-right text-xs text-fg-3`}>{timeAgo(a.lastEvent?.createdAt ?? a.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="flex flex-col lg:hidden">
              {apps.map((a) => (
                <li key={a.id} className="border-b border-line py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <AppLink app={a} />
                    <StatusBadge status={a.status} runningStage={a.runningJob?.stage ?? null} />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5 text-sm">
                    <div>
                      <dt className="label">revenue</dt>
                      <dd>
                        <Money usd={a.revenueUsd} tone="rev" />
                      </dd>
                    </div>
                    <div className="text-right">
                      <dt className="label">fee share</dt>
                      <dd>
                        <Money usd={a.feeShareUsd} tone="rev" exact />
                      </dd>
                    </div>
                    <div>
                      <dt className="label">budget / spent</dt>
                      <dd className="num">
                        <Money usd={a.budgetUsd} /> <span className="text-fg-3">/</span>{" "}
                        <Money usd={a.spentUsd} className="text-fg-2" />
                      </dd>
                    </div>
                    <div className="text-right">
                      <dt className="label">users · health</dt>
                      <dd className="text-xs">
                        <span className="num">{formatNum(a.users)}</span> <span className="text-fg-3">·</span> <Health app={a} />
                      </dd>
                    </div>
                    <div>
                      <dt className="label">stake</dt>
                      <dd className="text-xs">
                        <Stake app={a} />
                      </dd>
                    </div>
                    <div className="text-right">
                      <dt className="label">last event</dt>
                      <dd className="num text-xs text-fg-3">{timeAgo(a.lastEvent?.createdAt ?? a.createdAt)}</dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          </>
        )}
      </Section>
    </div>
  );
};
