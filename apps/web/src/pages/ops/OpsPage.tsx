import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/useAuth.js";
import { useAdminAction, useAdminAudit, useAdminJobs, useAdminOps, useMe } from "../../api/queries.js";
import type { AdminJob, AuditEntry, ReconcileRun } from "../../api/types.js";
import { EmptyState } from "../../components/EmptyState.js";
import { Modal } from "../../components/Modal.js";
import { Money } from "../../components/Money.js";
import { ProgressBar } from "../../components/ProgressBar.js";
import { Section } from "../../components/Section.js";
import { Stat, StatRow } from "../../components/Stat.js";
import { BADGE } from "../../components/StatusBadge.js";
import { Skeleton } from "../../components/Skeleton.js";
import { useToast } from "../../components/Toast.js";
import { formatDate, formatDuration, timeAgo } from "../../lib/format.js";

const JOB_CLS: Record<AdminJob["status"], string> = {
  QUEUED: "text-fg-3",
  RUNNING: "text-rev",
  SUCCEEDED: "text-fg-2",
  FAILED: "text-burn",
  CANCELLED: "text-warn",
};

/** Who wrote the row. Operators are the loud case; the runner and the scheduler are status. */
const ACTOR_CLS: Record<string, string> = { admin: "text-fg", worker: "text-violet", system: "text-fg-3" };

const CELL = "px-2 py-1 align-top";
/* No `font-semibold`: Silkscreen ships 400/700 only, so a 600 request is
   synthesised by smearing the bitmap. */
const HEAD = "label px-2 py-1";

/** CreditFunding status colours: money-in when SENT, money-out on failure, warn/agent while mid-flight. */
const FUNDING_CLS: Record<string, string> = {
  SENT: "border-rev/40 text-rev",
  FAILED: "border-burn/40 text-burn",
  PENDING: "border-warn/40 text-warn",
  SWAPPED: "border-violet/40 text-violet",
};

export const OpsPage = () => {
  const auth = useAuth();
  const me = useMe(auth.authenticated);
  const isAdmin = !!me.data?.isAdmin;
  const ops = useAdminOps(isAdmin);
  const failed = useAdminJobs("FAILED", isAdmin);
  const audit = useAdminAudit(isAdmin);
  const act = useAdminAction();
  const toast = useToast();
  const [kill, setKill] = useState<{ id: string; slug: string } | null>(null);
  const [killReason, setKillReason] = useState("");
  const [settingKey, setSettingKey] = useState("");
  const [settingValue, setSettingValue] = useState("");

  useEffect(() => {
    document.title = "Berth — ops";
  }, []);

  /** Every admin mutation goes through here so failures always surface. */
  const run = (p: { path: string; body?: unknown }, done: string, after?: () => void) => {
    act.mutate(p, {
      onSuccess: () => {
        toast.success(done);
        after?.();
      },
      onError: (e) => toast.error("Action failed", e.message),
    });
  };

  if (!auth.ready || (auth.authenticated && me.isPending)) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!auth.authenticated || !isAdmin) {
    return (
      <div className="mx-auto mt-12 max-w-md">
        <p className="num text-xs text-fg-2">403</p>
        <h1 className="h2 mt-2">Operators only</h1>
        <p className="mt-2 text-sm text-fg-2">
          {auth.authenticated
            ? "This account is not an operator. Nothing behind it is user-facing: compute spend, running jobs, abuse flags, reconcile drift, and the audit log."
            : "Sign in with an operator account to see compute spend, running jobs, abuse flags, reconcile drift, and the audit log."}
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {!auth.authenticated ? (
            <button type="button" className="btn btn-primary" onClick={auth.login}>
              Sign in
            </button>
          ) : null}
          <Link to="/" className="btn">
            Back to the leaderboard
          </Link>
        </div>
      </div>
    );
  }

  if (ops.isPending) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (ops.isError)
    return (
      <div role="alert" className="border-l-2 border-burn py-1 pl-3 text-sm text-burn">
        {ops.error.message}
      </div>
    );

  const d = ops.data;
  const computePct = Math.min(100, (d.compute.todayUsd / Math.max(d.compute.ceilingUsd, 1)) * 100);
  const hot = computePct > 85;
  const failedJobs = failed.data?.items ?? d.failed;
  const auditRows: AuditEntry[] = audit.data ? audit.data.pages.flatMap((p) => p.items) : d.audit;
  // Severity first, then alphabetical: unrepaired drift, then repaired drift, then clean.
  const severity = (r: ReconcileRun) => (!r.ok || r.drifted > r.repaired ? 0 : r.drifted > 0 ? 1 : 2);
  const reconcile = [...d.reconcile].sort((a, b) => severity(a) - severity(b) || a.kind.localeCompare(b.kind));
  const unrepaired = reconcile.filter((r) => !r.ok || r.drifted > r.repaired);
  const credits = d.credits;
  const creditPct = Math.min(100, (credits.compute.todayUsd / Math.max(credits.compute.ceilingUsd, 1)) * 100);
  const creditHot = creditPct >= 80;

  return (
    <div className="flex flex-col gap-8 font-mono">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {/* The page stamp has to out-rank the eight `Section` h2s under it;
            without this step the title and every section were the same 16px. */}
        <h1 className="h1">Ops</h1>
        <span className="num text-xs text-fg-3">
          admin · polling 10s · {d.counts.users} users
        </span>
        <span className="num ml-auto text-xs text-fg-3" aria-live="polite">
          {act.isPending ? "writing…" : ""}
        </span>
      </header>

      <section className="flex flex-col gap-3" aria-label="Platform state">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div>
            <div className="label">compute spend today</div>
            <div className={`figure figure-xl mt-1 ${hot ? "text-warn" : "text-fg"}`}>
              ${d.compute.todayUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <dl className="num flex flex-wrap gap-x-6 gap-y-1 text-xs">
            <Kv k="ceiling">
              <Money usd={d.compute.ceilingUsd} className="text-fg-2" />
            </Kv>
            <Kv k="yesterday">
              <Money usd={d.compute.yesterdayUsd} className="text-fg-2" exact />
            </Kv>
            <Kv k="used">
              <span className={hot ? "text-warn" : "text-fg-2"}>{computePct.toFixed(1)}%</span>
            </Kv>
          </dl>
        </div>

        <ProgressBar
          value={d.compute.todayUsd}
          max={Math.max(d.compute.ceilingUsd, 1)}
          tone={hot ? "warn" : "rev"}
          label={`${computePct.toFixed(1)}% of the daily ceiling`}
        />
        {hot && (
          <p className="text-xs text-warn">
            Past 85% of the ceiling. The runner refuses new jobs at 100%. Raise the ceiling or let today drain.
          </p>
        )}

        <dl className="num grid grid-cols-3 gap-x-4 gap-y-2 border-t border-line pt-3 text-sm sm:grid-cols-6">
          <Kv k="live" tone="text-rev">
            {d.counts.live}
          </Kv>
          <Kv k="building">{d.counts.building}</Kv>
          <Kv k="queued">{d.queued}</Kv>
          <Kv k="dormant" tone={d.counts.dormant > 0 ? "text-warn" : undefined}>
            {d.counts.dormant}
          </Kv>
          <Kv k="killed" tone={d.counts.killed > 0 ? "text-burn" : undefined}>
            {d.counts.killed}
          </Kv>
          <Kv k="flags + reports" tone={d.flags.length + d.reports.length > 0 ? "text-warn" : undefined}>
            {d.flags.length + d.reports.length}
          </Kv>
        </dl>
      </section>

      <Section
        title="Credits"
        sub="Platform compute against the ceiling, credit-funding health, and per-app credit accounting."
        right={
          credits.alerts.length > 0 ? (
            <span className="num text-xs text-warn" role="status">
              {credits.alerts.length} alert{credits.alerts.length === 1 ? "" : "s"}
            </span>
          ) : undefined
        }
      >
        {credits.alerts.length > 0 && (
          <ul className="mb-4 flex flex-col gap-1.5">
            {credits.alerts.map((a) => (
              <li
                key={a.code}
                className={`border-l-2 py-1 pl-3 text-xs ${a.level === "error" ? "border-burn text-burn" : "border-warn text-warn"}`}
                {...(a.level === "error" ? { role: "alert" as const } : {})}
              >
                <span className="num mr-2 tracking-wide uppercase">{a.code}</span>
                {a.message}
              </li>
            ))}
          </ul>
        )}

        <ProgressBar
          value={credits.compute.todayUsd}
          max={Math.max(credits.compute.ceilingUsd, 1)}
          tone={creditHot ? "warn" : "rev"}
          size="md"
          label={
            <>
              <span>daily compute</span>
              <span className="num text-fg-2">
                <Money usd={credits.compute.todayUsd} exact /> of <Money usd={credits.compute.ceilingUsd} exact /> daily compute
              </span>
            </>
          }
        />

        <StatRow cols={3} className="mt-4">
          <Stat label="funded to card" value={<Money usd={credits.fundedTotalUsd} tone="rev" />} tone="rev" />
          <Stat label="accrued, awaiting deposit" value={<Money usd={credits.accruedTotalUsd} />} />
          <Stat label="compute ceiling" value={<Money usd={credits.compute.ceilingUsd} exact />} />
        </StatRow>

        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          <div>
            <h3 className="h3 mb-3 border-b border-line pb-2">Per-app credits</h3>
            {credits.apps.length === 0 ? (
              <EmptyState compact title="No credit activity" body="Coins with build spend or accrued credits appear here." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-xs">
                  <thead>
                    <tr className="text-left">
                      <th className={HEAD}>coin</th>
                      <th className={`${HEAD} text-right`}>spent</th>
                      <th className={`${HEAD} text-right`}>budget</th>
                      <th className={`${HEAD} text-right`}>accrued</th>
                      <th className={`${HEAD} text-right`}>funded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {credits.apps.map((a) => (
                      <tr key={a.slug} className="border-t border-line">
                        <td className={`${CELL} num`}>
                          <Link to={`/c/${a.slug}`} className="font-semibold hover:underline">
                            ${a.ticker}
                          </Link>
                          <span className="ml-1 text-fg-3">{a.name}</span>
                        </td>
                        <td className={`${CELL} text-right`}>
                          <Money usd={a.spentUsd} tone="burn" />
                        </td>
                        <td className={`${CELL} text-right`}>
                          <Money usd={a.budgetUsd} />
                        </td>
                        <td className={`${CELL} text-right`}>
                          <Money usd={a.creditsAccruedUsd} />
                        </td>
                        <td className={`${CELL} text-right`}>
                          <Money usd={a.creditsFundedUsd} tone="rev" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <h3 className="h3 mb-3 border-b border-line pb-2">Recent fundings</h3>
            {credits.recentFundings.length === 0 ? (
              <EmptyState compact title="No fundings yet" body="Credit deposits to app cards land here as they settle." />
            ) : (
              <ul className="text-xs">
                {credits.recentFundings.map((f, i) => (
                  <li
                    key={`${f.slug}-${f.createdAt}-${i}`}
                    className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-line py-2"
                  >
                    <Link to={`/c/${f.slug}`} className="num font-semibold hover:underline">
                      ${f.ticker}
                    </Link>
                    <Money usd={f.usdcUsd} className="text-fg-2" exact />
                    <span className={`${BADGE} px-1.5 py-1 ${FUNDING_CLS[f.status] ?? "border-line text-fg-3"}`}>{f.status}</span>
                    <span className="num ml-auto text-fg-3" title={formatDate(f.createdAt)}>
                      {timeAgo(f.createdAt)}
                    </span>
                    {f.error && <div className="w-full text-burn">{f.error}</div>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Section>

      <Section
        title="Reconcile"
        sub="Latest run per check. A red row is drift nobody has fixed yet; amber is drift the reconciler repaired itself."
        right={
          unrepaired.length > 0 ? (
            <span className="num text-xs text-burn" role="status">
              open drift: {unrepaired.map((r) => r.kind.toLowerCase()).join(", ")}
            </span>
          ) : reconcile.length > 0 ? (
            <span className="num text-xs text-fg-3">no open drift</span>
          ) : undefined
        }
      >
        {reconcile.length === 0 ? (
          <EmptyState compact title="No reconcile run recorded" body="The reconciler writes one row per check per pass." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px] text-xs">
              <thead>
                <tr className="text-left">
                  <th className={HEAD}>check</th>
                  <th className={HEAD}>result</th>
                  <th className={`${HEAD} text-right`}>checked</th>
                  <th className={`${HEAD} text-right`}>drifted</th>
                  <th className={`${HEAD} text-right`}>repaired</th>
                  <th className={`${HEAD} text-right`}>took</th>
                  <th className={`${HEAD} text-right`}>ran</th>
                </tr>
              </thead>
              {reconcile.map((r) => {
                // Unrepaired drift or a failed run needs a human; drift the reconciler
                // already fixed is worth seeing, but it is not an incident.
                const open = !r.ok || r.drifted > r.repaired;
                const touched = r.drifted > 0;
                const rail = open ? "border-l-2 border-burn" : touched ? "border-l-2 border-warn" : "";
                const fill = open ? "bg-burn/5" : touched ? "bg-warn/5" : undefined;
                return (
                  <tbody key={r.kind} className="border-t border-line">
                    <tr className={fill}>
                      <td className={`${CELL} num font-semibold ${rail} ${open ? "text-burn" : touched ? "text-warn" : "text-fg"}`}>
                        {r.kind.toLowerCase()}
                      </td>
                      <td className={`${CELL} num ${r.ok ? "text-fg-2" : "text-burn"}`}>{r.ok ? "ok" : "failed"}</td>
                      <td className={`${CELL} num text-right text-fg-2`}>{r.checked}</td>
                      <td className={`${CELL} num text-right ${touched ? `font-semibold ${open ? "text-burn" : "text-warn"}` : "text-fg-3"}`}>
                        {r.drifted}
                      </td>
                      <td className={`${CELL} num text-right ${r.repaired > 0 ? "text-rev" : "text-fg-3"}`}>{r.repaired}</td>
                      <td className={`${CELL} num text-right text-fg-2`}>{formatDuration(r.durationMs)}</td>
                      <td className={`${CELL} num text-right text-fg-2`} title={formatDate(r.createdAt)}>
                        {timeAgo(r.createdAt)}
                      </td>
                    </tr>
                    {r.findings.length > 0 && (
                      <tr className={fill}>
                        <td colSpan={7} className={`${CELL} ${rail}`}>
                          <ul className="flex flex-col gap-1">
                            {r.findings.map((f, i) => {
                              // Everything beyond the message itself is check-specific context.
                              const context = Object.entries(f)
                                .filter(([k]) => k !== "code" && k !== "detail")
                                .map(([k, v]) => `${k}=${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
                                .join("  ");
                              return (
                                <li key={`${f.code}-${i}`} className="num flex flex-wrap gap-x-2 text-[11px]">
                                  <span className={open ? "text-burn" : "text-warn"}>{f.code}</span>
                                  <span className="text-fg-2">{f.detail}</span>
                                  <span className="text-fg-3">{context}</span>
                                </li>
                              );
                            })}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </tbody>
                );
              })}
            </table>
          </div>
        )}
      </Section>

      <Section title="Running jobs" sub={`${d.running.length} running, ${d.queued} queued.`}>
        <JobTable
          jobs={d.running}
          empty="Nothing running."
          action={(j) => (
            <button
              type="button"
              className="btn btn-danger px-2 py-0.5 text-xs"
              disabled={act.isPending}
              onClick={() => run({ path: `/v1/admin/jobs/${j.id}/cancel` }, `Cancelled ${j.stage.toLowerCase()} on ${j.appSlug}`)}
            >
              cancel
            </button>
          )}
        />
      </Section>

      <div className="grid gap-8 lg:grid-cols-2">
        <Section title="Abuse flags" sub={`${d.flags.length} unresolved.`}>
          {d.flags.length === 0 ? (
            <EmptyState compact title="No open flags" body="Automated moderation and holder reports land here." />
          ) : (
            <ul className="text-xs">
              {d.flags.map((f) => (
                <li key={f.id} className="flex flex-wrap gap-3 border-b border-line py-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <Link to={`/c/${f.appSlug}`} className="num font-semibold hover:underline">
                        {f.appSlug}
                      </Link>
                      <span className="num text-warn">{f.source.toLowerCase()}</span>
                      <span className="num text-fg-3">{f.category.toLowerCase()}</span>
                      <span className="num text-fg-3">{timeAgo(f.createdAt)}</span>
                    </div>
                    <div className="mt-0.5 text-fg-2">{f.reason}</div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      className="btn px-2 py-0.5 text-xs"
                      disabled={act.isPending}
                      onClick={() => run({ path: `/v1/admin/flags/${f.id}/resolve` }, `Resolved flag on ${f.appSlug}`)}
                    >
                      resolve
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger px-2 py-0.5 text-xs"
                      onClick={() => setKill({ id: f.appId, slug: f.appSlug })}
                    >
                      kill
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Reports" sub={`${d.reports.length} open.`}>
          {d.reports.length === 0 ? (
            <EmptyState compact title="No open reports" body="Abuse, DMCA, and impersonation reports arrive here." />
          ) : (
            <ul className="text-xs">
              {d.reports.map((r) => (
                <li key={r.id} className="flex flex-wrap gap-3 border-b border-line py-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <Link to={`/c/${r.appSlug}`} className="num font-semibold hover:underline">
                        {r.appSlug}
                      </Link>
                      <span className={`num ${r.kind === "DMCA" ? "text-burn" : "text-fg-3"}`}>{r.kind.toLowerCase()}</span>
                      <span className="num text-fg-3">{r.reporter}</span>
                      <span className="num text-fg-3">{timeAgo(r.createdAt)}</span>
                    </div>
                    <div className="mt-0.5 whitespace-pre-wrap text-fg-2">{r.details}</div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      className="btn px-2 py-0.5 text-xs"
                      disabled={act.isPending}
                      onClick={() => run({ path: `/v1/admin/reports/${r.id}`, body: { status: "ACTIONED" } }, "Report actioned")}
                    >
                      actioned
                    </button>
                    <button
                      type="button"
                      className="btn px-2 py-0.5 text-xs"
                      disabled={act.isPending}
                      onClick={() => run({ path: `/v1/admin/reports/${r.id}`, body: { status: "DISMISSED" } }, "Report dismissed")}
                    >
                      dismiss
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger px-2 py-0.5 text-xs"
                      onClick={() => setKill({ id: r.appId, slug: r.appSlug })}
                    >
                      kill
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Section title="Killed apps" sub={`${d.killed.length} serving a 410.`}>
          {d.killed.length === 0 ? (
            <EmptyState compact title="Nothing killed" body="A killed app serves a 410 and leaves the leaderboard." />
          ) : (
            <ul className="text-xs">
              {d.killed.map((k) => (
                <li key={k.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-line py-2">
                  <Link to={`/c/${k.slug}`} className="num hover:underline">
                    {k.slug}
                  </Link>
                  <span className="num text-fg-2">${k.ticker}</span>
                  <span className="min-w-0 flex-1 truncate text-fg-3" title={k.killedReason ?? undefined}>
                    {k.killedReason ?? "no reason recorded"}
                  </span>
                  <button
                    type="button"
                    className="btn px-2 py-0.5 text-xs"
                    disabled={act.isPending}
                    onClick={() => run({ path: `/v1/admin/apps/${k.id}/unkill` }, `Restored ${k.slug}`)}
                  >
                    unkill
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Settings" sub="Runtime overrides. Applied without a deploy.">
          <dl className="num grid grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] gap-x-3 gap-y-1 text-xs">
            {Object.entries(d.settings).map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="truncate text-fg-3">{k}</dt>
                <dd className="truncate text-fg-2" title={JSON.stringify(v)}>
                  {JSON.stringify(v)}
                </dd>
              </div>
            ))}
            {Object.keys(d.settings).length === 0 && <dd className="col-span-2 text-fg-3">no overrides</dd>}
          </dl>
          <div className="mt-3 flex gap-1">
            <input
              className="input num text-xs"
              placeholder="key"
              aria-label="Setting key"
              value={settingKey}
              onChange={(e) => setSettingKey(e.target.value.trim())}
            />
            <input
              className="input num text-xs"
              placeholder="JSON value"
              aria-label="Setting value"
              value={settingValue}
              onChange={(e) => setSettingValue(e.target.value)}
            />
            <button
              type="button"
              className="btn px-3 text-xs"
              disabled={!settingKey || act.isPending}
              onClick={() => {
                let value: unknown = settingValue;
                try {
                  value = JSON.parse(settingValue);
                } catch {
                  // keep as raw string
                }
                run({ path: "/v1/admin/settings", body: { key: settingKey, value } }, `Set ${settingKey}`, () => setSettingValue(""));
              }}
            >
              set
            </button>
          </div>
        </Section>
      </div>

      <Section title="Failed jobs" sub={`${failedJobs.length} in the last window.`}>
        <JobTable jobs={failedJobs} empty="No failures." showError />
      </Section>

      <Section
        title="Audit log"
        sub="Every privileged write, newest first. Operators, the runner, and the scheduler all land here."
        right={
          <span className="num text-xs text-fg-3">
            {auditRows.length} loaded{audit.hasNextPage ? "" : audit.isSuccess ? " · end of log" : ""}
          </span>
        }
      >
        {auditRows.length === 0 ? (
          <EmptyState compact title="Nothing logged yet" body="Kills, unkills, cancels, and setting changes are written here." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-xs">
                <thead>
                  <tr className="text-left">
                    <th className={HEAD}>when</th>
                    <th className={HEAD}>actor</th>
                    <th className={HEAD}>action</th>
                    <th className={HEAD}>target</th>
                    <th className={HEAD}>meta</th>
                  </tr>
                </thead>
                <tbody>
                  {auditRows.map((a) => {
                    const sep = a.actor.indexOf(":");
                    const kind = sep === -1 ? a.actor : a.actor.slice(0, sep);
                    const ref = sep === -1 ? "" : a.actor.slice(sep + 1);
                    // `/v1/admin/audit` resolves the operator's display name; the ops strip carries only the raw actor.
                    const name = "actorName" in a && typeof a.actorName === "string" ? a.actorName : null;
                    const meta = a.meta === null || a.meta === undefined ? "" : JSON.stringify(a.meta);
                    return (
                      <tr key={a.id} className="border-t border-line">
                        <td className={`${CELL} num whitespace-nowrap text-fg-3`} title={a.createdAt}>
                          {formatDate(a.createdAt)}
                        </td>
                        <td className={`${CELL} num whitespace-nowrap`}>
                          <span className={ACTOR_CLS[kind] ?? "text-fg-2"}>{kind}</span>
                          {(name || ref) && <span className="ml-1 text-fg-3">{name ?? ref}</span>}
                        </td>
                        <td className={`${CELL} num whitespace-nowrap text-fg`}>{a.action.toLowerCase()}</td>
                        <td className={`${CELL} num whitespace-nowrap text-fg-2`}>
                          {a.targetType.toLowerCase()}
                          <span className="ml-1 text-fg-3">{a.targetId}</span>
                        </td>
                        <td className={`${CELL} num max-w-[340px] truncate text-fg-3`} title={meta}>
                          {meta === "{}" ? "" : meta}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {audit.isError && (
              <div role="alert" className="mt-2 text-xs text-burn">
                {audit.error.message}
              </div>
            )}
            {audit.hasNextPage && (
              <button
                type="button"
                className="btn mt-3 px-3 py-1 text-xs"
                disabled={audit.isFetchingNextPage}
                onClick={() => void audit.fetchNextPage()}
              >
                {audit.isFetchingNextPage ? "loading…" : "load 50 more"}
              </button>
            )}
          </>
        )}
      </Section>

      <Modal open={!!kill} onClose={() => setKill(null)} title={`Kill ${kill?.slug ?? ""}`} width="sm">
        <p className="mb-2 text-sm text-fg-2">
          Stops builds, serves a 410, hides the app from the leaderboard. Reversible with unkill. The reason shows publicly on the coin
          page.
        </p>
        <textarea
          className="input min-h-[80px]"
          value={killReason}
          aria-label="Kill reason"
          onChange={(e) => setKillReason(e.target.value)}
          placeholder="Content policy: …"
        />
        <button
          type="button"
          className="btn btn-danger mt-3"
          disabled={killReason.trim().length < 5 || act.isPending}
          onClick={() => {
            if (!kill) return;
            run({ path: `/v1/admin/apps/${kill.id}/kill`, body: { reason: killReason.trim() } }, `Killed ${kill.slug}`, () => {
              setKill(null);
              setKillReason("");
            });
          }}
        >
          Kill app
        </button>
      </Modal>
    </div>
  );
};

const Kv = ({ k, children, tone = "text-fg" }: { k: string; children: ReactNode; tone?: string }) => (
  <div>
    <dt className="label">{k}</dt>
    <dd className={`num ${tone}`}>{children}</dd>
  </div>
);

const JobTable = ({
  jobs,
  empty,
  action,
  showError = false,
}: {
  jobs: AdminJob[];
  empty: string;
  action?: (j: AdminJob) => ReactNode;
  showError?: boolean;
}) => {
  if (jobs.length === 0) return <EmptyState compact title={empty} />;
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left">
              <th className={HEAD}>app</th>
              <th className={HEAD}>stage</th>
              <th className={HEAD}>model</th>
              <th className={`${HEAD} text-right`}>cost / budget</th>
              <th className={HEAD}>started</th>
              <th className={`${HEAD} text-right`}>duration</th>
              <th className={HEAD}>status</th>
              {(action || showError) && <th className={HEAD} />}
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id} className="border-t border-line">
                <td className={CELL}>
                  <Link to={`/c/${j.appSlug}`} className="num hover:underline">
                    {j.appSlug} <span className="text-fg-3">${j.appTicker}</span>
                  </Link>
                </td>
                <td className={`${CELL} num`}>{j.stage.toLowerCase()}</td>
                <td className={`${CELL} num text-fg-2`}>{j.model ?? "—"}</td>
                <td className={`${CELL} num text-right`}>
                  <Money usd={j.costUsd} exact />{" "}
                  <span className="text-fg-3">
                    / <Money usd={j.budgetUsd} className="text-fg-3" />
                  </span>
                </td>
                <td className={`${CELL} num text-fg-2`}>{formatDate(j.startedAt ?? j.createdAt)}</td>
                <td className={`${CELL} num text-right`}>
                  {j.startedAt ? formatDuration(new Date(j.finishedAt ?? Date.now()).getTime() - new Date(j.startedAt).getTime()) : "—"}
                </td>
                <td className={`${CELL} num ${JOB_CLS[j.status]}`}>
                  {j.status.toLowerCase()}
                  {j.sandboxId && <span className="ml-1 text-fg-3">{j.sandboxId.slice(0, 8)}</span>}
                </td>
                {(action || showError) && (
                  <td className={`${CELL} text-right`}>
                    {action?.(j)}
                    {showError && j.error && (
                      <div className="max-w-[320px] truncate text-left text-xs text-burn" title={j.error}>
                        {j.error}
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col md:hidden">
        {jobs.map((j) => (
          <li key={j.id} className="border-b border-line py-2">
            <div className="flex flex-wrap items-baseline gap-2">
              <Link to={`/c/${j.appSlug}`} className="num text-sm font-semibold hover:underline">
                {j.appSlug}
              </Link>
              <span className="num text-xs text-fg-3">{j.stage.toLowerCase()}</span>
              <span className={`num ml-auto text-xs ${JOB_CLS[j.status]}`}>{j.status.toLowerCase()}</span>
            </div>
            <div className="num mt-1 flex flex-wrap gap-x-3 text-xs text-fg-3">
              <span>
                <Money usd={j.costUsd} exact /> / <Money usd={j.budgetUsd} className="text-fg-3" />
              </span>
              <span>{j.model ?? "no model"}</span>
              <span>{timeAgo(j.startedAt ?? j.createdAt)}</span>
            </div>
            {showError && j.error && <div className="mt-1 text-xs text-burn">{j.error}</div>}
            {action && <div className="mt-2">{action(j)}</div>}
          </li>
        ))}
      </ul>
    </>
  );
};
