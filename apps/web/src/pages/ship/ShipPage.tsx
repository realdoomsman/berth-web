import { useEffect } from "react";
import { FEE_SPLIT_BPS, PUMP_TOTAL_SUPPLY, REVENUE_SPLIT_BPS } from "@ship/shared";
import { useShip } from "../../api/queries.js";
import { useAuth } from "../../auth/useAuth.js";
import { CopyField } from "../../components/CopyField.js";
import { Money } from "../../components/Money.js";
import { Skeleton } from "../../components/Skeleton.js";
import { TxLink } from "../../components/TxLink.js";
import { IconExternal } from "../../components/icons.js";
import { formatNum, formatPct, formatPrice } from "../../lib/format.js";
import { StakeForm } from "./StakeForm.js";
import { MyStakes } from "./MyStakes.js";
import { TopStakes } from "./TopStakes.js";

const SUPPLY = Number(PUMP_TOTAL_SUPPLY);

export const ShipPage = () => {
  const auth = useAuth();
  const q = useShip(auth.authenticated);

  useEffect(() => {
    document.title = "Berth — $BERTH";
  }, []);

  if (q.isPending) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-16 w-80" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (q.isError)
    return (
      <div role="alert" className="border-l-2 border-burn py-1 pl-3 text-sm text-burn">
        {q.error.message}
      </div>
    );

  const ship = q.data;
  const launched = ship.mint !== null;
  const routedUsd = ship.feesReceivedUsd + ship.revenueReceivedUsd;
  const burnedPct = (ship.burned / SUPPLY) * 100;

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-wrap items-end gap-x-6 gap-y-4 border-b border-line pb-6">
        <div className="min-w-0">
          {/* `h1` alone: the pixel face is the wordmark voice and already wins the
              cascade over `num`, so carrying both was a coin-flip on utility order. */}
          <h1 className="h1">$BERTH</h1>
          <p className="body mt-3 max-w-2xl text-fg-2">
            The platform coin. Every app on Berth routes <span className="num text-rev">{formatPct(FEE_SPLIT_BPS.SHIP_TOKEN)}</span> of its
            creator fees and <span className="num text-rev">{formatPct(REVENUE_SPLIT_BPS.SHIP_TOKEN)}</span> of its revenue here. That money
            buys $BERTH on the open market and burns it.
          </p>
        </div>
        {(ship.pumpUrl || launched) && (
          <div className="ml-auto flex items-center gap-2">
            {ship.pumpUrl && (
              <a href={ship.pumpUrl} target="_blank" rel="noreferrer noopener" className="btn btn-primary">
                Trade on pump.fun <IconExternal size={14} />
              </a>
            )}
            {launched && <TxLink address={ship.mint} label="mint" />}
          </div>
        )}
      </header>

      {launched ? (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
          <div>
            <dt className="label">price</dt>
            <dd className="figure figure-lg mt-1.5">{formatPrice(ship.priceUsd)}</dd>
          </div>
          <div>
            <dt className="label">market cap</dt>
            <dd className="mt-1.5">
              <Money usd={ship.marketCapUsd} size="lg" />
            </dd>
          </div>
          <div>
            <dt className="label">holders</dt>
            <dd className="figure figure-lg mt-1.5">{formatNum(ship.holders)}</dd>
          </div>
          <div>
            <dt className="label">24h volume</dt>
            <dd className="mt-1.5">
              <Money usd={ship.volume24hUsd} size="lg" />
            </dd>
          </div>
        </dl>
      ) : (
        <section className="border-l-2 border-warn pl-4">
          <h2 className="h3">$BERTH is not minted yet</h2>
          <p className="mt-2 max-w-2xl text-sm text-fg-2">
            There is no price, market cap or holder count because there is no coin: those numbers start the day it is minted. What already
            exists is the treasury below. Every app pays its $BERTH share into it from day one, the first buyback runs the moment the coin
            exists, and staking opens with it.
          </p>
          <CopyField className="mt-4 max-w-xl" label="buyback treasury, collecting now" value={ship.treasury} />
        </section>
      )}

      <div className="grid gap-8 sm:grid-cols-2">
        <section>
          <h2 className="h2">Routed to $BERTH</h2>
          <Money usd={routedUsd} tone="rev" size="xl" exact className="mt-2 block" />
          <p className="small mt-2 text-fg-2">Collected from every app on the platform, waiting to be spent on buybacks.</p>
          <dl className="mt-5 flex flex-col border-t border-line text-xs">
            <div className="flex items-baseline justify-between gap-3 border-b border-line py-2">
              <dt className="text-fg-2">
                creator fees, <span className="num">{formatPct(FEE_SPLIT_BPS.SHIP_TOKEN)}</span> share
              </dt>
              <dd>
                <Money usd={ship.feesReceivedUsd} tone="rev" exact />
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 border-b border-line py-2">
              <dt className="text-fg-2">
                app revenue, <span className="num">{formatPct(REVENUE_SPLIT_BPS.SHIP_TOKEN)}</span> share
              </dt>
              <dd>
                <Money usd={ship.revenueReceivedUsd} tone="rev" exact />
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 border-b border-line py-2">
              <dt className="text-fg-2">treasury</dt>
              <dd>
                <TxLink address={ship.treasury} />
              </dd>
            </div>
          </dl>
        </section>

        <section className="sm:border-l sm:border-line sm:pl-8">
          <h2 className="h2">Burned</h2>
          <div className="figure figure-xl mt-2 text-burn">{formatNum(ship.burned)}</div>
          <p className="small mt-2 text-fg-2">
            {launched
              ? "Tokens destroyed on-chain. Supply never comes back."
              : "No burns yet: the first one runs on the first buyback after the mint."}
          </p>
          <dl className="mt-5 flex flex-col border-t border-line text-xs">
            {launched ? (
              <>
                <div className="flex items-baseline justify-between gap-3 border-b border-line py-2">
                  <dt className="text-fg-2">of total supply</dt>
                  <dd className="num text-burn">{burnedPct < 0.01 && ship.burned > 0 ? "<0.01%" : `${burnedPct.toFixed(2)}%`}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 border-b border-line py-2">
                  <dt className="text-fg-2">circulating after burns</dt>
                  <dd className="num">{formatNum(SUPPLY - ship.burned)}</dd>
                </div>
              </>
            ) : (
              <div className="flex items-baseline justify-between gap-3 border-b border-line py-2">
                <dt className="text-fg-2">supply at mint</dt>
                <dd className="num">{formatNum(SUPPLY)}</dd>
              </div>
            )}
            <div className="flex items-baseline justify-between gap-3 border-b border-line py-2">
              <dt className="text-fg-2">staked to apps</dt>
              <dd className="num">
                {formatNum(ship.totalStaked)} <span className="text-fg-3">· {ship.stakers} stakers</span>
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="max-w-2xl">
        <h2 className="h2">Two sinks, both one-way</h2>
        <p className="body mt-3 text-fg-2">
          <b className="text-burn">Buyback and burn.</b> The treasury balance is swapped for $BERTH on the open market and the tokens are
          destroyed. That supply is gone.
        </p>
        <p className="body mt-3 text-fg-2">
          <b className="text-rev">Stake to boost.</b> $BERTH deposited against an app leaves circulation, moves that app to the front of the
          build queue, and earns the app&apos;s staker fee share while it stays deposited. You can pull it back at any time.
        </p>
        <p className="small mt-4 text-fg-2">Neither sink pays, distributes, or promises anything to holders.</p>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <StakeForm ship={ship} />
        <MyStakes stakes={ship.myStakes} authed={auth.authenticated} launched={launched} />
      </div>

      <TopStakes rows={ship.topStakes} totalStaked={ship.totalStaked} />

      {launched && <CopyField label="$BERTH mint" value={ship.mint!} className="max-w-xl" />}
    </div>
  );
};
