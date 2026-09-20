import { useEffect } from "react";
import { REVENUE_SPLIT_BPS } from "@ship/shared";
import { useApps } from "../../api/queries.js";
import { ShareCard, type ShareRow } from "../../components/ShareCard.js";
import { Money } from "../../components/Money.js";

/**
 * `/card` — the leaderboard share composition. Fixed 1200×630, no chrome, no
 * navigation: this route exists to be screenshotted and to back OG images.
 */
export const BoardCard = () => {
  const q = useApps("revenue");
  const apps = q.data?.pages.flatMap((p) => p.items) ?? [];

  useEffect(() => {
    document.title = "Berth — leaderboard card";
  }, []);

  const rows: ShareRow[] = apps.slice(0, 5).map((a, i) => ({
    rank: i + 1,
    ticker: a.ticker,
    name: a.name,
    revenueUsd: a.revenueUsd,
    imageUrl: a.imageUrl,
    status: a.status,
  }));
  const listed = rows.reduce((n, r) => n + r.revenueUsd, 0);

  return (
    <main>
      <ShareCard
        title="Coins ranked by the money their app earned"
        subtitle={
          rows.length > 0
            ? "Revenue collected from real users. Not volume, not market cap."
            : q.isError
              ? `Board unavailable — ${q.error.message}`
              : q.isPending
                ? "Loading the board…"
                : "No apps have launched yet. Row one is unclaimed."
        }
        rows={rows}
        footnote={
          listed > 0 ? (
            <>
              <Money usd={listed} tone="rev" exact={listed < 1_000_000} /> earned by{" "}
              {rows.length === 1 ? "the app above" : `the ${rows.length} apps above`}.{" "}
              <span className="num">{REVENUE_SPLIT_BPS.BUYBACK_BURN / 100}%</span> of it buys back and burns their
              coins.
            </>
          ) : undefined
        }
      />
    </main>
  );
};
