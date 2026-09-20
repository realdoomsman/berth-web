import { useState, type ReactNode } from "react";
import { AppSpec, MonetizationModel } from "@ship/shared";
import type { AppSpec as Spec, MonetizationModel as Model } from "@ship/shared";
import { Skeleton } from "../../components/Skeleton.js";
import { StatusBlock } from "../../components/StatusBadge.js";
import { IconChevron, IconX } from "../../components/icons.js";

interface Props {
  spec: Spec;
  ticker: string;
  busy: boolean;
  error: string | null;
  onApprove: (spec: Spec) => void;
  onBack: () => void;
}

const MODEL_LABEL: Record<Model, string> = {
  ONE_TIME: "One-time purchase (USDC)",
  SUBSCRIPTION: "Monthly subscription (USDC)",
  PAY_PER_REQUEST: "Pay per request (x402 API)",
  ADS: "Free with ads",
  HOLDER_TIER: "Free, pro tier for holders",
};

/** Form field label: sentence case, not a shouted micro-label. */
const LBL = "text-[13px] font-medium text-fg";

const TEMPLATES: Array<{ id: Spec["template"]; label: string; hint: string }> = [
  { id: "WEB_TOOL", label: "Web tool", hint: "utility / SaaS-style page" },
  { id: "GAME", label: "Game", hint: "canvas or DOM game loop" },
  { id: "AGENT_API", label: "Agent API", hint: "x402 endpoint + docs page" },
];

/** Shown while the intake agent drafts the spec — the launch sits in DRAFT and the page polls. */
export const SpecGenerating = () => (
  <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
    <div>
      <div className="flex items-center gap-2">
        <StatusBlock tone="agent" live size={8} />
        <h2 className="h3">The intake agent is writing your spec</h2>
      </div>
      <p className="mt-2 max-w-prose text-sm text-fg-2">
        Moderation first, then a build spec drafted from your prompt: what ships, who pays, what is out of scope. Usually{" "}
        <span className="num">20–60s</span>. You edit every line of it before anything launches.
      </p>
      <div className="mt-7 flex flex-col gap-6" aria-hidden>
        {[
          ["h-4 w-40", "h-3 w-full", "h-3 w-11/12"],
          ["h-4 w-28", "h-3 w-10/12", "h-3 w-9/12"],
          ["h-4 w-36", "h-3 w-full", "h-3 w-8/12"],
        ].map((rows, i) => (
          <div key={i} className="flex flex-col gap-2">
            {rows.map((r) => (
              <Skeleton key={r} className={r} />
            ))}
          </div>
        ))}
      </div>
      <div className="sr-only" aria-live="polite">
        Generating the build spec.
      </div>
    </div>
    <aside className="self-start border-l border-line pl-4 text-sm text-fg-2">
      The spec gets pinned to the coin page. Anyone deciding whether to buy reads exactly what their fees are paying to build.
    </aside>
  </div>
);

/** Moderation refused the prompt. Terminal for this draft; the form below stays editable. */
export const SpecRejected = ({ reason }: { reason: string }) => (
  <div role="alert" className="border-l-2 border-burn pl-4">
    <h2 className="h3 text-burn">Moderation rejected this idea</h2>
    <p className="mt-1.5 text-sm text-fg-2">{reason}</p>
    <p className="mt-1.5 text-sm text-fg-2">
      Nothing launched and nothing was charged. Scams, impersonation, gambling, and illegal services are refused outright; anything else,
      edit below and try again.
    </p>
  </div>
);

export const StepSpec = ({ spec: initial, ticker, busy, error, onApprove, onBack }: Props) => {
  const [spec, setSpec] = useState<Spec>(initial);
  const [errs, setErrs] = useState<string[]>([]);

  const patch = (p: Partial<Spec>) => setSpec((s) => ({ ...s, ...p }));

  const approve = () => {
    const parsed = AppSpec.safeParse(spec);
    if (!parsed.success) {
      setErrs(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`));
      return;
    }
    setErrs([]);
    onApprove(parsed.data);
  };

  const priced = spec.monetization.model !== "ADS" && spec.monetization.model !== "HOLDER_TIER";

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="flex flex-col gap-7">
        <p className="body max-w-prose text-fg-2">
          This is the contract. It gets pinned to the <span className="num">${ticker || "COIN"}</span> coin page and handed to the build
          agent verbatim, so buyers can read what their fees are funding. Edit anything.
        </p>

        <SpecSection title="Identity" sub="Headline and shape of the app.">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={LBL}>Title</span>
              <input className="input mt-1" value={spec.title} onChange={(e) => patch({ title: e.target.value })} maxLength={80} />
            </label>
            <label className="block">
              <span className={LBL}>Template</span>
              <select
                className="input mt-1"
                value={spec.template}
                onChange={(e) => patch({ template: e.target.value as Spec["template"] })}
              >
                {TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label} — {t.hint}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="mt-4 block">
            <span className={LBL}>One-liner</span>
            <input className="input mt-1" value={spec.oneLiner} onChange={(e) => patch({ oneLiner: e.target.value })} maxLength={160} />
          </label>
        </SpecSection>

        <SpecSection title="What it does" sub="Plain description of the product the agent will build.">
          <textarea
            className="input min-h-[110px] resize-y"
            value={spec.whatItDoes}
            onChange={(e) => patch({ whatItDoes: e.target.value })}
            maxLength={1200}
          />
        </SpecSection>

        <SpecSection title="Who pays" sub="Name the buyer. Vague answers here produce apps that never earn.">
          <textarea
            className="input min-h-[70px] resize-y"
            value={spec.whoPays}
            onChange={(e) => patch({ whoPays: e.target.value })}
            maxLength={600}
          />
        </SpecSection>

        <SpecSection title="Scope" sub="The first build ships the MVP list, top to bottom.">
          <ListEditor
            label="MVP scope"
            items={spec.mvp}
            max={8}
            onChange={(mvp) => patch({ mvp })}
            placeholder="Add an MVP feature"
            reorder
          />
          <div className="mt-5">
            <ListEditor
              label="Out of scope"
              items={spec.outOfScope}
              max={8}
              onChange={(outOfScope) => patch({ outOfScope })}
              placeholder="Explicitly not building…"
            />
          </div>
        </SpecSection>

        <SpecSection title="Monetization" sub="Revenue is what buys back and burns the coin, so this is not decoration.">
          <div className="grid gap-4 sm:grid-cols-[1fr_150px]">
            <label className="block">
              <span className={LBL}>Model</span>
              <select
                className="input mt-1"
                value={spec.monetization.model}
                onChange={(e) => {
                  const model = MonetizationModel.parse(e.target.value);
                  patch({
                    monetization: {
                      ...spec.monetization,
                      model,
                      priceUsd: model === "ADS" || model === "HOLDER_TIER" ? null : (spec.monetization.priceUsd ?? 5),
                    },
                  });
                }}
              >
                {MonetizationModel.options.map((m) => (
                  <option key={m} value={m}>
                    {MODEL_LABEL[m]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={LBL}>Price (USD)</span>
              <input
                className="input num mt-1"
                type="number"
                min={0}
                step="0.01"
                disabled={!priced}
                value={spec.monetization.priceUsd ?? ""}
                onChange={(e) =>
                  patch({ monetization: { ...spec.monetization, priceUsd: e.target.value === "" ? null : Number(e.target.value) } })
                }
              />
            </label>
          </div>
          <label className="mt-4 block">
            <span className={LBL}>Price description</span>
            <input
              className="input mt-1"
              value={spec.monetization.priceDescription}
              onChange={(e) => patch({ monetization: { ...spec.monetization, priceDescription: e.target.value } })}
              maxLength={200}
              placeholder="$5 unlocks PDF export forever"
            />
          </label>
        </SpecSection>

        <SpecSection title="Holder tier" sub="Perks the app checks live against the wallet's balance.">
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm text-fg-2">Give holders of the coin something the public tier does not get.</span>
            <input
              type="checkbox"
              className="size-4 shrink-0 accent-rev"
              checked={spec.holderTier.enabled}
              aria-label="Enable holder tier"
              onChange={(e) =>
                patch({
                  holderTier: {
                    ...spec.holderTier,
                    enabled: e.target.checked,
                    minHoldTokens: e.target.checked ? (spec.holderTier.minHoldTokens ?? 100_000) : spec.holderTier.minHoldTokens,
                  },
                })
              }
            />
          </label>
          {spec.holderTier.enabled && (
            <div className="mt-4 grid gap-4 sm:grid-cols-[190px_1fr]">
              <label className="block">
                <span className={LBL}>Min hold (tokens)</span>
                <input
                  className="input num mt-1"
                  type="number"
                  min={0}
                  step={1000}
                  value={spec.holderTier.minHoldTokens ?? ""}
                  onChange={(e) =>
                    patch({
                      holderTier: {
                        ...spec.holderTier,
                        minHoldTokens: e.target.value === "" ? null : Math.floor(Number(e.target.value)),
                      },
                    })
                  }
                />
              </label>
              <ListEditor
                label="Perks"
                items={spec.holderTier.perks}
                max={6}
                onChange={(perks) => patch({ holderTier: { ...spec.holderTier, perks } })}
                placeholder="Unlimited exports"
              />
            </div>
          )}
        </SpecSection>

        {spec.risks.length > 0 && (
          <div className="border-l-2 border-warn pl-4 text-sm">
            <h2 className="h3 text-warn">Risks intake flagged</h2>
            <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-fg-2">
              {spec.risks.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        {(errs.length > 0 || error) && (
          <div role="alert" className="border-l-2 border-burn pl-4 text-sm text-burn">
            {error && <div>{error}</div>}
            {errs.map((e) => (
              <div key={e} className="num text-xs">
                {e}
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <button type="button" className="btn" onClick={onBack} disabled={busy}>
            Back
          </button>
          <button type="button" className="btn btn-primary btn-lg" onClick={approve} disabled={busy}>
            {busy ? "Saving…" : "Approve spec → stake"}
          </button>
          <span className="text-xs text-fg-2">Approving pins the spec. Nothing is spent until you sign the stake.</span>
        </div>
      </div>

      <aside className="self-start border-l border-line pl-4 text-sm lg:sticky lg:top-20">
        <h2 className="h3">What happens next</h2>
        <ol className="mt-3 flex flex-col gap-3 text-fg-2">
          {[
            ["Stake", "0.05 SOL to the app's creator wallet. It pays the pump.fun creation tx and comes back at the first build."],
            ["Launch", "The coin goes live with the metadata you approved. Trading fees start accruing, 60% of them to the budget."],
            ["Build", "At $50 of budget the first build starts, streaming every step to the coin page."],
            ["Burn", "Revenue the app earns buys the coin back and burns it on-chain, attested in the ledger."],
          ].map(([t, body], i) => (
            <li key={t} className="flex gap-2.5">
              <span className="num shrink-0 text-xs text-fg-3">{i + 1}</span>
              <span>
                <b className="text-fg">{t}.</b> {body}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-xs text-fg-2">
          Once live, holders queue changes and vote by bag. The spec stays pinned as the record of what was promised.
        </p>
      </aside>
    </div>
  );
};

const SpecSection = ({ title, sub, children }: { title: string; sub: string; children: ReactNode }) => (
  <section>
    <div className="mb-4 border-b border-line pb-2">
      <h2 className="h3">{title}</h2>
      <p className="mt-0.5 text-xs text-fg-2">{sub}</p>
    </div>
    {children}
  </section>
);

const ListEditor = ({
  label,
  items,
  max,
  onChange,
  placeholder,
  reorder = false,
}: {
  label: string;
  items: string[];
  max: number;
  onChange: (items: string[]) => void;
  placeholder: string;
  reorder?: boolean;
}) => {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v || items.length >= max) return;
    onChange([...items, v]);
    setDraft("");
  };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    const a = next[i]!;
    next[i] = next[j]!;
    next[j] = a;
    onChange(next);
  };
  return (
    <div>
      <span className={LBL}>
        {label}{" "}
        <span className="num text-fg-3">
          {items.length}/{max}
        </span>
      </span>
      <ul className="mb-3 mt-1.5 flex flex-col border-t border-line">
        {items.map((it, i) => (
          <li key={`${i}-${it}`} className="flex items-center gap-2 border-b border-line py-1.5 text-sm">
            {reorder && <span className="num w-4 shrink-0 text-center text-[11px] text-fg-3">{i + 1}</span>}
            <input
              className="min-w-0 flex-1 bg-transparent outline-none"
              value={it}
              aria-label={`${label} item ${i + 1}`}
              onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
            />
            {reorder && (
              <span className="flex shrink-0 items-center">
                <button
                  type="button"
                  className="btn btn-ghost px-1 py-0.5 text-fg-3 disabled:opacity-30 hover:text-fg"
                  aria-label={`Move ${label} item ${i + 1} up`}
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                >
                  <IconChevron dir="up" size={14} />
                </button>
                <button
                  type="button"
                  className="btn btn-ghost px-1 py-0.5 text-fg-3 disabled:opacity-30 hover:text-fg"
                  aria-label={`Move ${label} item ${i + 1} down`}
                  disabled={i === items.length - 1}
                  onClick={() => move(i, 1)}
                >
                  <IconChevron dir="down" size={14} />
                </button>
              </span>
            )}
            <button
              type="button"
              className="shrink-0 text-fg-3 hover:text-burn"
              aria-label={`Remove ${label} item ${i + 1}`}
              onClick={() => onChange(items.filter((_, j) => j !== i))}
            >
              <IconX size={14} />
            </button>
          </li>
        ))}
      </ul>
      {items.length < max && (
        <div className="flex gap-2">
          <input
            className="input"
            value={draft}
            placeholder={placeholder}
            aria-label={placeholder}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
          />
          <button type="button" className="btn" onClick={add} disabled={!draft.trim()}>
            Add
          </button>
        </div>
      )}
    </div>
  );
};
