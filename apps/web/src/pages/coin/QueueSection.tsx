import { useState } from "react";
import { PromptQueueBody, PROMPT_QUEUE_MIN_HOLD_BPS, VOTE_WALLET_CAP_BPS } from "@ship/shared";
import { useQueue, useSubmitQueue, useVote } from "../../api/queries.js";
import { useAuth } from "../../auth/useAuth.js";
import { EmptyState } from "../../components/EmptyState.js";
import { QueueItem } from "../../components/QueueItem.js";
import { Skeleton } from "../../components/Skeleton.js";
import { useToast } from "../../components/Toast.js";
import { IconVote } from "../../components/icons.js";
import { formatNum } from "../../lib/format.js";

export const QueueSection = ({ slug, ticker }: { slug: string; ticker: string }) => {
  const auth = useAuth();
  const q = useQueue(slug);
  const submit = useSubmitQueue(slug);
  const vote = useVote(slug);
  const toast = useToast();
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const items = q.data?.items ?? [];
  const open = items.filter((i) => i.status === "OPEN").sort((a, b) => b.weight - a.weight);
  const rest = items.filter((i) => i.status !== "OPEN");
  const canVote = auth.authenticated && (q.data?.myWeight ?? 0) > 0;

  return (
    <section aria-labelledby="queue-h" className="min-w-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line pb-2.5">
        <h3 id="queue-h" className="h3">
          Prompt queue
        </h3>
        <p className="small text-fg-2">
          holders queue the work; the top-weighted task goes into the next paid iteration
          {q.data && auth.authenticated && (
            <>
              {" · "}your weight <span className="num text-fg">{formatNum(q.data.myWeight)}</span>
            </>
          )}
        </p>
      </div>

      <div className="border-b border-line py-3.5">
        {!auth.authenticated ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="small min-w-0 basis-full text-fg-2 sm:flex-1 sm:basis-auto">
              Sign in with a wallet to submit a task or vote on one. Weight is your ${ticker} balance, capped at{" "}
              <span className="num text-fg">{VOTE_WALLET_CAP_BPS / 100}%</span> of supply per wallet.
            </p>
            <button type="button" className="btn" onClick={auth.login}>
              Sign in to queue or vote
            </button>
          </div>
        ) : q.data && !q.data.canSubmit ? (
          <div className="flex items-start gap-2.5">
            <IconVote size={15} className="mt-0.5 shrink-0 text-fg-3" />
            <p className="small text-fg-2">
              Submitting a task needs at least{" "}
              <span className="num text-fg">
                {formatNum(q.data.minHoldTokens)} ${ticker}
              </span>{" "}
              (<span className="num">{PROMPT_QUEUE_MIN_HOLD_BPS / 100}%</span> of supply). Voting works with any
              nonzero balance. Your weight
              right now is <span className="num text-fg">{formatNum(q.data.myWeight)}</span>.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <textarea
              className="input min-h-[46px] flex-1 resize-y"
              value={text}
              maxLength={1000}
              aria-label="Task to queue"
              placeholder="Add CSV export to the results table; keep it behind the paid tier."
              onChange={(e) => setText(e.target.value)}
            />
            <div className="flex items-center gap-2 sm:flex-col sm:items-end">
              <button
                type="button"
                className="btn btn-primary"
                disabled={submit.isPending || text.trim().length < 10}
                onClick={() => {
                  const parsed = PromptQueueBody.safeParse({ text: text.trim() });
                  if (!parsed.success) {
                    setErr(parsed.error.issues[0]?.message ?? "invalid");
                    return;
                  }
                  setErr(null);
                  submit.mutate(parsed.data.text, {
                    onSuccess: () => {
                      setText("");
                      toast.success("Task queued", "Holders can vote it up; the agent picks the top item next iteration.");
                    },
                    onError: (e) => setErr(e.message),
                  });
                }}
              >
                {submit.isPending ? "Queueing…" : "Queue task"}
              </button>
              <span className="num text-[10px] text-fg-2">{text.length}/1000</span>
            </div>
          </div>
        )}
        {(err || vote.error) && <p className="small mt-2 text-burn">{err ?? vote.error?.message}</p>}
      </div>

      {q.isPending && (
        <div className="flex flex-col gap-3 py-3.5" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}
      {q.isError && (
        <EmptyState
          title="Queue unavailable"
          body={q.error.message}
          action={
            <button type="button" className="btn" onClick={() => void q.refetch()}>
              Retry
            </button>
          }
        />
      )}
      {q.isSuccess && open.length === 0 && (
        <EmptyState
          icon={<IconVote size={22} className="text-fg-3" />}
          title={items.length === 0 ? "Nothing queued yet" : "Nothing open right now"}
          body={
            items.length === 0
              ? `First task wins by default. Describe one change to $${ticker} and the agent builds it on the next funded iteration.`
              : `All ${items.length} queued task${items.length === 1 ? " is" : "s are"} scheduled or already shipped, and listed below. Queue the next one.`
          }
        />
      )}

      {open.length > 0 && (
        <ul>
          {open.map((it, i) => (
            <QueueItem
              key={it.id}
              item={it}
              rank={i + 1}
              maxWeight={open[0]?.weight ?? 0}
              canVote={canVote}
              myWeight={q.data?.myWeight ?? 0}
              busy={vote.isPending}
              onVote={() => vote.mutate(it.id)}
            />
          ))}
        </ul>
      )}

      {rest.length > 0 && (
        <details className="disclosure">
          <summary className="small cursor-pointer select-none text-fg-2">
            {rest.length} scheduled, shipped or rejected
          </summary>
          <ul className="pb-2">
            {rest.map((it) => (
              <QueueItem key={it.id} item={it} canVote={false} myWeight={0} busy onVote={() => undefined} />
            ))}
          </ul>
        </details>
      )}
    </section>
  );
};
