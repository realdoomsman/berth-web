import type { ReactNode } from "react";
import { Link } from "react-router-dom";

/*
 * The trust argument. An autonomous agent writing production code is only
 * acceptable because of what it is structurally prevented from touching, so
 * the section is exactly that: two lists, in type, with a rule between them.
 * No green on the left column and no red on the right — this is not money.
 */

interface Rule {
  k: string;
  what: string;
  detail: ReactNode;
}

const CAN: Rule[] = [
  {
    k: "ui",
    what: "The whole product surface",
    detail: <>Pages, components, state, styling, copy, assets: everything a user sees and clicks.</>,
  },
  {
    k: "logic",
    what: "Server functions, sandboxed",
    detail: (
      <>
        Business logic runs in QuickJS with 64 MB and a 5-second deadline. The only outbound call is{" "}
        <span className="num text-fg-2">ship.fetch</span> back to the platform, plus{" "}
        <span className="num text-fg-2">ship.llm</span> capped at 1024 output tokens and billed to the app&apos;s own
        budget.
      </>
    ),
  },
  {
    k: "sdk",
    what: "Calls into the platform SDK",
    detail: (
      <>
        It can ask for a login, a holder check, a checkout or a per-request charge. It cannot implement any of them.
      </>
    ),
  },
  {
    k: "tests",
    what: "Its own tests and repairs",
    detail: (
      <>
        Playwright tests, screenshots and a Lighthouse pass run before every deploy, and three consecutive failed
        healthchecks queue a self-heal job.
      </>
    ),
  },
];

const CANNOT: Rule[] = [
  {
    k: "auth",
    what: "Auth, wallets, payments",
    detail: (
      <>
        Sign-in, wallet connection and every USDC flow come from <span className="num text-fg-2">@ship/app-sdk</span>{" "}
        and platform endpoints. A diff that adds auth, wallet or payment code is blocked, not merged and patched later.
      </>
    ),
  },
  {
    k: "network",
    what: "The open internet",
    detail: (
      <>
        Template lint bans <span className="num text-fg-2">fetch</span>,{" "}
        <span className="num text-fg-2">XMLHttpRequest</span>, <span className="num text-fg-2">WebSocket</span>,{" "}
        <span className="num text-fg-2">eval</span> and external scripts. Every hosted app runs under{" "}
        <span className="num text-fg-2">script-src &apos;self&apos;</span> and{" "}
        <span className="num text-fg-2">form-action &apos;none&apos;</span>.
      </>
    ),
  },
  {
    k: "secrets",
    what: "Real keys, and other apps' data",
    detail: (
      <>
        The build sandbox holds a per-job, budget-capped, expiring token pointed at the platform&apos;s Anthropic proxy,
        never an API key. Each app gets its own origin, signed session cookie and KV namespace.
      </>
    ),
  },
  {
    k: "policy",
    what: "Its own approval",
    detail: (
      <>
        A separate reviewer model reads the diff and the manifest before a version goes live and blocks on
        exfiltration, raw network access, external scripts, spec drift or a{" "}
        <Link
          to="/legal/content-policy"
          className="text-fg-2 underline decoration-line-2 underline-offset-4 hover:text-fg"
        >
          content-policy
        </Link>{" "}
        violation. Price talk and &quot;guaranteed returns&quot; copy is a violation too.
      </>
    ),
  },
];

const RuleList = ({ heading, sub, rules }: { heading: string; sub: string; rules: Rule[] }) => (
  <div>
    <h3 className="h3">{heading}</h3>
    <p className="small text-fg-2">{sub}</p>
    <dl className="mt-4 divide-y divide-line border-t border-line">
      {rules.map((r) => (
        <div key={r.k} className="py-4">
          <dt className="text-sm font-medium text-fg">{r.what}</dt>
          <dd className="small mt-1 max-w-xl text-fg-2">{r.detail}</dd>
        </div>
      ))}
    </dl>
  </div>
);

export const TemplateMoat = () => (
  <section id="safety" aria-labelledby="safety-h" className="mt-24 scroll-mt-20 sm:mt-36">
    <h2 id="safety-h" className="h2 max-w-2xl">
      An AI writes the app. It never touches the money
    </h2>
    <p className="body mt-3 max-w-2xl text-fg-2">
      Every app starts from the same template, on platform-hosted auth, wallet and payment rails, behind the same
      content-security policy, past the same reviewer gate, and ends up in a public MIT repository you can read line by
      line. There is no IP assignment in either direction.
    </p>

    <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-0 lg:divide-x lg:divide-line">
      <div className="lg:pr-12">
        <RuleList heading="What it writes" sub="its entire job" rules={CAN} />
      </div>
      <div className="lg:pl-12">
        <RuleList heading="What it cannot reach" sub="enforced, not requested" rules={CANNOT} />
      </div>
    </div>
  </section>
);
