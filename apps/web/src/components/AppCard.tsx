import { Link } from "react-router-dom";
import type { AppSummary } from "../api/types.js";
import { AppShot } from "./AppShot.js";
import { Money } from "./Money.js";
import { Monogram } from "./Monogram.js";
import { Sparkline } from "./Sparkline.js";
import { StatusBadge, StatusBlock } from "./StatusBadge.js";
import { feedLine } from "./feedLine.js";
import { formatNum, formatRatio, formatUsd, timeAgo } from "../lib/format.js";

interface Props {
  app: AppSummary;
  /**
   * Cumulative revenue points for the trend line. No leaderboard payload
   * carries one today, so the line is simply omitted rather than drawn as an
   * invented curve or a decorative dashed baseline.
   */
  revenueSeries?: number[];
  className?: string;
}

/**
 * A row in the ledger that happens to be a card: identity, the dollars the app
 * earned, the four numbers that qualify that figure, and the last thing the
 * agent did. Nothing on it is decoration — if a mark is here, it is carrying a
 * number.
 */
export const AppCard = ({ app, revenueSeries, className = "" }: Props) => {
  const last = app.lastEvent;
  const building = app.runningJob !== null;
  const lowBudget = app.budgetUsd < 50;
  const trend = revenueSeries && revenueSeries.length > 1 ? revenueSeries : null;

  return (
    <Link
      to={`/c/${app.slug}`}
      className={`${building ? "panel-agent" : "panel"} panel-hover group flex flex-col gap-3 p-3.5 ${className}`}
      aria-label={`${app.name} $${app.ticker}`}
    >
      {/* The website itself, full-bleed to the card edges: a card should look
          like the product it ranks, not a wall of figures. */}
      <AppShot
        slug={app.slug}
        name={app.name}
        ticker={app.ticker}
        liveVersion={app.liveVersion}
        status={app.status}
        aspect="16 / 7"
        className="-mx-3.5 -mt-3.5 border-x-0 border-t-0"
      />

      <div className="flex items-start gap-2.5">
        <Monogram ticker={app.ticker} src={app.imageUrl} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="truncate font-semibold tracking-tight">{app.name}</span>
            <span className="num shrink-0 text-xs text-fg-2">${app.ticker}</span>
          </div>
          <p className="small mt-0.5 line-clamp-1 text-fg-2">{app.oneLiner ?? "spec pending"}</p>
        </div>
        <StatusBadge status={app.status} runningStage={building ? app.runningJob!.stage : null} size="sm" className="shrink-0" />
      </div>

      {/* The anchor. Cents are the evidence; only shorten once the figure would break the card. */}
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="label">revenue earned</div>
          <Money
            usd={app.revenueUsd}
            tone={app.revenueUsd > 0 ? "rev" : "neutral"}
            size="lg"
            animate
            exact={app.revenueUsd < 100_000}
            className="mt-1 block"
          />
        </div>
        {trend && <Sparkline points={trend} tone={app.revenueUsd > 0 ? "rev" : "plain"} width={96} height={28} showDot className="shrink-0" />}
      </div>

      <dl className="num grid grid-cols-4 gap-x-2 border-t border-line pt-2.5 text-[11.5px]">
        <div className="min-w-0">
          <dt className="sr-only">price to revenue</dt>
          <dd className="truncate text-fg">{formatRatio(app.priceToRevenue)}</dd>
          <dd className="label mt-0.5">P/R</dd>
        </div>
        <div className="min-w-0">
          <dt className="sr-only">users</dt>
          <dd className="truncate text-fg">{formatNum(app.users)}</dd>
          <dd className="label mt-0.5">users</dd>
        </div>
        <div className="min-w-0">
          <dt className="sr-only">holders</dt>
          <dd className="truncate text-fg">{formatNum(app.holders)}</dd>
          <dd className="label mt-0.5">holders</dd>
        </div>
        <div className="min-w-0">
          <dt className="sr-only">build budget</dt>
          <dd className={`truncate ${lowBudget ? "text-warn" : "text-fg"}`}>{formatUsd(app.budgetUsd)}</dd>
          <dd className="label mt-0.5">budget</dd>
        </div>
      </dl>

      <div className="mt-auto flex items-baseline gap-2 border-t border-line pt-2.5">
        {building && <StatusBlock tone="agent" live size={6} className="mt-1.5" />}
        <span className="num min-w-0 flex-1 truncate text-[11.5px] text-fg-2">{last ? feedLine(last) : "waiting for first fees"}</span>
        <time className="num shrink-0 text-[10.5px] text-fg-2" dateTime={last?.createdAt ?? app.createdAt}>
          {timeAgo(last ? last.createdAt : app.createdAt)}
        </time>
      </div>
    </Link>
  );
};
