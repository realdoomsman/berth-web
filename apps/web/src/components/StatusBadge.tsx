import type { AppStatus, JobStage } from "../api/types.js";

/**
 * Status tones are the product's colour roles, not a palette: money-in for a
 * live earner, money-out for something dead, warn for anything that needs a
 * human, info for a neutral pre-launch state, and the agent's low-chroma
 * violet whenever a job is running.
 */
export type StatusTone = "in" | "out" | "agent" | "warn" | "info" | "quiet";

const BLOCK: Record<StatusTone, string> = {
  in: "bg-rev",
  out: "bg-burn",
  agent: "bg-violet",
  warn: "bg-warn",
  info: "bg-info",
  quiet: "bg-fg-3",
};

/* Odd sizes exist so a block can sit dead-centre on an odd-width gutter: the
   feed's thread runs down a 23px column, where a 7px block starts at x=8 and a
   9px block at x=7 — both whole pixels. An 8px block would start at 7.5px. */
const BLOCK_SIZE: Record<6 | 7 | 8 | 9, string> = {
  6: "size-1.5",
  7: "size-[7px]",
  8: "size-2",
  9: "size-[9px]",
};

/**
 * A status indicator is a block, not a dot. Nothing in this product is round,
 * and a hard square reads as a lit cell on a machine panel rather than an LED
 * with a glow around it. `live` snaps between two opacities on a stepped
 * timing function, so it blinks like a status lamp instead of breathing.
 */
export const StatusBlock = ({
  tone,
  live = false,
  size = 6,
  className = "",
}: {
  tone: StatusTone;
  /** stepped blink, for a state that is actively happening */
  live?: boolean;
  size?: 6 | 7 | 8 | 9;
  className?: string;
}) => (
  <span
    className={`inline-block shrink-0 ${BLOCK_SIZE[size]} ${BLOCK[tone]} ${
      live ? "animate-pulse-dot" : ""
    } ${className}`}
    aria-hidden
  />
);

/**
 * The product's badge shape, exported because a status word is the same object
 * everywhere it appears. Deliberately *not* the `chip` utility: a badge here is
 * a hard-edged 8px pixel label, and it carries no inset highlight — a lit top
 * edge is a soft-UI idiom that fights a pixel grid.
 *
 * Callers supply the border/fill/text colour, because the colour is the meaning.
 */
export const BADGE =
  "inline-flex items-center gap-1.5 whitespace-nowrap border font-pixel text-[8px] leading-none tracking-[0.14em] uppercase";

const STYLE: Record<AppStatus, { label: string; cls: string; tone?: StatusTone; live?: boolean; title: string }> = {
  DRAFT: { label: "drafting", cls: "border-line-2 text-fg-2", title: "The launcher is still writing the prompt." },
  SPEC_READY: {
    label: "spec ready",
    cls: "border-info/40 bg-info/5 text-info",
    tone: "info",
    title: "The spec is generated and buildable; the coin is not minted yet.",
  },
  AWAITING_STAKE: {
    label: "awaiting stake",
    cls: "border-warn/40 bg-warn/5 text-warn",
    tone: "warn",
    title: "Waiting on the launcher's refundable stake before minting.",
  },
  LAUNCHING: {
    label: "launching",
    cls: "border-warn/40 bg-warn/5 text-warn",
    tone: "warn",
    live: true,
    title: "Minting on pump.fun.",
  },
  LIVE: {
    label: "live",
    cls: "border-rev/40 bg-rev/5 text-rev",
    tone: "in",
    live: true,
    title: "The app is deployed and can earn.",
  },
  DORMANT: {
    label: "dormant",
    cls: "border-warn/30 text-warn",
    tone: "warn",
    title: "Out of build budget. Anyone can revive it by topping up.",
  },
  KILLED: { label: "killed", cls: "border-burn/40 bg-burn/5 text-burn", title: "Retired. No further builds." },
  FAILED: { label: "failed", cls: "border-burn/40 bg-burn/5 text-burn", title: "The launch or build failed terminally." },
};

const STAGE_LABEL: Record<JobStage, string> = {
  SCAFFOLD: "scaffolding",
  MVP: "building mvp",
  DEPLOY: "deploying",
  VERIFY: "verifying",
  ITERATE: "iterating",
  SELF_HEAL: "self-healing",
  PR_REVIEW: "reviewing pr",
};

interface Props {
  status: AppStatus;
  /** when set, badge shows the running stage with a blinking agent block */
  runningStage?: JobStage | null;
  className?: string;
  size?: "sm" | "md";
}

export const StatusBadge = ({ status, runningStage, className = "", size = "md" }: Props) => {
  /* Silkscreen only renders crisply at whole pixels, so the two sizes differ by
     padding and block size rather than by type size. */
  const pad = size === "sm" ? "px-1.5 py-[3px]" : "px-2 py-[5px]";
  const block = size === "sm" ? 6 : 8;
  if (runningStage) {
    return (
      <span
        className={`${BADGE} ${pad} border-violet/45 bg-violet/10 text-violet ${className}`}
        title={`The build agent is running: ${STAGE_LABEL[runningStage]}.`}
      >
        <StatusBlock tone="agent" live size={block} />
        {STAGE_LABEL[runningStage]}
      </span>
    );
  }
  const s = STYLE[status];
  return (
    <span className={`${BADGE} ${pad} ${s.cls} ${className}`} title={s.title}>
      {s.tone && <StatusBlock tone={s.tone} live={s.live} size={block} className={s.live ? "" : "opacity-80"} />}
      {s.label}
    </span>
  );
};
