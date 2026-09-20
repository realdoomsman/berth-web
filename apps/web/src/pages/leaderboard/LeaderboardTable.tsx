import { Link } from "react-router-dom";
import type { AppSummary } from "../../api/types.js";
import { Money } from "../../components/Money.js";
import { Monogram } from "../../components/Monogram.js";
import { Skeleton } from "../../components/Skeleton.js";
import { StatusBadge } from "../../components/StatusBadge.js";
import { feedLine } from "../../components/feedLine.js";
import { formatNum, formatRatio, formatSol, timeAgo } from "../../lib/format.js";

/*
 * The shareable artifact: coin tickers with dollar figures next to them. It sits
 * directly on the page — no panel, no toolbar, no pulsing dot — because the
 * quieter the chrome, the more the revenue column reads as a record rather than
 * a widget. From `sm` up the header sticks under the app bar (h-14) so the
 * columns stay labelled while you scroll a long board.
 *
 * Numerics are right-aligned `num` so digits line up. Below `sm` the table
 * scrolls horizontally with rank + coin pinned and the secondary metrics
 * collapsed into a stacked line under the coin name — and the header is *not*
 * sticky there, because a cell that is sticky on both axes ends up painting
 * under the pinned body cells instead of over them.
 */
const TH =
  "label whitespace-nowrap bg-bg px-2 py-2.5 text-left shadow-[inset_0_-1px_0_var(--color-line)] sm:sticky sm:top-14 sm:z-20 sm:px-3";
const THR = `${TH} text-right`;
const TD = "whitespace-nowrap px-2 py-2 sm:px-3";
const TDR = `num ${TD} text-right`;
const PIN_RANK = "max-sm:sticky max-sm:left-0 max-sm:z-[2] max-sm:bg-bg max-sm:group-hover:bg-bg-1";
const PIN_COIN = "max-sm:sticky max-sm:left-9 max-sm:z-[2] max-sm:bg-bg max-sm:group-hover:bg-bg-1";

interface Props {
  apps: AppSummary[];
  /** one factual line under the table, e.g. "Ranked by lifetime revenue." */
  caption: string;
  loading?: boolean;
}

export const LeaderboardTable = ({ apps, caption, loading = false }: Props) => (
  <div className="max-sm:overflow-x-auto">
    <table className="w-full border-collapse text-sm">
      <caption className="small caption-bottom pt-3 text-left text-fg-2">
        {caption} Revenue is USD the product collected from its own users, verified on-chain before it counts, and it
        is what funds the buybacks.
      </caption>
      <thead>
        <tr>
          <th scope="col" className={`${TH} w-9 ${PIN_RANK}`}>
            #
          </th>
          <th scope="col" className={`${TH} ${PIN_COIN}`}>
            coin
          </th>
          <th scope="col" className={THR}>
            revenue
          </th>
          <th scope="col" className={`${THR} hidden sm:table-cell`}>
            p/r
          </th>
          <th scope="col" className={`${THR} hidden md:table-cell`}>
            buybacks
          </th>
          <th scope="col" className={`${THR} hidden sm:table-cell`}>
            users
          </th>
          <th scope="col" className={`${THR} hidden lg:table-cell`}>
            holders
          </th>
          <th scope="col" className={`${THR} hidden md:table-cell`}>
            mcap
          </th>
          <th scope="col" className={`${THR} hidden pr-3 sm:table-cell`}>
            status
          </th>
          <th scope="col" className={`${TH} hidden lg:table-cell`}>
            last activity
          </th>
        </tr>
      </thead>
      <tbody>
        {apps.map((a, i) => (
          <Row key={a.id} app={a} rank={i + 1} />
        ))}
        {loading &&
          Array.from({ length: apps.length === 0 ? 6 : 2 }, (_, i) => (
            <tr key={`sk-${i}`} className="border-t border-line">
              <td className={`${TD} ${PIN_RANK}`}>
                <Skeleton className="h-3 w-4" />
              </td>
              <td className={`${TD} ${PIN_COIN}`}>
                <div className="flex items-center gap-2.5">
                  <Skeleton className="size-7" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </td>
              <td className={TD}>
                <Skeleton className="ml-auto h-3.5 w-16" />
              </td>
              <td className={`${TD} hidden sm:table-cell`}>
                <Skeleton className="ml-auto h-3 w-10" />
              </td>
              <td className={`${TD} hidden md:table-cell`}>
                <Skeleton className="ml-auto h-3 w-16" />
              </td>
              <td className={`${TD} hidden sm:table-cell`}>
                <Skeleton className="ml-auto h-3 w-10" />
              </td>
              <td className={`${TD} hidden lg:table-cell`}>
                <Skeleton className="ml-auto h-3 w-10" />
              </td>
              <td className={`${TD} hidden md:table-cell`}>
                <Skeleton className="ml-auto h-3 w-14" />
              </td>
              <td className={`${TD} hidden sm:table-cell`}>
                <Skeleton className="ml-auto h-4 w-16" />
              </td>
              <td className={`${TD} hidden lg:table-cell`}>
                <Skeleton className="h-3 w-24" />
              </td>
            </tr>
          ))}
      </tbody>
    </table>
  </div>
);

const Row = ({ app, rank }: { app: AppSummary; rank: number }) => {
  const last = app.lastEvent;
  return (
    <tr className="group border-t border-line transition-colors hover:bg-bg-1">
      <td className={`num ${TD} text-xs text-fg-3 ${PIN_RANK}`}>{rank}</td>
      <td className={`${TD} ${PIN_COIN}`}>
        <Link to={`/c/${app.slug}`} className="flex items-center gap-2.5">
          <Monogram ticker={app.ticker} src={app.imageUrl} size={26} />
          <span className="min-w-0">
            <span className="flex items-baseline gap-2">
              <span className="max-w-[7.5rem] truncate font-medium group-hover:text-rev sm:max-w-[14rem]">
                {app.name}
              </span>
              <span className="num text-xs text-fg-2">${app.ticker}</span>
            </span>
            <span className="mt-0.5 flex items-center gap-2 text-[11px] sm:hidden">
              <StatusBadge status={app.status} runningStage={app.runningJob?.stage ?? null} size="sm" />
              <span className="num text-fg-2">{formatRatio(app.priceToRevenue)} p/r</span>
            </span>
          </span>
        </Link>
      </td>
      <td className={`${TD} text-right`}>
        {app.revenueUsd > 0 ? (
          <Money
            usd={app.revenueUsd}
            tone="rev"
            exact={app.revenueUsd < 1_000_000}
            className="figure figure-md font-semibold"
          />
        ) : (
          <span className="num text-fg-3">$0</span>
        )}
      </td>
      <td className={`${TDR} hidden text-fg-2 sm:table-cell`}>{formatRatio(app.priceToRevenue)}</td>
      <td className={`${TDR} hidden md:table-cell`}>
        {app.buybackSol > 0 ? formatSol(app.buybackSol) : <span className="text-fg-3">—</span>}
        {app.burnedTokens > 0 && (
          <span className="block text-[11px] text-burn">{formatNum(app.burnedTokens)} burned</span>
        )}
      </td>
      <td className={`${TDR} hidden text-fg-2 sm:table-cell`}>{formatNum(app.users)}</td>
      <td className={`${TDR} hidden text-fg-2 lg:table-cell`}>{formatNum(app.holders)}</td>
      <td className={`${TDR} hidden text-fg-2 md:table-cell`}>
        <Money usd={app.marketCapUsd} tone="plain" className="text-fg-2" />
      </td>
      <td className={`${TD} hidden pr-3 text-right sm:table-cell`}>
        <StatusBadge status={app.status} runningStage={app.runningJob?.stage ?? null} />
      </td>
      <td className={`${TD} hidden max-w-[16rem] lg:table-cell`}>
        <span className="num text-xs text-fg-2">{timeAgo(last?.createdAt ?? app.createdAt)}</span>
        <span className="num block truncate text-xs text-fg-2">{last ? feedLine(last) : "waiting for first fees"}</span>
      </td>
    </tr>
  );
};
