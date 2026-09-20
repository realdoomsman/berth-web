import { useEffect, useState } from "react";
import { ITERATION_BUDGET_USD, MIN_BUILD_BUDGET_USD } from "@ship/shared";
import type { AppDetail } from "../../api/types.js";
import { useStats, useTopup } from "../../api/queries.js";
import { useAuth } from "../../auth/useAuth.js";
import { CopyField } from "../../components/CopyField.js";
import { Modal } from "../../components/Modal.js";
import { Money } from "../../components/Money.js";
import { ProgressBar } from "../../components/ProgressBar.js";
import { actionError } from "../../lib/errors.js";

interface Props {
  app: AppDetail;
  open: boolean;
  onClose: () => void;
}

/**
 * Top up an app's build budget. The platform converts SOL from the user's
 * custodial wallet and credits 100% to the budget (REVIVE_BUY); the user just
 * enters an amount and funds their wallet — no client-side transaction.
 */
export const TopupModal = ({ app, open, onClose }: Props) => {
  const auth = useAuth();
  const topup = useTopup(app.slug);
  const stats = useStats();
  const [sol, setSol] = useState("0.1");
  const [done, setDone] = useState<{ budgetUsd: number; status: string } | null>(null);

  const solNum = Number(sol);
  const valid = Number.isFinite(solNum) && solNum >= 0.001;
  const solPrice = stats.data?.solPriceUsd ?? 0;
  const estUsd = valid && solPrice > 0 ? solNum * solPrice : 0;
  const gate = app.firstBuildAt ? ITERATION_BUDGET_USD.MIN : MIN_BUILD_BUDGET_USD;
  const projected = app.budgetUsd + estUsd;

  const submit = () => {
    if (!valid) return;
    topup.mutate(solNum, { onSuccess: (r) => setDone(r) });
  };

  // The modal stays mounted when closed, so wipe success + form state on close
  // to avoid showing a stale "budget credited" screen on the next open.
  useEffect(() => {
    if (!open) {
      setDone(null);
      setSol("0.1");
      topup.reset();
    }
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title={`Top up $${app.ticker} build budget`}>
      {!app.creatorWallet ? (
        <div className="text-sm text-fg-2">The creator wallet is not available yet. It is created with the coin.</div>
      ) : done ? (
        <div className="text-sm">
          <div className="font-semibold text-rev">Budget credited</div>
          <p className="mt-1.5 leading-relaxed text-fg-2">
            Build budget is now <Money usd={done.budgetUsd} tone="rev" exact />. Status{" "}
            <span className="num text-fg">{done.status.toLowerCase()}</span>.
            {done.status === "LIVE" && " The next build job is queued."}
          </p>
          <button type="button" className="btn mt-3" onClick={onClose}>
            Close
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 text-sm">
          <p className="body text-fg-2">
            SOL from your wallet is converted at the current price and credited{" "}
            <span className="text-fg">100% to the build budget</span>, with no platform cut. A first build needs{" "}
            <Money usd={MIN_BUILD_BUDGET_USD} className="text-fg" />; each later iteration needs{" "}
            <Money usd={ITERATION_BUDGET_USD.MIN} className="text-fg" />.
          </p>

          <div className="border-y border-line py-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className="small text-fg-2">budget now</span>
              <span>
                <Money usd={app.budgetUsd} tone={app.budgetUsd > 0 ? "rev" : "plain"} exact />
                {estUsd > 0 && (
                  <>
                    <span className="num text-fg-2"> → </span>
                    <Money usd={projected} tone="rev" exact />
                  </>
                )}
              </span>
            </div>
            <ProgressBar className="mt-2" value={Math.min(projected, gate)} max={gate} tone={projected >= gate ? "rev" : "info"} />
            <p className="small mt-1.5 text-fg-2">
              {projected >= gate ? (
                "clears the gate for the next build"
              ) : (
                <>
                  needs <Money usd={gate - projected} className="text-fg" exact /> more before a build runs
                </>
              )}
            </p>
          </div>

          {auth.wallet && <CopyField label="your wallet (deposit SOL here)" value={auth.wallet} wrap />}

          <label className="block">
            <span className="small text-fg-2">Amount (SOL)</span>
            <input
              className="input num mt-1"
              type="number"
              min="0.001"
              step="0.01"
              value={sol}
              onChange={(e) => setSol(e.target.value)}
            />
            {estUsd > 0 && (
              <span className="num mt-1 block text-[11px] text-fg-2">
                ≈ <Money usd={estUsd} className="text-fg" exact /> credited at <Money usd={solPrice} className="text-fg" /> / SOL
              </span>
            )}
          </label>

          {topup.error && <p className="small text-burn">{actionError(topup.error, auth.wallet)}</p>}

          {auth.authenticated ? (
            <button type="button" className="btn btn-primary" disabled={!valid || topup.isPending} onClick={submit}>
              {topup.isPending ? "Crediting…" : `Top up ${sol || "0"} SOL`}
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={auth.login}>
              Sign in to top up
            </button>
          )}
        </div>
      )}
    </Modal>
  );
};
