import { useMemo, useRef, useState, type ReactNode } from "react";
import { CreateLaunchBody, slugify } from "@ship/shared";
import type { CreateLaunchBody as Body } from "@ship/shared";
import { appUrl } from "../../env.js";
import { Monogram } from "../../components/Monogram.js";
import { StatusBadge } from "../../components/StatusBadge.js";
import { isHttpError, uploadCoinImage } from "../../api/client.js";

interface Props {
  initial: Partial<Body>;
  forkOf: { name: string; ticker: string } | null;
  busy: boolean;
  error: string | null;
  onSubmit: (body: Body) => void;
}

const PROMPT_MAX = 4000;
const PROMPT_MIN = 20;

const EXAMPLES: Array<{ title: string; blurb: string; prompt: string }> = [
  {
    title: "Invoice generator",
    blurb: "one-time USDC unlock",
    prompt:
      "A one-page invoice generator for freelancers. Fill in client, line items, and tax rate; get a clean PDF. Free to create with a watermark, $5 in USDC removes the watermark forever. Holders of the coin get unlimited exports and saved templates.",
  },
  {
    title: "Uptime pinger",
    blurb: "monthly subscription",
    prompt:
      "A dead-simple uptime monitor. Paste up to 10 URLs, get an email and a webhook when one goes down, plus a public status page per project. $9/month in USDC for 50 monitors and 1-minute checks; free tier gets 3 monitors on 15-minute checks.",
  },
  {
    title: "Screenshot API",
    blurb: "pay per request via x402",
    prompt:
      "An HTTP API that turns any URL into a screenshot or a PDF. One endpoint, query params for viewport, full page, and dark mode. Priced per request with x402 at $0.002 per call, no accounts, no keys — agents pay per call. Docs page with a live playground.",
  },
];

const UPLOAD_ERRORS: Record<string, string> = {
  image_too_large: "Image must be under 5 MB.",
  unsupported_image_type: "Use a PNG, JPG, WEBP or GIF.",
  not_an_image: "That file isn't a valid image.",
  uploads_unavailable: "Uploads are temporarily unavailable — paste a URL instead.",
  unauthorized: "Sign in to upload an image.",
  invalid_token: "Sign in to upload an image.",
};

export const StepPrompt = ({ initial, forkOf, busy, error, onSubmit }: Props) => {
  const [name, setName] = useState(initial.name ?? "");
  const [ticker, setTicker] = useState(initial.ticker ?? "");
  const [imageUrl, setImageUrl] = useState(initial.imageUrl ?? "");
  const [prompt, setPrompt] = useState(initial.prompt ?? "");
  const [twitter, setTwitter] = useState(initial.twitter ?? "");
  const [website, setWebsite] = useState(initial.website ?? "");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [imageFailed, setImageFailed] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onPickFile = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    setUploadErr(null);
    if (file.size > 5 * 1024 * 1024) {
      setUploadErr("Image must be under 5 MB.");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadCoinImage(file);
      setImageUrl(url);
      setImageFailed(null);
      setTouched((t) => ({ ...t, imageUrl: true }));
    } catch (e) {
      setUploadErr((isHttpError(e) ? (UPLOAD_ERRORS[e.error] ?? e.error) : null) ?? "Upload failed — try again or paste a URL.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const body = useMemo(
    () => ({
      name: name.trim(),
      ticker: ticker.trim().toUpperCase(),
      imageUrl: imageUrl.trim(),
      prompt: prompt.trim(),
      twitter: twitter.trim() || undefined,
      website: website.trim() || undefined,
      forkOfAppId: initial.forkOfAppId,
    }),
    [name, ticker, imageUrl, prompt, twitter, website, initial.forkOfAppId],
  );

  const parsed = useMemo(() => CreateLaunchBody.safeParse(body), [body]);
  const issues = useMemo(() => {
    const out: Record<string, string> = {};
    if (!parsed.success) for (const i of parsed.error.issues) out[String(i.path[0])] ??= i.message;
    return out;
  }, [parsed]);

  // Only nag about a field once it has been visited, or once the user has tried to submit.
  const shownError = (field: string): string | undefined => (submitted || touched[field] ? issues[field] : undefined);

  const submit = () => {
    setSubmitted(true);
    if (!parsed.success) return;
    onSubmit(parsed.data);
  };

  const imageOk = imageUrl.trim().length > 0 && imageFailed !== imageUrl.trim();
  const displayTicker = ticker || "TICKER";

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      {/* min-w-0: a grid item defaults to min-width:auto, so the form column
          refuses to shrink below its content's intrinsic width and pushes the
          page 21px wide at 390px. */}
      <div className="flex min-w-0 flex-col">
        {forkOf && (
          <p className="mb-7 border-l-2 border-info/70 pl-3 text-sm text-fg-2">
            Forking <b className="text-fg">{forkOf.name}</b> <span className="num">${forkOf.ticker}</span>. <span className="num">10%</span>{" "}
            of your coin&apos;s fees route upstream to the original, forever. The prompt is prefilled from its spec.
          </p>
        )}

        <Group>
          <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_170px]">
            <Field label="Name" error={shownError("name")} hint="Shown on the leaderboard and the coin page.">
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                maxLength={32}
                placeholder="Invoice Ninja"
                aria-invalid={!!shownError("name")}
              />
            </Field>
            <Field label="Ticker" error={shownError("ticker")} hint={ticker.length >= 2 ? `Trades as $${ticker}` : "2–10 letters or digits."}>
              <div className="relative">
                <span className="num pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-3">$</span>
                <input
                  className="input num pl-6 uppercase tracking-wide"
                  value={ticker}
                  onChange={(e) =>
                    setTicker(
                      e.target.value
                        .toUpperCase()
                        .replace(/[^A-Z0-9]/g, "")
                        .slice(0, 10),
                    )
                  }
                  onBlur={() => setTouched((t) => ({ ...t, ticker: true }))}
                  placeholder="NINJA"
                  aria-invalid={!!shownError("ticker")}
                />
              </div>
            </Field>
          </div>
        </Group>

        <Group>
          <Field label="Coin image" error={shownError("imageUrl")} hint="Upload a square PNG, JPG, WEBP or GIF (max 5 MB), or paste a URL. This becomes the coin image on pump.fun.">
            <div className="flex items-stretch gap-2">
              <span className="grid size-11 shrink-0 place-items-center overflow-hidden border border-line-2 bg-bg-2">
                {imageOk ? (
                  <img
                    key={imageUrl.trim()}
                    src={imageUrl.trim()}
                    alt=""
                    className="size-full object-cover"
                    onError={() => setImageFailed(imageUrl.trim())}
                  />
                ) : (
                  <span className="num text-[10px] text-fg-3">{ticker.slice(0, 3) || "img"}</span>
                )}
              </span>
              <input
                className="input"
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  setImageFailed(null);
                  setUploadErr(null);
                }}
                onBlur={() => setTouched((t) => ({ ...t, imageUrl: true }))}
                placeholder="https://…/logo.png"
                aria-invalid={!!shownError("imageUrl")}
              />
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="sr-only"
                onChange={(e) => void onPickFile(e.target.files?.[0])}
              />
              <button
                type="button"
                className="btn shrink-0"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? "uploading…" : "Upload"}
              </button>
            </div>
            {uploadErr !== null && <div className="mt-2 text-xs text-burn">{uploadErr}</div>}
            {imageFailed !== null && imageFailed === imageUrl.trim() && (
              <div className="mt-2 text-xs text-warn">
                That URL did not load. The launch still works; the coin falls back to a ticker monogram.
              </div>
            )}
          </Field>
        </Group>

        <Group>
          <Field
            label="Prompt"
            error={shownError("prompt")}
            hint="Who it is for, what it does, how it makes money. Name the buyer; vague prompts build apps nobody pays for."
          >
            <textarea
              className="input min-h-[210px] resize-y font-mono text-[13px] leading-relaxed"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value.slice(0, PROMPT_MAX))}
              onBlur={() => setTouched((t) => ({ ...t, prompt: true }))}
              placeholder="A one-page invoice generator for freelancers. Free to create, $5 USDC to remove the watermark and download the PDF. Holders of the coin get unlimited exports."
              aria-invalid={!!shownError("prompt")}
            />
            <div className="mt-2 flex items-baseline justify-between gap-3">
              <span className="text-xs text-warn">
                {prompt.trim().length < PROMPT_MIN ? `At least ${PROMPT_MIN} characters.` : ""}
              </span>
              <span className={`num text-xs ${prompt.length > PROMPT_MAX - 200 ? "text-warn" : "text-fg-3"}`}>
                {prompt.length}/{PROMPT_MAX}
              </span>
            </div>
          </Field>

          <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1.5">
            <span className="text-xs text-fg-2">Or start from an example:</span>
            {EXAMPLES.map((ex) => (
              <button
                key={ex.title}
                type="button"
                className="text-xs text-fg underline decoration-line-2 underline-offset-4 transition-colors hover:decoration-fg-2"
                onClick={() => {
                  setPrompt(ex.prompt);
                  setTouched((t) => ({ ...t, prompt: true }));
                }}
              >
                {ex.title} <span className="text-fg-3">({ex.blurb})</span>
              </button>
            ))}
          </div>
        </Group>

        <details className="disclosure">
          <summary className="text-sm">Optional links</summary>
          <div className="grid gap-5 pb-5 sm:grid-cols-2">
            <Field label="X / Twitter" error={shownError("twitter")}>
              <input
                className="input"
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, twitter: true }))}
                placeholder="https://x.com/…"
              />
            </Field>
            <Field label="Website" error={shownError("website")}>
              <input
                className="input"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, website: true }))}
                placeholder="https://…"
              />
            </Field>
          </div>
        </details>

        {error && (
          <div role="alert" className="mt-6 border-l-2 border-burn pl-3 text-sm text-burn">
            {error}
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <button type="button" className="btn btn-primary btn-lg" disabled={busy} onClick={submit}>
            {busy ? "Generating spec…" : "Generate spec"}
          </button>
          <span className="text-xs text-fg-2">Free. The stake comes two steps later.</span>
        </div>
      </div>

      <aside className="min-w-0 lg:sticky lg:top-20 lg:self-start">
        <div className="panel-raised p-4">
          <div className="flex items-center gap-3">
            <Monogram ticker={ticker || name || "?"} src={imageOk ? imageUrl.trim() : null} size={44} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{name || "Your app"}</div>
              <div className="num text-xs text-fg-2">${displayTicker}</div>
            </div>
            <StatusBadge status="DRAFT" />
          </div>

          <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3">
            <div>
              <dt className="label">revenue</dt>
              <dd className="figure figure-md mt-1 text-rev">$0</dd>
            </div>
            <div>
              <dt className="label">mcap</dt>
              <dd className="figure figure-md mt-1 text-fg-3">—</dd>
            </div>
            <div>
              <dt className="label">holders</dt>
              <dd className="figure figure-md mt-1 text-fg-3">—</dd>
            </div>
          </dl>

          <div className="mt-4 border-t border-line pt-3">
            <div className="text-xs text-fg-2">App will be served at</div>
            <div className="num mt-1 truncate text-xs text-fg" title={appUrl(slugify(name || "your-app"))}>
              {appUrl(slugify(name || "your-app"))}
            </div>
          </div>

          <dl className="mt-4 flex flex-col gap-1.5 border-t border-line pt-3 text-xs text-fg-2">
            <div className="flex justify-between gap-2">
              <dt>creator fees → build budget</dt>
              <dd className="num text-rev">60%</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>creator fees → $BERTH buybacks</dt>
              <dd className="num">25%</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>creator fees → you</dt>
              <dd className="num text-rev">15%</dd>
            </div>
            <div className="flex justify-between gap-2 border-t border-line pt-1.5">
              <dt>app revenue → buy and burn</dt>
              <dd className="num text-burn">85%</dd>
            </div>
          </dl>
        </div>
      </aside>
    </div>
  );
};

/** One hairline-separated band of the form. The rule is the only chrome. */
const Group = ({ children }: { children: ReactNode }) => <div className="border-b border-line pb-7 [&:not(:first-child)]:pt-7">{children}</div>;

const Field = ({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) => (
  <label className="block">
    <span className="text-[13px] font-medium text-fg">{label}</span>
    <div className="mt-1.5">{children}</div>
    {error ? (
      <div className="mt-1.5 text-xs text-burn">{error}</div>
    ) : hint ? (
      <div className="mt-1.5 text-xs text-fg-2">{hint}</div>
    ) : null}
  </label>
);
