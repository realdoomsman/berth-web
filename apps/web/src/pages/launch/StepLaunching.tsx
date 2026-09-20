import { Link } from "react-router-dom";
import type { LaunchDto } from "../../api/types.js";
import { Monogram } from "../../components/Monogram.js";
import { StatusBlock } from "../../components/StatusBadge.js";
import { TxLink } from "../../components/TxLink.js";
import { IconCheck } from "../../components/icons.js";
import { pumpCoinUrl } from "../../env.js";

const STEPS: Array<{ label: string; active: string; done: (l: LaunchDto) => boolean }> = [
  { label: "Stake verified on-chain", active: "Confirming your stake transaction", done: (l) => !!l.stakeTx },
  { label: "Metadata uploaded", active: "Uploading the coin image and metadata", done: (l) => !!l.mint || !!l.launchTx },
  { label: "Coin created on pump.fun", active: "Creating the coin on pump.fun", done: (l) => !!l.mint },
  { label: "Live and collecting fees", active: "Indexing the coin and opening the page", done: (l) => l.status === "LIVE" || l.status === "DORMANT" },
];

export const StepLaunching = ({ launch }: { launch: LaunchDto }) => {
  const failed = launch.status === "FAILED" || launch.status === "KILLED";
  const currentIndex = STEPS.findIndex((s) => !s.done(launch));
  const current = failed || currentIndex === -1 ? null : STEPS[currentIndex];

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="flex items-center gap-3 border-b border-line pb-5">
        <Monogram ticker={launch.ticker} src={launch.imageUrl} size={44} />
        <div className="min-w-0">
          <h2 className="h3 truncate">{launch.name}</h2>
          <div className="num text-xs text-fg-2">${launch.ticker}</div>
        </div>
        <p className="ml-auto text-right text-sm" aria-live="polite">
          {failed ? (
            <span className="text-burn">Launch {launch.status.toLowerCase()}</span>
          ) : current ? (
            <span className="text-warn">{current.active}…</span>
          ) : (
            <span className="text-rev">Live. Taking you to the coin page.</span>
          )}
        </p>
      </div>

      <ol className="mt-5 flex flex-col gap-2.5">
        {STEPS.map((s, i) => {
          const done = s.done(launch);
          const active = !failed && i === currentIndex;
          return (
            <li key={s.label} className="flex items-center gap-3 text-sm">
              <span
                aria-hidden
                className={`num inline-flex size-5 shrink-0 items-center justify-center text-[11px] ${
                  done ? "text-rev" : active ? "text-warn" : "text-fg-3"
                }`}
              >
                {done ? <IconCheck size={13} /> : i + 1}
              </span>
              <span className={done || active ? "text-fg" : "text-fg-3"}>{s.label}</span>
              {active && <StatusBlock tone="warn" live className="ml-auto" />}
            </li>
          );
        })}
      </ol>

      <dl className="mt-6 flex flex-col gap-1.5 border-t border-line pt-4 text-xs text-fg-2">
        <div className="flex justify-between gap-3">
          <dt>stake tx</dt>
          <dd>
            <TxLink sig={launch.stakeTx} />
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>launch tx</dt>
          <dd>
            <TxLink sig={launch.launchTx} />
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>mint</dt>
          <dd>
            {launch.mint ? (
              <a href={pumpCoinUrl(launch.mint)} target="_blank" rel="noreferrer noopener" className="num text-info hover:underline">
                pump.fun ↗
              </a>
            ) : (
              <span className="text-fg-3">—</span>
            )}
          </dd>
        </div>
      </dl>

      {failed ? (
        <div role="alert" className="mt-6 border-l-2 border-burn pl-4">
          <h3 className="h3 text-burn">Launch {launch.status.toLowerCase()}</h3>
          <p className="mt-1 text-sm text-fg-2">
            {launch.error ?? "The stake is refunded automatically to the wallet it came from."}
          </p>
          <Link to="/launch" className="btn mt-4">
            Start over
          </Link>
        </div>
      ) : (
        <p className="mt-6 text-xs text-fg-2">
          Under a minute, usually, and it keeps running if you close the tab.{" "}
          <Link to={`/c/${launch.slug}`} className="underline">
            Go to the coin page now
          </Link>
          .
        </p>
      )}
    </div>
  );
};
