import { createContext, lazy, Suspense, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { api, clearSessionToken, getSessionToken, isHttpError, setSessionToken } from "../api/client.js";
import type { Me } from "../api/types.js";

export interface AuthState {
  ready: boolean;
  authenticated: boolean;
  user: Me | null;
  /** The user's custodial Solana wallet address (server-held), or null before it exists. */
  wallet: string | null;
  displayName: string | null;
  /** Open the sign-in modal (Google + connect-a-wallet). */
  login: () => void;
  /** Open the sign-in modal and immediately start the connect-a-wallet flow. */
  loginWallet: () => void;
  logout: () => Promise<void>;
}

/** Props the lazily-loaded sign-in stack needs to publish a new session upward. */
export interface WalletStackProps {
  open: boolean;
  autoWallet: boolean;
  onCancel: () => void;
  onSession: (token: string) => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

/*
 * The sign-in stack — Google Identity Services and Solana wallet-adapter — is
 * ~1 MB and needed only when a visitor actually signs in. This dynamic import is
 * the code-split boundary: nothing else may import those packages statically, so
 * the landing page and share cards boot without them.
 */
const WalletStack = lazy(async () => ({ default: (await import("./WalletStack.js")).WalletStack }));

/**
 * Self-hosted auth: a platform session JWT in localStorage (`berth_session`),
 * validated against `/v1/me`. There is no embedded wallet and no client-side
 * signing — every on-chain action is signed server-side from the user's custodial
 * wallet. Session validation is a plain fetch, so it never loads the wallet stack.
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<Me | null>(null);
  const [ready, setReady] = useState(() => !getSessionToken());
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [autoWallet, setAutoWallet] = useState(false);

  // Validate any stored session on first paint; a 401 means the token is stale.
  useEffect(() => {
    const token = getSessionToken();
    if (!token) {
      setReady(true);
      return;
    }
    let cancelled = false;
    api
      .get<Me>("/v1/me")
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch((e) => {
        if (!cancelled && isHttpError(e) && e.status === 401) clearSessionToken();
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onSession = useCallback(async (token: string) => {
    setSessionToken(token);
    setUser(await api.get<Me>("/v1/me"));
    setOpen(false);
    setAutoWallet(false);
  }, []);

  const login = useCallback(() => {
    setAutoWallet(false);
    setMounted(true);
    setOpen(true);
  }, []);

  const loginWallet = useCallback(() => {
    setAutoWallet(true);
    setMounted(true);
    setOpen(true);
  }, []);

  const logout = useCallback(async () => {
    clearSessionToken();
    setUser(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      ready,
      authenticated: user !== null,
      user,
      wallet: user?.wallet ?? null,
      displayName: user?.displayName ?? null,
      login,
      loginWallet,
      logout,
    }),
    [ready, user, login, loginWallet, logout],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      {mounted && (
        <Suspense fallback={null}>
          <WalletStack open={open} autoWallet={autoWallet} onCancel={() => setOpen(false)} onSession={onSession} />
        </Suspense>
      )}
    </AuthContext.Provider>
  );
};

export const useAuthState = (): AuthState => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("auth hooks must be used inside <AuthProvider>");
  return ctx;
};
