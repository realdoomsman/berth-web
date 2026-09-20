import { useEffect } from "react";
import { useHealth, useStats } from "../../api/queries.js";
import { Money } from "../../components/Money.js";
import { Section } from "../../components/Section.js";
import { Skeleton } from "../../components/Skeleton.js";
import { Stat, StatRow } from "../../components/Stat.js";
import { BADGE, StatusBlock } from "../../components/StatusBadge.js";
import { formatNum, formatPct } from "../../lib/format.js";

/**
 * Public status board: is the API up, and what has the platform done. Calm and
 * read-only — no actions, no auth. Health drives one badge; the rest is the same
 * `/v1/stats` the leaderboard reads, presented as a plain ledger of the machine.
 */
export const Status = () => {
  const health = useHealth();
  const stats = useStats();

  useEffect(() => {
    document.title = "Berth — Status";
  }, []);

  const up = health.isSuccess && health.data.ok;
  const down = health.isError || (health.isSuccess && !health.data.ok);
  const label = health.isPending ? "checking" : up ? "operational" : "disrupted";

  return (
    <div className="flex flex-col gap-9">
      <Section title="Status" sub="Live service health and platform metrics. Nothing to sign — this page only reports.">
        <div className="panel flex flex-wrap items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-2.5">
            <StatusBlock tone={up ? "in" : down ? "out" : "quiet"} live={up} size={9} />
            <div>
              <div className="font-semibold">Berth API</div>
              <div className="small text-fg-2">
                {health.isPending ? "Checking service health…" : up ? "All systems operational" : "Service disruption — check back shortly"}
              </div>
            </div>
          </div>
          <span
            className={`${BADGE} px-2 py-[5px] ${
              up ? "border-rev/40 bg-rev/5 text-rev" : down ? "border-burn/40 bg-burn/5 text-burn" : "border-line text-fg-2"
            }`}
          >
            {label}
          </span>
        </div>
      </Section>

      <Section title="Platform" sub="What Berth has shipped and burned to date." icon={<StatusBlock tone="quiet" size={8} />}>
        {stats.isPending ? (
          <Skeleton className="h-28 w-full" />
        ) : stats.isError ? (
          <div role="alert" className="border-l-2 border-burn py-1 pl-3 text-sm text-burn">
            {stats.error.message}
          </div>
        ) : stats.data ? (
          <div className="flex flex-col gap-6">
            <StatRow cols={3}>
              <Stat label="apps live" value={formatNum(stats.data.appsLive)} tone="rev" />
              <Stat label="building" value={formatNum(stats.data.appsBuilding)} tone="info" />
              <Stat label="apps total" value={formatNum(stats.data.appsTotal)} />
            </StatRow>
            <StatRow cols={4}>
              <Stat label="revenue" value={<Money usd={stats.data.revenueUsd} tone="rev" />} />
              <Stat label="$BERTH burned" value={formatNum(stats.data.shipBurned)} tone="burn" />
              <Stat label="buyback" value={<Money usd={stats.data.buybackUsd} tone="rev" />} />
              <Stat label="fees paid" value={<Money usd={stats.data.feesUsd} />} />
            </StatRow>
            <StatRow cols={3}>
              <Stat label="avg uptime" value={formatPct(stats.data.uptimeAvgBps)} />
              <Stat label="first-deploy success" value={formatPct(stats.data.firstDeploySuccessRate * 10_000)} />
              <Stat label="apps killed" value={formatNum(stats.data.appsKilled)} tone="warn" />
            </StatRow>
          </div>
        ) : null}
      </Section>
    </div>
  );
};
