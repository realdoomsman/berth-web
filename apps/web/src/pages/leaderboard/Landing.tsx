import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { FEE_SPLIT_BPS, REVENUE_SPLIT_BPS } from "@ship/shared";
import { useStats } from "../../api/queries.js";
import type { AppSummary } from "../../api/types.js";
import { Money } from "../../components/Money.js";
import { Monogram } from "../../components/Monogram.js";
import { Skeleton } from "../../components/Skeleton.js";
import { StatusBadge } from "../../components/StatusBadge.js";
import { IconChevron } from "../../components/icons.js";
import { formatNum, formatPct, formatRatio, formatSol } from "../../lib/format.js";
import { Flywheel } from "./Flywheel.js";
import { StatBand } from "./StatBand.js";

/*
 * Type-led hero. The live numbers sit inside the sentence and in one dense
 * totals row on hairlines — no hero card, no marquee, no glow. The top earner
 * owns the right-hand column because "a coin whose app earned real money" is
 * the entire argument and it should be readable before anything is scrolled.
 */

/** The #1 earner, set in type rather than boxed. */
const TopEarner = ({ app }: { app: AppSummary }) => (
  <div>
    <div className="flex items-baseline justify-between gap-3">
      {/* A column legend, not a sentence: one voice with the `label` row below
         it and with the totals row underneath. */}
      <p className="label">Top earner</p>
      <StatusBadge status={app.status} runningStage={app.runningJob?.stage ?? null} size="sm" />
    </div>

    <div className="mt-3 flex items-center gap-3">
      <Monogram ticker={app.ticker} src={app.imageUrl} size={40} />
      <div className="min-w-0">
        <div className="h3 truncate">{app.name}</div>
        <div className="num small text-fg-2">${app.ticker}</div>
      </div>
    </div>

    <Money usd={app.revenueUsd} tone="rev" exact={app.revenueUsd < 1_000_000} size="xl" className="mt-5 block" />
    <p className="small mt-2 text-fg-2">collected from its own users</p>

    <dl className="mt-5 flex flex-wrap gap-x-7 gap-y-3 border-t border-line pt-3.5">
      <div>
        <dt className="label">p/r</dt>
        <dd className="num mt-0.5 text-sm">{formatRatio(app.priceToRevenue)}</dd>
      </div>
      <div>
        <dt className="label">users</dt>
        <dd className="num mt-0.5 text-sm">{formatNum(app.users)}</dd>
      </div>
      <div>
        <dt className="label">burned</dt>
        <dd className="num mt-0.5 text-sm text-burn">{app.burnedTokens > 0 ? formatNum(app.burnedTokens) : "—"}</dd>
      </div>
    </dl>

    <Link
      to={`/c/${app.slug}`}
      className="mt-4 inline-flex items-center gap-1 text-sm text-fg-2 underline decoration-line-2 underline-offset-4 transition-colors hover:text-fg"
    >
      Read ${app.ticker}&apos;s ledger
      <IconChevron dir="right" size={14} />
    </Link>
  </div>
);

const Figure = ({
  label,
  value,
  sub,
  tone = "",
}: {
  label: string;
  value: ReactNode;
  sub: ReactNode;
  tone?: string;
}) => (
  <div className="min-w-0">
    <dt className="label">{label}</dt>
    <dd className={`figure figure-md mt-1.5 ${tone}`}>{value}</dd>
    {/* Sans, not mono: these captions are sentences. `Money` and the explicit
        `num` spans below carry the monospace where there is actually a number. */}
    <div className="micro mt-1 text-fg-2">{sub}</div>
  </div>
);

const TOTALS_GRID = "grid grid-cols-2 gap-x-8 gap-y-6 border-y border-line py-5 sm:grid-cols-3 lg:grid-cols-5";

/** Platform totals as one dense data row on hairlines, not six cards. */
const Totals = () => {
  const { data, isError, error } = useStats();

  if (isError) {
    return (
      <p className="body border-y border-line py-4 text-burn" role="alert">
        Platform totals unavailable: {error.message}
      </p>
    );
  }

  if (!data) {
    return (
      <div className={TOTALS_GRID}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-2.5 w-24" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-2.5 w-16" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <dl className={TOTALS_GRID} aria-label="Platform totals">
      <Figure
        label="app revenue"
        tone="text-rev"
        value={<Money usd={data.revenueUsd} tone="rev" exact={data.revenueUsd < 1_000_000} />}
        sub="paid by users, not by us"
      />
      <Figure
        label="creator fees swept"
        tone="text-rev"
        value={formatSol(data.feesSol)}
        sub={
          <>
            ≈{" "}
            <Money usd={data.feesUsd} tone="plain" exact={data.feesUsd < 1_000_000} className="text-fg-2" />
          </>
        }
      />
      <Figure
        label="spent on buybacks"
        value={formatSol(data.buybackSol)}
        sub={
          <>
            ≈{" "}
            <Money usd={data.buybackUsd} tone="plain" exact={data.buybackUsd < 1_000_000} className="text-fg-2" />
          </>
        }
      />
      <Figure
        label="$BERTH burned"
        tone={data.shipBurned > 0 ? "text-burn" : ""}
        value={data.shipBurned > 0 ? formatNum(data.shipBurned) : "0"}
        sub={data.shipBurned > 0 ? "destroyed for good" : "first burn pending"}
      />
      <Figure
        label="apps live"
        value={formatNum(data.appsLive)}
        sub={
          <>
            <span className="num">{formatNum(data.appsBuilding)}</span> building ·{" "}
            <span className="num">{formatNum(data.appsTotal)}</span> total
          </>
        }
      />
    </dl>
  );
};

const LEGEND: Record<"rev" | "violet" | "burn", string> = {
  rev: "bg-rev",
  violet: "bg-violet",
  burn: "bg-burn",
};

const LEGEND_ROW: ReadonlyArray<readonly ["rev" | "violet" | "burn", string]> = [
  ["rev", "money"],
  ["violet", "the build"],
  ["burn", "burn"],
];

/**
 * The flywheel in its well: the diagram, a caption and the colour key that makes
 * the money / build / burn arrows legible without a paragraph next to them.
 */
const FlywheelPanel = () => (
  <div className="panel-inset p-4 sm:p-5">
    <p className="label">How one coin pays for its own product</p>
    <Flywheel className="mx-auto mt-3 max-w-[440px]" />
    <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 border-t border-line pt-3">
      {LEGEND_ROW.map(([tone, label]) => (
        <span key={label} className="flex items-center gap-1.5">
          <span className={`size-2 ${LEGEND[tone]}`} aria-hidden />
          <span className="micro text-fg-2">{label}</span>
        </span>
      ))}
    </div>
  </div>
);

/** The split stated in exact percentages, so the diagram's shapes have numbers. */
const SplitBreakdown = () => (
  <div>
    <p className="label">Where the money goes</p>
    <dl className="mt-3 border-y border-line">
      <div className="border-b border-line py-3.5">
        <dt className="h3">Every trading fee</dt>
        <dd className="num mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
          <span className="text-rev">{formatPct(FEE_SPLIT_BPS.BUILD_BUDGET)} build budget</span>
          <span className="text-rev">{formatPct(FEE_SPLIT_BPS.SHIP_TOKEN)} $BERTH buyback</span>
          <span className="text-fg-2">{formatPct(FEE_SPLIT_BPS.LAUNCHER)} launcher</span>
        </dd>
      </div>
      <div className="py-3.5">
        <dt className="h3">Every dollar of revenue</dt>
        <dd className="num mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
          <span className="text-burn">{formatPct(REVENUE_SPLIT_BPS.BUYBACK_BURN)} buyback &amp; burn</span>
          <span className="text-rev">{formatPct(REVENUE_SPLIT_BPS.SHIP_TOKEN)} $BERTH</span>
          <span className="text-fg-2">{formatPct(REVENUE_SPLIT_BPS.PLATFORM_OPS)} platform ops</span>
        </dd>
      </div>
    </dl>
    <p className="small mt-3 text-fg-2">
      No treasury sits in between, and holders are never paid. The only thing that ever happens to supply is that it
      falls.
    </p>
  </div>
);

export const Landing = ({ apps, loading }: { apps: AppSummary[]; loading: boolean }) => {
  const top = apps.find((a) => a.revenueUsd > 0) ?? null;
  const { data: stats } = useStats();

  return (
    <section aria-labelledby="pitch" className="pt-1 sm:pt-4">
      {/* Movement 1 — the thesis, paired with the diagram that proves it out. */}
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)] lg:items-center lg:gap-14">
        <div>
          <p className="label">The flywheel</p>
          <h1 id="pitch" className="display mt-3">
            Coins that build apps.
          </h1>
          <p className="h2 mt-4 text-fg">Fees fund the build. Revenue funds the burn.</p>

          <p className="body mt-5 max-w-xl text-fg-2 sm:text-base">
            You write one sentence. A coin launches on pump.fun, and{" "}
            <span className="num text-fg">{formatPct(FEE_SPLIT_BPS.BUILD_BUDGET)}</span> of its trading fees pay an AI
            agent to build the app. The app charges its own users, and{" "}
            <span className="num text-fg">{formatPct(REVENUE_SPLIT_BPS.BUYBACK_BURN)}</span> of that revenue buys the
            coin on the open market and <span className="text-burn">burns it</span>. Holders are never paid. Supply
            only falls.
          </p>

          {stats ? (
            stats.revenueUsd > 0 ? (
              <p className="body mt-4 max-w-xl text-fg-2">
                So far the products on this board have collected{" "}
                <Money
                  usd={stats.revenueUsd}
                  tone="rev"
                  exact={stats.revenueUsd < 1_000_000}
                  className="font-semibold"
                />{" "}
                from their users across <span className="num text-fg">{formatNum(stats.appsLive)}</span> live apps, and{" "}
                <span className="num text-fg">{formatSol(stats.buybackSol)}</span> has gone back into buying their
                coins.
              </p>
            ) : (
              <p className="body mt-4 max-w-xl text-fg-2">
                No app has been paid yet, so the board below is empty. It is not padded with volume, holder counts or
                placeholder rows to cover for that.
              </p>
            )
          ) : (
            <div className="mt-4 flex max-w-xl flex-col gap-2" aria-hidden>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-2/3 sm:hidden" />
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/launch" className="btn btn-primary btn-lg">
              Launch an app
              <IconChevron dir="right" size={15} />
            </Link>
            <a href={top ? "#board" : "#how-it-works"} className="btn btn-lg">
              {top ? "See what already earns" : "See how the loop works"}
            </a>
          </div>
        </div>

        <FlywheelPanel />
      </div>

      {/* Movement 2 — the proof: the top earner, and the exact split beside it. */}
      <div className="mt-16 grid gap-10 border-t border-line pt-10 sm:mt-20 lg:grid-cols-2 lg:gap-14">
        <div aria-label="Top earning coin">
          {top ? (
            <TopEarner app={top} />
          ) : loading ? (
            /* Matches `TopEarner`'s stack so the section below does not jump when the query resolves. */
            <div className="flex flex-col gap-5" aria-hidden>
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-10 w-44" />
              <Skeleton className="h-9 w-40" />
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-3 w-32" />
            </div>
          ) : (
            <div>
              <p className="label">Top earner</p>
              <span className="figure figure-xl mt-3 block text-fg-3">$0.00</span>
              <p className="body mt-3 max-w-sm text-fg-2">
                No app has been paid yet, so the top of the board is unclaimed. The first coin whose product collects a
                dollar takes this column, and that number is the only thing that puts it there.
              </p>
            </div>
          )}
        </div>

        <div className="lg:border-l lg:border-line lg:pl-14">
          <SplitBreakdown />
        </div>
      </div>

      <StatBand />

      <div className="mt-14 sm:mt-16">
        <Totals />
      </div>
    </section>
  );
};
