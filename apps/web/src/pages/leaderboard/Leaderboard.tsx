import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { LeaderboardSort, MIN_BUILD_BUDGET_USD } from "@ship/shared";
import { useApps } from "../../api/queries.js";
import { useSse } from "../../api/sse.js";
import { AppCard } from "../../components/AppCard.js";
import { Skeleton } from "../../components/Skeleton.js";
import { Reveal } from "../../components/Reveal.js";
import { Tabs } from "../../components/Tabs.js";
import { IconImage } from "../../components/icons.js";
import { EmptyBoard } from "./EmptyBoard.js";
import { FaqSection } from "./FaqSection.js";
import { HowItWorks } from "./HowItWorks.js";
import { Landing } from "./Landing.js";
import { LatestActivity, LatestActivitySkeleton } from "./LatestActivity.js";
import { LeaderboardTable } from "./LeaderboardTable.js";
import { LiveApps } from "./LiveApps.js";
import { RoleSplit } from "./RoleSplit.js";
import { TemplateMoat } from "./TemplateMoat.js";

/*
 * Page order is an argument: the claim, then the evidence, then the mechanism,
 * then the objections. The board comes second because it is the only thing here
 * that cannot be written by a copywriter.
 *
 * Vertical rhythm is deliberately uneven — the hero and the board are one
 * movement and sit close together, and each section after that sets its own
 * top margin so the page breathes between arguments instead of every 24px.
 */

const TABS: Array<{ id: LeaderboardSort; label: string }> = [
  { id: "revenue", label: "Revenue" },
  { id: "buybacks", label: "Buybacks" },
  { id: "users", label: "Users" },
  { id: "newest", label: "Newest" },
  { id: "building", label: "Building" },
  { id: "dormant", label: "Dormant" },
];

const CAPTION: Record<LeaderboardSort, string> = {
  revenue: "Ranked by lifetime revenue.",
  buybacks: "Ranked by SOL spent buying the coin back and burning it.",
  users: "Ranked by paying users, not holders.",
  newest: "Newest launches first.",
  building: "Apps with an agent job running right now.",
  dormant: "Shipped, out of build budget, waiting for a buy.",
};

type View = "cards" | "table";
const VIEW_KEY = "ship:leaderboard:view";

const storedView = (): View => {
  try {
    return localStorage.getItem(VIEW_KEY) === "cards" ? "cards" : "table";
  } catch {
    return "table";
  }
};

export const Leaderboard = () => {
  const [params, setParams] = useSearchParams();
  const sortParam = LeaderboardSort.safeParse(params.get("sort"));
  const sort: LeaderboardSort = sortParam.success ? sortParam.data : "revenue";
  const viewParam = params.get("view");
  const [view, setView] = useState<View>(() =>
    viewParam === "cards" || viewParam === "table" ? viewParam : storedView(),
  );
  const q = useApps(sort);
  // The hero and the live-app strip always show the money leaders, whatever tab the board is on.
  const top = useApps("revenue");
  const qc = useQueryClient();

  // A single stream carries every leaderboard-affecting change on the platform,
  // so a burst of events (a launch, a build, a buyback in the same second) would
  // otherwise fire an ['apps'] invalidation each. Coalesce them into one refetch
  // a beat after the burst settles.
  const invalidateTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(invalidateTimer.current), []);
  const scheduleInvalidate = useCallback(() => {
    window.clearTimeout(invalidateTimer.current);
    invalidateTimer.current = window.setTimeout(() => {
      void qc.invalidateQueries({ queryKey: ["apps"] });
    }, 1500);
  }, [qc]);
  useSse<{ appId: string }>("/v1/apps/stream", { onMessage: scheduleInvalidate });

  const apps = useMemo(() => q.data?.pages.flatMap((p) => p.items) ?? [], [q.data]);
  const topApps = useMemo(() => top.data?.pages.flatMap((p) => p.items) ?? [], [top.data]);
  // The dormant explainer is far more convincing with a real stalled app attached.
  const dormant = useMemo(
    () => topApps.find((a) => a.status === "DORMANT") ?? apps.find((a) => a.status === "DORMANT") ?? null,
    [topApps, apps],
  );

  useEffect(() => {
    document.title = "Berth — every coin owns a real product";
  }, []);

  const setParam = useCallback(
    (k: string, v: string, fallback: string) => {
      const next = new URLSearchParams(params);
      if (v === fallback) next.delete(k);
      else next.set(k, v);
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  const changeView = (v: View) => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* private mode: in-memory only */
    }
    setParam("view", v, "table");
  };

  return (
    <div>
      <Landing apps={topApps} loading={top.isPending} />

      <section id="board" aria-labelledby="board-h" className="mt-14 scroll-mt-20 sm:mt-20">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <h2 id="board-h" className="h2">
            Ranked by what the product earned
          </h2>
          <div className="flex shrink-0 items-center gap-1" role="group" aria-label="View">
            <button
              type="button"
              className={`btn btn-ghost px-2.5 py-1 text-xs ${view === "table" ? "border-line-2 bg-bg-2 text-fg" : ""}`}
              aria-pressed={view === "table"}
              onClick={() => changeView("table")}
            >
              table
            </button>
            <button
              type="button"
              className={`btn btn-ghost px-2.5 py-1 text-xs ${view === "cards" ? "border-line-2 bg-bg-2 text-fg" : ""}`}
              aria-pressed={view === "cards"}
              onClick={() => changeView("cards")}
            >
              cards
            </button>
          </div>
        </div>

        <div className="mt-4 border-b border-line">
          <Tabs items={TABS} active={sort} ariaLabel="Sort leaderboard" onChange={(id) => setParam("sort", id, "revenue")} />
        </div>

        {q.isError && (
          <p className="body mt-4 text-burn" role="alert">
            Could not load the leaderboard: {q.error.message}
          </p>
        )}

        <div className="mt-5">
          {q.isPending ? (
            view === "table" ? (
              <LeaderboardTable apps={[]} caption={CAPTION[sort]} loading />
            ) : (
              <div className="card-grid">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="panel flex flex-col gap-3 p-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-12" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-3.5 w-32" />
                        <Skeleton className="h-3 w-48 max-w-full" />
                      </div>
                    </div>
                    <Skeleton className="h-8 w-28" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                ))}
              </div>
            )
          ) : apps.length === 0 ? (
            <EmptyBoard
              sort={sort}
              platformEmpty={topApps.length === 0 && !top.isPending}
              onShowEarners={() => setParam("sort", "revenue", "revenue")}
            />
          ) : view === "table" ? (
            <LeaderboardTable apps={apps} caption={CAPTION[sort]} loading={q.isFetchingNextPage} />
          ) : (
            <div className="card-grid">
              {apps.map((a) => (
                <AppCard key={a.id} app={a} />
              ))}
            </div>
          )}
        </div>

        {q.hasNextPage && (
          <div className="mt-5 flex justify-center">
            <button type="button" className="btn" disabled={q.isFetchingNextPage} onClick={() => void q.fetchNextPage()}>
              {q.isFetchingNextPage ? "loading…" : "Load more"}
            </button>
          </div>
        )}

        <div className="mt-8">
          <LiveApps apps={topApps} />
        </div>

        {topApps.length > 0 && (
          <p className="mt-5">
            <Link
              to="/card"
              className="inline-flex items-center gap-1.5 text-sm text-fg-2 underline decoration-line-2 underline-offset-4 transition-colors hover:text-fg"
            >
              <IconImage size={14} />
              Share this board as a 1200×630 image
            </Link>
          </p>
        )}
      </section>

      {top.isPending ? <LatestActivitySkeleton /> : <LatestActivity apps={topApps} />}

      <Reveal>
        <HowItWorks dormant={dormant} />
      </Reveal>

      <Reveal>
        <RoleSplit />
      </Reveal>

      <Reveal>
        <TemplateMoat />
      </Reveal>

      <Reveal>
        <FaqSection />
      </Reveal>

      <div className="mt-20 flex flex-col gap-5 border-t border-line pt-8 sm:mt-28 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
        <p className="body max-w-2xl text-fg-2">
          <span className="text-fg">One sentence is the whole application process.</span> Describe an app somebody
          would pay for. The intake agent turns it into a spec you approve, the coin launches on pump.fun, and the
          first <span className="num text-fg">${MIN_BUILD_BUDGET_USD}</span> of trading fees puts the build agent to
          work in public.
        </p>
        <Link to="/launch" className="btn btn-primary btn-lg shrink-0">
          Launch an app
        </Link>
      </div>
    </div>
  );
};
