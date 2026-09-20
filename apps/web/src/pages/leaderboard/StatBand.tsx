import type { ReactNode } from "react";
import { useStats } from "../../api/queries.js";
import { Money } from "../../components/Money.js";
import { StatusBlock } from "../../components/StatusBadge.js";
import { formatNum, formatSol } from "../../lib/format.js";

/*
 * The live band: the platform's real figures on a slow ledger tape. It is a
 * marquee, not a hero card — a thin recessed strip on hairlines that scrolls the
 * same numbers the totals grid states precisely, so the page has one ambient
 * pulse without a second gaudy stat wall. Money keeps its green, the burn its
 * red; everything else is ink. The tape is duplicated so the loop never seams,
 * the visible copy is decorative (`aria-hidden`), and one sr-only line carries
 * the figures to assistive tech. `prefers-reduced-motion` halts the scroll.
 */

const Item = ({ label, children }: { label: string; children: ReactNode }) => (
  <span className="flex shrink-0 items-baseline gap-2">
    <span className="label">{label}</span>
    <span className="num text-sm text-fg">{children}</span>
    <span className="ml-6 h-1 w-1 shrink-0 self-center bg-line-2" aria-hidden />
  </span>
);

export const StatBand = () => {
  const { data } = useStats();

  if (!data) {
    return (
      <div className="mt-10 flex items-center gap-3 border-y border-line bg-bg-1/40 px-3 py-2.5">
        <StatusBlock tone="quiet" size={6} />
        <span className="label">platform tape</span>
        <span className="small text-fg-3">reading platform totals…</span>
      </div>
    );
  }

  const burned = data.shipBurned;
  const tape = (
    <>
      <Item label="app revenue">
        <Money usd={data.revenueUsd} tone="rev" exact={data.revenueUsd < 1_000_000} />
      </Item>
      <Item label="$BERTH burned">
        <span className={burned > 0 ? "text-burn" : "text-fg-2"}>{burned > 0 ? formatNum(burned) : "0"}</span>
      </Item>
      <Item label="apps built">{formatNum(data.appsTotal)}</Item>
      <Item label="creator fees">
        <span className="text-rev">{formatSol(data.feesSol)}</span>
      </Item>
      <Item label="spent on buybacks">{formatSol(data.buybackSol)}</Item>
      <Item label="apps live">{formatNum(data.appsLive)}</Item>
    </>
  );

  return (
    <div className="mt-10 flex items-stretch border-y border-line bg-bg-1/40">
      <div className="flex shrink-0 items-center gap-2 border-r border-line px-3">
        <StatusBlock tone="in" live size={6} />
        <span className="label whitespace-nowrap">live tape</span>
      </div>
      {/* Mask the tape's edges into the page so numbers fade in and out, not clip. */}
      <div
        className="relative min-w-0 flex-1 overflow-hidden py-2.5"
        style={{ maskImage: "linear-gradient(to right, transparent, #000 6%, #000 94%, transparent)" }}
      >
        <div
          className="animate-ticker flex w-max items-baseline gap-6 pr-6 hover:[animation-play-state:paused]"
          aria-hidden
        >
          {tape}
          {tape}
        </div>
        <p className="sr-only">
          Platform totals — app revenue {formatNum(data.revenueUsd)} dollars, {formatNum(burned)} $BERTH burned,{" "}
          {formatNum(data.appsTotal)} apps built, {formatNum(data.appsLive)} live.
        </p>
      </div>
    </div>
  );
};
