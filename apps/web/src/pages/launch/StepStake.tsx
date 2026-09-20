import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LAUNCH_STAKE_LAMPORTS } from "@ship/shared";
import { useAuth } from "../../auth/useAuth.js";
import { getSolBalance } from "../../lib/solana.js";
import { CopyField } from "../../components/CopyField.js";
import { formatSol } from "../../lib/format.js";
import { actionError } from "../../lib/errors.js";

interface Props {
  lamports: number;
  name: string;
  ticker: string;
  busy: boolean;
  error: string | null;
  onStaked: () => void;
}

/**
 * Launch stake, custodial-style: the platform signs the 0.05 SOL stake from the
 * user's own wallet, so the only thing the user does here is fund that wallet and
 * press the button. No client signing, no manual-signature fallback.
 */
export const StepStake = ({ lamports, name, ticker, busy, error, onStaked }: Props) => {
  const auth = useAuth();
  const wallet = auth.wallet;
  const [balance, setBalance] = useState<number | null>(null);
  const sol = (lamports || LAUNCH_STAKE_LAMPORTS) / 1e9;

  useEffect(() => {
    if (!wallet) return;
    let live = true;
    const tick = () =>
      void getSolBalance(wallet)
        .then((b) => live && setBalance(b))
        .catch(() => undefined);
    tick();
    const t = window.setInterval(tick, 8000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, [wallet]);

  const needsFunds = balance !== null && balance < sol + 0.001;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="flex min-w-0 flex-col">
        <div className="border-b border-line pb-7">
          <h2 className="h3 text-fg-2">Launch stake</h2>
          <div className="figure figure-xl mt-2">{formatSol(sol)}</div>
          <p className="mt-3 max-w-prose text-sm text-fg-2">
            Bots pay this, real launches do not. The stake covers <span className="num">${ticker}</span>&apos;s pump.fun creation
            transaction and returns to your wallet at the first build. Berth signs it from your wallet — deposit at least{" "}
            <span className="num">{formatSol(sol)}</span> first.
          </p>
          {wallet && <CopyField className="mt-5" label={`${name} — your wallet (deposit ${formatSol(sol)} here)`} value={wallet} wrap />}
        </div>

        <dl className="flex flex-wrap items-end justify-between gap-3 border-b border-line py-5">
          <div className="min-w-0">
            <dt className="label">staking from</dt>
            <dd className="num mt-1 truncate text-sm">{wallet ?? "—"}</dd>
          </div>
          <div className="text-right">
            <dt className="label">balance</dt>
            <dd className={`num mt-1 text-sm ${needsFunds ? "text-warn" : "text-rev"}`} aria-live="polite">
              {balance === null ? <span className="text-fg-3">reading…</span> : formatSol(balance)}
            </dd>
          </div>
          {needsFunds && (
            <p className="w-full border-l-2 border-warn pl-3 text-xs text-fg-2">
              Fund this wallet with at least <span className="num text-warn">{formatSol(sol + 0.001)}</span>, which is the stake plus the network fee. Send
              SOL to the address above; the balance refreshes every 8 seconds.
            </p>
          )}
        </dl>

        {error && (
          <div role="alert" className="mt-5 border-l-2 border-burn pl-3 text-sm text-burn">
            {actionError(error, wallet)}
          </div>
        )}

        <div className="mt-7 flex flex-col gap-3">
          <button
            type="button"
            className="btn btn-primary btn-lg w-full sm:w-auto sm:self-start"
            disabled={!wallet || busy || needsFunds}
            onClick={onStaked}
          >
            {busy ? "Staking…" : `Stake ${formatSol(sol)}`}
          </button>
        </div>

        <p className="mt-7 text-xs text-fg-2">
          By staking you agree to the{" "}
          <Link to="/legal/terms" className="underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link to="/legal/content-policy" className="underline">
            Content Policy
          </Link>
          . Buybacks are on-chain purchases and burns, not distributions to holders.
        </p>
      </div>

      <aside className="self-start border-l border-line pl-4 text-sm lg:sticky lg:top-20">
        <h2 className="h3">Refund conditions</h2>
        <ul className="mt-3 flex flex-col gap-2.5 text-fg-2">
          <li>
            Refunded in full when the app&apos;s accrued build budget first reaches <span className="num">$50</span>.
          </li>
          <li>Refunded if the pump.fun launch fails, and the app is marked failed.</li>
          <li className="text-burn">Forfeited only if the app is killed for a content-policy violation before the first build.</li>
        </ul>
      </aside>
    </div>
  );
};
