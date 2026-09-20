import { Link, NavLink, Outlet, isRouteErrorResponse, useRouteError } from "react-router-dom";
import type { ReactNode } from "react";
import { WalletButton } from "../components/WalletButton.js";
import { NotificationBell } from "./NotificationBell.js";
import { ToastProvider } from "../components/Toast.js";
import { IconBurn, IconChart, IconRefresh, IconRocket, IconUsers, IconVote, ShipMark } from "../components/icons.js";
import { isHttpError } from "../api/client.js";

const NAV: Array<{ to: string; label: string; icon: (p: { size?: number }) => ReactNode }> = [
  { to: "/", label: "Leaderboard", icon: IconChart },
  { to: "/launch", label: "Launch", icon: IconRocket },
  { to: "/ship", label: "$BERTH", icon: IconBurn },
  { to: "/governance", label: "Governance", icon: IconVote },
  { to: "/me", label: "Me", icon: IconUsers },
];

/**
 * Launch is the header's one lit control, so it is not also a nav item on
 * desktop. On mobile the bottom bar is the only navigation there is, so it
 * keeps all four.
 */
const DESKTOP_NAV = NAV.filter((n) => n.to !== "/launch");

/**
 * The lockup: the 16x16 sprite, the name in the pixel face at 16px, and the
 * line of copy that says what the product is. `ShipMark` is pixel-exact only at
 * integer multiples of its 16-unit grid, so the mark is 16 — not 20, where a
 * 1-unit feature lands on 1.25 device pixels and the sprite loses its edges.
 */
const Mark = () => (
  <Link to="/" className="flex shrink-0 items-center gap-2" aria-label="Berth home">
    <ShipMark size={16} className="text-rev" aria-hidden />
    <span className="font-pixel text-base leading-none tracking-[0.01em]">berth</span>
    <span className="label hidden leading-none lg:inline">coins that build apps</span>
  </Link>
);

const RouteError = () => {
  const err = useRouteError();
  const status = isHttpError(err) ? err.status : isRouteErrorResponse(err) ? err.status : null;
  const msg = isHttpError(err)
    ? err.error
    : isRouteErrorResponse(err)
      ? (err.statusText ?? "request failed")
      : err instanceof Error
        ? err.message
        : "something broke";
  return (
    <div className="panel-raised fade-in mx-auto mt-16 max-w-md overflow-hidden p-6">
      <div className="font-pixel text-[8px] tracking-[0.14em] uppercase text-burn">{status ? `error ${status}` : "error"}</div>
      <h1 className="h2 mt-2">This page did not load</h1>
      <p className="small mt-2 leading-relaxed break-words text-fg-2">{msg}</p>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button type="button" className="btn" onClick={() => window.location.reload()}>
          <IconRefresh size={14} />
          Retry
        </button>
        <Link to="/" className="btn btn-primary">
          Back to leaderboard
        </Link>
      </div>
    </div>
  );
};

export const Shell = ({ error = false }: { error?: boolean }) => (
  <ToastProvider>
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:btn focus:absolute focus:top-2 focus:left-2 focus:z-50">
        Skip to content
      </a>

      <header className="sticky top-0 z-30 border-b border-line bg-bg">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-3 sm:gap-5 sm:px-5">
          <Mark />

          {/* Pixel nav at the same 10px step as `btn`, so the whole bar reads as
              one machine. Active is a hard 2px block seated on the bottom rule —
              no accent colour: green is money, not navigation. */}
          <nav className="ml-auto hidden items-stretch self-stretch sm:flex" aria-label="Primary">
            {DESKTOP_NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === "/"}
                className={({ isActive }) =>
                  `relative flex items-center px-3 font-pixel text-[10px] tracking-[0.08em] uppercase transition-colors ${
                    isActive ? "text-fg" : "text-fg-2 hover:text-fg"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {n.label}
                    {isActive && <span className="absolute inset-x-2 bottom-0 h-[2px] bg-fg" aria-hidden />}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2 sm:ml-0">
            <Link to="/launch" className="btn btn-primary hidden sm:inline-flex">
              <IconRocket size={14} />
              Launch
            </Link>
            <NotificationBell />
            <WalletButton />
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-3 pt-5 pb-24 sm:px-5 sm:pb-10">
        {error ? <RouteError /> : <Outlet />}
      </main>

      <footer className="mt-8 border-t border-line">
        <div className="mx-auto grid max-w-7xl gap-7 px-3 py-9 sm:grid-cols-3 sm:px-5">
          <div>
            <div className="label mb-3">Product</div>
            <ul className="small space-y-2 text-fg-2">
              <li>
                <Link to="/" className="transition-colors hover:text-fg">
                  Leaderboard
                </Link>
              </li>
              <li>
                <Link to="/launch" className="transition-colors hover:text-fg">
                  Launch a coin
                </Link>
              </li>
              <li>
                <Link to="/ship" className="transition-colors hover:text-fg">
                  $BERTH staking
                </Link>
              </li>
              <li>
                <Link to="/status" className="transition-colors hover:text-fg">
                  Status
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <div className="label mb-3">Legal</div>
            <ul className="small space-y-2 text-fg-2">
              <li>
                <Link to="/legal/terms" className="transition-colors hover:text-fg">
                  Terms
                </Link>
              </li>
              <li>
                <Link to="/legal/privacy" className="transition-colors hover:text-fg">
                  Privacy
                </Link>
              </li>
              <li>
                <Link to="/legal/content-policy" className="transition-colors hover:text-fg">
                  Content policy
                </Link>
              </li>
            </ul>
          </div>
          <div className="sm:text-right">
            <div className="flex items-baseline gap-2 sm:justify-end">
              <ShipMark size={16} className="translate-y-[2px] text-rev" aria-hidden />
              <span className="font-pixel text-sm leading-none tracking-[0.01em]">berth</span>
            </div>
            <p className="small mt-2.5 text-fg-2">
              Fees fund the build. <span className="text-rev">Revenue funds the burn.</span>
            </p>
            <p className="micro mt-2 leading-relaxed text-fg-2">
              Coins are not investments. Apps can fail. Nothing here is financial advice.
            </p>
          </div>
        </div>
      </footer>

      {/* Mobile bar: fixed height, safe-area padded, and the active state is an
          absolutely positioned indicator so switching tabs never reflows. */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg pb-[env(safe-area-inset-bottom)] sm:hidden"
        aria-label="Primary (mobile)"
      >
        <ul className="grid grid-cols-5">
          {NAV.map((n) => (
            <li key={n.to}>
              <NavLink
                to={n.to}
                end={n.to === "/"}
                className={({ isActive }) =>
                  `relative flex h-[3.4rem] flex-col items-center justify-center gap-1 transition-colors ${
                    isActive ? "text-fg" : "text-fg-2"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {/* A stepped block, not a sliding pill: the indicator snaps
                        between cells because it reports a state, not a motion. */}
                    <span
                      className={`absolute top-0 h-[3px] w-6 bg-fg transition-opacity duration-150 ${
                        isActive ? "opacity-100" : "opacity-0"
                      }`}
                      aria-hidden
                    />
                    {/* 16, not 19: the icons are 16x16 1-bit sprites, so only
                        multiples of 16 put one art unit on one device pixel. */}
                    <n.icon size={16} />
                    {/* Explicit pixel classes, not `label`: `label` pins its own
                        colour and would erase the active/inactive distinction. */}
                    <span className="font-pixel text-[8px] leading-none tracking-[0.14em] uppercase">{n.label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  </ToastProvider>
);
