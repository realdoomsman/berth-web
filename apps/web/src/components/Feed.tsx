import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BuildEventType } from "@ship/shared";
import type { BuildEvent } from "../api/types.js";
import { useFeedBackfill } from "../api/queries.js";
import { useSse, type SseState } from "../api/sse.js";
import { FeedEvent, KIND } from "./FeedEvent.js";
import { EmptyState } from "./EmptyState.js";
import { StatusBlock, type StatusTone } from "./StatusBadge.js";
import { Cursor } from "./Skeleton.js";
import { IconChevron } from "./icons.js";
import { timeAgo } from "../lib/format.js";

/** The stream's own state is agent status, not money: low-chroma unless a human needs to act. */
const STATE_LABEL: Record<SseState, { text: string; cls: string; tone: StatusTone; live: boolean }> = {
  connecting: { text: "connecting", cls: "text-fg-3", tone: "quiet", live: false },
  open: { text: "live", cls: "text-fg-3", tone: "agent", live: true },
  reconnecting: { text: "reconnecting", cls: "text-warn", tone: "warn", live: true },
  closed: { text: "offline", cls: "text-fg-3", tone: "quiet", live: false },
};

type Group = { kind: "event"; e: BuildEvent } | { kind: "tools"; id: string; items: BuildEvent[] };

/**
 * Consecutive tool calls are noise in bulk: fold runs of 2+ into one node on
 * the thread that expands into a recessed log. Nested calls deliberately do not
 * get their own nodes — one run of tool calls is one step of the build.
 */
const ToolGroup = ({ items }: { items: BuildEvent[] }) => {
  const [open, setOpen] = useState(false);
  const last = items[items.length - 1]!;
  return (
    <div>
      <button
        type="button"
        className="flex w-full items-baseline gap-2 py-[3px] pr-2 text-left text-[12.5px] text-fg-2 transition-colors hover:bg-bg-2/30"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="relative z-10 flex w-[23px] shrink-0 justify-center self-start pt-[6px]">
          <StatusBlock tone="agent" size={6} className="opacity-70" />
        </span>
        <span className={`${KIND} text-fg-3`}>tools</span>
        <span className="num">{items.length} calls</span>
        <IconChevron size={11} dir={open ? "up" : "down"} />
        <time className="num ml-auto text-[10.5px]" dateTime={last.createdAt}>
          {timeAgo(last.createdAt)}
        </time>
      </button>
      {open && (
        <ul className="fade-in mb-1 ml-[31px] border-l border-line pl-3">
          {items.map((e) =>
            e.payload.type === "TOOL_CALL" ? (
              <li key={e.id} className="flex items-baseline gap-2 py-[3px] text-[11.5px]">
                <span className="num shrink-0 text-violet">{e.payload.tool}</span>
                <span className="min-w-0 flex-1 truncate text-fg-2">{e.payload.summary}</span>
                <time className="num shrink-0 text-[10px] text-fg-2" dateTime={e.createdAt}>
                  {timeAgo(e.createdAt)}
                </time>
              </li>
            ) : null,
          )}
        </ul>
      )}
    </div>
  );
};

/**
 * The thread while the backfill is in flight: dithered blocks on the same rail
 * and the same row rhythm as the real log, so the swap does not move a pixel.
 */
const SkeletonThread = () => (
  <div className="rail rail-even mx-3 py-2" aria-hidden>
    {["w-3/4", "w-5/6", "w-2/3", "w-4/5", "w-1/2", "w-5/6", "w-3/5"].map((w, i) => (
      <div key={i} className="flex items-center gap-2 py-[3px]">
        <span className="relative z-10 flex w-[23px] shrink-0 justify-center">
          <span className="skeleton size-[7px]" />
        </span>
        <span className={`skeleton h-3 ${w}`} />
      </div>
    ))}
  </div>
);

interface Props {
  slug: string;
  className?: string;
  onEvent?: (e: BuildEvent) => void;
}

/**
 * Live build feed: REST backfill + SSE tail, rendered as a timeline. Auto-scrolls
 * to the newest event unless the reader has scrolled up, in which case a pill
 * offers the jump back and counts what arrived meanwhile.
 */
export const Feed = ({ slug, className = "", onEvent }: Props) => {
  const backfill = useFeedBackfill(slug);
  const [live, setLive] = useState<BuildEvent[]>([]);
  const [pinned, setPinned] = useState(true);
  const scroller = useRef<HTMLDivElement>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  /** How many events the reader had seen when they last sat at the bottom. */
  const seen = useRef(0);

  useEffect(() => setLive([]), [slug]);

  const backfillItems = backfill.data?.items;
  const lastId = useMemo(() => {
    if (!backfillItems?.length) return null;
    return backfillItems.reduce((a, b) => (a.createdAt > b.createdAt ? a : b)).id;
  }, [backfillItems]);

  const onMessage = useCallback((e: BuildEvent) => {
    setLive((prev) => (prev.some((x) => x.id === e.id) ? prev : [...prev, e]));
    onEventRef.current?.(e);
  }, []);

  const state = useSse<BuildEvent>(backfill.isSuccess ? `/v1/apps/${slug}/feed/stream` : null, {
    onMessage,
    lastEventId: lastId,
    events: BuildEventType.options,
  });

  const events = useMemo(() => {
    const seenIds: Record<string, true> = {};
    const all: BuildEvent[] = [];
    for (const e of [...(backfillItems ?? []), ...live]) {
      if (seenIds[e.id]) continue;
      seenIds[e.id] = true;
      all.push(e);
    }
    all.sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));
    return all;
  }, [backfillItems, live]);

  const groups = useMemo(() => {
    const out: Group[] = [];
    let run: BuildEvent[] = [];
    const flush = () => {
      if (run.length === 0) return;
      if (run.length === 1) out.push({ kind: "event", e: run[0]! });
      else out.push({ kind: "tools", id: run[0]!.id, items: run });
      run = [];
    };
    for (const e of events) {
      if (e.type === "TOOL_CALL") run.push(e);
      else {
        flush();
        out.push({ kind: "event", e });
      }
    }
    flush();
    return out;
  }, [events]);

  useEffect(() => {
    if (!pinned || !scroller.current) return;
    scroller.current.scrollTop = scroller.current.scrollHeight;
    seen.current = events.length;
  }, [groups, pinned, events.length]);

  const jump = () => {
    setPinned(true);
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  };

  const unseen = pinned ? 0 : Math.max(0, events.length - seen.current);
  const st = STATE_LABEL[state];

  return (
    <section className={`panel relative flex min-h-0 flex-col overflow-hidden ${className}`} aria-label="Build log">
      <header className="flex shrink-0 items-center gap-2.5 border-b border-line px-3.5 py-2.5">
        <h2 className="h2">Build log</h2>
        <span className={`${KIND} inline-flex items-center gap-1.5 ${st.cls}`}>
          <StatusBlock tone={st.tone} live={st.live} size={6} />
          {st.text}
        </span>
        <span className="num ml-auto text-[11px] text-fg-2">{events.length} events</span>
      </header>

      <div
        ref={scroller}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        aria-live="polite"
        aria-busy={backfill.isPending}
        onScroll={(e) => {
          const el = e.currentTarget;
          setPinned(el.scrollHeight - el.scrollTop - el.clientHeight < 40);
        }}
      >
        {backfill.isPending && <SkeletonThread />}

        {backfill.isError && (
          <EmptyState
            tone="out"
            title="Feed unavailable"
            body={backfill.error.message}
            action={
              <button type="button" className="btn text-xs" onClick={() => void backfill.refetch()}>
                Retry
              </button>
            }
          />
        )}

        {backfill.isSuccess && groups.length === 0 && (
          <EmptyState
            tone="agent"
            title="No build events yet"
            body="The first job starts once the fee budget reaches $50."
          />
        )}

        {groups.length > 0 && (
          <ol className="rail rail-even mx-3 py-2">
            {groups.map((g) => (
              <li key={g.kind === "tools" ? g.id : g.e.id}>
                {g.kind === "tools" ? <ToolGroup items={g.items} /> : <FeedEvent e={g.e} slug={slug} />}
              </li>
            ))}
            {/* The thread ends in a block cursor while the stream is attached:
                the log is not finished, it is waiting for its next line. */}
            {state === "open" && (
              <li className="flex gap-2 py-[3px]" aria-hidden>
                <span className="w-[23px] shrink-0" />
                <Cursor className="bg-violet" />
              </li>
            )}
          </ol>
        )}
      </div>

      {!pinned && groups.length > 0 && (
        <button
          type="button"
          className="btn animate-rise absolute bottom-3 left-1/2 -translate-x-1/2 gap-1.5 border-line-2 bg-bg-2 px-3 py-1 shadow-lift"
          onClick={jump}
        >
          <IconChevron size={12} />
          {unseen > 0 ? `${unseen} new` : "jump to latest"}
        </button>
      )}
    </section>
  );
};
