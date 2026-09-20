import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth.js";

/**
 * Resets auth-scoped queries whenever the login state settles or changes, so a
 * fresh session never shows a previous user's cached data. The bearer token is
 * attached synchronously in `api/client`, so there is nothing to wire here.
 */
export const AuthBridge = () => {
  const { authenticated, ready } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!ready) return;
    void qc.invalidateQueries({ queryKey: ["me"] });
    void qc.invalidateQueries({ queryKey: ["queue"] });
    void qc.invalidateQueries({ queryKey: ["prs"] });
    void qc.invalidateQueries({ queryKey: ["ship"] });
    void qc.invalidateQueries({ queryKey: ["admin"] });
  }, [authenticated, ready, qc]);

  return null;
};
