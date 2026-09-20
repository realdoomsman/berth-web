import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Me } from "../../api/types.js";
import { keys, useClaimFees, useWithdraw } from "../../api/queries.js";
import { useAuth } from "../../auth/useAuth.js";
import { CopyField } from "../../components/CopyField.js";
import { Section } from "../../components/Section.js";
import { TxLink } from "../../components/TxLink.js";
import { actionError } from "../../lib/errors.js";

/*
 * The account: one place to fund the custodial wallet (deposit), move funds out (withdraw), and pull
 * accrued launcher fees into the wallet (claim). Deposit is just the address — funds arrive on chain.
 * Withdraw and claim are signed server-side from the user's custodial wallet; the browser never signs.
 */
export const AccountSection = ({ me }: { me: Me | undefined }) => {
  const auth = useAuth();
  const qc = useQueryClient();
  const withdraw = useWithdraw();
  const claim = useClaimFees();
  const [asset, setAsset] = useState<"SOL" | "USDC">("SOL");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");

  const wallet = auth.wallet;
  const claimable = me?.claimableUsd ?? 0;
  const amountNum = Number(amount);
  const canWithdraw = to.trim().length >= 32 && amountNum > 0 && !withdraw.isPending;

  const onClaim = async () => {
    try {
      await claim.mutateAsync();
      await qc.invalidateQueries({ queryKey: keys.me });
    } catch {
      /* surfaced via claim.error */
    }
  };

  const onWithdraw = () => {
    if (!canWithdraw) return;
    withdraw.mutate(
      { asset, to: to.trim(), amount: amountNum },
      {
        onSuccess: () => {
          setAmount("");
          setTo("");
          void qc.invalidateQueries({ queryKey: keys.me });
        },
      },
    );
  };

  if (!wallet) {
    return <p className="body text-fg-2">No Solana wallet on your account yet. Sign in with Google or a wallet to get one.</p>;
  }

  return (
    <div className="flex flex-col gap-9">
      <Section title="Deposit" sub="Send SOL or USDC on Solana to this address to fund your wallet.">
        <CopyField value={wallet} label="Your wallet address" wrap />
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
            <select className="input mt-1.5 w-full" value={asset} onChange={(e) => setAsset(e.target.value as "SOL" | "USDC")}>
              <option value="SOL">SOL</option>
              <option value="USDC">USDC</option>
            </select>
          </label>
          <label className="block">
            <span className="label">destination address</span>
            <input
              className="input mt-1.5 w-full"
              value={to}
              onChange={(e) => setTo(e.target.value)}
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
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="0.0"
            />
          </label>
          <button type="button" className="btn btn-primary self-start" disabled={!canWithdraw} onClick={onWithdraw}>
            {withdraw.isPending ? "sending…" : "Withdraw"}
          </button>
          {withdraw.isSuccess && (
            <p className="small text-rev">
              Sent — <TxLink sig={withdraw.data.signature} label="view tx" />
            </p>
          )}
          {withdraw.error && <p className="small text-burn">{actionError(withdraw.error, wallet)}</p>}
        </div>
      </Section>
    </div>
  );
};
