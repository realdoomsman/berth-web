import { Link } from "react-router-dom";
import { PROMPT_QUEUE_MIN_HOLD_BPS, PUMP_TOTAL_SUPPLY } from "@ship/shared";
import { useHolderDashboard } from "../../api/queries.js";
import { EmptyState } from "../../components/EmptyState.js";
import { InfoTip } from "../../components/InfoTip.js";
import { Money } from "../../components/Money.js";
import { Monogram } from "../../components/Monogram.js";
import { Section } from "../../components/Section.js";
import { Skeleton } from "../../components/Skeleton.js";
import { StatusBadge } from "../../components/StatusBadge.js";
import { TxLink } from "../../components/TxLink.js";
import { formatNum, formatSol, timeAgo } from "../../lib/format.js";

/** Governance floor: hold ≥0.1% of supply to submit prompt-queue tasks and vote on an app. */
const TIER_MIN_TOKENS = (Number(PUMP_TOTAL_SUPPLY) * PROMPT_QUEUE_MIN_HOLD_BPS) / 10_000;
const TIER_TIP = `Hold at least ${formatNum(TIER_MIN_TOKENS)} tokens (0.1% of supply) to submit tasks to an app's build queue and vote on them.`;

const HEAD = "label py-2 pr-3";
const CELL = "py-2.5 pr-3";

export const HolderDashboard = () => {
  const q = useHolderDashboard(true);

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

  const d = q.data;
  const votesByApp = new Map<string, number>();
  for (const v of d.votes) votesByApp.set(v.appSlug, (votesByApp.get(v.appSlug) ?? 0) + 1);
  const contribByApp = new Map<string, { mergedPrs: number; earnedUsd: number }>();
  for (const c of d.contributions) contribByApp.set(c.appSlug, { mergedPrs: c.mergedPrs, earnedUsd: c.earnedUsd });

  return (
    <div className="flex flex-col gap-8">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-b border-line pb-6 sm:grid-cols-4">
        <div>
          <dt className="label">positions</dt>
          <dd className="figure figure-lg mt-1.5">{d.positions.length}</dd>
          <dd className="micro mt-1 text-fg-3">coins held</dd>
        </div>
        <div>
          <dt className="label">total value</dt>
          <dd className="mt-1.5">
            <Money usd={d.totals.valueUsd} size="lg" />
          </dd>
          <dd className="micro mt-1 text-fg-3">at the last price snapshot</dd>
        </div>
        <div>
          <dt className="label">votes cast</dt>
          <dd className="figure figure-lg mt-1.5">{d.votes.length}</dd>
          <dd className="micro mt-1 text-fg-3">on prompt-queue tasks</dd>
        </div>
        <div>
          <dt className="label">buybacks against your bags</dt>
          <dd className="mt-1.5">
            <Money usd={d.totals.buybackShareUsd} tone="rev" size="lg" exact />
          </dd>
          <dd className="micro mt-1 text-fg-3">burned, not paid out</dd>
        </div>
      </dl>

      <Section
        title="Positions"
        right={
          d.positions.length > 0 ? <span className="micro text-fg-3">price snapshots refresh every few minutes</span> : undefined
        }
      >
        {d.positions.length === 0 ? (
          <EmptyState
            title="No Berth coins in this wallet"
            body="Buy any coin on the leaderboard and its app's revenue starts burning supply you own."
            action={
              <Link to="/" className="btn btn-primary">
                Browse the leaderboard
              </Link>
            }
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left">
                    <th className={HEAD}>coin</th>
                    <th className={`${HEAD} text-right`}>balance</th>
                    <th className={`${HEAD} text-right`}>% supply</th>
                    <th className={`${HEAD} text-right`}>value</th>
                    <th className={`${HEAD} text-right`}>buyback share</th>
                    <th className={`${HEAD} text-right`}>burned share</th>
                    <th className={`${HEAD} pl-5`}>
                      holder tier <InfoTip text={TIER_TIP} />
                    </th>
                    <th className={`${HEAD} text-right`}>votes</th>
                    <th className={`${HEAD} pr-0 text-right`}>contributions</th>
                  </tr>
                </thead>
                <tbody>
                  {d.positions.map((p) => {
                    const clears = p.balance >= TIER_MIN_TOKENS;
                    const contrib = contribByApp.get(p.app.slug);
                    return (
                      <tr key={p.app.id} className="border-b border-line transition-colors hover:bg-bg-2/50">
                        <td className={CELL}>
                          <Link to={`/c/${p.app.slug}`} className="flex min-w-0 items-center gap-2.5 hover:text-rev">
                            <Monogram ticker={p.app.ticker} src={p.app.imageUrl} size={28} />
                            <span className="min-w-0">
                              <span className="block truncate font-semibold">{p.app.name}</span>
                              <span className="num text-xs text-fg-3">${p.app.ticker}</span>
                            </span>
                            <StatusBadge status={p.app.status} runningStage={p.app.runningJob?.stage ?? null} className="ml-1 shrink-0" />
                          </Link>
                        </td>
                        <td className={`${CELL} num text-right`}>{formatNum(p.balance)}</td>
                        <td className={`${CELL} num text-right text-fg-2`}>{p.pctSupply.toFixed(3)}%</td>
                        <td className={`${CELL} text-right`}>
                          <Money usd={p.valueUsd} />
                        </td>
                        <td className={`${CELL} text-right`}>
                          <Money usd={p.buybackShareUsd} tone="rev" exact />
                        </td>
                        <td className={`${CELL} num text-right text-burn`}>{formatNum(p.burnedShare)}</td>
                        <td className={`${CELL} pl-5 text-xs`}>
                          {clears ? (
                            <span className="num text-rev">can queue &amp; vote</span>
                          ) : (
                            <span className="num text-fg-3">{formatNum(Math.max(0, TIER_MIN_TOKENS - p.balance))} short</span>
                          )}
                        </td>
                        <td className={`${CELL} num text-right`}>{votesByApp.get(p.app.slug) ?? 0}</td>
                        <td className={`${CELL} pr-0 text-right text-xs`}>
                          {contrib ? (
                            <span className="num">
                              {contrib.mergedPrs} PR{contrib.mergedPrs === 1 ? "" : "s"} · <Money usd={contrib.earnedUsd} tone="rev" exact />
                            </span>
                          ) : (
                            <span className="text-fg-3">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className="flex flex-col lg:hidden">
              {d.positions.map((p) => {
                const clears = p.balance >= TIER_MIN_TOKENS;
                const contrib = contribByApp.get(p.app.slug);
                return (
                  <li key={p.app.id} className="border-b border-line py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <Link to={`/c/${p.app.slug}`} className="flex min-w-0 items-center gap-2.5">
                        <Monogram ticker={p.app.ticker} src={p.app.imageUrl} size={28} />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">{p.app.name}</span>
                          <span className="num text-xs text-fg-3">${p.app.ticker}</span>
                        </span>
                      </Link>
                      <StatusBadge status={p.app.status} runningStage={p.app.runningJob?.stage ?? null} />
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5 text-sm">
                      <div>
                        <dt className="label">balance</dt>
                        <dd className="num">
                          {formatNum(p.balance)} <span className="text-fg-3">· {p.pctSupply.toFixed(3)}%</span>
                        </dd>
                      </div>
                      <div className="text-right">
                        <dt className="label">value</dt>
                        <dd>
                          <Money usd={p.valueUsd} />
                        </dd>
                      </div>
                      <div>
                        <dt className="label">buyback share</dt>
                        <dd>
                          <Money usd={p.buybackShareUsd} tone="rev" exact />
                        </dd>
                      </div>
                      <div className="text-right">
                        <dt className="label">burned share</dt>
                        <dd className="num text-burn">{formatNum(p.burnedShare)}</dd>
                      </div>
                      <div>
                        <dt className="label">holder tier</dt>
                        <dd className="text-xs">
                          {clears ? (
                            <span className="text-rev">can queue &amp; vote</span>
                          ) : (
                            <span className="num text-fg-3">{formatNum(Math.max(0, TIER_MIN_TOKENS - p.balance))} short</span>
                          )}
                        </dd>
                      </div>
                      <div className="text-right">
                        <dt className="label">votes · PRs</dt>
                        <dd className="num text-xs">
                          {votesByApp.get(p.app.slug) ?? 0} · {contrib?.mergedPrs ?? 0}
                        </dd>
                      </div>
                    </dl>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Section>

      <div className="grid gap-8 lg:grid-cols-2">
        <Section title="Votes" sub="Prompt-queue tasks you backed, weighted by bag.">
          {d.votes.length === 0 ? (
            <EmptyState compact title="No votes cast" body="Holding a coin lets you queue work for its agent and vote on what ships next." />
          ) : (
            <ul className="text-sm">
              {d.votes.map((v) => (
                <li key={v.id} className="flex flex-wrap gap-x-3 gap-y-1 border-b border-line py-2">
                  <Link to={`/c/${v.appSlug}?tab=governance`} className="num shrink-0 text-xs text-fg-2 hover:text-fg">
                    ${v.appTicker}
                  </Link>
                  <span className="min-w-0 flex-1 truncate">{v.text}</span>
                  <span className="num shrink-0 text-xs text-fg-3">
                    {formatNum(v.weight)} · {v.status.toLowerCase()} · {timeAgo(v.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Contributions and bounties" sub="Merged PRs and bounty work across app repos.">
          {d.contributions.length === 0 && d.bounties.length === 0 ? (
            <EmptyState
              compact
              title="No merged PRs or bounties yet"
              body="Every app repo is MIT. Pick one, ship a PR, earn a share of its fee stream."
            />
          ) : (
            <ul className="text-sm">
              {d.contributions.map((c) => (
                <li key={c.appSlug} className="flex items-center gap-3 border-b border-line py-2">
                  <Link to={`/c/${c.appSlug}?tab=governance`} className="num text-xs text-fg-2 hover:text-fg">
                    ${c.appTicker}
                  </Link>
                  <span className="num text-xs text-fg-3">
                    {c.mergedPrs} merged PR{c.mergedPrs === 1 ? "" : "s"}
                  </span>
                  <Money usd={c.earnedUsd} tone="rev" className="ml-auto" exact />
                </li>
              ))}
              {d.bounties.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line py-2">
                  <Link to={`/c/${b.appSlug}?tab=governance`} className="num text-xs text-fg-2 hover:text-fg">
                    ${b.appTicker}
                  </Link>
                  <span className="min-w-0 flex-1 truncate">{b.title}</span>
                  <span className="num text-xs text-fg-3">{b.status.toLowerCase()}</span>
                  <span className="num text-rev">{formatSol(b.sol)}</span>
                  {b.payoutTx && <TxLink sig={b.payoutTx} />}
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <p className="small max-w-prose text-fg-2">
        Buyback share is your pro-rata slice of the supply that app revenue has bought and destroyed. It is a burn, not a distribution:
        nothing is paid to holders.
      </p>
    </div>
  );
};
