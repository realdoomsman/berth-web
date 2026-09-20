import { FEE_SPLIT_BPS, ITERATION_BUDGET_USD, MIN_BUILD_BUDGET_USD } from "@ship/shared";
import type { AppDetail } from "../../api/types.js";
import { Money } from "../../components/Money.js";
import { ProgressBar } from "../../components/ProgressBar.js";
import { formatSol } from "../../lib/format.js";

/**
 * The money that actually builds the app: what is left, what has been spent, and
 * how far the budget is from paying for the next job. Hairline-separated rows —
 * the only raised object on this page is the revenue block.
 */
export const BudgetPanel = ({ app, onTopup }: { app: AppDetail; onTopup: () => void }) => {
  const firstBuildDone = app.firstBuildAt !== null;
  const gate = firstBuildDone ? ITERATION_BUDGET_USD.MIN : MIN_BUILD_BUDGET_USD;
  const armed = app.budgetUsd >= gate;
  const running = app.runningJob !== null;

  return (
    <section aria-labelledby="budget-h" className="min-w-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line pb-2.5">
        <h3 id="budget-h" className="h3">
          Build budget
        </h3>
        <div className="flex items-baseline gap-3">
          <p className="small text-fg-2">
            <span className="num">{FEE_SPLIT_BPS.BUILD_BUDGET / 100}%</span> of every trading fee lands here
          </p>
          <button type="button" className="btn btn-ghost px-2 py-1 text-xs" onClick={onTopup}>
            Top up
          </button>
        </div>
      </div>

      <dl className="grid grid-cols-2 items-baseline gap-x-6 gap-y-4 py-4 sm:flex sm:flex-wrap sm:justify-between sm:gap-x-8">
        <div className="col-span-2 sm:col-auto">
          <dt className="small text-fg-2">remaining</dt>
          <dd className="mt-1">
            <Money usd={app.budgetUsd} tone={app.budgetUsd > 0 ? "rev" : "plain"} size="xl" exact />
          </dd>
        </div>
        <div className="sm:text-right">
          <dt className="small text-fg-2">spent on builds, lifetime</dt>
          <dd className="mt-1">
            <Money usd={app.spentUsd} size="lg" exact />
          </dd>
        </div>
        <div className="sm:text-right">
          <dt className="small text-fg-2">fees collected</dt>
          <dd className="figure figure-lg mt-1">{formatSol(app.feesSol)}</dd>
        </div>
      </dl>

      <div>
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <span className="small text-fg-2">
            {running ? (
              <>A job is running now, drawing this balance down as it works</>
            ) : armed ? (
              <>
                Past the <span className="num text-fg">${gate}</span> gate, so the next job is queued
              </>
            ) : (
              <>
                The next {firstBuildDone ? "iteration" : "build"} starts when the budget reaches{" "}
                <span className="num text-fg">${gate}</span>
              </>
            )}
          </span>
          <span className="num shrink-0 text-xs text-fg-2">{Math.min(100, Math.round((app.budgetUsd / gate) * 100))}%</span>
        </div>
        <ProgressBar
          value={Math.min(app.budgetUsd, gate)}
          max={gate}
          tone={armed ? "rev" : app.budgetUsd === 0 ? "warn" : "info"}
        />
        {!armed && (
          <p className="small mt-2 text-fg-2">
            <Money usd={Math.max(0, gate - app.budgetUsd)} className="text-fg" exact /> of fees to go.
          </p>
        )}
      </div>

      <dl className="mt-5 grid gap-x-8 gap-y-1.5 border-t border-line pt-4 text-xs sm:grid-cols-2">
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-fg-2">first build gate</dt>
          <dd className="num">
            <Money usd={MIN_BUILD_BUDGET_USD} className={firstBuildDone ? "text-fg-2" : "text-fg"} />
            {firstBuildDone && <span className="ml-1 text-rev">cleared</span>}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-fg-2">per-iteration cap</dt>
          <dd className="num">
            <Money usd={ITERATION_BUDGET_USD.MIN} className="text-fg" /> –{" "}
            <Money usd={ITERATION_BUDGET_USD.MAX} className="text-fg" />
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-fg-2">versions shipped</dt>
          <dd className="num">v{app.liveVersion}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-fg-2">launch stake</dt>
          <dd className="num">
            {formatSol(app.stakeSol)}{" "}
            <span className={app.stakeRefundedAt ? "text-rev" : "text-fg-2"}>
              {app.stakeRefundedAt ? "refunded" : "held"}
            </span>
          </dd>
        </div>
      </dl>

      <p className="small mt-3 text-fg-2">
        At <span className="num text-fg">$0</span> the app goes <span className="text-warn">dormant</span>: it keeps
        serving traffic and keeps earning revenue, but no new build or self-heal runs. The next trading fee or top-up
        restarts it without anyone stepping in.
      </p>
    </section>
  );
};
