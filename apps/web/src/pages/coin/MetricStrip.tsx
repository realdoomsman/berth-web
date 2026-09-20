import type { ReactNode } from "react";
import type { AppDetail } from "../../api/types.js";
import { InfoTip } from "../../components/InfoTip.js";
import { Money } from "../../components/Money.js";
import { formatNum, formatPct, formatPrice, formatRatio, formatSol, timeAgo } from "../../lib/format.js";

const P_REV_TIP =
  "Market cap divided by annualized revenue (last 30 days × 12). Lower means you are paying less per dollar the app actually earns — the same multiple equity investors use.";

interface Metric {
  k: string;
  label: ReactNode;
  value: ReactNode;
  tone?: string;
}

/**
 * Market and usage numbers, deliberately demoted: they matter, but they are not
 * the story. One hairline row under the money block — no cells, no borders, no
 * display figures competing with the revenue figure above.
 */
export const MetricStrip = ({ app, traded }: { app: AppDetail; traded: boolean }) => {
  const metrics: Metric[] = traded
    ? [
        { k: "price", label: "price", value: formatPrice(app.priceUsd) },
        { k: "mcap", label: "market cap", value: <Money usd={app.marketCapUsd} /> },
        { k: "vol", label: "24h volume", value: <Money usd={app.volume24hUsd} /> },
        { k: "liq", label: "liquidity", value: app.liquidityUsd > 0 ? <Money usd={app.liquidityUsd} /> : "—" },
        {
          k: "pr",
          label: (
            <span className="inline-flex items-center gap-1">
              price / revenue
              <InfoTip text={P_REV_TIP} />
            </span>
          ),
          value: formatRatio(app.priceToRevenue),
        },
        { k: "holders", label: "holders", value: formatNum(app.holders) },
        { k: "users", label: `users · v${app.liveVersion}`, value: formatNum(app.users) },
        {
          k: "uptime",
          label: app.liveVersion > 0 ? (app.healthy ? "uptime · ok" : "uptime · failing") : "uptime",
          value: app.liveVersion > 0 ? formatPct(app.uptimeBps) : "—",
          tone: app.liveVersion > 0 && app.uptimeBps < 9900 ? "text-warn" : undefined,
        },
      ]
    : [
        { k: "budget", label: "build budget", value: <Money usd={app.budgetUsd} exact />, tone: "text-rev" },
        {
          k: "stake",
          label: app.stakeRefundedAt ? "stake · refunded" : "stake · refundable",
          value: formatSol(app.stakeSol),
        },
        { k: "status", label: "status", value: app.status.toLowerCase().replace(/_/g, " ") },
        { k: "created", label: "created", value: timeAgo(app.createdAt) },
      ];

  return (
    <section aria-label="Market and usage metrics" className="border-y border-line py-3.5">
      <dl
        className={`grid gap-x-6 gap-y-4 ${traded ? "grid-cols-2 sm:grid-cols-4 lg:grid-cols-8" : "grid-cols-2 sm:grid-cols-4"}`}
      >
        {metrics.map((m) => (
          <div key={m.k} className="min-w-0">
            <dt className="label truncate">{m.label}</dt>
            <dd className={`num mt-1 truncate text-sm ${m.tone ?? ""}`}>{m.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
};
