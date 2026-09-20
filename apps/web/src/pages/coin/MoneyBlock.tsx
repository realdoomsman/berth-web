import { MIN_BUYBACK_USD, PUMP_TOTAL_SUPPLY, REVENUE_SPLIT_BPS } from "@ship/shared";
import type { AppDetail } from "../../api/types.js";
import { Money } from "../../components/Money.js";
import { ProgressBar } from "../../components/ProgressBar.js";
import { formatNum, formatPct, formatSol, timeAgo } from "../../lib/format.js";

const SUPPLY = Number(PUMP_TOTAL_SUPPLY);

/**
 * The answer to "is it making money": revenue as the anchor figure, then the two
 * things that revenue causes, aligned on a single right edge so the chain reads
 * down the column instead of through a row of arrows. The only raised surface on
 * the page — everything below it is a hairline.
 */
export const MoneyBlock = ({ app, onVerify }: { app: AppDetail; onVerify: () => void }) => {
  const burnedPct = (app.burnedTokens / SUPPLY) * 100;
  const earning = app.revenueUsd > 0;
  const pendingPct = Math.min(100, Math.round((app.pendingRevenueUsd / MIN_BUYBACK_USD) * 100));

  return (
    <section aria-labelledby="money-h" className="panel-raised overflow-hidden">
      <div className="grid gap-x-10 gap-y-7 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.02fr)]">
        <div className="min-w-0">
          {/* Pixel, like the page's other two movement questions ("Is it being
              built?", "Can I verify it?") — they are one trio and must speak in
              one voice. */}
          <h2 id="money-h" className="h2">
            Is it making money?
          </h2>
          <Money
            usd={app.revenueUsd}
            tone={earning ? "rev" : "plain"}
            exact={app.revenueUsd < 1_000_000}
            size="xl"
            animate
            className={`mt-3 block ${earning ? "" : "text-fg-3"}`}
          />
          <p className="small mt-3 max-w-md text-fg-2">
            {earning ? (
              <>
                Dollars the product charged its own users, all-time. Every payment was verified on-chain before it was
                recorded here
                {app.firstRevenueAt ? <>, starting {timeAgo(app.firstRevenueAt)}</> : null}.
              </>
            ) : app.liveVersion > 0 ? (
              <>
                The app is deployed and can take payments. Nothing on this page is projected, so revenue stays at
                $0.00 until a user actually pays.
              </>
            ) : (
              <>No version is live yet, so there is nothing to sell. Revenue starts at the first deploy.</>
            )}
          </p>
        </div>

        <dl className="min-w-0 self-center lg:border-l lg:border-line lg:pl-10">
          <div className="flex items-baseline justify-between gap-6 py-3 sm:py-3.5">
            <dt className="min-w-0">
              <span className="small block text-fg">
                <span className="num">{formatPct(REVENUE_SPLIT_BPS.BUYBACK_BURN)}</span> of it buys ${app.ticker} back
              </span>
              <span className="small block text-fg-2">swapped on the open market by the platform treasury</span>
            </dt>
            <dd className="figure figure-lg shrink-0">{formatSol(app.buybackSol)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-6 border-t border-line py-3 sm:py-3.5">
            <dt className="min-w-0">
              <span className="small block text-fg">every token it buys is burned</span>
              <span className="small block text-fg-2">
                {app.burnedTokens > 0
                  ? `${burnedPct < 0.01 ? "<0.01" : burnedPct.toFixed(2)}% of total supply, destroyed for good`
                  : "supply can only shrink from here"}
              </span>
            </dt>
            <dd className={`figure figure-lg shrink-0 ${app.burnedTokens > 0 ? "text-burn" : "text-fg-3"}`}>
              {app.burnedTokens > 0 ? formatNum(app.burnedTokens) : "0"}
            </dd>
          </div>
        </dl>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-4 border-t border-line px-4 py-3.5 sm:px-6">
        <div className="min-w-[15rem] flex-1">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <span className="small text-fg-2">
              {app.pendingRevenueUsd >= MIN_BUYBACK_USD ? (
                <>
                  <Money usd={app.pendingRevenueUsd} tone="rev" exact /> is attested and unspent. The next executor
                  pass swaps and burns it
                </>
              ) : app.pendingRevenueUsd > 0 ? (
                <>
                  <Money usd={app.pendingRevenueUsd} tone="rev" exact /> collected since the last burn. Revenue waits
                  in a batch until it reaches <span className="num text-fg">${MIN_BUYBACK_USD}</span>, then it buys and
                  burns
                </>
              ) : (
                <>
                  Nothing pending. Revenue batches until <span className="num text-fg">${MIN_BUYBACK_USD}</span> is
                  attested, then it buys and burns in one transaction pair
                </>
              )}
            </span>
            <span className="num shrink-0 text-xs text-fg-2">{pendingPct}%</span>
          </div>
          <ProgressBar
            value={Math.min(app.pendingRevenueUsd, MIN_BUYBACK_USD)}
            max={MIN_BUYBACK_USD}
            tone={app.pendingRevenueUsd >= MIN_BUYBACK_USD ? "rev" : "info"}
          />
        </div>
        <button type="button" className="btn shrink-0" onClick={onVerify}>
          Check the ledger
        </button>
      </div>
    </section>
  );
};
