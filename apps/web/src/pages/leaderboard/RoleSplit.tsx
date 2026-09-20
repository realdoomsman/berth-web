import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { FEE_SPLIT_BPS, LAUNCH_STAKE_LAMPORTS, REVENUE_SPLIT_BPS, VOTE_WALLET_CAP_BPS } from "@ship/shared";
import { formatPct } from "../../lib/format.js";

const STAKE_SOL = LAUNCH_STAKE_LAMPORTS / 1_000_000_000;

/*
 * Three audiences, three different deals, including the parts that sting. Set
 * as a typographic comparison with column rules — the same content as three
 * cards, minus the three cards.
 */

interface Role {
  k: string;
  who: string;
  tag: string;
  gives: ReactNode;
  gets: ReactNode;
  /** The uncomfortable part, stated by us rather than found later by them. */
  snag: ReactNode;
}

const ROLES: Role[] = [
  {
    k: "launcher",
    who: "Launchers",
    tag: "you have the idea",
    gives: (
      <>
        One sentence, a name, a ticker and an image, plus a refundable{" "}
        <span className="num text-fg">{STAKE_SOL} SOL</span> stake. You are responsible for all four under the content
        policy.
      </>
    ),
    gets: (
      <>
        <span className="num text-rev">{formatPct(FEE_SPLIT_BPS.LAUNCHER)}</span> of the coin&apos;s creator fees for as
        long as it trades, your stake back at the first build gate, and a public MIT repo with your app in it.
      </>
    ),
    snag: (
      <>
        <span className="text-fg">No supply allocation.</span> Not one token. Prompting is not building, so the launcher
        is paid a fee share for launching and specifying: there is nothing to unlock and nothing to dump.
      </>
    ),
  },
  {
    k: "holder",
    who: "Holders",
    tag: "you fund the build",
    gives: (
      <>
        Trading. Every buy and sell pays a creator fee, and{" "}
        <span className="num text-fg">{formatPct(FEE_SPLIT_BPS.BUILD_BUDGET)}</span> of it becomes this app&apos;s build
        budget. Volume is the payroll.
      </>
    ),
    gets: (
      <>
        A token-weighted vote in the build queue, capped at{" "}
        <span className="num text-fg">{formatPct(VOTE_WALLET_CAP_BPS)}</span> of supply per wallet, whatever perks the
        app offers its holders, and a supply that{" "}
        <span className="num text-fg">{formatPct(REVENUE_SPLIT_BPS.BUYBACK_BURN)}</span> of revenue keeps burning down.
      </>
    ),
    snag: (
      <>
        <span className="text-fg">You are never paid.</span> No dividend, no yield, no claim on revenue. Buybacks are a
        platform feature executed on-chain at the platform&apos;s discretion and can be paused; read{" "}
        <Link to="/legal/terms" className="text-fg-2 underline decoration-line-2 underline-offset-4 hover:text-fg">
          the terms
        </Link>{" "}
        before you assume otherwise.
      </>
    ),
  },
  {
    k: "user",
    who: "Users",
    tag: "you just want the tool",
    gives: (
      <>Money for a product that works: a one-time purchase, a subscription, or a per-request API call in USDC.</>
    ),
    gets: (
      <>
        The app, hosted on its own domain, with the platform as merchant of record and a real refund path. Every app
        repo is public and MIT, so you can read what it does with your data before you pay.
      </>
    ),
    snag: (
      <>
        <span className="text-fg">You never need to know a coin exists.</span> Your payment is what funds the buyback,
        but the product has to stand on its own or nobody pays twice.
      </>
    ),
  },
];

const Line = ({ lead, children }: { lead: string; children: ReactNode }) => (
  <p className="small mt-3 text-fg-2">
    <span className="font-medium text-fg">{lead} </span>
    {children}
  </p>
);

export const RoleSplit = () => (
  <section id="roles" aria-labelledby="roles-h" className="mt-24 scroll-mt-20 sm:mt-32">
    <h2 id="roles-h" className="h2 max-w-2xl">
      Three ways to be here. None of them is waiting for a pump
    </h2>

    <div className="mt-7 grid gap-8 border-t border-line pt-7 md:grid-cols-3 md:gap-0 md:divide-x md:divide-line">
      {ROLES.map((r) => (
        <div key={r.k} className="md:px-7 md:first:pl-0 md:last:pr-0">
          <h3 className="h3">{r.who}</h3>
          <p className="small text-fg-2">{r.tag}</p>
          <Line lead="Gives:">{r.gives}</Line>
          <Line lead="Gets:">{r.gets}</Line>
          <Line lead="Snag:">{r.snag}</Line>
        </div>
      ))}
    </div>
  </section>
);
