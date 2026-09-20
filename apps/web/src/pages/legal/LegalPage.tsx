import { useEffect } from "react";
import { Link, NavLink, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "../../components/Skeleton.js";
import { Markdown } from "./markdown.js";

const DOCS: Record<string, { title: string; label: string; blurb: string }> = {
  terms: { title: "Terms of Service", label: "Terms", blurb: "What Berth does and what you agree to." },
  privacy: { title: "Privacy Policy", label: "Privacy", blurb: "What we store and who sees it." },
  "content-policy": { title: "Content Policy", label: "Content policy", blurb: "What can and cannot be launched." },
};

const ORDER = ["terms", "privacy", "content-policy"];

const LAST_UPDATED = /^_Last updated:\s*(.+?)_\s*$/m;

export const LegalPage = () => {
  const { doc } = useParams<{ doc: string }>();
  const key = doc && DOCS[doc] ? doc : null;

  const q = useQuery({
    queryKey: ["legal", key],
    queryFn: async () => {
      const res = await fetch(`/legal/${key}.md`, { headers: { accept: "text/markdown, text/plain" } });
      if (!res.ok) throw new Error(`could not load this document (${res.status})`);
      return res.text();
    },
    enabled: key !== null,
    staleTime: Infinity,
  });

  useEffect(() => {
    document.title = key ? `Berth — ${DOCS[key].title}` : "Berth — document not found";
  }, [key]);

  // The date lives in the markdown; hoist it into the eyebrow rather than printing it twice.
  const match = q.data ? LAST_UPDATED.exec(q.data) : null;
  const updated = match?.[1] ?? null;
  const source = q.data && match ? q.data.replace(match[0], "").trimStart() : q.data;

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,10rem)_minmax(0,1fr)]">
      <nav aria-label="Legal documents" className="lg:sticky lg:top-20 lg:self-start">
        <ul className="flex gap-4 overflow-x-auto border-b border-line pb-2 lg:flex-col lg:gap-0 lg:overflow-visible lg:border-b-0 lg:pb-0">
          {ORDER.map((d) => (
            <li key={d} className="shrink-0">
              <NavLink
                to={`/legal/${d}`}
                className={({ isActive }) =>
                  `block whitespace-nowrap text-sm transition-colors lg:border-l lg:py-1.5 lg:pl-3 ${
                    isActive ? "font-medium text-fg lg:border-fg-2" : "text-fg-2 hover:text-fg lg:border-line"
                  }`
                }
              >
                {DOCS[d].label}
              </NavLink>
            </li>
          ))}
        </ul>
        {key && <p className="mt-5 hidden text-xs text-fg-2 lg:block">{DOCS[key].blurb}</p>}
      </nav>

      <div className="min-w-0">
        {key === null ? (
          <div className="max-w-prose">
            <p className="num text-xs text-fg-2">404</p>
            <h1 className="h1 mt-2">No such document</h1>
            <p className="body mt-3 text-fg-2">
              <code className="num text-fg">/legal/{doc}</code> does not exist. Berth publishes three: the terms of service, the privacy
              policy, and the content policy.
            </p>
            <Link to="/legal/terms" className="btn mt-6">
              Read the terms
            </Link>
          </div>
        ) : q.isPending ? (
          <div className="flex max-w-prose flex-col gap-3">
            <Skeleton className="h-8 w-72" />
            <Skeleton className="h-3 w-40" />
            <div className="mt-4 flex flex-col gap-2">
              {["w-full", "w-11/12", "w-10/12", "w-full", "w-9/12"].map((w) => (
                <Skeleton key={w} className={`h-3 ${w}`} />
              ))}
            </div>
          </div>
        ) : q.isError ? (
          <div role="alert" className="border-l-2 border-burn pl-3 text-sm text-burn">
            {q.error.message}
          </div>
        ) : (
          <article>
            <p className="text-xs text-fg-2">
              {DOCS[key].label}
              {updated && (
                <span className="text-fg-2">
                  {" · "}last updated <span className="num">{updated}</span>
                </span>
              )}
            </p>
            <div className="mt-3">
              <Markdown source={source ?? ""} />
            </div>
            <p className="prose-legal mt-12 border-t border-line pt-5 text-sm">
              True across all three documents: <strong>buybacks are burns, never distributions</strong>. The platform buys tokens on the
              open market and destroys them. Holders are never paid, and Berth promises no yield, dividend, or return.
            </p>
          </article>
        )}
      </div>
    </div>
  );
};
