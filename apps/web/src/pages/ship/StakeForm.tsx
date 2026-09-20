import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PUMP_DECIMALS } from "@ship/shared";
import { api, qs } from "../../api/client.js";
import { useShipStake } from "../../api/queries.js";
import type { AppSummary, Page, ShipInfo } from "../../api/types.js";
import { useAuth } from "../../auth/useAuth.js";
import { CopyField } from "../../components/CopyField.js";
import { Section } from "../../components/Section.js";
import { formatNum } from "../../lib/format.js";
import { getTokenBalance } from "../../lib/solana.js";
import { actionError } from "../../lib/errors.js";

const BASE_UNITS = 10 ** PUMP_DECIMALS;

const LBL = "text-[13px] font-medium text-fg";

/**
 * Stake $BERTH against one app. The platform holds the tokens in the user's
 * custodial wallet and signs the transfer server-side: the form just sends the
 * app id and a whole-token amount to `POST /v1/ship/stake`.
 */
export const StakeForm = ({ ship }: { ship: ShipInfo }) => {
  const auth = useAuth();
  const stake = useShipStake();
  // The leaderboard endpoint returns only LIVE + DORMANT apps — exactly what `/v1/ship/stake` accepts.
  const apps = useQuery({
    queryKey: ["ship", "stakeable-apps"],
    queryFn: ({ signal }) => api.get<Page<AppSummary>>(`/v1/apps${qs({ sort: "revenue", limit: 100 })}`, signal),
    enabled: ship.mint !== null,
    staleTime: 60_000,
  });
  const [appId, setAppId] = useState("");
  const [amount, setAmount] = useState("");

  const wallet = auth.wallet;
  const balance = useQuery({
    queryKey: ["ship", "wallet-balance", wallet, ship.mint],
    queryFn: () => getTokenBalance(wallet!, ship.mint!),
    enabled: !!wallet && ship.mint !== null,
    refetchInterval: 60_000,
  });

  const parsed = Number(amount);
  const amountValid = Number.isFinite(parsed) && parsed > 0;
  const amountBase = amountValid ? BigInt(Math.round(parsed * BASE_UNITS)) : 0n;
  const held = balance.data ?? 0n;
  const overBalance = balance.isSuccess && amountBase > held;
  const selected = apps.data?.items.find((a) => a.id === appId) ?? null;
  const canSend = ship.mint !== null && !!appId && amountValid && !overBalance && !stake.isPending;

  const submit = () => {
    if (!appId || !amountValid) return;
    stake.mutate(
      { appId, amount: parsed },
      {
        onSuccess: () => {
          setAmount("");
          void balance.refetch();
        },
      },
    );
  };

  return (
    <Section title="Stake to boost" sub="Build priority, not a yield product.">
      <div className="flex flex-col gap-4 text-sm">
        <p className="text-fg-2">
          A deposit moves one app to the front of the build queue and earns a share of that app&apos;s launcher fee stream while it stays
          deposited. Unstake at any time and the same amount of $BERTH comes back.
        </p>

        {ship.mint === null ? (
          <p className="border-l-2 border-warn pl-3 text-xs text-fg-2">
            Staking opens when $BERTH is minted. Until then there is nothing to deposit.
          </p>
        ) : (
          <>
            <label className="block">
              <span className={LBL}>App to boost</span>
              <select className="input mt-1" value={appId} onChange={(e) => setAppId(e.target.value)} disabled={apps.isPending}>
                <option value="">{apps.isPending ? "loading apps…" : "select an app"}</option>
                {apps.data?.items.map((a) => (
                  <option key={a.id} value={a.id}>
                    ${a.ticker} — {a.name}
                    {a.status === "DORMANT" ? " (dormant)" : ""}
                  </option>
                ))}
              </select>
            </label>
            {apps.isError && <div className="text-xs text-burn">{apps.error.message}</div>}

            <label className="block">
              <span className={LBL}>Amount ($BERTH)</span>
              <div className="mt-1 flex items-stretch gap-1">
                <input
                  className="input num"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="decimal"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <button
                  type="button"
                  className="btn px-3 text-xs"
                  disabled={held === 0n}
                  onClick={() => setAmount(String(Number(held) / BASE_UNITS))}
                >
                  max
                </button>
              </div>
              <div className="num mt-1 text-[11px] text-fg-2">
                {wallet
                  ? balance.isPending
                    ? "reading wallet balance…"
                    : `wallet balance ${formatNum(Number(held) / BASE_UNITS)} $BERTH`
                  : "sign in to see your balance"}
              </div>
            </label>

            {wallet && (
              <CopyField label="your wallet (deposit $BERTH here)" value={wallet} wrap />
            )}

            {overBalance && <div className="text-xs text-burn">More than your wallet holds.</div>}
            {stake.error && (
              <div role="alert" className="text-xs text-burn">
                {actionError(stake.error, wallet)}
              </div>
            )}
            {stake.isSuccess && (
              <div className="text-xs text-rev" aria-live="polite">
                Staked <span className="num">{formatNum(stake.data.amount)}</span> $BERTH to ${stake.data.appTicker}. Build priority applies
                on the next scheduler pass.
              </div>
            )}

            {auth.authenticated ? (
              <button type="button" className="btn btn-primary" disabled={!canSend} onClick={submit}>
                {stake.isPending ? "Staking…" : `Stake ${amount || "0"} $BERTH${selected ? ` → $${selected.ticker}` : ""}`}
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={auth.login}>
                Sign in to stake
              </button>
            )}
          </>
        )}
      </div>
    </Section>
  );
};
