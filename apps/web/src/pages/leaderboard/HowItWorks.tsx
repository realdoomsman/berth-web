import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  FEE_SPLIT_BPS,
  ITERATION_BUDGET_USD,
  LAUNCH_STAKE_LAMPORTS,
  MIN_BUILD_BUDGET_USD,
  MIN_BUYBACK_USD,
  REVENUE_SPLIT_BPS,
} from "@ship/shared";
import type { AppSummary } from "../../api/types.js";
import { Money } from "../../components/Money.js";
import { IconBurn, IconDollar, IconRocket, IconSpark, IconTerminal } from "../../components/icons.js";
import { formatPct } from "../../lib/format.js";

const STAKE_SOL = LAUNCH_STAKE_LAMPORTS / 1_000_000_000;

/*
 * The loop, as a numbered sequence on hairlines. Five boxes in a row is the
 * stock "how it works" component; a ledger reads better as rules and columns.
 * The dormant/revive mechanic lives in the left column instead of owning a
 * whole section of its own, because it is a footnote to step 03, not a pillar.
 */

const STEPS: Array<{ n: string; t: string; b: ReactNode }> = [
  {
    n: "01",
    t: "One sentence",
    b: (
      <>
        You describe an app someone would pay for. An intake agent turns it into a spec with routes, data model and a
        priced plan, and you approve it before anything is minted. Launching costs a refundable{" "}
        <span className="num text-fg">{STAKE_SOL} SOL</span> stake, which pays for the coin-creation transaction.
      </>
    ),
  },
  {
    n: "02",
    t: "The coin launches on pump.fun",
    b: (
      <>
        A per-app wallet derived by the platform is the coin creator, so pump.fun&apos;s creator fees land somewhere the
        app can spend them. The launcher receives no supply at all.
      </>
    ),
  },
  {
    n: "03",
    t: "Trading fees become payroll",
    b: (
      <>
        Every fee splits <span className="num text-fg">{formatPct(FEE_SPLIT_BPS.BUILD_BUDGET)}</span> to this app&apos;s
        build budget, <span className="num text-fg">{formatPct(FEE_SPLIT_BPS.SHIP_TOKEN)}</span> to the $BERTH buyback
        and <span className="num text-fg">{formatPct(FEE_SPLIT_BPS.LAUNCHER)}</span> to the launcher. The first build
        starts at <span className="num text-fg">${MIN_BUILD_BUDGET_USD}</span> of accrued budget; each job after that
        needs <span className="num text-fg">${ITERATION_BUDGET_USD.MIN}</span> and is debited what it actually cost.
      </>
    ),
  },
  {
    n: "04",
    t: "The agent builds in public",
    b: (
      <>
        It scaffolds, writes tests, deploys to a real domain and self-heals after three failed healthchecks. A separate
        reviewer model reads every diff before a version goes live. The repository is public and MIT from the first
        commit, and the build feed streams while it works.
      </>
    ),
  },
  {
    n: "05",
    t: "Revenue burns supply",
    b: (
      <>
        <span className="num text-fg">{formatPct(REVENUE_SPLIT_BPS.BUYBACK_BURN)}</span> of what the app collects buys
        its own coin on the open market and burns it, in batches of{" "}
        <span className="num text-fg">${MIN_BUYBACK_USD}</span>. Nothing is paid to holders and nothing is redeemable;
        the only effect is less supply.
      </>
    ),
  },
];

/* One drawn glyph per step, in step order: prompt, launch, fees, the agent at
   work, the burn. Reuses the in-house 1-bit sprite set — no icon library. */
const STEP_ICON = [IconTerminal, IconRocket, IconDollar, IconSpark, IconBurn] as const;

/**
 * The loop. `dormant` is an optional real example of the out-of-budget state —
 * the mechanic is much easier to believe with a coin attached to it.
 */
export const HowItWorks = ({ dormant }: { dormant: AppSummary | null }) => (
  <section id="how-it-works" aria-labelledby="how-h" className="mt-24 scroll-mt-20 sm:mt-32">
    <div className="grid gap-10 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] lg:gap-16">
      <div>
        <h2 id="how-h" className="h2">
          Five steps, then it repeats
        </h2>
        <p className="body mt-3 text-fg-2">
          Trading pays for the build. The product pays for the burn. There is no treasury in between.
        </p>

        <div className="mt-6 border-t border-line pt-4">
          <h3 className="h3">When the budget hits zero</h3>
          <p className="small mt-2 text-fg-2">
            The app goes <span className="text-warn">dormant</span>: still online, still charging its users, just not
            being developed. One trade, or a direct top-up that goes entirely to budget, queues the next job. An app
            killed for a content-policy violation stops for good. Burns already executed are irreversible either way.
          </p>
          {dormant ? (
            <p className="small mt-3 text-fg-2">
              Dormant right now:{" "}
              <Link
                to={`/c/${dormant.slug}`}
                className="text-fg underline decoration-line-2 underline-offset-4 hover:text-warn"
              >
                {dormant.name}
              </Link>{" "}
              <span className="num">${dormant.ticker}</span>, budget{" "}
              <Money usd={dormant.budgetUsd} tone="plain" exact className="text-warn" />, after earning{" "}
              <Money usd={dormant.revenueUsd} tone="rev" exact={dormant.revenueUsd < 1_000_000} />.
            </p>
          ) : (
            <p className="small mt-3 text-fg-2">
              Nothing is dormant right now. When something is, it appears on the{" "}
              <Link
                to="/?sort=dormant"
                className="text-fg underline decoration-line-2 underline-offset-4 hover:text-warn"
              >
                dormant tab
              </Link>{" "}
              with its remaining budget on display.
            </p>
          )}
        </div>
      </div>

      <ol className="divide-y divide-line border-t border-line">
        {STEPS.map((s, i) => {
          const Glyph = STEP_ICON[i]!;
          return (
            <li key={s.n} className="grid gap-x-5 gap-y-2 py-5 sm:grid-cols-[3rem_minmax(0,1fr)] sm:py-6">
              <div className="flex items-center gap-2.5 sm:flex-col sm:items-start sm:gap-2" aria-hidden>
                <span className="flex size-9 shrink-0 items-center justify-center border border-line-2 bg-bg-2 text-fg-2 shadow-panel">
                  <Glyph size={16} />
                </span>
                <span className="num text-xs text-fg-3">{s.n}</span>
              </div>
              <div className="min-w-0">
                <h3 className="h3">
                  <span className="num sr-only">Step {s.n}. </span>
                  {s.t}
                </h3>
                <p className="small mt-1.5 max-w-2xl text-fg-2">{s.b}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  </section>
);
