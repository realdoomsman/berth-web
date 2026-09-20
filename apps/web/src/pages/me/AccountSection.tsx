import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Me } from "../../api/types.js";
import { keys, useClaimFees, useStats, useWithdraw } from "../../api/queries.js";
import { isHttpError } from "../../api/client.js";
import { useAuth } from "../../auth/useAuth.js";
import { CopyField } from "../../components/CopyField.js";
import { QrCode } from "../../components/QrCode.js";
import { Section } from "../../components/Section.js";
import { TxLink } from "../../components/TxLink.js";
import { env } from "../../env.js";
import { actionError } from "../../lib/errors.js";
import { getSolBalance, getTokenBalance } from "../../lib/solana.js";

/** Over-this-USD withdrawals ask for one confirmation before signing. */
const CONFIRM_USD = 1000;

/** The server's `daily_limit_exceeded` body, when the shape matches. */
const readDailyLimit = (body: unknown): { capUsd: number; usedUsd: number; requestedUsd: number } | null => {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  return typeof b.capUsd === "number" && typeof b.usedUsd === "number" && typeof b.requestedUsd === "number"
    ? { capUsd: b.capUsd, usedUsd: b.usedUsd, requestedUsd: b.requestedUsd }
    : null;
};

/*
 * The account: one place to fund the custodial wallet (deposit), move funds out (withdraw), and pull
 * accrued launcher fees into the wallet (claim). Deposit shows the address as a QR plus live on-chain
 * balances; funds arrive on chain. Withdraw and claim are signed server-side; the browser never signs.
 */
export const AccountSection = ({ me }: { me: Me | undefined }) => {
  const auth = useAuth();
  const qc = useQueryClient();
  const withdraw = useWithdraw();
  const claim = useClaimFees();
  const stats = useStats();
  const [asset, setAsset] = useState<"SOL" | "USDC">("SOL");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [confirming, setConfirming] = useState(false);

  const wallet = auth.wallet;
  const balances = useQuery({
    queryKey: ["wallet-balances", wallet],
    enabled: !!wallet,
    refetchInterval: 30_000,
    queryFn: async () => {
      const [sol, usdcBase] = await Promise.all([getSolBalance(wallet!), getTokenBalance(wallet!, env.usdcMint)]);
      return { sol, usdc: Number(usdcBase) / 1e6 };
    },
  });

  const claimable = me?.claimableUsd ?? 0;
  const amountNum = Number(amount);
  const solPrice = stats.data?.solPriceUsd ?? 0;
  const usdValue = asset === "SOL" ? amountNum * solPrice : amountNum;
  const canWithdraw = to.trim().length >= 32 && amountNum > 0 && !withdraw.isPending;

  const resetConfirm = () => setConfirming(false);

  const onClaim = async () => {
    try {
      await claim.mutateAsync();
      await qc.invalidateQueries({ queryKey: keys.me });
    } catch {
      /* surfaced via claim.error */
    }
  };

  const submit = () => {
    withdraw.mutate(
      { asset, to: to.trim(), amount: amountNum },
      {
        onSuccess: () => {
          setAmount("");
          setTo("");
          setConfirming(false);
          void qc.invalidateQueries({ queryKey: keys.me });
          void balances.refetch();
        },
      },
    );
  };

  const onWithdraw = () => {
    if (!canWithdraw) return;
    // Gate a large move behind a confirm step: over $1000 (amount × SOL price, or USDC face) asks first.
    if (usdValue >= CONFIRM_USD && !confirming) {
      setConfirming(true);
      return;
    }
    submit();
  };

  if (!wallet) {
    return <p className="body text-fg-2">No Solana wallet on your account yet. Sign in with Google or a wallet to get one.</p>;
  }

  const limit =
    withdraw.error && isHttpError(withdraw.error) && withdraw.error.error === "daily_limit_exceeded"
      ? readDailyLimit(withdraw.error.body)
      : null;

  return (
    <div className="flex flex-col gap-9">
      <Section title="Deposit" sub="Send SOL or USDC on Solana to this address to fund your wallet.">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <QrCode value={wallet} size={148} className="shrink-0 self-center sm:self-start" />
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <CopyField value={wallet} label="Your wallet address" wrap />
            <div className="panel-inset flex gap-8 px-3 py-2.5">
              <div>
                <span className="label">SOL balance</span>
                <span className="figure mt-1 block text-fg">
                  {balances.isPending ? "…" : `${balances.data?.sol.toFixed(4) ?? "0"} SOL`}
                </span>
              </div>
              <div>
                <span className="label">USDC balance</span>
                <span className="figure mt-1 block text-fg">
                  {balances.isPending ? "…" : `${balances.data?.usdc.toFixed(2) ?? "0"} USDC`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Claim fees" sub="Your launcher fee share, paid from the treasury to your wallet in SOL.">
        <div className="panel flex flex-wrap items-center justify-between gap-4 p-4">
          <div className="min-w-0">
            <span className="label">claimable</span>
            <span className="figure figure-lg mt-1 block text-rev">${claimable.toFixed(2)}</span>
          </div>
          <button
            type="button"
            className="btn btn-primary shrink-0"
            disabled={claimable < 1 || claim.isPending}
            onClick={onClaim}
          >
            {claim.isPending ? "claiming…" : "Claim to wallet"}
          </button>
        </div>
        {claim.isSuccess && (
          <p className="small mt-3 text-rev">
            Claimed ${claim.data.claimedUsd.toFixed(2)} — <TxLink sig={claim.data.payoutTx} label="view tx" />
          </p>
        )}
        {claim.isError && <p className="small mt-3 text-burn">{(claim.error as Error).message}</p>}
        {claimable < 1 && !claim.isSuccess && (
          <p className="small mt-3 text-fg-2">Fees under $1 keep accruing until they are worth the transaction fee.</p>
        )}
      </Section>

      <Section title="Withdraw" sub="Send SOL or USDC from your wallet to any Solana address. Berth signs it for you.">
        <div className="flex max-w-lg flex-col gap-3">
          <label className="block">
            <span className="label">asset</span>
            <select
              className="input mt-1.5 w-full"
              value={asset}
              onChange={(e) => {
                setAsset(e.target.value as "SOL" | "USDC");
                resetConfirm();
              }}
            >
              <option value="SOL">SOL</option>
              <option value="USDC">USDC</option>
            </select>
          </label>
          <label className="block">
            <span className="label">destination address</span>
            <input
              className="input mt-1.5 w-full"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                resetConfirm();
              }}
              placeholder="Solana address"
              spellCheck={false}
              autoComplete="off"
            />
          </label>
          <label className="block">
            <span className="label">amount ({asset})</span>
            <input
              className="input num mt-1.5 w-full"
              inputMode="decimal"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value.replace(/[^0-9.]/g, ""));
                resetConfirm();
              }}
              placeholder="0.0"
            />
            {amountNum > 0 && usdValue > 0 && (
              <span className="small mt-1 block text-fg-2">
                ≈ ${usdValue.toLocaleString("en-US", { maximumFractionDigits: 2 })}
              </span>
            )}
          </label>

          {confirming ? (
            <div className="panel-inset flex flex-col gap-3 p-3.5">
              <p className="small text-fg">
                You're about to withdraw{" "}
                <span className="num text-fg">
                  {amountNum} {asset}
                </span>{" "}
                (≈ ${usdValue.toLocaleString("en-US", { maximumFractionDigits: 2 })}) to{" "}
                <span className="num break-all text-fg-2">{to.trim()}</span>. This can't be undone.
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn btn-primary" disabled={withdraw.isPending} onClick={submit}>
                  {withdraw.isPending ? "sending…" : "Confirm withdrawal"}
                </button>
                <button type="button" className="btn" disabled={withdraw.isPending} onClick={resetConfirm}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="btn btn-primary self-start" disabled={!canWithdraw} onClick={onWithdraw}>
              {withdraw.isPending ? "sending…" : "Withdraw"}
            </button>
          )}

          {withdraw.isSuccess && (
            <p className="small text-rev">
              Sent — <TxLink sig={withdraw.data.signature} label="view tx" />
            </p>
          )}
          {limit ? (
            <p className="small text-burn">
              Daily withdrawal limit reached — the cap is ${limit.capUsd.toLocaleString()}/day and you've moved $
              {limit.usedUsd.toLocaleString("en-US", { maximumFractionDigits: 2 })} today. This $
              {limit.requestedUsd.toLocaleString("en-US", { maximumFractionDigits: 2 })} request would put you over. Try a smaller
              amount or come back tomorrow.
            </p>
          ) : (
            withdraw.error && <p className="small text-burn">{actionError(withdraw.error, wallet)}</p>
          )}
        </div>
      </Section>
    </div>
  );
};
