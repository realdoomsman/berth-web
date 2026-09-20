import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { FEE_SPLIT_BPS, MIN_BUYBACK_USD } from "@ship/shared";
import { formatPct } from "../../lib/format.js";

/*
 * Six questions, as a definition list. The securities question genuinely has to
 * be answered, and it has to be answered the same way the terms answer it — so
 * it goes first and the rest are the objections that actually block a launch.
 * Anything already answered by the loop or the board is not repeated here.
 */

const Doc = ({ to, children }: { to: string; children: ReactNode }) => (
  <Link to={to} className="text-fg-2 underline decoration-line-2 underline-offset-4 hover:text-fg">
    {children}
  </Link>
);

const FAQ: Array<{ k: string; q: string; a: ReactNode }> = [
  {
    k: "security",
    q: "Is this a security? Do holders get a cut of the revenue?",
    a: (
      <>
        No. Nobody is ever paid for holding: no dividend, no yield, no claim, no redemption right. App revenue is used
        to buy the coin on the open market and burn it, which is a supply reduction the platform executes for itself, at
        its discretion, and can pause. Holding gets you whatever perks the app offers and a capped vote in its build
        queue; section 3 of <Doc to="/legal/terms">the terms</Doc> says exactly this.
      </>
    ),
  },
  {
    k: "verified",
    q: "How do I know the revenue is real?",
    a: (
      <>
        Berth is the merchant of record, so every USDC checkout, subscription and per-request call is verified on-chain
        by signature and memo before a revenue event exists. Once{" "}
        <span className="num text-fg">${MIN_BUYBACK_USD}</span> of attested revenue accumulates, the executor writes a
        buyback whose attestation hash is a sha256 of exactly the revenue event ids it settles, and that hash rides in
        the memo of both the swap and the burn transaction. Open any coin&apos;s ledger and the payments, the swap
        signature, the burn signature and the hash are on one screen.
      </>
    ),
  },
  {
    k: "allocation",
    q: "Why doesn't the launcher get any of the supply?",
    a: (
      <>
        Because prompting is not building. The idea is worth{" "}
        <span className="num text-fg">{formatPct(FEE_SPLIT_BPS.LAUNCHER)}</span> of the coin&apos;s creator fees, paid
        continuously as compensation for launching and specifying the app, and that is what the launcher gets. No
        allocation, no vesting cliff, no unlock calendar.
      </>
    ),
  },
  {
    k: "junk",
    q: "What if the agent ships junk?",
    a: (
      <>
        Then it earns nothing, and the board shows that within a day. The reviewer gate blocks unsafe code, not bad
        taste, so nothing here guarantees an app is good or even that it gets built. What the design guarantees is that
        the ranking is dollars collected from real users rather than trading volume, so a junk app has nowhere to hide.
      </>
    ),
  },
  {
    k: "dies",
    q: "What happens to my coin if the app stops?",
    a: (
      <>
        It keeps trading on pump.fun, because Berth does not issue it, custody it or control its price. An app that runs
        out of build budget goes <span className="text-warn">dormant</span>: still online and still charging users,
        just not being developed until a trade or a top-up refills the budget. An app{" "}
        <span className="text-burn">killed</span> for a content-policy violation returns 410 and never builds again.
        Burns already executed are irreversible either way.
      </>
    ),
  },
  {
    k: "owns",
    q: "Who owns the code?",
    a: (
      <>
        Every app repository is created public under the MIT licence, with no IP assignment in either direction: you
        keep whatever rights you have in your prompt and spec, the platform keeps its rights in the template and SDK,
        and the generated output is MIT to everyone. Contributors submit pull requests under the same licence and can be
        paid bounties or a share of fees for merged work.
      </>
    ),
  },
];

export const FaqSection = () => (
  <section id="faq" aria-labelledby="faq-h" className="mt-24 scroll-mt-20 sm:mt-32">
    <h2 id="faq-h" className="h2">
      Questions that have real answers
    </h2>

    <dl className="mt-7 divide-y divide-line border-t border-line">
      {FAQ.map((item) => (
        <div
          key={item.k}
          className="grid gap-x-10 gap-y-1.5 py-5 sm:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] sm:py-6"
        >
          <dt className="h3 text-fg">{item.q}</dt>
          <dd className="body max-w-2xl text-fg-2">{item.a}</dd>
        </div>
      ))}
    </dl>

    <p className="small mt-6 max-w-2xl text-fg-2">
      The rest is in <Doc to="/legal/terms">the terms</Doc>, the <Doc to="/legal/content-policy">content policy</Doc>{" "}
      and the <Doc to="/legal/privacy">privacy policy</Doc>. Nothing here is investment, financial, legal or tax
      advice.
    </p>
  </section>
);
