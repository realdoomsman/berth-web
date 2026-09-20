import { useState } from "react";
import { CONTRIBUTOR_POOL_BPS, VOTE_WALLET_CAP_BPS } from "@ship/shared";
import type { AppDetail, PullRequestDto } from "../../api/types.js";
import { useMaintainerVote, usePrs } from "../../api/queries.js";
import { useAuth } from "../../auth/useAuth.js";
import { EmptyState } from "../../components/EmptyState.js";
import { Money } from "../../components/Money.js";
import { Skeleton } from "../../components/Skeleton.js";
import { TxLink } from "../../components/TxLink.js";
import { useToast } from "../../components/Toast.js";
import { BADGE } from "../../components/StatusBadge.js";
import { IconExternal, IconGithub } from "../../components/icons.js";
import { formatNum, shortAddr, timeAgo } from "../../lib/format.js";

/* A PR's state is a machine status, so it wears `BADGE` (hard border, 8px pixel
   uppercase) rather than the softer `chip`. Each caller supplies the colour,
   because on this product the colour is the meaning. */
const STATUS: Record<PullRequestDto["status"], string> = {
  OPEN: "text-fg-2 border-line-2",
  REVIEWING: "text-warn border-warn/40 bg-warn/5",
  APPROVED: "text-rev border-rev/40 bg-rev/5",
  REJECTED: "text-burn border-burn/40 bg-burn/5",
  MERGED: "text-rev border-rev/40 bg-rev/5",
};

export const PrsSection = ({ app }: { app: AppDetail }) => {
  const auth = useAuth();
  const q = usePrs(app.slug);
  const vote = useMaintainerVote(app.slug);
  const toast = useToast();
  const [candidate, setCandidate] = useState("");

  return (
    <div className="grid min-w-0 gap-x-10 gap-y-9 lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)]">
      <section aria-labelledby="prs-h" className="min-w-0">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line pb-2.5">
          <h3 id="prs-h" className="h3">
            Pull requests
          </h3>
          {app.repoUrl ? (
            <a
              href={`${app.repoUrl}/pulls`}
              target="_blank"
              rel="noreferrer"
              className="small inline-flex items-center gap-1 text-info hover:underline"
            >
              <IconGithub size={13} />
              open a PR
              <IconExternal size={11} />
            </a>
          ) : (
            <p className="small text-fg-2">repo is created at the first build</p>
          )}
        </div>

        {q.isPending && (
          <div className="flex flex-col gap-3 py-3.5" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        )}
        {q.isSuccess && q.data.items.length === 0 && (
          <EmptyState
            icon={<IconGithub size={22} className="text-fg-3" />}
            title="No pull requests yet"
            body={
              <>
                The code is MIT and anyone can contribute. The reviewer reads the diff against the spec, merges what
                fits, and <span className="num">{CONTRIBUTOR_POOL_BPS / 100}%</span> of the fee stream is reserved for
                merged contributors.
              </>
            }
            action={
              app.repoUrl ? (
                <a href={app.repoUrl} target="_blank" rel="noreferrer" className="btn">
                  <IconGithub size={14} />
                  View the repo
                </a>
              ) : undefined
            }
          />
        )}
        <ul>
          {q.data?.items.map((pr) => (
            <li key={pr.id} className="border-b border-line/50 py-2.5">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
                <a href={pr.url} target="_blank" rel="noreferrer" className="num text-info hover:underline">
                  #{pr.number}
                </a>
                <span className="min-w-0 font-semibold">{pr.title}</span>
                <span className={`${BADGE} px-1.5 py-[3px] ${STATUS[pr.status]}`}>{pr.status.toLowerCase()}</span>
                <span className="num ml-auto text-xs text-fg-2">
                  {pr.authorLogin} · {timeAgo(pr.createdAt)}
                </span>
              </div>
              {pr.reviewSummary && <p className="small mt-1 text-fg-2">{pr.reviewSummary}</p>}
              <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-fg-2">
                {pr.mergeSha && <span className="num">merged {pr.mergeSha.slice(0, 7)}</span>}
                {pr.authorWallet && <span className="num">{shortAddr(pr.authorWallet)}</span>}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex min-w-0 flex-col gap-7 lg:border-l lg:border-line lg:pl-10">
        <section aria-labelledby="contrib-h" className="min-w-0">
          <h3 id="contrib-h" className="h3 border-b border-line pb-2">
            Contributors
          </h3>
          <p className="small mt-2 text-fg-2">
            <span className="num">{CONTRIBUTOR_POOL_BPS / 100}%</span> of fees, split by merged work
          </p>
          {q.data?.contributors.length ? (
            <ul className="mt-2">
              {q.data.contributors.map((c) => (
                <li key={c.userId} className="flex items-baseline justify-between gap-2 border-b border-line/50 py-1.5 text-xs">
                  <span className="num truncate">{c.displayName ?? (c.wallet ? shortAddr(c.wallet) : "anon")}</span>
                  <span className="num shrink-0 text-fg-2">
                    {c.mergedPrs} merged · <Money usd={c.earnedUsd} tone="rev" />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="small mt-2 text-fg-2">No merged human contributions yet.</p>
          )}
        </section>

        <section aria-labelledby="maintainer-h" className="min-w-0">
          <h3 id="maintainer-h" className="h3 border-b border-line pb-2">
            Maintainer
          </h3>
          <p className="small mt-2 text-fg-2">
            token-weighted, <span className="num">{VOTE_WALLET_CAP_BPS / 100}%</span> cap per wallet, one vote per
            wallet
          </p>
          <div className="mt-2 text-sm">
            {q.data?.maintainer ? (
              <span className="num">
                {q.data.maintainer.displayName ?? (q.data.maintainer.wallet ? shortAddr(q.data.maintainer.wallet) : "—")}
              </span>
            ) : (
              <span className="text-fg-2">none elected, so the launcher holds the role</span>
            )}
          </div>
          {q.data && q.data.maintainerVotes.length > 0 && (
            <ul className="mb-2.5 mt-2">
              {q.data.maintainerVotes.map((v) => (
                <li key={v.candidateWallet} className="flex items-baseline justify-between gap-2 border-b border-line/50 py-1.5 text-xs">
                  <TxLink address={v.candidateWallet} />
                  <span className="num text-fg-2">
                    {formatNum(v.weight)} <span className="text-fg-3">· {v.voters} voters</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {auth.authenticated ? (
            <div className="mt-2.5 flex gap-1.5">
              <input
                className="input num text-xs"
                aria-label="Maintainer candidate wallet"
                placeholder={q.data?.myMaintainerVote ? `voted ${shortAddr(q.data.myMaintainerVote)}` : "candidate wallet"}
                value={candidate}
                onChange={(e) => setCandidate(e.target.value.trim())}
              />
              <button
                type="button"
                className="btn shrink-0 px-2 text-xs"
                disabled={candidate.length < 32 || vote.isPending}
                onClick={() =>
                  vote.mutate(candidate, {
                    onSuccess: (r) => {
                      setCandidate("");
                      toast.success(
                        r.elected ? "Maintainer elected" : "Vote recorded",
                        `${formatNum(r.weight)} weight on ${shortAddr(r.candidateWallet)}`,
                      );
                    },
                  })
                }
              >
                {vote.isPending ? "…" : "Vote"}
              </button>
            </div>
          ) : (
            <button type="button" className="btn mt-2.5 px-2 py-1 text-xs" onClick={auth.login}>
              Sign in to vote
            </button>
          )}
          {vote.error && <p className="small mt-1.5 text-burn">{vote.error.message}</p>}
          <p className="small mt-2.5 text-fg-2">
            An elected maintainer can merge pull requests without waiting for the AI reviewer.
          </p>
        </section>
      </div>
    </div>
  );
};
