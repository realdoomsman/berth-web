const origin = (import.meta.env.VITE_API_ORIGIN as string | undefined)?.replace(/\/+$/, "") ?? "";

export const env = {
  apiOrigin: origin,
  googleClientId: (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? "",
  appDomain: (import.meta.env.VITE_APP_DOMAIN as string | undefined) ?? "",
  shipMint: (import.meta.env.VITE_SHIP_MINT as string | undefined) ?? "",
  solanaRpcUrl: (import.meta.env.VITE_SOLANA_RPC_URL as string | undefined) ?? "https://api.mainnet-beta.solana.com",
} as const;

/** Public URL of a deployed app: wildcard subdomain when configured, path routing otherwise. */
export const appUrl = (slug: string): string =>
  env.appDomain ? `https://${slug}.${env.appDomain}` : `${env.apiOrigin}/a/${slug}`;

export const explorerTx = (sig: string): string => `https://solscan.io/tx/${sig}`;
export const explorerAddress = (addr: string): string => `https://solscan.io/account/${addr}`;
export const pumpCoinUrl = (mint: string): string => `https://pump.fun/coin/${mint}`;
