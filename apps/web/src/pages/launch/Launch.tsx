import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { AppSpec, CreateLaunchBody } from "@ship/shared";
import { useAuth } from "../../auth/useAuth.js";
import { useApp, useApproveSpec, useConfirmStake, useCreateLaunch, useFork, useLaunch } from "../../api/queries.js";
import type { LaunchDto } from "../../api/types.js";
import { Skeleton } from "../../components/Skeleton.js";
import { StepPrompt } from "./StepPrompt.js";
import { SpecGenerating, SpecRejected, StepSpec } from "./StepSpec.js";
import { StepStake } from "./StepStake.js";
import { StepLaunching } from "./StepLaunching.js";

const STEP_OF: Record<LaunchDto["status"], 1 | 2 | 3 | 4> = {
  DRAFT: 1,
  SPEC_READY: 2,
  AWAITING_STAKE: 3,
  LAUNCHING: 4,
  LIVE: 4,
  DORMANT: 4,
  KILLED: 4,
  FAILED: 4,
};

const STEPS = ["Idea", "Spec", "Stake", "Launch"] as const;

/**
 * Typographic progress: the four step names with the current one lit, plus a
 * hairline that fills as the launch advances. No numbered bubbles, no colour —
 * progress is not money.
 */
const StepRail = ({ step }: { step: 1 | 2 | 3 | 4 }) => (
  <nav aria-label="Launch progress" className="flex flex-col gap-2">
    <ol className="flex flex-wrap items-baseline gap-x-2 text-sm">
      {STEPS.map((label, i) => {
        const n = i + 1;
        return (
          <li key={label} className="flex items-baseline gap-2">
            {i > 0 && (
              <span className="text-fg-3" aria-hidden>
                →
              </span>
            )}
            <span className={n === step ? "font-semibold text-fg" : n < step ? "text-fg-2" : "text-fg-3"}>
              {label}
              <span className="sr-only">{n === step ? " (current step)" : n < step ? " (done)" : " (upcoming)"}</span>
            </span>
          </li>
        );
      })}
      <li className="num ml-auto text-xs text-fg-3">
        step {step} of {STEPS.length}
      </li>
    </ol>
    <div className="h-px w-full bg-line">
      <div className="h-px bg-fg-2 transition-[width] duration-500 ease-out" style={{ width: `${(step / STEPS.length) * 100}%` }} />
    </div>
  </nav>
);

export const Launch = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const id = params.get("id");
  const forkSlug = params.get("fork");
  const forkApp = useApp(forkSlug ?? undefined);
  const launch = useLaunch(id);
  const create = useCreateLaunch();
  const fork = useFork(forkSlug ?? "");
  const approve = useApproveSpec(id ?? "");
  const stake = useConfirmStake(id ?? "");
  // Last thing the user typed, so going Back from the spec (or being rejected) never wipes the form.
  const [draft, setDraft] = useState<Partial<CreateLaunchBody> | null>(null);

  useEffect(() => {
    document.title = "Berth — launch";
  }, []);

  const data = launch.data;
  // Intake moderation rejection lands as FAILED with no spec: show on step 1 with the reason.
  const rejected = data && data.status === "FAILED" && !data.spec;
  const step: 1 | 2 | 3 | 4 = !data ? 1 : rejected ? 1 : STEP_OF[data.status];

  useEffect(() => {
    if (data && (data.status === "LIVE" || data.status === "DORMANT")) {
      const t = window.setTimeout(() => navigate(`/c/${data.slug}`, { replace: true }), 1200);
      return () => clearTimeout(t);
    }
  }, [data, navigate]);

  const forkInitial = useMemo<Partial<CreateLaunchBody>>(() => {
    const a = forkApp.data;
    if (!a) return {};
    const spec = a.spec;
    const prompt = spec
      ? `${spec.title}: ${spec.oneLiner}\n\n${spec.whatItDoes}\n\nWho pays: ${spec.whoPays}\n\nMVP:\n${spec.mvp.map((m) => `- ${m}`).join("\n")}`
      : a.prompt;
    return { name: `${a.name} Fork`.slice(0, 32), ticker: "", imageUrl: a.imageUrl, prompt: prompt.slice(0, 4000), forkOfAppId: a.id };
  }, [forkApp.data]);

  const promptInitial = useMemo<Partial<CreateLaunchBody>>(() => {
    if (rejected && data) {
      return { name: data.name, ticker: data.ticker, imageUrl: data.imageUrl, prompt: data.prompt, ...(data.forkOfId ? { forkOfAppId: data.forkOfId } : {}) };
    }
    if (draft) return draft;
    return forkInitial;
  }, [rejected, data, draft, forkInitial]);

  if (!auth.ready) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (!auth.authenticated) {
    return (
      <div className="mx-auto w-full max-w-xl py-6">
        <h1 className="h1">Launch a coin that builds an app</h1>
        <p className="body mt-4 text-fg-2">
          You write the idea. An agent writes the spec, builds the app, deploys it, and keeps shipping. The coin&apos;s trading fees pay for
          all of it, and whatever the app earns buys the coin back and burns it.
        </p>
        <dl className="mt-7 flex flex-col border-t border-line">
          {[
            ["60%", "of creator fees become the app's build budget"],
            ["15%", "of creator fees go to you, the launcher"],
            ["85%", "of app revenue buys back and burns your coin"],
          ].map(([n, t]) => (
            <div key={n} className="flex items-baseline gap-4 border-b border-line py-2.5">
              <dt className="num w-12 shrink-0 text-rev">{n}</dt>
              <dd className="small text-fg-2">{t}</dd>
            </div>
          ))}
        </dl>
        <button type="button" className="btn btn-primary btn-lg mt-7" onClick={auth.login}>
          Sign in to launch
        </button>
        <p className="small mt-3 text-fg-2">
          Google or a Solana wallet. You get a custodial wallet to hold the refundable <span className="num">0.05 SOL</span> stake.
        </p>
      </div>
    );
  }

  const onSubmitPrompt = (body: CreateLaunchBody) => {
    setDraft(body);
    const m = forkSlug && forkApp.data ? fork : create;
    m.mutate(body, {
      onSuccess: (l) => {
        const next = new URLSearchParams();
        next.set("id", l.id);
        setParams(next, { replace: true });
      },
    });
  };

  const onApprove = (spec: AppSpec) => {
    approve.mutate(spec, { onSuccess: () => void launch.refetch() });
  };

  const onStaked = () => {
    stake.mutate(undefined, { onSuccess: () => void launch.refetch() });
  };

  const generating = data?.status === "DRAFT" || create.isPending || fork.isPending;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <header className="flex flex-col gap-1.5">
        <h1 className="h1">Launch</h1>
        <p className="small text-fg-2">
          Nothing is spent until you sign the <span className="num">0.05 SOL</span> stake, and that comes back at the first build.
        </p>
      </header>

      <StepRail step={step} />

      {launch.isError && (
        <div role="alert" className="border-l-2 border-burn py-1 pl-3 text-sm text-burn">
          {launch.error.message}
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-5">
          {rejected && data && <SpecRejected reason={data.moderation?.reason ?? data.error ?? "Rejected by moderation."} />}
          {generating && !rejected ? (
            <SpecGenerating />
          ) : (
            <StepPrompt
              key={rejected && data ? data.id : (forkApp.data?.id ?? "new")}
              initial={promptInitial}
              forkOf={forkApp.data ? { name: forkApp.data.name, ticker: forkApp.data.ticker } : null}
              busy={create.isPending || fork.isPending}
              error={create.error?.message ?? fork.error?.message ?? null}
              onSubmit={onSubmitPrompt}
            />
          )}
        </div>
      )}

      {step === 2 && data?.spec && (
        <StepSpec
          spec={data.spec}
          ticker={data.ticker}
          busy={approve.isPending}
          error={approve.error?.message ?? null}
          onApprove={onApprove}
          onBack={() => {
            const next = new URLSearchParams();
            setParams(next, { replace: true });
          }}
        />
      )}

      {step === 3 && data && (
        <StepStake
          lamports={data.lamports || approve.data?.lamports || 0}
          name={data.name}
          ticker={data.ticker}
          busy={stake.isPending}
          error={stake.error?.message ?? null}
          onStaked={onStaked}
        />
      )}

      {step === 4 && data && !rejected && <StepLaunching launch={data} />}
    </div>
  );
};
