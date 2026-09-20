import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

export const NotFound = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = "Berth — not found";
  }, []);

  return (
    <div className="mx-auto max-w-lg py-16">
      <p className="num text-xs text-fg-2">404</p>
      <h1 className="h1 mt-2">Nothing at this address</h1>
      <p className="body mt-3 text-fg-2">
        <code className="num text-fg">{pathname}</code> is not a coin, a dashboard, or a document. Coin pages live at{" "}
        <span className="num">/c/&lt;slug&gt;</span>, where the slug is the app name lowercased and hyphenated. A coin killed for a
        content-policy violation stops resolving too.
      </p>
      <div className="mt-8 flex flex-wrap gap-2">
        <Link to="/" className="btn btn-primary">
          Coin leaderboard
        </Link>
        <Link to="/launch" className="btn">
          Launch a coin
        </Link>
      </div>
    </div>
  );
};
