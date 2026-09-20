import { useState } from "react";
import { BountyBody } from "@ship/shared";
import type { AppDetail, BountyDto } from "../../api/types.js";
import { useBounties, useClaimBounty, useCreateBounty, useShip } from "../../api/queries.js";
import { useAuth } from "../../auth/useAuth.js";
import { EmptyState } from "../../components/EmptyState.js";
import { Modal } from "../../components/Modal.js";
import { Skeleton } from "../../components/Skeleton.js";
import { TxLink } from "../../components/TxLink.js";
import { useToast } from "../../components/Toast.js";
import { IconGithub, IconSpark } from "../../components/icons.js";
import { formatSol, shortAddr, timeAgo } from "../../lib/format.js";
import { actionError } from "../../lib/errors.js";

const STATUS: Record<BountyDto["status"], string> = {
  OPEN: "text-rev border-rev/40",
  CLAIMED: "text-warn border-warn/40",
  PAID: "text-fg-2 border-line-2",
  CANCELLED: "text-fg-2 border-line-2",
};

const ORDER: Record<BountyDto["status"], number> = { OPEN: 0, CLAIMED: 1, PAID: 2, CANCELLED: 3 };

export const BountiesSection = ({ app }: { app: AppDetail }) => {
  const auth = useAuth();
  const q = useBounties(app.slug);
  const ship = useShip(auth.authenticated);
  const create = useCreateBounty(app.slug);
  const claim = useClaimBounty(app.slug);
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sol, setSol] = useState("0.1");
  const [err, setErr] = useState<string | null>(null);
  const [claimFor, setClaimFor] = useState<BountyDto | null>(null);
  const [prNumber, setPrNumber] = useState("");

  const treasury = ship.data?.treasury ?? null;
  const items = [...(q.data?.items ?? [])].sort((a, b) => ORDER[a.status] - ORDER[b.status] || (a.createdAt < b.createdAt ? 1 : -1));
  const escrowed = items.filter((b) => b.status === "OPEN" || b.status === "CLAIMED").reduce((n, b) => n + b.sol, 0);

  // Opening the claim modal on a different bounty must not inherit the previous
  // one's error or PR number, or a stale "PR #42 not found" reads as this claim's.
  const openClaim = (b: BountyDto) => {
    claim.reset();
    setErr(null);
    setPrNumber("");
    setClaimFor(b);
  };

  const submit = async () => {
    const pre = BountyBody.safeParse({ title: title.trim(), description: description.trim(), sol: Number(sol) });
    if (!pre.success) {
      setErr(pre.error.issues[0]?.message ?? "invalid");
      return;
    }
    setErr(null);
    try {
      await create.mutateAsync(pre.data);
      setOpen(false);
      setTitle("");
      setDescription("");
      toast.success("Bounty posted", `${formatSol(pre.data.sol)} escrowed until a PR closes it.`);
    } catch (e) {
      setErr(actionError(e, auth.wallet));
    }
  };

  return (
    <section aria-labelledby="bounties-h" className="min-w-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line pb-2.5">
        <h3 id="bounties-h" className="h3">
          Bounties
        </h3>
        <div className="flex items-baseline gap-3">
          <p className="small text-fg-2">
            SOL escrowed in the treasury, paid to whoever's pull request gets merged
            {escrowed > 0 && (
              <>
                {" · "}
                <span className="num text-rev">{formatSol(escrowed)}</span> escrowed now
              </>
            )}
          </p>
          <button
            type="button"
            className="btn px-2 py-1 text-xs"
            onClick={() => (auth.authenticated ? setOpen(true) : auth.login())}
            disabled={!app.repoUrl}
            title={app.repoUrl ? "" : "the repo is created at the first build"}
          >
            New bounty
          </button>
        </div>
      </div>

      {q.isPending && (
        <div className="flex flex-col gap-3 py-3.5" aria-busy="true">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}
      {q.isSuccess && items.length === 0 && (
        <EmptyState
          icon={<IconSpark size={22} className="text-fg-3" />}
          title="No bounties yet"
          body={
            app.repoUrl
              ? "Escrow SOL against a specific change and any human can claim it with a merged PR. The reviewer merges and the treasury pays out without a human in the loop."
              : "The repo is created at the first build. Bounties open once there is code to change."
          }
          action={
            app.repoUrl ? (
              <a href={`${app.repoUrl}/pulls`} target="_blank" rel="noreferrer" className="btn">
                <IconGithub size={14} />
                Browse the repo
              </a>
            ) : undefined
          }
        />
      )}

      <ul>
        {items.map((b) => (
          <li key={b.id} className="border-b border-line/50 py-3">
            <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{b.title}</span>
                  <span className={`chip ${STATUS[b.status]}`}>{b.status.toLowerCase()}</span>
                </div>
                <p className="small mt-1 whitespace-pre-wrap text-fg-2">{b.description}</p>
                <div className="small mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-fg-2">
                  <span className="num">{b.author.displayName ?? (b.author.wallet ? shortAddr(b.author.wallet) : "anon")}</span>
                  <span className="num">{timeAgo(b.createdAt)}</span>
                  <span>
                    escrow <TxLink sig={b.escrowTx} />
                  </span>
                  {b.prNumber !== null && (
                    <span className="num">
                      PR #{b.prNumber}
                      {b.claimantWallet && ` · ${shortAddr(b.claimantWallet)}`}
                    </span>
                  )}
                  {b.payoutTx && (
                    <span>
                      payout <TxLink sig={b.payoutTx} />
                    </span>
                  )}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="figure figure-md text-rev">{formatSol(b.sol)}</div>
                {b.status === "OPEN" && (
                  <button
                    type="button"
                    className="btn mt-1.5 px-2 py-0.5 text-xs"
                    onClick={() => (auth.authenticated ? openClaim(b) : auth.login())}
                  >
                    Claim with PR
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <Modal open={open} onClose={() => setOpen(false)} title={`New bounty on $${app.ticker}`}>
        <div className="flex flex-col gap-3">
          <label className="block">
            <span className="small text-fg-2">Title</span>
            <input
              className="input mt-1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="Add dark mode toggle"
            />
          </label>
          <label className="block">
            <span className="small text-fg-2">Description and acceptance</span>
            <textarea
              className="input mt-1 min-h-[90px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              placeholder="What must the PR do to be accepted. Reference this bounty id in the PR body: Closes #<id>."
            />
          </label>
          <label className="block">
            <span className="small text-fg-2">Reward (SOL)</span>
            <input
              className="input num mt-1"
              type="number"
              min="0.01"
              step="0.01"
              value={sol}
              onChange={(e) => setSol(e.target.value)}
            />
          </label>
          <p className="small text-fg-2">
            The SOL is escrowed in the platform treasury{treasury ? ` (${shortAddr(treasury)})` : ""} and pays out
            automatically when the reviewer merges a PR that references this bounty. The launcher can cancel an
            unclaimed bounty.
          </p>
          {err && <p className="small text-burn">{err}</p>}
          <button type="button" className="btn btn-primary" disabled={create.isPending} onClick={() => void submit()}>
            {create.isPending ? "Registering…" : `Escrow ${sol || "0"} SOL`}
          </button>
        </div>
      </Modal>

      <Modal open={!!claimFor} onClose={() => setClaimFor(null)} title="Claim bounty" width="sm">
        <p className="body mb-3 text-fg-2">
          Enter the pull request number on <span className="num text-fg">{app.repoUrl?.replace("https://github.com/", "")}</span>{" "}
          that resolves this bounty. The reviewer reads the diff against the acceptance notes, then merges and pays
          out.
        </p>
        <input
          className="input num"
          type="number"
          min={1}
          value={prNumber}
          aria-label="Pull request number"
          onChange={(e) => setPrNumber(e.target.value)}
          placeholder="42"
        />
        {claim.error && <p className="small mt-2 text-burn">{claim.error.message}</p>}
        <button
          type="button"
          className="btn btn-primary mt-3"
          disabled={!prNumber || claim.isPending}
          onClick={() => {
            if (!claimFor) return;
            claim.mutate(
              { bountyId: claimFor.id, prNumber: Number(prNumber) },
              {
                onSuccess: () => {
                  setClaimFor(null);
                  setPrNumber("");
                  toast.success("Claim submitted", "The reviewer checks the PR against the bounty's acceptance notes.");
                },
              },
            );
          }}
        >
          {claim.isPending ? "Claiming…" : "Claim"}
        </button>
      </Modal>
    </section>
  );
};
