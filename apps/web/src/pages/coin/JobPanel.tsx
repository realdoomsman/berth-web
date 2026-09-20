import { useEffect, useState } from "react";
import type { AppDetail, JobStage } from "../../api/types.js";
import { Money } from "../../components/Money.js";
import { ProgressBar } from "../../components/ProgressBar.js";
import { StatusBlock } from "../../components/StatusBadge.js";
import { formatDuration, timeAgo } from "../../lib/format.js";

const STAGE_LABEL: Record<JobStage, string> = {
  SCAFFOLD: "scaffolding the repo",
  MVP: "building the MVP",
  DEPLOY: "deploying",
  VERIFY: "verifying the deploy",
  ITERATE: "shipping a queued task",
  SELF_HEAL: "self-healing a failure",
  PR_REVIEW: "reviewing a pull request",
};

/** The line above the feed: is the agent working right now, on what, for how much. */
export const JobPanel = ({ app }: { app: AppDetail }) => {
  const job = app.runningJob;
  const [, tick] = useState(0);

  useEffect(() => {
    if (!job?.startedAt) return;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [job?.startedAt]);

  if (!job) {
    return (
      <div className="flex items-center gap-2.5 border-b border-line pb-3">
        <StatusBlock tone="quiet" size={8} />
        <div className="min-w-0 flex-1">
          <div className="small font-semibold" aria-live="polite">
            Agent idle
          </div>
          <div className="small text-fg-2">
            {app.lastEvent ? <>last activity {timeAgo(app.lastEvent.createdAt)}</> : "no build activity yet"}
          </div>
        </div>
        <span className="small shrink-0 text-fg-2">waiting on fees</span>
      </div>
    );
  }

  const elapsed = job.startedAt ? Date.now() - new Date(job.startedAt).getTime() : 0;
  return (
    <div className="border-b border-line pb-3">
      <div className="flex items-center gap-2.5">
        {/* A running job is agent status, not money: the one accent is spent on
            revenue and burns, and `StatusBadge` already renders a running stage
            in the agent role. Green here claimed the money colour for a build. */}
        <StatusBlock tone="agent" live size={8} />
        <div className="min-w-0 flex-1">
          <div className="small truncate font-semibold text-violet" aria-live="polite">
            {STAGE_LABEL[job.stage]}
          </div>
          <div className="num text-[11px] text-fg-2">
            {job.startedAt ? formatDuration(elapsed) : "queued"}
            {job.model && <span className="ml-2">{job.model}</span>}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="num text-sm font-semibold">
            <Money usd={job.costUsd} exact />
            <span className="text-fg-3"> / </span>
            <Money usd={job.budgetUsd} className="text-fg-2" />
          </div>
          <div className="small text-fg-2">spend on this job</div>
        </div>
      </div>
      <ProgressBar
        className="mt-2.5"
        value={Math.min(job.costUsd, job.budgetUsd)}
        max={job.budgetUsd || 1}
        /* Agent, not money-in: this gauge is how far the agent has eaten into
           its own job budget. Amber once it is close to the cap, because that
           is the point a human might want to know. */
        tone={job.costUsd / (job.budgetUsd || 1) > 0.9 ? "warn" : "agent"}
      />
    </div>
  );
};
