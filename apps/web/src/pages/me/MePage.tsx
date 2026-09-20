import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/useAuth.js";
import { useMe } from "../../api/queries.js";
import { Skeleton } from "../../components/Skeleton.js";
import { Tabs } from "../../components/Tabs.js";
import { LauncherDashboard } from "./LauncherDashboard.js";
import { HolderDashboard } from "./HolderDashboard.js";
import { AccountSection } from "./AccountSection.js";
import { shortAddr } from "../../lib/format.js";

type View = "launcher" | "holder" | "account";

const VIEW_OF: Record<string, View> = { launcher: "launcher", holder: "holder", account: "account" };

const TIER_CLS: Record<string, string> = { NEW: "text-fg-2", TRUSTED: "text-info", VETERAN: "text-rev" };

export const MePage = () => {
  const auth = useAuth();
  const me = useMe(auth.authenticated);
  const [params, setParams] = useSearchParams();
  const view: View = VIEW_OF[params.get("view") ?? ""] ?? "launcher";

  useEffect(() => {
    document.title = "Berth — me";
  }, []);

  if (!auth.ready) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (!auth.authenticated) {
    return (
      <div className="mx-auto max-w-xl py-6">
        <h1 className="h1">Your launches and your bags</h1>
        <p className="body mt-4 text-fg-2">
          Signed in, this page shows two things. The apps you launched: fee share paid to you, revenue they made, build health, and whether
          the <span className="num">0.05 SOL</span> stake came back. And the coins you hold: balance, share of supply, and how much supply
          each app&apos;s revenue has burned underneath you.
        </p>
        <p className="small mt-4 text-fg-2">
          Both sides read from your account, so there is nothing to connect. Sign in with Google or a Solana wallet — we create a custodial Solana wallet for your account automatically.
        </p>
        <button type="button" className="btn btn-primary btn-lg mt-7" onClick={auth.login}>
          Sign in
        </button>
      </div>
    );
  }

  const name = me.data?.displayName ?? auth.displayName ?? "You";

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-wrap items-baseline gap-x-4 gap-y-2 border-b border-line pb-5">
        <div className="min-w-0">
          <h1 className="h1 truncate">{name}</h1>
          <p className="num mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-2">
            <span>{auth.wallet ? shortAddr(auth.wallet, 6) : "no wallet"}</span>
            {me.data && (
              <>
                <span className={TIER_CLS[me.data.reputationTier] ?? "text-fg-2"}>
                  {me.data.reputation} rep · {me.data.reputationTier.toLowerCase()}
                </span>
                <span>
                  {me.data.launchesToday}/{me.data.launchesPerDay} launches today
                </span>
              </>
            )}
          </p>
        </div>
        <Link to="/launch" className="btn btn-primary ml-auto">
          New launch
        </Link>
      </header>

      <Tabs
        ariaLabel="Dashboard view"
        items={[
          { id: "launcher", label: "Launcher" },
          { id: "holder", label: "Holder" },
          { id: "account", label: "Account" },
        ]}
        active={view}
        onChange={(id) => setParams({ view: id }, { replace: true })}
      />

      {view === "launcher" ? (
        <LauncherDashboard me={me.data} />
      ) : view === "holder" ? (
        <HolderDashboard />
      ) : (
        <AccountSection me={me.data} />
      )}
    </div>
  );
};
