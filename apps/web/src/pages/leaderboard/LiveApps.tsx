import type { AppSummary } from "../../api/types.js";
import { Money } from "../../components/Money.js";
import { IconExternal } from "../../components/icons.js";
import { appUrl } from "../../env.js";

/*
 * The dogfood line, folded into the board instead of owning a section of three
 * cards: these rows are deployed apps on their own domains, and the link opens
 * the product rather than the coin page.
 */
export const LiveApps = ({ apps }: { apps: AppSummary[] }) => {
  const live = apps.filter((a) => a.liveVersion > 0).slice(0, 4);
  if (live.length === 0) return null;

  return (
    <div className="border-t border-line pt-4">
      <p className="small text-fg-2">
        Deployed right now, each on its own domain, each taking payments through the platform checkout:
      </p>
      <ul className="mt-3 grid gap-x-10 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
        {live.map((a) => (
          <li key={a.id} className="min-w-0">
            <a
              href={a.liveUrl ?? appUrl(a.slug)}
              target="_blank"
              rel="noreferrer"
              className="flex min-w-0 items-baseline gap-1.5 text-sm font-medium text-fg transition-colors hover:text-rev"
            >
              <span className="truncate">{a.name}</span>
              <IconExternal size={12} className="shrink-0 text-fg-2" />
            </a>
            <div className="num mt-0.5 flex items-baseline gap-2 text-xs text-fg-2">
              <span>${a.ticker}</span>
              <span aria-hidden className="h-3 w-px bg-line" />
              <Money usd={a.revenueUsd} tone={a.revenueUsd > 0 ? "rev" : "plain"} exact={a.revenueUsd < 1_000_000} />
              <span>v{a.liveVersion}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
