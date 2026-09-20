import { useState } from "react";
import type { AppStatus } from "../api/types.js";
import { env } from "../env.js";
import { StatusBlock } from "./StatusBadge.js";

/*
 * An app is a real website, so the most honest visual on its card is the site
 * itself — framed as a ledger object, not a floating hero image. AppShot draws a
 * squared browser window: a hairline chrome bar carrying the app's real domain,
 * and a recessed viewport that shows the live screenshot when one exists and a
 * faint page wireframe when it does not. The placeholder is drawn in the same
 * hairlines and 2px checker the product uses for "loading" and "empty", so a
 * pre-launch card reads as "this page is not captured yet" rather than a broken
 * image — never the coin's monogram, which already identifies the card above it.
 * No rounded corner, no drop shadow, no gradient wash.
 */

const DITHER =
  "repeating-linear-gradient(45deg, color-mix(in oklab, var(--color-bg-2) 88%, transparent) 0 2px, transparent 2px 4px)";

interface Props {
  slug: string;
  name: string;
  ticker: string;
  liveVersion: number;
  status: AppStatus;
  /** A live screenshot/preview URL; when absent or broken the ledger wireframe shows. */
  src?: string;
  /** CSS aspect-ratio of the viewport. */
  aspect?: string;
  className?: string;
}

export const AppShot = ({ slug, name, ticker, liveVersion, status, src, aspect = "16 / 9", className = "" }: Props) => {
  const [broken, setBroken] = useState(false);
  const deployed = liveVersion > 0;
  const domain = env.appDomain ? `${slug}.${env.appDomain}` : `/a/${slug}`;
  const caption = deployed
    ? `live · v${liveVersion}`
    : status === "DRAFT" || status === "SPEC_READY" || status === "AWAITING_STAKE" || status === "LAUNCHING"
      ? "not deployed yet"
      : "preview pending";
  const showImage = !!src && !broken;

  return (
    <div className={`overflow-hidden border border-line bg-bg-1 ${className}`}>
      <div className="flex items-center gap-2 border-b border-line bg-bg-2 px-2 py-1.5">
        <span className="flex gap-1" aria-hidden>
          <span className="size-1.5 bg-line-2" />
          <span className="size-1.5 bg-line-2" />
          <span className="size-1.5 bg-line-2" />
        </span>
        <span className="num truncate text-[10.5px] text-fg-3">{domain}</span>
        {deployed && <StatusBlock tone="in" live size={6} className="ml-auto" />}
      </div>
      <div
        className="relative w-full overflow-hidden"
        style={{ aspectRatio: aspect, background: "color-mix(in oklab, var(--color-bg) 88%, black)" }}
      >
        {showImage ? (
          <img
            src={src}
            alt={`${name} preview`}
            loading="lazy"
            onError={() => setBroken(true)}
            className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <>
            <div className="absolute inset-0 flex flex-col gap-1.5 p-3 opacity-60" style={{ backgroundImage: DITHER }} aria-hidden>
              <div className="flex items-center gap-1.5">
                <span className="num text-[8px] text-fg-3">{ticker}</span>
                <span className="ml-auto h-1.5 w-5 bg-line-2" />
                <span className="h-1.5 w-5 bg-line-2" />
              </div>
              <div className="flex-1 border border-line" />
              <div className="flex gap-1.5">
                <span className="h-4 flex-1 border border-line" />
                <span className="h-4 flex-1 border border-line" />
              </div>
            </div>
            <span className="label absolute inset-x-0 bottom-2 text-center">{caption}</span>
          </>
        )}
      </div>
    </div>
  );
};
