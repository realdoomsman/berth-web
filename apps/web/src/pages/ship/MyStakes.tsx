import { Link } from "react-router-dom";
import { useShipUnstake } from "../../api/queries.js";
import type { ShipStakeDto } from "../../api/types.js";
import { EmptyState } from "../../components/EmptyState.js";
import { Money } from "../../components/Money.js";
import { Section } from "../../components/Section.js";
import { TxLink } from "../../components/TxLink.js";
import { formatNum, timeAgo } from "../../lib/format.js";

interface Props {
  stakes: ShipStakeDto[];
  authed: boolean;
  launched: boolean;
}

/** The caller's $BERTH deposits: earned fee share per stake, plus withdrawal. */
export const MyStakes = ({ stakes, authed, launched }: Props) => {
  const unstake = useShipUnstake();
  const active = stakes.filter((s) => s.withdrawnAt === null);
  const closed = stakes.filter((s) => s.withdrawnAt !== null);
  const totalActive = active.reduce((n, s) => n + s.amount, 0);
  const totalEarned = stakes.reduce((n, s) => n + s.earnedUsd, 0);

  return (
    <Section
      title="Your stakes"
      sub="Deposits you can pull back at any time."
      right={
        stakes.length > 0 ? (
          <span className="num text-xs text-fg-3">
            {formatNum(totalActive)} staked · earned <Money usd={totalEarned} tone="rev" exact />
          </span>
        ) : undefined
      }
    >
      {!authed ? (
        <EmptyState compact title="Sign in to see your stakes" body="Stakes follow your account, not the browser." />
      ) : stakes.length === 0 ? (
        <EmptyState
          compact
          title={launched ? "No stakes yet" : "Staking opens when $BERTH launches"}
          body={
            launched
              ? "Pick an app on the left to move it up the build queue and earn its staker fee share."
              : "There is no coin to deposit yet. This opens the moment $BERTH is minted."
          }
        />
      ) : (
        <ul className="text-sm">
          {[...active, ...closed].map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line py-2">
              <Link to={`/c/${s.appSlug}`} className="flex min-w-0 items-baseline gap-2 hover:text-rev">
                <span className="num text-xs text-fg-2">${s.appTicker}</span>
                <span className="truncate font-semibold">{s.appName}</span>
              </Link>
              <div className="num ml-auto text-right">
                {formatNum(s.amount)} <span className="text-xs text-fg-3">$BERTH</span>
              </div>
              <div className="w-24 text-right" title="Your share of this app's staker fee stream so far.">
                <Money usd={s.earnedUsd} tone="rev" exact />
              </div>
              <div className="num w-full text-[11px] text-fg-3 sm:w-auto">
                {s.withdrawnAt ? `unstaked ${timeAgo(s.withdrawnAt)}` : `staked ${timeAgo(s.createdAt)}`} ·{" "}
                <TxLink sig={s.withdrawTx ?? s.depositTx} label={s.withdrawTx ? "withdraw tx" : "deposit tx"} />
              </div>
              {s.withdrawnAt === null && (
                <button
                  type="button"
                  className="btn btn-danger px-2 py-1 text-xs"
                  disabled={unstake.isPending}
                  onClick={() => unstake.mutate(s.id)}
                >
                  {unstake.isPending && unstake.variables === s.id ? "Returning…" : "Unstake"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {unstake.error && (
        <div role="alert" className="mt-2 border-l-2 border-burn pl-3 text-xs text-burn">
          {unstake.error.message}
        </div>
      )}
      {unstake.isSuccess && unstake.data.withdrawTx && (
        <div className="mt-2 text-xs text-fg-2" aria-live="polite">
          Returned <span className="num">{formatNum(unstake.data.amount)}</span> $BERTH — <TxLink sig={unstake.data.withdrawTx} />
        </div>
      )}
    </Section>
  );
};
