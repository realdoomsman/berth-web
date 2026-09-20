import { Link } from "react-router-dom";
import type { LeaderboardSort } from "@ship/shared";
import { MIN_BUILD_BUDGET_USD } from "@ship/shared";
import { IconRocket } from "../../components/icons.js";

/*
 * An empty board is allowed to be empty. No ghost rows, no "your ticker here"
 * mock-up, no vanity metric standing in for revenue — the honest version is
 * more persuasive than a placeholder, and the whole pitch is that this number
 * cannot be faked.
 */

const BUCKET_COPY: Partial<Record<LeaderboardSort, { title: string; body: string }>> = {
  dormant: {
    title: "Nothing is dormant",
    body: "Every app on the board still has build budget. Dormant means the fees dried up and the agent is waiting for a buy; apps pass through it, they do not end there.",
  },
  building: {
    title: "No agent is building this second",
    body: "Jobs start the moment an app's budget crosses its gate, so this tab fills and empties all day.",
  },
};

interface Props {
  sort: LeaderboardSort;
  /** No app exists anywhere on the platform, not just in this bucket. */
  platformEmpty: boolean;
  onShowEarners: () => void;
}

export const EmptyBoard = ({ sort, platformEmpty, onShowEarners }: Props) => {
  // Only the platform-empty board may claim nothing has launched; a filter that
  // happens to match nothing gets its own copy.
  if (!platformEmpty) {
    const bucket = BUCKET_COPY[sort] ?? {
      title: "Nothing matches this filter",
      body: "No coin is in this bucket right now.",
    };
    return (
      <div className="border-t border-line py-10">
        <h3 className="h3">{bucket.title}</h3>
        <p className="body mt-2 max-w-xl text-fg-2">{bucket.body}</p>
        <button
          type="button"
          className="mt-4 text-sm text-fg-2 underline decoration-line-2 underline-offset-4 transition-colors hover:text-fg"
          onClick={onShowEarners}
        >
          Show the earners instead
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 border-t border-line py-10 lg:flex-row lg:items-start lg:gap-14">
      <div className="min-w-0 flex-1">
        <h3 className="h2">Nothing to rank yet</h3>
        <p className="body mt-3 max-w-2xl text-fg-2">
          The board ranks coins by dollars their product collected from its own users, so it stays empty until a coin
          clears <span className="num text-fg">${MIN_BUILD_BUDGET_USD}</span> of accrued trading fees, the agent ships
          a working version, and somebody pays for it. Volume, holders and follower counts are not on this page, and
          they are not going to be.
        </p>
      </div>
      <Link to="/launch" className="btn btn-primary btn-lg shrink-0">
        <IconRocket size={15} />
        Launch the first one
      </Link>
    </div>
  );
};
