import { useEffect, useState } from "react";
import type { AppDetail } from "../../api/types.js";
import { useAuth } from "../../auth/useAuth.js";
import { EmptyState } from "../../components/EmptyState.js";
import { ProgressBar } from "../../components/ProgressBar.js";
import { Skeleton } from "../../components/Skeleton.js";
import { IconCheck, IconExternal, IconLock } from "../../components/icons.js";
import { getTokenBalance } from "../../lib/solana.js";
import { formatNum } from "../../lib/format.js";
import { appUrl } from "../../env.js";

interface Props {
  app: AppDetail;
  /** pump.fun buy link, when the coin exists */
  buyUrl: string | null;
}

export const HolderTierTab = ({ app, buyUrl }: Props) => {
  const auth = useAuth();
  const tier = app.spec?.holderTier;
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!auth.wallet || !app.mint) return;
    let live = true;
    setLoading(true);
    void getTokenBalance(auth.wallet, app.mint)
      .then((b) => {
        if (live) setBalance(Number(b) / 1e6);
      })
      .catch(() => {
        if (live) setBalance(0);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [auth.wallet, app.mint]);

  const min = tier?.minHoldTokens ?? 0;
  const enabled = !!tier?.enabled && min > 0;
  const qualifies = enabled && balance !== null && balance >= min;
  const short = enabled && balance !== null ? Math.max(0, min - balance) : 0;
  const openUrl = app.liveUrl ?? (app.liveVersion > 0 ? appUrl(app.slug) : null);

  if (!tier?.enabled) {
    return (
      <EmptyState
        icon={<IconLock size={22} className="text-fg-3" />}
        title="No holder tier on this app"
        body="Its spec ships everything to everyone. Holders can queue a gated tier as a task in governance; the agent builds it like any other change."
      />
    );
  }

  return (
    <div className="grid min-w-0 gap-x-10 gap-y-9 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
      <section aria-labelledby="tier-h" className="min-w-0">
        <h3 id="tier-h" className="h3 border-b border-line pb-2.5">
          What holding unlocks
        </h3>

        <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="figure figure-xl text-rev">{formatNum(min)}</span>
          <span className="num text-lg text-fg-2">${app.ticker}</span>
          <span className="num text-xs text-fg-2">{((min / 1_000_000_000) * 100).toFixed(2)}% of supply</span>
        </div>
        <p className="small mt-1.5 text-fg-2">
          The minimum balance for the gated features. No staking and no lockup: the app asks the chain what you hold
          when you make a request.
        </p>

        <div className="mt-6">
          <h4 className="small font-semibold text-fg-2">What it unlocks</h4>
          {tier.perks.length > 0 ? (
            <ul className="mt-2 flex flex-col gap-2 text-sm">
              {tier.perks.map((p, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <IconCheck size={13} className="mt-1 shrink-0 text-rev" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="small mt-2 text-fg-2">The perks are defined inside the app itself.</p>
          )}
        </div>

        <p className="small mt-6 border-t border-line pt-3 text-fg-2">
          The check runs through the Berth SDK on every request. Sell below the threshold and the tier turns off
          immediately; buy back in and it returns with no action from the launcher.
        </p>
      </section>

      <section aria-labelledby="status-h" className="min-w-0 lg:border-l lg:border-line lg:pl-10">
        <h3 id="status-h" className="h3 border-b border-line pb-2.5">
          Your status
        </h3>
        {!auth.authenticated ? (
          <div className="mt-3 flex flex-col items-start gap-2">
            <p className="small text-fg-2">Connect a wallet to check your balance against the tier.</p>
            <button type="button" className="btn btn-primary" onClick={auth.login}>
              Sign in to check
            </button>
          </div>
        ) : !app.mint ? (
          <p className="small mt-3 text-fg-2">The coin is not minted yet, so there is nothing to hold.</p>
        ) : (
          <>
            <p className="small mt-3 text-fg-2">your balance</p>
            {balance === null && loading ? (
              <Skeleton className="mt-1 h-7 w-32" />
            ) : (
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className={`figure figure-lg ${qualifies ? "text-rev" : ""}`}>{formatNum(balance ?? 0)}</span>
                <span className="num text-sm text-fg-2">${app.ticker}</span>
              </div>
            )}

            <div className="mt-3">
              <ProgressBar value={Math.min(balance ?? 0, min)} max={min} tone={qualifies ? "rev" : "info"} />
              <div className="small mt-2">
                {qualifies ? (
                  <span className="inline-flex items-center gap-1 text-rev">
                    <IconCheck size={12} />
                    tier unlocked
                  </span>
                ) : balance === null ? (
                  <span className="text-fg-2">checking your on-chain balance…</span>
                ) : (
                  <span className="text-fg-2">
                    <span className="num text-fg">{formatNum(short)}</span> more ${app.ticker} to unlock
                  </span>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              {!qualifies && buyUrl && (
                <a href={buyUrl} target="_blank" rel="noreferrer" className="btn btn-primary justify-center">
                  Buy ${app.ticker} on pump.fun
                  <IconExternal size={13} />
                </a>
              )}
              {openUrl && (
                <a href={openUrl} target="_blank" rel="noreferrer" className="btn justify-center">
                  Open the app
                  <IconExternal size={13} />
                </a>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
};
