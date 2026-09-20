import { useState, type ReactNode } from "react";
import type { BuildEvent } from "../api/types.js";
import { env } from "../env.js";
import { formatDuration, formatUsd, timeAgo } from "../lib/format.js";
import { Modal } from "./Modal.js";
import { StatusBlock, type StatusTone } from "./StatusBadge.js";
import { IconExternal } from "./icons.js";

/** Screenshot payloads reference deployment-relative paths; resolve against the API origin when relative. */
const absolute = (url: string, slug: string): string =>
  url.startsWith("http") ? url : `${env.apiOrigin}/a/${slug}${url.startsWith("/") ? "" : "/"}${url}`;

/**
 * Semantic role of a feed row. Identical to a status block's tone, because it
 * is the same idea: the agent working is violet, money arriving is green, money
 * leaving or a terminal failure is red, anything needing a human is amber, and
 * external references are blue. `quiet` is the default narration tone.
 */
export type FeedRole = StatusTone;

/**
 * The kind of event, as an 8px pixel label. Three voices do three jobs on every
 * row: this label says *what happened*, mono carries the machine's own strings
 * (stages, shas, models, commands, figures), and sans carries anything a person
 * reads as a sentence. Exported because the feed header and tool groups are
 * part of the same log and must speak in the same register.
 */
export const KIND = "font-pixel text-[8px] leading-none tracking-[0.14em] uppercase";

/**
 * One line on the thread: a square node in the gutter aligned to the feed's
 * `rail`, the body, and relative time. No tiles, no per-event card, no wash and
 * no ring around the node — this is a build log, and a log is type on a rail.
 */
const Row = ({
  e,
  role = "quiet",
  children,
  emphasis = false,
}: {
  e: BuildEvent;
  role?: FeedRole;
  children: ReactNode;
  /** load-bearing moment: deploy, failure, milestone. Reads as a heavier node. */
  emphasis?: boolean;
}) => (
  <div className="flex gap-2 py-[3px] pr-2 text-[12.5px] leading-snug transition-colors hover:bg-bg-2/30">
    <span className="relative z-10 flex w-[23px] shrink-0 justify-center pt-[6px]">
      <StatusBlock tone={role} size={emphasis ? 9 : 7} className={emphasis ? "" : "opacity-85"} />
    </span>
    <div className="min-w-0 flex-1 break-words">{children}</div>
    <time
      className="num shrink-0 pt-[3px] text-[10.5px] text-fg-3"
      dateTime={e.createdAt}
      title={new Date(e.createdAt).toLocaleString()}
    >
      {timeAgo(e.createdAt)}
    </time>
  </div>
);

/** The event-type label. Colour only when the event is money or a failure. */
const Kind = ({ children, className = "text-fg-3" }: { children: ReactNode; className?: string }) => (
  <span className={`${KIND} mr-1.5 ${className}`}>{children}</span>
);

const SCORES: Array<[string, "performance" | "accessibility" | "bestPractices" | "seo"]> = [
  ["performance", "performance"],
  ["accessibility", "accessibility"],
  ["best practices", "bestPractices"],
  ["seo", "seo"],
];

const ScreenshotRow = ({ e, slug, label, url }: { e: BuildEvent; slug: string; label: string; url: string }) => {
  const [open, setOpen] = useState(false);
  const src = absolute(url, slug);
  return (
    <Row e={e} role="agent">
      <Kind>screenshot</Kind>
      <span className="text-fg">{label}</span>
      <button type="button" className="mt-1.5 block text-left" onClick={() => setOpen(true)} aria-label={`Open screenshot: ${label}`}>
        <img
          src={src}
          alt={label}
          loading="lazy"
          className="max-h-56 border border-line bg-bg-2 object-contain transition-colors hover:border-fg-3"
        />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={label} width="lg">
        <img src={src} alt={label} className="w-full border border-line bg-bg-2 object-contain" />
        <a href={src} target="_blank" rel="noreferrer" className="num mt-3 inline-flex items-center gap-1 text-xs text-info hover:underline">
          open original <IconExternal size={11} />
        </a>
      </Modal>
    </Row>
  );
};

export const FeedEvent = ({ e, slug }: { e: BuildEvent; slug: string }) => {
  const p = e.payload;
  switch (p.type) {
    case "JOB_QUEUED":
      return (
        <Row e={e} role="agent">
          <Kind>queued</Kind>
          <span className="num text-fg">{p.stage.toLowerCase()}</span>{" "}
          <span className="num text-fg-2">budget {formatUsd(p.budgetUsd)}</span>
        </Row>
      );
    case "JOB_STARTED":
      return (
        <Row e={e} role="agent" emphasis>
          <Kind>start</Kind>
          <span className="num font-semibold text-fg">{p.stage.toLowerCase()}</span>{" "}
          <span className="num text-fg-2">{p.model}</span>{" "}
          <span className="num text-fg-3">sandbox {p.sandboxId.slice(0, 8)}</span>
        </Row>
      );
    case "STAGE":
      return (
        <Row e={e} role={p.status === "FAIL" ? "out" : "agent"}>
          <Kind>stage</Kind>
          <span className="num text-fg">{p.stage.toLowerCase()}</span>{" "}
          <span className={`num ${p.status === "FAIL" ? "text-burn" : "text-fg-2"}`}>{p.status.toLowerCase()}</span>
        </Row>
      );
    case "AGENT_NOTE":
      return (
        <Row e={e} role="quiet">
          <Kind>note</Kind>
          <span className="text-fg">{p.text}</span>
        </Row>
      );
    case "TOOL_CALL":
      return (
        <Row e={e} role="agent">
          <Kind>tool</Kind>
          <span className="num text-fg">{p.tool}</span> <span className="text-fg-2">{p.summary}</span>
        </Row>
      );
    case "COMMIT":
      return (
        <Row e={e} role="agent">
          <Kind>commit</Kind>
          {p.url ? (
            <a href={p.url} target="_blank" rel="noreferrer" className="num text-info hover:underline">
              {p.sha.slice(0, 7)}
            </a>
          ) : (
            <span className="num text-fg-2">{p.sha.slice(0, 7)}</span>
          )}{" "}
          <span className="text-fg">{p.message}</span>
        </Row>
      );
    case "TEST_RESULT": {
      const ok = p.failed === 0;
      return (
        <Row e={e} role={ok ? "agent" : "out"} emphasis={!ok}>
          <Kind className={ok ? "text-fg-3" : "text-burn"}>tests</Kind>
          <span className="num text-fg">{p.passed} passed</span>
          <span className="text-fg-3" aria-hidden>
            {" · "}
          </span>
          <span className={`num ${ok ? "text-fg-2" : "font-semibold text-burn"}`}>{p.failed} failed</span>
          {p.output && (
            <details className="mt-1">
              <summary className={`${KIND} cursor-pointer text-fg-3 hover:text-fg`}>output</summary>
              <pre className="num panel-inset mt-1 max-h-48 overflow-auto p-2 text-[11px] text-fg-2">{p.output}</pre>
            </details>
          )}
        </Row>
      );
    }
    case "SCREENSHOT":
      return <ScreenshotRow e={e} slug={slug} label={p.label} url={p.url} />;
    case "LIGHTHOUSE": {
      const scores = { performance: p.performance, accessibility: p.accessibility, bestPractices: p.bestPractices, seo: p.seo };
      return (
        <Row e={e} role="agent">
          <Kind>lighthouse</Kind>
          {SCORES.map(([name, key], i) => {
            const score = scores[key];
            return (
              <span key={key}>
                {i > 0 && (
                  <span className="text-fg-3" aria-hidden>
                    {" · "}
                  </span>
                )}
                <span className="text-fg-2">{name} </span>
                <span className={`num ${score >= 90 ? "text-fg" : score >= 50 ? "text-warn" : "text-burn"}`}>{score}</span>
              </span>
            );
          })}
        </Row>
      );
    }
    case "REVIEW": {
      const ok = p.verdict === "APPROVE";
      return (
        <Row e={e} role={ok ? "agent" : "out"} emphasis={!ok}>
          <Kind className={ok ? "text-fg-3" : "text-burn"}>review</Kind>
          <span className={`num font-semibold ${ok ? "text-fg" : "text-burn"}`}>{p.verdict.toLowerCase()}</span>{" "}
          <span className="text-fg-2">{p.summary}</span>
          {p.findings.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {p.findings.map((f, i) => (
                <li key={i} className="flex gap-2 text-[11.5px]">
                  <span
                    className={`${KIND} shrink-0 pt-[3px] ${
                      f.severity === "BLOCK" ? "text-burn" : f.severity === "WARN" ? "text-warn" : "text-fg-3"
                    }`}
                  >
                    {f.severity.toLowerCase()}
                  </span>
                  <span className="text-fg-2">{f.text}</span>
                </li>
              ))}
            </ul>
          )}
        </Row>
      );
    }
    case "DEPLOY":
      return (
        <Row e={e} role="agent" emphasis>
          <Kind>deploy</Kind>
          <span className="num font-semibold text-fg">v{p.version}</span>{" "}
          <a href={p.url} target="_blank" rel="noreferrer" className="num inline-flex items-center gap-1 text-info hover:underline">
            {p.url.replace(/^https?:\/\//, "")}
            <IconExternal size={11} />
          </a>
        </Row>
      );
    case "JOB_FINISHED":
      return (
        <Row e={e} role="agent">
          <Kind>done</Kind>
          <span className="num text-fg">
            {formatUsd(p.costUsd)} · {formatDuration(p.durationMs)}
          </span>
          <div className="text-fg-2">{p.summary}</div>
        </Row>
      );
    case "JOB_FAILED":
      return (
        <Row e={e} role="out" emphasis>
          <Kind className="text-burn">failed</Kind>
          <span className="num text-fg-2">{formatUsd(p.costUsd)} spent</span>
          {/* Stack traces are unbounded; a feed row is not. Clamp and let it scroll. */}
          <pre className="num panel-inset mt-1 max-h-24 overflow-auto p-2 text-[11px] leading-relaxed break-words whitespace-pre-wrap text-fg-2">
            {p.error}
          </pre>
        </Row>
      );
    case "BUDGET": {
      const up = p.delta >= 0;
      return (
        <Row e={e} role={up ? "in" : "out"}>
          <Kind className={up ? "text-rev" : "text-burn"}>budget</Kind>
          <span className={`num font-semibold ${up ? "text-rev" : "text-burn"}`}>
            {up ? "+" : "−"}
            {formatUsd(Math.abs(p.delta))}
          </span>{" "}
          <span className="text-fg-2">{p.reason}</span> <span className="num text-fg">→ {formatUsd(p.budgetUsd)}</span>
        </Row>
      );
    }
    case "MILESTONE":
      return (
        <Row e={e} role="in" emphasis>
          <Kind className="text-rev">milestone</Kind>
          <span className="text-fg">{p.milestone}</span>{" "}
          <span className="num text-fg-2">{p.value >= 1 ? formatUsd(p.value) : p.value}</span>
        </Row>
      );
    case "REVIVED":
      return (
        <Row e={e} role="in" emphasis>
          <Kind className="text-rev">revived</Kind>
          <span className="text-fg-2">by</span> <span className="num text-fg">{p.by}</span>{" "}
          <span className="num text-fg-2">· budget {formatUsd(p.budgetUsd)}</span>
        </Row>
      );
    case "DORMANT":
      return (
        <Row e={e} role="warn" emphasis>
          <Kind className="text-warn">dormant</Kind>
          <span className="text-fg-2">{p.reason}</span>
        </Row>
      );
    case "SELF_HEAL":
      return (
        <Row e={e} role="warn">
          <Kind className="text-warn">self-heal</Kind>
          <span className="line-clamp-2 text-fg-2" title={p.error}>
            {p.error}
          </span>
        </Row>
      );
    case "PR_MERGED":
      return (
        <Row e={e} role="info">
          <Kind>merged</Kind>
          <a href={p.url} target="_blank" rel="noreferrer" className="num text-info hover:underline">
            PR #{p.prNumber}
          </a>{" "}
          <span className="text-fg-2">by</span> <span className="num text-fg">{p.author}</span>
        </Row>
      );
    case "BOUNTY_CLAIMED":
      return (
        <Row e={e} role="in">
          <Kind className="text-rev">bounty</Kind>
          <span className="text-fg-2">claimed by</span> <span className="num text-fg">{p.claimant}</span>{" "}
          <span className="num text-rev">{(Number(p.amountLamports) / 1e9).toFixed(3)} SOL</span>
        </Row>
      );
    case "GROWTH_POST":
      return (
        <Row e={e} role="info">
          <Kind>posted</Kind>
          <a href={p.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-info hover:underline">
            on X
            <IconExternal size={11} />
          </a>
          <div className="text-fg-2">{p.text}</div>
        </Row>
      );
  }
};
