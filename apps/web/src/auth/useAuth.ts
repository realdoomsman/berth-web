import { useAuthState } from "./AuthProvider.js";
import type { AuthState } from "./AuthProvider.js";

export type { AuthState };

/**
 * Auth for the whole app: `login()` opens the sign-in modal (Google or wallet),
 * `wallet` is the user's custodial address, and `authenticated` reflects a valid
 * platform session. Every on-chain action is signed server-side.
 */
export const useAuth = (): AuthState => useAuthState();
