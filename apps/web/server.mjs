import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sirv from "sirv";

const here = dirname(fileURLToPath(import.meta.url));
// WEB_DIST lets `scripts/audit.mjs` serve a throwaway build with the real headers.
const dist = process.env.WEB_DIST ? resolve(process.env.WEB_DIST) : join(here, "dist");
const indexPath = join(dist, "index.html");
if (!existsSync(indexPath)) {
  console.error(`[web] ${indexPath} missing — run "npm run build" first`);
  process.exit(1);
}
const indexHtml = readFileSync(indexPath);
const port = Number(process.env.PORT ?? 3000);

const origin = (url) => {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
};

/*
 * CSP for the platform site. This is not the app sandbox: it has to allow Google
 * Identity Services (sign-in iframe/script) and WalletConnect/Reown (relay
 * websocket, wallet registry, verify iframe) for wallet-connect logins, plus our
 * own API and Solana RPC. Hosts come from the SDKs' own endpoints, not from a
 * wildcard: `connect-src https:` would make this policy decorative.
 *
 * Deliberate exceptions:
 *  - style-src 'unsafe-inline': runtime-injected styles (GSI + wallet-adapter UI).
 *    Nothing we can nonce from here.
 *  - img-src https: data: blob:: coin images are user-supplied pump.fun/IPFS
 *    URLs, and wallet logos come from the WalletConnect registry.
 */
const API_ORIGIN = origin(process.env.VITE_API_ORIGIN ?? "") ?? "";
const RPC_ORIGIN = origin(process.env.VITE_SOLANA_RPC_URL ?? "") ?? "https://api.mainnet-beta.solana.com";
const EXTRA_CONNECT = (process.env.CSP_CONNECT_EXTRA ?? "").split(/\s+/).filter(Boolean);

const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "script-src 'self' https://challenges.cloudflare.com https://accounts.google.com/gsi/client",
  "style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  [
    "connect-src 'self'",
    API_ORIGIN,
    RPC_ORIGIN,
    "https://accounts.google.com/gsi/",
    "https://explorer-api.walletconnect.com",
    "https://api.web3modal.org",
    "https://pulse.walletconnect.org",
    "https://rpc.walletconnect.org",
    "wss://relay.walletconnect.com",
    "wss://relay.walletconnect.org",
    "https://challenges.cloudflare.com",
    ...EXTRA_CONNECT,
  ]
    .filter(Boolean)
    .join(" "),
  [
    "frame-src 'self'",
    "https://accounts.google.com/gsi/",
    "https://challenges.cloudflare.com",
    "https://verify.walletconnect.com",
    "https://verify.walletconnect.org",
    "https://secure.walletconnect.org",
    "https://secure-mobile.walletconnect.org",
  ].join(" "),
].join("; ");

/*
 * Nothing here is meant to be framed, including /card and /c/:slug/card. Those
 * are 1200×630 compositions for a screenshot runner that *navigates* to them;
 * social embeds use the og:image PNG, not an iframe. So: DENY everywhere, and
 * frame-ancestors 'none' to say the same thing to modern browsers.
 */
const securityHeaders = {
  "content-security-policy": CSP,
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "accelerometer=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=()",
  "cross-origin-opener-policy": "same-origin-allow-popups",
};

const serve = sirv(dist, {
  etag: true,
  gzip: true,
  brotli: true,
  maxAge: 31536000,
  immutable: true,
  setHeaders(res, pathname) {
    // Three cache classes. /assets/* is content-hashed by Vite, so immutable and
    // a year long. HTML must never be cached or a deploy keeps serving the old
    // asset hashes. Everything else (favicon.svg, og.png, apple-touch-icon.png)
    // keeps a stable name, so it has to revalidate or a new logo never ships.
    if (pathname === "/" || pathname.endsWith(".html")) res.setHeader("Cache-Control", "no-cache");
    else if (!pathname.startsWith("/assets/")) res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
    for (const [k, v] of Object.entries(securityHeaders)) res.setHeader(k, v);
  },
});

createServer((req, res) => {
  if (req.url === "/healthz") {
    res.writeHead(200, { "content-type": "text/plain", "cache-control": "no-store" });
    res.end("ok");
    return;
  }
  serve(req, res, () => {
    /*
     * SPA fallback: unknown path without a file extension → index.html. HEAD has
     * to answer exactly like GET minus the body — Privy probes the current URL
     * with HEAD to read its Cross-Origin-Opener-Policy, and a 404 there makes it
     * log an error on every route it mounts on.
     */
    const path = (req.url ?? "/").split("?")[0];
    const method = req.method ?? "GET";
    const bodyless = method === "HEAD";
    if ((method !== "GET" && !bodyless) || /\.[a-z0-9]+$/i.test(path)) {
      res.writeHead(404, { "content-type": "text/plain", "cache-control": "no-store" });
      res.end(bodyless ? undefined : "not found");
      return;
    }
    res.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-cache",
      "content-length": String(indexHtml.byteLength),
      ...securityHeaders,
    });
    res.end(bodyless ? undefined : indexHtml);
  });
}).listen(port, "0.0.0.0", () => {
  console.log(`[web] serving ${dist} on :${port}`);
});
