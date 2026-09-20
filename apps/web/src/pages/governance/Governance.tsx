import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useProposals, useSetProposalStatus, useSubmitProposal, useUnvoteProposal, useVoteProposal } from "../../api/queries.js";
import type { Proposal, ProposalStatus } from "../../api/types.js";
import { isHttpError } from "../../api/client.js";
import { useAuth } from "../../auth/useAuth.js";
import { EmptyState } from "../../components/EmptyState.js";
import { Modal } from "../../components/Modal.js";
import { Section } from "../../components/Section.js";
import { Skeleton } from "../../components/Skeleton.js";
import { BADGE, StatusBlock } from "../../components/StatusBadge.js";
import type { StatusTone } from "../../components/StatusBadge.js";
import { useToast } from "../../components/Toast.js";
import { IconUsers, IconVote } from "../../components/icons.js";
import { formatNum, shortAddr } from "../../lib/format.js";

const STATUSES: ProposalStatus[] = ["OPEN", "PLANNED", "BUILDING", "SHIPPED", "DECLINED"];

/** Roadmap ordering: what's moving comes before what's parked, declined last. */
const ORDER: Record<ProposalStatus, number> = { BUILDING: 0, PLANNED: 1, OPEN: 2, SHIPPED: 3, DECLINED: 4 };

/** Status styling mirrors StatusBadge's colour roles: violet = agent building, green = shipped, burn = declined. */
const STATUS_STYLE: Record<ProposalStatus, { label: string; cls: string; tone?: StatusTone; live?: boolean }> = {
  OPEN: { label: "open", cls: "border-info/40 bg-info/5 text-info", tone: "info" },
  PLANNED: { label: "planned", cls: "border-warn/40 bg-warn/5 text-warn", tone: "warn" },
  BUILDING: { label: "building", cls: "border-violet/45 bg-violet/10 text-violet", tone: "agent", live: true },
  SHIPPED: { label: "shipped", cls: "border-rev/40 bg-rev/5 text-rev", tone: "in" },
  DECLINED: { label: "declined", cls: "border-burn/40 bg-burn/5 text-burn" },
};

/** $BERTH base units (6 decimals) → whole-token display. */
const tokens = (baseUnits: string): string => formatNum(Number(baseUnits) / 1e6);

const authorName = (a: Proposal["author"]): string => a.displayName ?? (a.wallet ? shortAddr(a.wallet) : "anon");

const StatusBadge = ({ status }: { status: ProposalStatus }) => {
  const s = STATUS_STYLE[status];
  return (
    <span className={`${BADGE} px-2 py-[5px] ${s.cls}`}>
      {s.tone && <StatusBlock tone={s.tone} live={s.live} size={8} className={s.live ? "" : "opacity-80"} />}
      {s.label}
    </span>
  );
};

/** `insufficient_hold` carries the caller's holding vs the 3% floor, both in $BERTH base units. */
const readHold = (body: unknown): { needBaseUnits: string; haveBaseUnits: string } | null => {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  return typeof b.needBaseUnits === "string" && typeof b.haveBaseUnits === "string"
    ? { needBaseUnits: b.needBaseUnits, haveBaseUnits: b.haveBaseUnits }
    : null;
};

const ProposalCard = ({ p, isAdmin }: { p: Proposal; isAdmin: boolean }) => {
  const auth = useAuth();
  const toast = useToast();
  const vote = useVoteProposal();
  const unvote = useUnvoteProposal();
  const setStatus = useSetProposalStatus();
  const [expanded, setExpanded] = useState(false);
  const [status, setStatusValue] = useState<ProposalStatus>(p.status);
  const [note, setNote] = useState("");

  const clamp = p.body.length > 280;
  const pending = vote.isPending || unvote.isPending;

  const onVote = () => {
    if (!auth.authenticated) {
      auth.login();
      return;
    }
    const action = p.mine ? unvote : vote;
    action.mutate(p.id, {
      onError: (e) => {
        if (isHttpError(e) && e.error === "must_hold_berth") toast.error("Hold $BERTH to vote", "You need some $BERTH to weigh in.");
        else if (isHttpError(e) && e.error === "ship_not_launched") toast.error("$BERTH isn't live yet", "Voting opens once it launches.");
        else toast.error("Vote failed", e instanceof Error ? e.message : undefined);
      },
    });
  };

  const onSetStatus = () => {
    setStatus.mutate(
      { id: p.id, status, ...(note.trim() ? { note: note.trim() } : {}) },
      {
        onSuccess: () => toast.success("Status updated", `Marked ${STATUS_STYLE[status].label}.`),
        onError: (e) => toast.error("Update failed", e instanceof Error ? e.message : undefined),
      },
    );
  };

  return (
    <li className="border-b border-line/50 py-4">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{p.title}</span>
            <StatusBadge status={p.status} />
          </div>
          <p className={`small mt-1 whitespace-pre-wrap text-fg-2 ${clamp && !expanded ? "line-clamp-3" : ""}`}>{p.body}</p>
          {clamp && (
            <button
              type="button"
              className="small mt-1 text-fg-2 underline decoration-line-2 underline-offset-2 hover:text-fg"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? "Show less" : "Show more"}
            </button>
          )}
          <div className="small mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-fg-2">
            <span className="num">{authorName(p.author)}</span>
            <span>
              <span className="num text-fg">{p.voters}</span> {p.voters === 1 ? "voter" : "voters"}
            </span>
            <span>
              <span className="num text-rev">{tokens(p.weight)}</span> $BERTH
            </span>
          </div>
          {p.ownerNote && (
            <p className="small mt-2 border-l-2 border-line-2 pl-2.5 text-fg-2">
              <span className="label mr-1.5">team</span>
              {p.ownerNote}
            </p>
          )}
        </div>

        <div className="shrink-0">
          <button
            type="button"
            className={`btn px-2 py-1 text-xs ${p.mine ? "text-rev" : ""}`}
            disabled={pending}
            onClick={onVote}
            aria-pressed={p.mine}
          >
            <IconVote size={14} />
            {p.mine ? "Voted — withdraw" : "Vote"}
          </button>
        </div>
      </div>

      {isAdmin && (
        <div className="mt-3 flex flex-wrap items-end gap-2 border-l-2 border-line-2 pl-3">
          <label className="block">
            <span className="label">status</span>
            <select
              className="input mt-1"
              value={status}
              onChange={(e) => setStatusValue(e.target.value as ProposalStatus)}
              aria-label="Proposal status"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_STYLE[s].label}
                </option>
              ))}
            </select>
          </label>
          <label className="block min-w-0 flex-1">
            <span className="label">note (optional)</span>
            <input
              className="input mt-1 w-full"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={1000}
              placeholder="Why this moved — shown publicly as the team note."
            />
          </label>
          <button type="button" className="btn px-2 py-1 text-xs" disabled={setStatus.isPending} onClick={onSetStatus}>
            {setStatus.isPending ? "Saving…" : "Set status"}
          </button>
        </div>
      )}
    </li>
  );
};

const ProposeModal = ({ open, onClose, minHoldBaseUnits }: { open: boolean; onClose: () => void; minHoldBaseUnits: string }) => {
  const auth = useAuth();
  const toast = useToast();
  const submit = useSubmitProposal();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const reset = () => {
    setTitle("");
    setBody("");
    setErr(null);
  };

  const onSubmit = async () => {
    const t = title.trim();
    const b = body.trim();
    if (t.length < 6 || t.length > 120) {
      setErr("Title must be 6–120 characters.");
      return;
    }
    if (b.length < 20 || b.length > 4000) {
      setErr("Body must be 20–4000 characters.");
      return;
    }
    setErr(null);
    try {
      await submit.mutateAsync({ title: t, body: b });
      reset();
      onClose();
      toast.success("Proposal posted", "It's on the board — every $BERTH holder can vote now.");
    } catch (e) {
      if (isHttpError(e) && e.error === "ship_not_launched") {
        setErr("$BERTH isn't live yet — proposals open once it launches.");
        return;
      }
      if (isHttpError(e) && e.error === "insufficient_hold") {
        const hold = readHold(e.body);
        const need = tokens(hold?.needBaseUnits ?? minHoldBaseUnits);
        setErr(
          hold
            ? `You need ${need} $BERTH (3% of supply) to propose — you hold ${tokens(hold.haveBaseUnits)}.`
            : `You need ${need} $BERTH (3% of supply) to propose.`,
        );
        return;
      }
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Propose an improvement to Berth"
      sub={`Holding ≥3% of $BERTH (${tokens(minHoldBaseUnits)} tokens) lets you put a change on the board.`}
    >
      <div className="flex flex-col gap-3">
        <label className="block">
          <span className="small text-fg-2">Title</span>
          <input
            className="input mt-1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="Add a public changelog to every coin page"
          />
        </label>
        <label className="block">
          <span className="small text-fg-2">What should Berth build, and why</span>
          <textarea
            className="input mt-1 min-h-[120px]"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={4000}
            placeholder="Describe the change and the outcome. Every $BERTH holder votes; the team builds what wins."
          />
        </label>
        {!auth.authenticated && <p className="small text-fg-2">Sign in to submit — your $BERTH holding is checked on submit.</p>}
        {err && <p className="small text-burn">{err}</p>}
        <button
          type="button"
          className="btn btn-primary"
          disabled={submit.isPending}
          onClick={() => (auth.authenticated ? void onSubmit() : auth.login())}
        >
          {submit.isPending ? "Posting…" : auth.authenticated ? "Post proposal" : "Sign in to propose"}
        </button>
      </div>
    </Modal>
  );
};

export const Governance = () => {
  const auth = useAuth();
  const q = useProposals();
  const [open, setOpen] = useState(false);
  const isAdmin = auth.user?.isAdmin ?? false;

  useEffect(() => {
    document.title = "Berth — Governance";
  }, []);

  const items = useMemo(
    () =>
      [...(q.data?.items ?? [])].sort(
        (a, b) => ORDER[a.status] - ORDER[b.status] || (Number(b.weight) - Number(a.weight)) || (a.createdAt < b.createdAt ? 1 : -1),
      ),
    [q.data],
  );

  const shipLaunched = q.data?.shipLaunched ?? false;
  const minHold = q.data?.minHoldBaseUnits ?? "0";

  return (
    <div className="flex flex-col gap-8">
      <Section
        title="Governance"
        sub={
          <>
            $BERTH holders with ≥3% propose improvements to Berth itself; everyone holding{" "}
            <Link to="/ship" className="text-fg underline decoration-line-2 underline-offset-2 hover:text-rev">
              $BERTH
            </Link>{" "}
            votes, and the team builds what wins. Advisory — every proposal goes through the owner.
          </>
        }
        icon={<IconUsers size={16} />}
        right={
          shipLaunched ? (
            <button type="button" className="btn btn-primary" onClick={() => (auth.authenticated ? setOpen(true) : auth.login())}>
              Propose
            </button>
          ) : undefined
        }
      >
        {q.isPending && (
          <div className="flex flex-col gap-3 py-2" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        )}

        {q.isError && (
          <div role="alert" className="border-l-2 border-burn py-1 pl-3 text-sm text-burn">
            {q.error.message}
          </div>
        )}

        {q.isSuccess && !shipLaunched && (
          <EmptyState
            icon={<IconVote size={22} className="text-fg-3" />}
            title="$BERTH isn't live yet"
            body="Proposals open once it launches. Until then the board stays quiet."
            action={
              <Link to="/ship" className="btn">
                About $BERTH
              </Link>
            }
          />
        )}

        {q.isSuccess && shipLaunched && items.length === 0 && (
          <EmptyState
            icon={<IconVote size={22} className="text-fg-3" />}
            title="No proposals yet"
            body="Hold ≥3% of $BERTH and be the first to put an improvement on the board."
          />
        )}

        {shipLaunched && items.length > 0 && (
          <ul>
            {items.map((p) => (
              <ProposalCard key={p.id} p={p} isAdmin={isAdmin} />
            ))}
          </ul>
        )}
      </Section>

      <ProposeModal open={open} onClose={() => setOpen(false)} minHoldBaseUnits={minHold} />
    </div>
  );
};
