import { Link } from "react-router-dom";
import type { AppSummary, BuildEventType } from "../../api/types.js";
import { StatusBlock, type StatusTone } from "../../components/StatusBadge.js";
import { feedLine } from "../../components/feedLine.js";
import { timeAgo } from "../../lib/format.js";

/*
 * Cross-app activity rail. Every app summary carries its most recent build
 * event, so sorted by recency this is a live cut of what the agents did last
 * across the whole platform — and it refreshes on the same global SSE the board
 * already subscribes to (Leaderboard invalidates the `apps` query on every
 * frame). It is evidence, not decoration: each row links to the coin whose
 * agent produced it. Renders nothing until there is real activity, so an empty
 * platform shows no empty box.
 */

/* Money and merges are money-in green; deaths are money-out red; a growth post
   is a neutral external reference. Everything else is the agent at work, which
   is deliberately low-chroma violet — status, not money. Missing key falls back
   to the agent tone at the call site. */
const TONE: Partial<Record<BuildEventType, StatusTone>> = {
  DEPLOY: "in",
  REVIVED: "in",
  MILESTONE: "in",
  JOB_FINISHED: "in",
  PR_MERGED: "in",
  BOUNTY_CLAIMED: "in",
  JOB_FAILED: "out",
  DORMANT: "out",
  SELF_HEAL: "out",
  GROWTH_POST: "info",
};

const ROWS = 6;

/** Fixed-height placeholder: same row count as the loaded list, so the sections
    below it do not jump when the query resolves. */
export const LatestActivitySkeleton = () => (
  <section className="mt-12 sm:mt-16" aria-hidden>
    <div className="h-4 w-56 max-w-full bg-bg-2" />
    <div className="panel-inset mt-4">
      {Array.from({ length: ROWS }, (_, i) => (
        <div key={i} className="flex items-start gap-3 border-b border-line px-3 py-2.5 last:border-b-0">
          <span className="mt-1 size-[7px] bg-bg-3" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="h-3 w-40 max-w-full bg-bg-2" />
            <div className="h-2.5 w-64 max-w-full bg-bg-2/60" />
          </div>
          <span className="mt-1 h-2.5 w-10 bg-bg-2" />
        </div>
      ))}
    </div>
  </section>
);

export const LatestActivity = ({ apps }: { apps: AppSummary[] }) => {
  const rows = apps
    .filter((a) => a.lastEvent)
    .map((a) => ({ app: a, e: a.lastEvent! }))
    .sort((x, y) => new Date(y.e.createdAt).getTime() - new Date(x.e.createdAt).getTime())
    .slice(0, ROWS);
  if (rows.length === 0) return null;

  const building = apps.some((a) => a.runningJob);

  return (
    <section aria-labelledby="activity-h" className="mt-12 sm:mt-16">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="activity-h" className="h2">
          Latest from the build agents
        </h2>
        <span className="label flex items-center gap-1.5">
          <StatusBlock tone={building ? "agent" : "in"} live={building} size={6} />
          {building ? "building now" : "live"}
        </span>
      </div>

      <ul className="panel-inset mt-4" aria-label="Recent activity across all apps">
        {rows.map(({ app, e }) => (
          <li key={e.id} className="border-b border-line last:border-b-0">
            <Link
              to={`/c/${app.slug}`}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 px-3 py-2.5 transition-colors hover:bg-bg-2/40"
            >
              <StatusBlock tone={TONE[e.type] ?? "agent"} live={!!app.runningJob} size={7} className="mt-1" />
              <span className="min-w-0">
                <span className="flex items-baseline gap-2">
                  <span className="truncate text-sm font-medium text-fg">{app.name}</span>
                  <span className="num shrink-0 text-[11px] text-fg-3">${app.ticker}</span>
                </span>
                <span className="mt-0.5 block truncate small text-fg-2">{feedLine(e)}</span>
              </span>
              <span className="num mt-1 shrink-0 text-[11px] text-fg-3">{timeAgo(e.createdAt)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};
