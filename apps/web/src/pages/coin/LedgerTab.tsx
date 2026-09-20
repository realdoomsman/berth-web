import { useState } from "react";
import { MIN_BUYBACK_USD, PUMP_TOTAL_SUPPLY, REVENUE_SPLIT_BPS } from "@ship/shared";
import type { AppDetail, BuybackDto, RevenueSource } from "../../api/types.js";
import { useLedger } from "../../api/queries.js";
import { EmptyState } from "../../components/EmptyState.js";
import { Money } from "../../components/Money.js";
import { Skeleton } from "../../components/Skeleton.js";
import { Stat } from "../../components/Stat.js";
import { TxLink } from "../../components/TxLink.js";
import { IconBurn, IconChevron } from "../../components/icons.js";
import { formatDate, formatNum, formatSol, shortAddr } from "../../lib/format.js";
import { BurnChain } from "./BurnChain.js";

const SOURCE_LABEL: Record<RevenueSource, string> = {
  CHECKOUT: "checkout",
  SUBSCRIPTION: "subscription",
  X402: "x402 request",
  AD: "ad impression",
  EXTERNAL_SDK: "external sdk",
};

const STATUS_CLS: Record<BuybackDto["status"], string> = {
  PENDING: "text-warn",
  SWAPPED: "text-info",
  BURNED: "text-burn",
  FAILED: "text-burn",
};

const SUPPLY = Number(PUMP_TOTAL_SUPPLY);
const COLS = "sm:grid-cols-[1.15fr_1fr_0.8fr_1fr_0.75fr_0.75fr_0.6fr]";

export const LedgerTab = ({ app }: { app: AppDetail }) => {
  const q = useLedger(app.slug);
  const [open, setOpen] = useState<Record<string, true>>({});

  if (q.isPending) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true">
        <Skeleton className="h-[5.5rem] w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (q.isError) {
    return (
      <EmptyState
        title="Ledger unavailable"
        body={q.error.message}
        action={
          <button type="button" className="btn" onClick={() => void q.refetch()}>
            Retry
          </button>
        }
      />
    );
  }

  const { buybacks, totals } = q.data;
  const burnedPct = (totals.burnedTokens / SUPPLY) * 100;
  // The newest batch is the verification story; the rest are the archive.
  const latest = buybacks[0] ?? null;
  const earlier = buybacks.slice(1);

  return (
    <div className="flex min-w-0 flex-col gap-8">
      <dl className="grid grid-cols-2 gap-x-8 gap-y-5 border-b border-line pb-5 sm:grid-cols-4">
        <Stat
          label="revenue routed"
          value={<Money usd={totals.revenueUsd} exact />}
          tone="rev"
          size="lg"
          sub={
            <>
              <span className="num">{REVENUE_SPLIT_BPS.BUYBACK_BURN / 100}%</span> of it buys and burns the coin
            </>
          }
        />
        <Stat
          label="sol spent buying back"
          value={<span className="num">{formatSol(totals.buybackSol)}</span>}
          size="lg"
          sub={`${buybacks.length} settled ${buybacks.length === 1 ? "batch" : "batches"}`}
        />
        <Stat
          label="tokens burned"
          value={<span className="num text-burn">{totals.burnedTokens > 0 ? formatNum(totals.burnedTokens) : "0"}</span>}
          tone="burn"
          size="lg"
          sub="permanently destroyed"
        />
        <Stat
          label="supply burned"
          value={
            <span className="num text-burn">
              {burnedPct > 0 && burnedPct < 0.01 ? "<0.01%" : `${burnedPct.toFixed(2)}%`}
            </span>
          }
          tone="burn"
          size="lg"
          sub={
            totals.pendingRevenueUsd > 0 ? (
              <>
                <Money usd={totals.pendingRevenueUsd} className="text-fg-2" exact /> queued for the next burn
              </>
            ) : (
              "no revenue pending"
            )
          }
        />
      </dl>

      {latest ? (
        <BurnChain b={latest} ticker={app.ticker} />
      ) : (
        <section className="min-w-0">
          <h3 className="h3">No burns yet</h3>
          <p className="body mt-1.5 max-w-2xl text-fg-2">
            The executor batches attested revenue and fires the first buyback once{" "}
            <span className="num text-fg">${MIN_BUYBACK_USD}</span> has accumulated.{" "}
            {app.revenueUsd > 0 ? (
              <>
                This app has collected <Money usd={app.revenueUsd} tone="rev" exact /> so far.
              </>
            ) : (
              <>This app has not collected revenue yet, so there is nothing to spend.</>
            )}
          </p>
          <p className="small mt-3 flex items-center gap-2 text-fg-2">
            <IconBurn size={14} className="shrink-0 text-fg-3" />
            When it fires, this is where the swap and burn transactions appear.
          </p>
        </section>
      )}

      {earlier.length > 0 && (
        <section className="min-w-0">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h3 className="h3">Earlier batches</h3>
            <p className="small text-fg-2">open a row for the payments that funded it</p>
          </div>
          <div className={`mt-3 hidden gap-x-3 border-b border-line pb-1.5 sm:grid ${COLS}`}>
            <span className="label">settled</span>
            <span className="label">revenue attested</span>
            <span className="label">sol spent</span>
            <span className="label">tokens burned</span>
            <span className="label">swap tx</span>
            <span className="label">burn tx</span>
            <span className="label text-right">state</span>
          </div>
          <ul>
            {earlier.map((b) => (
              <BuybackRow
                key={b.id}
                b={b}
                ticker={app.ticker}
                expanded={!!open[b.id]}
                toggle={() =>
                  setOpen((o) => {
                    const n = { ...o };
                    if (n[b.id]) delete n[b.id];
                    else n[b.id] = true;
                    return n;
                  })
                }
              />
            ))}
          </ul>
        </section>
      )}

      <p className="small max-w-3xl border-t border-line pt-4 text-fg-2">
        How this ledger is produced: the app reports a payment, the executor attests it, then swaps{" "}
        <span className="num">{REVENUE_SPLIT_BPS.BUYBACK_BURN / 100}%</span> of the batch for ${app.ticker} and burns
        the tokens. <span className="num">{REVENUE_SPLIT_BPS.SHIP_TOKEN / 100}%</span> buys $BERTH and{" "}
        <span className="num">{REVENUE_SPLIT_BPS.PLATFORM_OPS / 100}%</span> covers hosting.
        Both transaction memos carry the sha256 of the revenue event ids they settle, so every row here is checkable
        against chain data without trusting this page.
      </p>
    </div>
  );
};

const BuybackRow = ({
  b,
  ticker,
  expanded,
  toggle,
}: {
  b: BuybackDto;
  ticker: string;
  expanded: boolean;
  toggle: () => void;
}) => (
  <li className="border-b border-line/50">
    <div className={`grid grid-cols-2 items-baseline gap-x-3 gap-y-2 py-2.5 text-sm ${COLS}`}>
      <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
        <button
          type="button"
          className="text-fg-2 transition-colors hover:text-fg"
          aria-expanded={expanded}
          aria-controls={`buyback-${b.id}`}
          aria-label={expanded ? "Hide the payments that funded this burn" : "Show the payments that funded this burn"}
          onClick={toggle}
        >
          <IconChevron size={14} dir={expanded ? "up" : "down"} />
        </button>
        <span className="num text-fg-2">{formatDate(b.completedAt ?? b.createdAt)}</span>
      </div>
      <div className="min-w-0">
        <span className="label block sm:hidden">revenue attested</span>
        <Money usd={b.revenueUsd} tone="rev" exact />
        <span className="num ml-1.5 text-[10px] text-fg-2">{b.revenueEvents.length} ev</span>
      </div>
      <div className="min-w-0">
        <span className="label block sm:hidden">sol spent</span>
        <span className="num">{formatSol(b.solSpent)}</span>
      </div>
      <div className="min-w-0">
        <span className="label block sm:hidden">tokens burned</span>
        <span className="num text-burn">{b.tokensBurned > 0 ? formatNum(b.tokensBurned) : "—"}</span>
      </div>
      <div className="min-w-0">
        <span className="label block sm:hidden">swap tx</span>
        <TxLink sig={b.swapTx} />
      </div>
      <div className="min-w-0">
        <span className="label block sm:hidden">burn tx</span>
        <TxLink sig={b.burnTx} />
      </div>
      <div className="min-w-0 sm:text-right">
        <span className="label block sm:hidden">state</span>
        <span className={`num text-xs ${STATUS_CLS[b.status]}`}>{b.status.toLowerCase()}</span>
      </div>
    </div>

    {expanded && (
      <div id={`buyback-${b.id}`} className="mb-3 ml-1 border-l border-line pb-1 pl-4">
        <p className="small text-fg-2">
          <Money usd={b.revenueUsd} tone="rev" exact /> attested, {formatSol(b.solSpent)} swapped,{" "}
          <span className="num text-burn">{formatNum(b.tokensBurned || b.tokensBought)}</span> ${ticker} burned.{" "}
          <Money usd={b.shipUsd} className="text-fg-2" exact /> to $BERTH,{" "}
          <Money usd={b.opsUsd} className="text-fg-2" exact /> to hosting.
        </p>
        <ul className="mt-2">
          {b.revenueEvents.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-line/40 py-1.5 sm:flex-nowrap"
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
        <p className="small mt-2 text-fg-2">
          attestation <code className="num break-all text-fg">{b.attestHash}</code>
        </p>
        {b.error && <p className="small mt-1 text-burn">{b.error}</p>}
      </div>
    )}
  </li>
);
