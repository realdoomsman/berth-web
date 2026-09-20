import { lazy, Suspense } from "react";
import type { ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { Shell } from "./layout/Shell.js";
import { Skeleton } from "./components/Skeleton.js";
import { useAuth } from "./auth/useAuth.js";

/*
 * Every route is its own chunk. The dynamic imports below are the split points:
 * a static import would put all eight pages — including the chart library and
 * anything a page drags in — into the entry chunk the landing page waits on.
 */
const Leaderboard = lazy(async () => ({ default: (await import("./pages/leaderboard/Leaderboard.js")).Leaderboard }));
const Launch = lazy(async () => ({ default: (await import("./pages/launch/Launch.js")).Launch }));
const CoinPage = lazy(async () => ({ default: (await import("./pages/coin/CoinPage.js")).CoinPage }));
const MePage = lazy(async () => ({ default: (await import("./pages/me/MePage.js")).MePage }));
const OpsPage = lazy(async () => ({ default: (await import("./pages/ops/OpsPage.js")).OpsPage }));
const ShipPage = lazy(async () => ({ default: (await import("./pages/ship/ShipPage.js")).ShipPage }));
const Governance = lazy(async () => ({ default: (await import("./pages/governance/Governance.js")).Governance }));
const LegalPage = lazy(async () => ({ default: (await import("./pages/legal/LegalPage.js")).LegalPage }));
const Status = lazy(async () => ({ default: (await import("./pages/status/Status.js")).Status }));
const NotFound = lazy(async () => ({ default: (await import("./pages/NotFound.js")).NotFound }));
const BoardCard = lazy(async () => ({ default: (await import("./pages/share/BoardCard.js")).BoardCard }));
const CoinCard = lazy(async () => ({ default: (await import("./pages/share/CoinCard.js")).CoinCard }));

/**
 * Shape of a page before its chunk lands: heading, standfirst, one content block.
 *
 * `fill` is load-bearing, not decoration. The Shell pins a 262 px footer to the
 * bottom of the viewport, so on a 844 px phone the footer is in view while the
 * fallback shows. If the real page turns out to be taller than the viewport, that
 * footer gets shoved off-screen and costs 0.31 CLS (measured by PixelPages, whose
 * LayoutShift.sources dump named the footer, not the chart or the feed). Holding a
 * viewport of height for pages that are reliably long keeps the footer off-screen
 * across the swap. Pages that are legitimately short when signed out — /me, /ops,
 * 404 — must NOT do that, or the footer shifts back up into view instead.
 */
const PageFallback = ({ fill }: { fill: boolean }) => (
  <div
    className={`space-y-4 ${fill ? "min-h-svh" : ""}`}
    role="status"
    aria-live="polite"
    aria-label="Loading page"
  >
    <Skeleton className="h-20 w-full max-w-lg" />
    <Skeleton className="h-4 w-72" />
    <Skeleton className="h-72 w-full" />
  </div>
);

/*
 * /me and /ops are short signed out (an explainer, a 403 block) and long signed
 * in (CraftFlows measured /ops at 2124 px for an operator), so a per-route flag
 * is wrong for them in one of the two states. We already know which state we are
 * in synchronously — a returning session is detected from the stored token before
 * /v1/me resolves — so decide per render instead of guessing per route. Un-ready
 * means we expect a session, which means the long variant.
 */
const AuthSizedFallback = () => {
  const auth = useAuth();
  return <PageFallback fill={!auth.ready || auth.authenticated} />;
};

/** In-Shell route: suspend on the page chunk, keep the header and footer painted. */
const page = (node: ReactNode, fill: boolean | "auth" = true) => (
  <Suspense fallback={fill === "auth" ? <AuthSizedFallback /> : <PageFallback fill={fill} />}>{node}</Suspense>
);

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Shell />,
    errorElement: <Shell error />,
    children: [
      { index: true, element: page(<Leaderboard />) },
      { path: "launch", element: page(<Launch />) },
      { path: "c/:slug", element: page(<CoinPage />) },
      { path: "me", element: page(<MePage />, "auth") },
      { path: "ops", element: page(<OpsPage />, "auth") },
      { path: "ship", element: page(<ShipPage />) },
      { path: "governance", element: page(<Governance />) },
      { path: "status", element: page(<Status />, false) },
      { path: "legal", element: <Navigate to="/legal/terms" replace /> },
      { path: "legal/:doc", element: page(<LegalPage />) },
      { path: "*", element: page(<NotFound />, false) },
    ],
  },
  // Share compositions: fixed 1200×630, deliberately outside the Shell so there
  // is no header, footer or nav in the screenshot. No wallet, no auth — they are
  // rendered by a screenshot runner, so the fallback is blank rather than a
  // skeleton that could be captured mid-load.
  { path: "/card", element: <Suspense fallback={null}>{<BoardCard />}</Suspense> },
  { path: "/c/:slug/card", element: <Suspense fallback={null}>{<CoinCard />}</Suspense> },
]);
