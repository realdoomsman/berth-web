import { REVENUE_SPLIT_BPS } from "@ship/shared";
import type { BuybackDto, RevenueSource } from "../../api/types.js";
import { CopyField } from "../../components/CopyField.js";
import { Money } from "../../components/Money.js";
import { TxLink } from "../../components/TxLink.js";
import { formatDate, formatNum, formatPct, formatSol, shortAddr } from "../../lib/format.js";

const SOURCE_LABEL: Record<RevenueSource, string> = {
  CHECKOUT: "checkout",
  SUBSCRIPTION: "subscription",
  X402: "x402 request",
  AD: "ad impression",
  EXTERNAL_SDK: "external sdk",
};

const STATE_NOTE: Record<BuybackDto["status"], string> = {
  PENDING: "swap not sent yet",
  SWAPPED: "bought, burn pending",
  BURNED: "settled end to end",
  FAILED: "failed, nothing was burned",
};

/**
 * The audit record for one batch: the money that came in, the SOL it was swapped
 * for, the tokens that were destroyed, the digest that commits to all of it, and
 * the payments it was computed from. Figures sit on one right edge so the column
 * can be read down; every claim has its transaction next to it.
 */
export const BurnChain = ({ b, ticker }: { b: BuybackDto; ticker: string }) => (
  <section aria-label="Most recent buyback, end to end" className="min-w-0">
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line pb-2.5">
      <h3 className="h3">
        {b.status === "BURNED" ? "Most recent burn, end to end" : "Most recent batch, end to end"}
      </h3>
      <p className="small text-fg-2">
        <span className="num">{formatDate(b.completedAt ?? b.createdAt)}</span> · {STATE_NOTE[b.status]} · batch{" "}
        <span className="num">{b.id}</span>
      </p>
    </div>

    <dl className="min-w-0">
      <div className="flex items-baseline justify-between gap-x-6 border-b border-line/60 py-3">
        <dt className="min-w-0">
          <span className="small block text-fg">Revenue attested</span>
          <span className="small block text-fg-2">
            {b.revenueEvents.length > 0
              ? `${b.revenueEvents.length} payment${b.revenueEvents.length === 1 ? "" : "s"}, itemised below`
              : "no individual payments are attached to this batch"}
          </span>
        </dt>
        <dd className="shrink-0">
          <Money usd={b.revenueUsd} tone="rev" exact size="lg" className="block text-right" />
        </dd>
      </div>

      <div className="flex items-baseline justify-between gap-x-6 border-b border-line/60 py-3">
        <dt className="min-w-0">
          <span className="small block text-fg">SOL spent buying ${ticker}</span>
          <span className="small block text-fg-2">
            <span className="num">{formatPct(REVENUE_SPLIT_BPS.BUYBACK_BURN)}</span> of the batch · swap{" "}
            <TxLink sig={b.swapTx} />
          </span>
        </dt>
        <dd className="figure figure-lg shrink-0 text-right">{formatSol(b.solSpent)}</dd>
      </div>

      {b.tokensBought > 0 && (
        <div className="flex items-baseline justify-between gap-x-6 border-b border-line/60 py-3">
          <dt className="min-w-0">
            <span className="small block text-fg">${ticker} received from the swap</span>
            <span className="small block text-fg-2">filled on the open market, no private price</span>
          </dt>
          <dd className="num shrink-0 text-right text-sm">{formatNum(b.tokensBought)}</dd>
        </div>
      )}

      <div className="flex items-baseline justify-between gap-x-6 border-b border-line/60 py-3">
        <dt className="min-w-0">
          <span className="small block text-fg">${ticker} burned</span>
          <span className="small block text-fg-2">
            sent to the incinerator, supply permanently reduced · burn <TxLink sig={b.burnTx} />
          </span>
        </dt>
        <dd className="figure figure-lg shrink-0 text-right text-burn">
          {formatNum(b.tokensBurned || b.tokensBought)}
        </dd>
      </div>

      <div className="flex items-baseline justify-between gap-x-6 border-b border-line/60 py-3">
        <dt className="min-w-0">
          <span className="small block text-fg">The rest of the batch</span>
          <span className="small block text-fg-2">
            <span className="num">{formatPct(REVENUE_SPLIT_BPS.SHIP_TOKEN)}</span> buys $BERTH,{" "}
            <span className="num">{formatPct(REVENUE_SPLIT_BPS.PLATFORM_OPS)}</span> pays for hosting
          </span>
        </dt>
        <dd className="num shrink-0 text-right text-sm text-fg-2">
          <Money usd={b.shipUsd} exact /> + <Money usd={b.opsUsd} exact />
        </dd>
      </div>
    </dl>

    <div className="mt-5">
      <h4 className="h3">Attestation</h4>
      <p className="small mt-1 max-w-2xl text-fg-2">
        {b.revenueEvents.length > 0 ? (
          <>
            sha256 over the {b.revenueEvents.length} revenue event id
            {b.revenueEvents.length === 1 ? "" : "s"} listed below, in order. The same digest is written into the memo
            of both transactions above, so anyone can pull the swap or the burn, hash those ids, and get this string
            back.
          </>
        ) : (
          <>
            sha256 over the revenue event ids this batch settles, written into the memo of both transactions above.
            The individual payments are not exposed on this batch, so the digest is all there is to check against.
          </>
        )}
      </p>
      <CopyField value={b.attestHash} className="mt-2 max-w-2xl" wrap />
      {b.status === "BURNED" && (
        <p className="small mt-1.5 text-rev">Revenue, swap and burn reconcile for this batch.</p>
      )}
      {b.error && <p className="small mt-1.5 text-burn">{b.error}</p>}
    </div>

    {b.revenueEvents.length > 0 && (
      <div className="mt-5">
        <h4 className="h3">Payments in this batch</h4>
        <div className="mt-2 hidden items-baseline gap-x-3 border-b border-line pb-1.5 sm:flex">
          <span className="label w-32 shrink-0">paid</span>
          <span className="label w-24 shrink-0">source</span>
          <span className="label w-20 shrink-0">payer</span>
          <span className="label min-w-0 flex-1">reference</span>
          <span className="label w-24 shrink-0 text-right">usd</span>
        </div>
        <ul>
          {b.revenueEvents.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-line/40 py-2 sm:flex-nowrap"
            >
              <span className="num w-32 shrink-0 text-xs text-fg-2">{formatDate(r.createdAt)}</span>
              <span className="small w-24 shrink-0 truncate text-fg">{SOURCE_LABEL[r.source]}</span>
              <span className="num w-20 shrink-0 truncate text-xs text-fg-2" title={r.payer ?? undefined}>
                {r.payer ? shortAddr(r.payer, 4) : "—"}
              </span>
              <span className="min-w-0 flex-1 truncate text-xs">
                {r.reference && r.reference.length >= 64 ? (
                  <TxLink sig={r.reference} />
                ) : (
                  <span className="num text-fg-2">{r.reference ?? "—"}</span>
                )}
              </span>
              <span className="w-24 shrink-0 text-right">
                <Money usd={r.usd} tone="rev" exact className="text-sm" />
              </span>
            </li>
          ))}
        </ul>
      </div>
    )}
  </section>
);
