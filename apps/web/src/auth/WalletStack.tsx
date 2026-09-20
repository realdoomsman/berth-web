import { useCallback, useEffect, useMemo, useState } from "react";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import type { CredentialResponse } from "@react-oauth/google";
import { ConnectionProvider, WalletProvider, useWallet } from "@solana/wallet-adapter-react";
import { WalletModalProvider, useWalletModal } from "@solana/wallet-adapter-react-ui";
import { api } from "../api/client.js";
import type { AuthResponse } from "../api/types.js";
import { env } from "../env.js";
import { Modal } from "../components/Modal.js";
import type { WalletStackProps } from "./AuthProvider.js";
import "@solana/wallet-adapter-react-ui/styles.css";

/** base64 of an ed25519 signature, as the wallet-login endpoint expects. */
const toBase64 = (bytes: Uint8Array): string => {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
};

/**
 * The sign-in UI, rendered inside the wallet-adapter + Google providers. Google
 * returns an ID token we exchange for a session; wallet login connects an
 * external wallet, signs a server-issued challenge, and exchanges that. The
 * browser never signs a transaction — only the login challenge.
 */
const SignIn = ({ open, autoWallet, onCancel, onSession }: WalletStackProps) => {
  const { publicKey, signMessage, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const [walletPending, setWalletPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startWallet = useCallback(() => {
    setError(null);
    setWalletPending(true);
    if (!connected) setVisible(true);
  }, [connected, setVisible]);

  // Opened via loginWallet(): jump straight to connecting a wallet.
  useEffect(() => {
    if (open && autoWallet) startWallet();
  }, [open, autoWallet, startWallet]);

  const onGoogle = useCallback(
    async (resp: CredentialResponse) => {
      if (!resp.credential) return;
      setError(null);
      try {
        const { token } = await api.post<AuthResponse>("/v1/auth/google", { credential: resp.credential });
        await onSession(token);
      } catch (e) {
        setError(e instanceof Error ? e.message : "sign-in failed");
      }
    },
    [onSession],
  );

  // Once a wallet is connected after startWallet(), sign the challenge and verify.
  useEffect(() => {
    if (!walletPending || !connected || !publicKey || !signMessage) return;
    let cancelled = false;
    void (async () => {
      try {
        const pubkey = publicKey.toBase58();
        const { message } = await api.post<{ message: string }>("/v1/auth/wallet/challenge", { pubkey });
        const signature = toBase64(await signMessage(new TextEncoder().encode(message)));
        const { token } = await api.post<AuthResponse>("/v1/auth/wallet", { pubkey, message, signature });
        if (!cancelled) await onSession(token);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "wallet sign-in failed");
      } finally {
        if (!cancelled) setWalletPending(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [walletPending, connected, publicKey, signMessage, onSession]);

  return (
    <Modal open={open} onClose={onCancel} title="Sign in" width="sm">
      <div className="flex flex-col items-stretch gap-4 text-sm">
        <p className="text-fg-2">
          Sign in with Google to get a platform wallet, or connect an existing Solana wallet. Berth signs every
          on-chain action for you — you never approve a transaction.
        </p>
        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={onGoogle}
            onError={() => setError("Google sign-in was cancelled.")}
            theme="filled_black"
            text="continue_with"
            shape="pill"
          />
        </div>
        <div className="flex items-center gap-3 text-xs text-fg-3">
          <span className="h-px flex-1 bg-line" />
          or
          <span className="h-px flex-1 bg-line" />
        </div>
        <button type="button" className="btn" disabled={walletPending} onClick={startWallet}>
          {walletPending ? "Waiting for wallet…" : "Connect a Solana wallet"}
        </button>
        {error && <p className="small text-burn">{error}</p>}
      </div>
    </Modal>
  );
};

/**
 * The lazily-loaded wallet stack: Google Identity Services and Solana
 * wallet-adapter. Wallet-standard wallets (Phantom, Solflare, …) auto-register,
 * so `WalletProvider` needs no explicit adapter list.
 */
export const WalletStack = (props: WalletStackProps) => {
  const wallets = useMemo(() => [], []);
  return (
    <GoogleOAuthProvider clientId={env.googleClientId}>
      <ConnectionProvider endpoint={env.solanaRpcUrl}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            <SignIn {...props} />
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </GoogleOAuthProvider>
  );
};
