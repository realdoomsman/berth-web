import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { REVENUE_SPLIT_BPS } from "@ship/shared";
import { useApp } from "../../api/queries.js";
import { isHttpError } from "../../api/client.js";
import { Money } from "../../components/Money.js";
import { ShareCard, type ShareStat } from "../../components/ShareCard.js";
import { formatNum, formatRatio } from "../../lib/format.js";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "drafting",
  SPEC_READY: "spec ready",
  AWAITING_STAKE: "awaiting stake",
  LAUNCHING: "launching",
  LIVE: "live",
  DORMANT: "dormant",
  KILLED: "killed",
  FAILED: "failed",
};

const BUYBACK_PCT = REVENUE_SPLIT_BPS.BUYBACK_BURN / 100;

/**
 * `/c/:slug/card` — single-coin share composition, fixed 1200×630. Three figures
 * and one sentence: what the product earned, what that destroyed, what you are
 * paying for it. The state of the app goes in the footnote, as prose, because a
 * word like "dormant" is not a figure.
 */
export const CoinCard = () => {
  const { slug = "" } = useParams();
  const q = useApp(slug);
  const app = q.data ?? null;

  useEffect(() => {
    document.title = app ? `$${app.ticker} — Berth card` : "Berth — coin card";
  }, [app]);

  if (!app) {
    const missing = q.isError && isHttpError(q.error) && q.error.status === 404;
    return (
      <main>
        <ShareCard
          variant="coin"
          title={missing ? "No coin at this address" : q.isError ? "Card unavailable" : "Loading"}
          subtitle={
            missing
              ? `Nothing on Berth uses "${slug}".`
              : q.isError
                ? `Could not load $${slug} — ${q.error.message}`
                : slug
          }
        />
      </main>
    );
  }

  const earning = app.revenueUsd > 0;
  const status = STATUS_LABEL[app.status] ?? app.status.toLowerCase();

  const stats: ShareStat[] = earning
    ? [
        {
          label: "revenue collected from users",
          value: <Money usd={app.revenueUsd} tone="rev" exact={app.revenueUsd < 1_000_000} />,
          tone: "in",
        },
        {
          label: `$${app.ticker} burned`,
          value: app.burnedTokens > 0 ? formatNum(app.burnedTokens) : "0",
          tone: "out",
        },
        { label: "price ÷ revenue", value: formatRatio(app.priceToRevenue) },
      ]
    : [
        { label: "revenue collected from users", value: <Money usd={0} exact />, tone: "in" },
        { label: "build budget", value: <Money usd={app.budgetUsd} tone="rev" exact />, tone: "in" },
        { label: "versions shipped", value: `v${app.liveVersion}` },
      ];

  return (
    <main>
      <ShareCard
        variant="coin"
        title={`$${app.ticker}`}
        subtitle={app.spec?.oneLiner ?? app.oneLiner ?? app.name}
        stats={stats}
        footnote={
          app.status === "DORMANT" ? (
            <>
              {earning ? (
                <>
                  Users paid <Money usd={app.revenueUsd} tone="rev" exact={app.revenueUsd < 1_000_000} />, but the
                  build budget is empty, so ${app.ticker} is dormant.
                </>
              ) : (
                <>The build budget is empty, so ${app.ticker} is dormant.</>
              )}{" "}
              The next trading fee restarts it.
            </>
          ) : app.status === "KILLED" ? (
            <>${app.ticker} is delisted. The coin still trades; the app is offline.</>
          ) : app.status === "FAILED" ? (
            <>The build loop never produced a working deploy for ${app.ticker}.</>
          ) : earning ? (
            <>
              Users paid <Money usd={app.revenueUsd} tone="rev" exact={app.revenueUsd < 1_000_000} />.{" "}
              <span className="num">{BUYBACK_PCT}%</span> of it buys ${app.ticker} and burns it.
            </>
          ) : app.liveVersion > 0 ? (
            <>
              ${app.ticker} is {status} and open for business. Nothing here is projected.
            </>
          ) : (
            <>
              ${app.ticker} is {status}. Trading fees pay the agent to build it.
            </>
          )
        }
      />
    </main>
  );
};
