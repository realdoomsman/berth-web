import { Link } from "react-router-dom";
import type { ShipInfo } from "../../api/types.js";
import { EmptyState } from "../../components/EmptyState.js";
import { Section } from "../../components/Section.js";
import { formatNum } from "../../lib/format.js";

/** BullMQ priority the scheduler gives apps with no stake (lower number = built sooner). */
const UNSTAKED_PRIORITY = 1000;

interface Props {
  rows: ShipInfo["topStakes"];
  totalStaked: number;
}

/**
 * Staked apps ranked by deposit. The scheduler ranks the same list and uses the rank as the
 * build-queue priority, so row N here is priority N on the next pass.
 */
export const TopStakes = ({ rows, totalStaked }: Props) => (
  <Section
    title="Top-staked apps"
    sub="Rank here is the build-queue priority on the next scheduler pass."
    right={
      <span className="micro text-fg-3">
        <span className="num">{formatNum(totalStaked)}</span> $BERTH staked · unstaked apps queue at{" "}
        <span className="num">{UNSTAKED_PRIORITY}</span>
      </span>
    }
  >
    {rows.length === 0 ? (
      <EmptyState compact title="Nothing staked yet" body="The first deposit takes priority 1 and is built before everything else." />
    ) : (
      <>
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="label py-2 pr-3">app</th>
                <th className="label py-2 pr-3 text-right">staked</th>
                <th className="label py-2 pr-3 text-right">share of stake</th>
                <th className="label py-2 pr-3 text-right">stakers</th>
                <th className="label py-2 pr-0 text-right">compute priority</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.appSlug} className="border-b border-line transition-colors hover:bg-bg-2/50">
                  <td className="py-2.5 pr-3">
                    <Link to={`/c/${r.appSlug}`} className="flex items-baseline gap-2 hover:text-rev">
                      <span className="num text-xs text-fg-2">${r.appTicker}</span>
                      <span className="font-semibold">{r.appName}</span>
                    </Link>
                  </td>
                  <td className="num py-2.5 pr-3 text-right">{formatNum(r.amount)}</td>
                  <td className="num py-2.5 pr-3 text-right text-fg-2">
                    {totalStaked > 0 ? `${((r.amount / totalStaked) * 100).toFixed(1)}%` : "—"}
                  </td>
                  <td className="num py-2.5 pr-3 text-right">{r.stakers}</td>
                  <td className="num py-2.5 pr-0 text-right">
                    <span className={i === 0 ? "font-semibold text-rev" : ""}>{i + 1}</span>
                    <span className="ml-1 text-[11px] text-fg-3">/ {UNSTAKED_PRIORITY}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="flex flex-col sm:hidden">
          {rows.map((r, i) => (
            <li key={r.appSlug} className="border-b border-line py-3">
              <div className="flex items-center gap-2">
                <span className={`num text-xs ${i === 0 ? "text-rev" : "text-fg-3"}`}>#{i + 1}</span>
                <Link to={`/c/${r.appSlug}`} className="min-w-0 truncate font-semibold">
                  {r.appName}
                </Link>
                <span className="num ml-auto text-xs text-fg-2">${r.appTicker}</span>
              </div>
              <div className="num mt-1 flex flex-wrap gap-x-3 text-xs text-fg-3">
                <span>{formatNum(r.amount)} staked</span>
                <span>{totalStaked > 0 ? `${((r.amount / totalStaked) * 100).toFixed(1)}% of stake` : "—"}</span>
                <span>
                  {r.stakers} staker{r.stakers === 1 ? "" : "s"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </>
    )}
  </Section>
);
