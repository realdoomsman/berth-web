import type { ReactNode } from "react";
import type { AppDetail, MonetizationModel } from "../../api/types.js";
import { EmptyState } from "../../components/EmptyState.js";
import { Money } from "../../components/Money.js";
import { BADGE, StatusBlock } from "../../components/StatusBadge.js";
import { IconCheck, IconExternal, IconLock, IconX } from "../../components/icons.js";
import { formatDate, formatNum } from "../../lib/format.js";
import { appUrl } from "../../env.js";

const MODEL_LABEL: Record<MonetizationModel, string> = {
  ONE_TIME: "one-time unlock",
  SUBSCRIPTION: "subscription",
  PAY_PER_REQUEST: "x402 per request",
  ADS: "ad supported",
  HOLDER_TIER: "holder-gated",
};

const Block = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="mt-6 first:mt-0">
    <h4 className="small font-semibold text-fg-2">{title}</h4>
    <div className="body mt-1.5 max-w-2xl text-fg">{children}</div>
  </section>
);

export const SpecTab = ({ app }: { app: AppDetail }) => {
  const spec = app.spec;

  if (!spec) {
    return (
      <div className="flex min-w-0 flex-col gap-6">
        <EmptyState
          title="Spec not generated yet"
          body="The intake agent turns the launcher's prompt into a buildable spec before the coin is minted. Until then the prompt below is all there is."
        />
        <section className="min-w-0">
          <h3 className="h3 border-b border-line pb-2.5">Original prompt</h3>
          <p className="num mt-3 whitespace-pre-wrap text-[13px] leading-relaxed text-fg-2">{app.prompt}</p>
        </section>
      </div>
    );
  }

  const shipped = app.mvpLiveAt !== null;
  const live = app.liveUrl ?? (app.liveVersion > 0 ? appUrl(app.slug) : null);

  return (
    <div className="grid min-w-0 gap-x-10 gap-y-9 lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)]">
      <article className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip text-fg-2">{spec.template.replace(/_/g, " ").toLowerCase()}</span>
          <span className="chip text-fg-2">{MODEL_LABEL[spec.monetization.model]}</span>
          {/* Build status is the same object here as anywhere else, so it uses
              `BADGE` rather than `chip`. The date stays outside it: a date is
              monospace, never 8px pixel. */}
          {shipped ? (
            <>
              <span className={`${BADGE} border-rev/40 bg-rev/5 px-2 py-[5px] text-rev`}>
                <IconCheck size={9} />
                shipped
              </span>
              <span className="num micro text-fg-2">{formatDate(app.mvpLiveAt)}</span>
            </>
          ) : (
            <span className={`${BADGE} border-warn/30 px-2 py-[5px] text-warn`}>not built yet</span>
          )}
        </div>

        <h3 className="h1 mt-4">{spec.title}</h3>
        <p className="body mt-2 max-w-2xl text-fg-2">{spec.oneLiner}</p>
        <p className="small mt-3 max-w-2xl text-fg-2">
          This is the pinned spec: the agent builds against it, the AI reviewer judges pull requests against it, and
          holders change it by queueing tasks.
        </p>

        <div className="mt-7 border-t border-line pt-6">
          <Block title="What it does">
            <p className="whitespace-pre-wrap">{spec.whatItDoes}</p>
          </Block>

          <Block title="Who pays">
            <p className="whitespace-pre-wrap">{spec.whoPays}</p>
          </Block>

          <Block title={`MVP checklist · ${spec.mvp.length} item${spec.mvp.length === 1 ? "" : "s"}`}>
            <ul className="flex flex-col gap-1.5">
              {spec.mvp.map((m, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  {/* Shipped is a lit green cell; not-yet-built is the theme's
                      dithered block, the same texture as `skeleton` — "the machine
                      has not got here yet" rather than an empty outline. */}
                  <span
                    aria-hidden
                    className={`mt-1 flex size-4 shrink-0 items-center justify-center ${
                      shipped ? "border border-rev/50 bg-rev/10 text-rev" : "skeleton"
                    }`}
                  >
                    {shipped && <IconCheck size={10} />}
                  </span>
                  <span>{m}</span>
                </li>
              ))}
            </ul>
            <p className="small mt-2 text-fg-2">
              {shipped
                ? `Delivered in the first deploy; ${app.liveVersion} version${app.liveVersion === 1 ? "" : "s"} shipped since.`
                : `The agent starts on this list once the budget clears the gate. The budget is currently ${app.budgetUsd > 0 ? "partly funded" : "empty"}.`}
            </p>
          </Block>

          {spec.outOfScope.length > 0 && (
            <Block title="Out of scope">
              <ul className="flex flex-col gap-1.5 text-fg-2">
                {spec.outOfScope.map((m, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <IconX size={13} className="mt-1 shrink-0 text-fg-3" />
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
            </Block>
          )}

          <Block title="Monetization">
            <p>{spec.monetization.priceDescription}</p>
            <dl className="mt-2.5 flex flex-wrap items-baseline gap-x-8 gap-y-1.5 text-sm">
              <div className="flex items-baseline gap-2">
                <dt className="small text-fg-2">model</dt>
                <dd>{MODEL_LABEL[spec.monetization.model]}</dd>
              </div>
              {spec.monetization.priceUsd !== null && (
                <div className="flex items-baseline gap-2">
                  <dt className="small text-fg-2">price</dt>
                  <dd>
                    <Money usd={spec.monetization.priceUsd} className="text-fg" exact />
                  </dd>
                </div>
              )}
              <div className="flex items-baseline gap-2">
                <dt className="small text-fg-2">collected so far</dt>
                <dd>
                  <Money usd={app.revenueUsd} tone="rev" exact />
                </dd>
              </div>
            </dl>
          </Block>

          {spec.risks.length > 0 && (
            <Block title="Risks the spec called out">
              <ul className="flex flex-col gap-1.5 text-warn">
                {spec.risks.map((m, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <StatusBlock tone="warn" className="mt-2" />
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
            </Block>
          )}
        </div>
      </article>

      <div className="flex min-w-0 flex-col gap-7 lg:border-l lg:border-line lg:pl-10">
        <section className="min-w-0">
          <h3 className="h3 border-b border-line pb-2">Holder tier</h3>
          {spec.holderTier.enabled ? (
            <>
              <div className="mt-3 flex items-baseline gap-1.5">
                <IconLock size={13} className="text-fg-3" />
                <span className="figure figure-md">{formatNum(spec.holderTier.minHoldTokens ?? 0)}</span>
                <span className="num text-sm text-fg-2">${app.ticker}</span>
              </div>
              <p className="small mt-1 text-fg-2">checked against your wallet on every request</p>
              {spec.holderTier.perks.length > 0 && (
                <ul className="mt-3 flex flex-col gap-1.5 text-sm">
                  {spec.holderTier.perks.map((p, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <IconCheck size={12} className="mt-1 shrink-0 text-rev" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="small mt-3 text-fg-2">
              No holder tier in this spec: everything ships to everyone. Holders can queue one in governance.
            </p>
          )}
        </section>

        <section className="min-w-0">
          <h3 className="h3 border-b border-line pb-2">Delivered</h3>
          <dl className="text-sm">
            <div className="flex items-baseline justify-between gap-3 border-b border-line/50 py-2">
              <dt className="small text-fg-2">live version</dt>
              <dd className="num">v{app.liveVersion}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 border-b border-line/50 py-2">
              <dt className="small text-fg-2">first build</dt>
              <dd className="num text-xs">{formatDate(app.firstBuildAt)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 border-b border-line/50 py-2">
              <dt className="small text-fg-2">mvp live</dt>
              <dd className="num text-xs">{formatDate(app.mvpLiveAt)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 py-2">
              <dt className="small text-fg-2">first revenue</dt>
              <dd className="num text-xs">{formatDate(app.firstRevenueAt)}</dd>
            </div>
          </dl>
          {live && (
            <a href={live} target="_blank" rel="noreferrer" className="btn mt-3 w-full justify-center">
              Open the built app
              <IconExternal size={13} />
            </a>
          )}
        </section>

        <details className="disclosure">
          <summary className="small cursor-pointer select-none text-fg-2">Original prompt</summary>
          <p className="num mt-1 whitespace-pre-wrap pb-3 text-[12.5px] leading-relaxed text-fg-2">{app.prompt}</p>
        </details>
      </div>
    </div>
  );
};
