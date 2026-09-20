import type { QueueItemDto } from "../api/types.js";
import { formatNum, shortAddr, timeAgo } from "../lib/format.js";
import { ProgressBar } from "./ProgressBar.js";
import { BADGE } from "./StatusBadge.js";
import { IconCheck, IconVote } from "./icons.js";

const STATUS: Record<QueueItemDto["status"], { label: string; cls: string }> = {
  OPEN: { label: "open", cls: "border-line-2 text-fg-2" },
  SCHEDULED: { label: "scheduled", cls: "border-violet/40 bg-violet/5 text-violet" },
  DONE: { label: "shipped", cls: "border-rev/40 bg-rev/5 text-rev" },
  REJECTED: { label: "rejected", cls: "border-burn/40 bg-burn/5 text-burn" },
};

interface Props {
  item: QueueItemDto;
  canVote: boolean;
  myWeight: number;
  busy: boolean;
  onVote: () => void;
  /** 1-based position in the queue */
  rank?: number;
  /** weight of the top item, so the bar reads as share-of-leader */
  maxWeight?: number;
}

/**
 * One queued task. The vote control is the widest target in the row because it
 * is the only action, and the bar reads as share-of-leader so the ordering is
 * legible without reading the numbers.
 */
export const QueueItem = ({ item, canVote, myWeight, busy, onVote, rank, maxWeight }: Props) => {
  const s = STATUS[item.status];
  const voteable = item.status === "OPEN" && canVote && !item.votedByMe;
  const share = maxWeight && maxWeight > 0 ? Math.max(2, Math.min(100, (item.weight / maxWeight) * 100)) : null;

  return (
    <li className="row-hover flex gap-2.5 border-t border-line/70 px-3 py-2.5 first:border-t-0">
      {rank !== undefined && (
        <span className="num w-5 shrink-0 pt-1 text-right text-sm text-fg-2" aria-hidden>
          {rank}
        </span>
      )}
      <button
        type="button"
        className={`flex w-14 shrink-0 flex-col items-center justify-center gap-0.5 border py-1.5 transition-colors ${
          item.votedByMe
            ? "border-rev/50 bg-rev/10 text-rev"
            : voteable
              ? "border-line-2 bg-bg-2 hover:border-rev/60 hover:text-rev"
              : "border-line bg-bg-1 text-fg-2"
        } ${busy ? "opacity-60" : ""}`}
        disabled={!voteable || busy}
        onClick={onVote}
        aria-label={item.votedByMe ? "Already voted" : `Upvote: ${item.text}`}
        title={
          item.votedByMe
            ? "you voted"
            : !canVote
              ? "hold the coin to vote"
              : `vote with your bag (${formatNum(myWeight)} weight, capped at 2% of supply)`
        }
      >
        {item.votedByMe ? <IconCheck size={13} /> : <IconVote size={13} className={busy ? "animate-pulse-dot" : ""} />}
        <span className="num text-xs font-semibold">{formatNum(item.weight)}</span>
      </button>
      <div className="min-w-0 flex-1">
        <p className="small leading-snug text-fg">{item.text}</p>
        {share !== null && (
          <ProgressBar
            className="mt-2"
            size="xs"
            value={share}
            tone={item.votedByMe ? "rev" : "info"}
            ariaLabel={`${Math.round(share)}% of the leading task's weight`}
          />
        )}
        <div className="micro mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-fg-2">
          <span className={`${BADGE} px-1.5 py-[3px] ${s.cls}`}>{s.label}</span>
          <span className="num">{item.votes} votes</span>
          <span className="text-line-2" aria-hidden>
            ·
          </span>
          <span className="num">{item.author.displayName ?? (item.author.wallet ? shortAddr(item.author.wallet) : "anon")}</span>
          <span className="num ml-auto">{timeAgo(item.createdAt)}</span>
        </div>
      </div>
    </li>
  );
};
