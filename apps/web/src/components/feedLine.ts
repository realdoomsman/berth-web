import type { BuildEvent } from "../api/types.js";

/** One-line human summary of a build event, used on cards and compact lists. */
export const feedLine = (e: BuildEvent): string => {
  const p = e.payload;
  switch (p.type) {
    case "JOB_QUEUED":
      return `queued ${p.stage.toLowerCase()} · $${p.budgetUsd.toFixed(0)} budget`;
    case "JOB_STARTED":
      return `started ${p.stage.toLowerCase()} on ${p.model}`;
    case "STAGE":
      return `${p.stage.toLowerCase()} ${p.status.toLowerCase()}`;
    case "AGENT_NOTE":
      return p.text;
    case "TOOL_CALL":
      return `${p.tool}: ${p.summary}`;
    case "COMMIT":
      return `commit ${p.sha.slice(0, 7)} — ${p.message}`;
    case "TEST_RESULT":
      return `tests: ${p.passed} passed, ${p.failed} failed`;
    case "SCREENSHOT":
      return `screenshot: ${p.label}`;
    case "LIGHTHOUSE":
      return `lighthouse perf ${p.performance} · a11y ${p.accessibility}`;
    case "REVIEW":
      return `review ${p.verdict.toLowerCase()}: ${p.summary}`;
    case "DEPLOY":
      return `deployed v${p.version}`;
    case "JOB_FINISHED":
      return `finished · $${p.costUsd.toFixed(2)} · ${p.summary}`;
    case "JOB_FAILED":
      return `failed: ${p.error}`;
    case "BUDGET":
      return `budget ${p.delta >= 0 ? "+" : ""}$${p.delta.toFixed(2)} (${p.reason}) → $${p.budgetUsd.toFixed(2)}`;
    case "MILESTONE":
      return `milestone: ${p.milestone}`;
    case "REVIVED":
      return `revived by ${p.by} · $${p.budgetUsd.toFixed(2)} budget`;
    case "DORMANT":
      return `dormant: ${p.reason}`;
    case "SELF_HEAL":
      return `self-heal: ${p.error}`;
    case "PR_MERGED":
      return `merged PR #${p.prNumber} by ${p.author}`;
    case "BOUNTY_CLAIMED":
      return `bounty claimed by ${p.claimant}`;
    case "GROWTH_POST":
      return `posted: ${p.text}`;
  }
};
