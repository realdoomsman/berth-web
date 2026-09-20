import { Link } from "react-router-dom";
import { MIN_BUILD_BUDGET_USD, ITERATION_BUDGET_USD } from "@ship/shared";
import type { AppDetail, AppStatus } from "../../api/types.js";
import { Monogram } from "../../components/Monogram.js";
import { BADGE, StatusBadge } from "../../components/StatusBadge.js";
import { IconExternal, IconGithub } from "../../components/icons.js";
import { timeAgo } from "../../lib/format.js";
import { appUrl, pumpCoinUrl } from "../../env.js";

interface Props {
  app: AppDetail;
  onReport: () => void;
  onTopup: () => void;
}

/** Statuses where a market exists and price/mcap are meaningful. */
const TRADED: Partial<Record<AppStatus, true>> = { LIVE: true, DORMANT: true, KILLED: true };

const PRE_LAUNCH: Partial<Record<AppStatus, { title: string; body: string }>> = {
  DRAFT: {
    title: "Spec being written",
    body: "The intake agent is turning the launcher's prompt into a buildable spec. No coin exists yet.",
  },
  SPEC_READY: {
    title: "Spec ready, waiting on the launcher",
    body: "The spec in the Spec tab is what gets built. The coin is minted once the launcher approves it and posts the refundable stake.",
  },
  AWAITING_STAKE: {
    title: "Waiting on the launch stake",
    body: "The launcher posts a refundable 0.05 SOL stake, then the coin is minted. Nothing is tradeable before that.",
  },
  LAUNCHING: {
    title: "Minting on pump.fun",
    body: "The coin is being created and its fee stream wired to the build budget. Price and market cap appear on the first trade.",
  },
};

export const CoinHeader = ({ app, onReport, onTopup }: Props) => {
  const traded = !!TRADED[app.status];
  const openUrl = app.liveUrl ?? (app.liveVersion > 0 ? appUrl(app.slug) : null);
  const pump = app.pumpUrl ?? (app.mint ? pumpCoinUrl(app.mint) : null);
  const forkable = app.status === "LIVE" || app.status === "DORMANT";
  const pre = PRE_LAUNCH[app.status];
  const reviveGate = app.firstBuildAt ? ITERATION_BUDGET_USD.MIN : MIN_BUILD_BUDGET_USD;

  return (
    <header className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
        <Monogram ticker={app.ticker} src={app.imageUrl} size={56} className="shrink-0" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <h1 className="h1">{app.name}</h1>
            <span className="num text-base text-fg-2 sm:text-lg">${app.ticker}</span>
            <StatusBadge status={app.status} runningStage={app.runningJob?.stage ?? null} />
            {/* These sit shoulder to shoulder with `StatusBadge`, so they wear
                the same shape. A sans pill next to two pixel badges reads as a
                different kind of object when it is the same kind of object. */}
            {traded && (
              <span
                className={`${BADGE} border-line-2 px-2 py-[5px] text-fg-2`}
                title={
                  app.curveStage === "GRADUATED"
                    ? "Graduated off the bonding curve — trades on PumpSwap"
                    : "Still on the pump.fun bonding curve"
                }
              >
                {app.curveStage === "GRADUATED" ? "graduated" : "bonding"}
              </span>
            )}
            {app.forkOf && (
              <Link
                to={`/c/${app.forkOf.slug}`}
                className={`${BADGE} border-violet/40 px-2 py-[5px] text-violet transition-colors hover:bg-violet/10`}
                title="10% of this app's fees route to its parent"
              >
                fork of ${app.forkOf.ticker}
              </Link>
            )}
          </div>

          <p className="body mt-2 max-w-2xl text-fg-2">{app.spec?.oneLiner ?? app.oneLiner ?? "Spec pending."}</p>

          <div className="small mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-fg-2">
            <span>
              launched by{" "}
              <span className="text-fg">
                {app.launcher.xHandle ? `@${app.launcher.xHandle}` : (app.launcher.displayName ?? "anon")}
              </span>
            </span>
            <span aria-hidden className="text-line-2">
              ·
            </span>
            <span className="num">{timeAgo(app.createdAt)}</span>
            {app.forksCount > 0 && (
              <>
                <span aria-hidden className="text-line-2">
                  ·
                </span>
                <span className="num">{app.forksCount} forks</span>
              </>
            )}
            {app.twitterUrl && (
              <a href={app.twitterUrl} target="_blank" rel="noreferrer" className="text-info hover:underline">
                x
              </a>
            )}
            {app.websiteUrl && (
              <a href={app.websiteUrl} target="_blank" rel="noreferrer" className="text-info hover:underline">
                site
              </a>
            )}
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          {openUrl && (
            <a href={openUrl} target="_blank" rel="noreferrer" className="btn btn-primary">
              Open app
              <IconExternal size={13} />
            </a>
          )}
          {pump && (
            <a href={pump} target="_blank" rel="noreferrer" className="btn">
              pump.fun
              <IconExternal size={13} />
            </a>
          )}
          {app.repoUrl && (
            <a
              href={app.repoUrl}
              target="_blank"
              rel="noreferrer"
              className="btn px-2.5"
              aria-label="GitHub repository"
              title="Source on GitHub — MIT, PRs welcome"
            >
              <IconGithub size={15} />
            </a>
          )}
          {forkable && (
            <Link
              to={`/launch?fork=${app.slug}`}
              className="btn btn-ghost"
              title="Launch your own version — 10% of its fees route back here"
            >
              Fork
            </Link>
          )}
          <button type="button" className="btn btn-ghost text-fg-2 hover:text-burn" onClick={onReport}>
            Report
          </button>
        </div>
      </div>

      {app.status === "DORMANT" && (
        <div role="status" className="flex flex-wrap items-center gap-x-5 gap-y-3 border-l-2 border-warn pl-4">
          <div className="min-w-0 basis-full sm:flex-1 sm:basis-auto">
            <h2 className="h3 text-warn">Dormant: the budget ran out</h2>
            <p className="small mt-1 max-w-2xl text-fg-2">
              The app still serves traffic and still earns revenue. What stopped is the build loop: no new versions and
              no self-heals, because the budget is at{" "}
              <span className="num text-fg">${app.budgetUsd.toFixed(2)}</span> and a job needs{" "}
              <span className="num text-fg">${reviveGate}</span>. Trading fees refill it automatically, so buying the
              coin is how the next build gets paid for. A direct top-up does the same thing faster.
            </p>
          </div>
          {pump && (
            <a href={pump} target="_blank" rel="noreferrer" className="btn btn-primary">
              Buy to revive
              <IconExternal size={13} />
            </a>
          )}
          <button type="button" className="btn" onClick={onTopup}>
            Top up budget
          </button>
        </div>
      )}

      {(app.status === "KILLED" || app.status === "FAILED") && (
        <div role="status" className="border-l-2 border-burn pl-4">
          <h2 className="h3 text-burn">{app.status === "KILLED" ? "Delisted" : "Build failed"}</h2>
          <p className="small mt-1 max-w-2xl text-fg-2">
            {app.killedReason ??
              (app.status === "KILLED"
                ? "Removed for a content-policy violation. The coin still trades; the app is offline."
                : "The build loop could not produce a working deploy. The launch stake was consumed; whatever budget is left stays with the app.")}
          </p>
        </div>
      )}

      {pre && (
        <div role="status" className="flex flex-wrap items-center gap-x-5 gap-y-2 border-l-2 border-info pl-4">
          <div className="min-w-0 basis-full sm:flex-1 sm:basis-auto">
            <h2 className="h3 text-info">{pre.title}</h2>
            <p className="small mt-1 max-w-2xl text-fg-2">{pre.body}</p>
          </div>
          <Link to="/" className="btn btn-ghost">
            Browse live coins
          </Link>
        </div>
      )}
    </header>
  );
};
