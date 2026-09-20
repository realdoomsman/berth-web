import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { brotliCompressSync, gzipSync, constants as zlib } from "node:zlib";
import { defineConfig } from "vite";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/*
 * Chunking.
 *
 * The wallet stack — Google Identity Services, Solana wallet-adapter and their UI
 * and data dependencies — is ~1 MB raw and almost nobody needs it. It is reachable
 * only through the lazy import in `auth/AuthProvider.tsx` (which loads
 * `auth/WalletStack.tsx`), so no other module may import those packages statically.
 * Those packages import each other in both directions, and a cyclic chunk graph
 * plus CommonJS interop breaks at runtime (`Cannot read properties of undefined
 * (reading 'exports')` on any page that touched web3.js — this was real, not
 * hypothetical). Classifying every package into the layered chunks below keeps
 * the graph a DAG:
 *
 *     react ← query          react, zod ← entry
 *     base  ← solana ← wallet → react, query
 *     chart (leaf)
 *
 * `base` is the catch-all *bottom* layer, and that direction is deliberate: a
 * package we forget to classify becomes a size regression on the Solana pages —
 * which `ship:bundle-budget` and `scripts/audit.mjs` both catch — rather than a
 * chunk cycle that only shows up as a runtime crash.
 */
const WALLET_PACKAGES =
  /^(@react-oauth\/|@privy-io\/|@walletconnect\/|@reown\/|@coinbase\/|@base-org\/|@metamask\/|@msgpack\/|@simplewebauthn\/|viem|ox|abitype|@adraffy\/|@ethersproject\/|@headlessui\/|@heroicons\/|react-aria|@react-aria\/|@react-stately\/|@react-types\/|@internationalized\/|@floating-ui\/|styled-components|stylis|tinycolor2|qrcode|lucide-react|libphonenumber-js|secure-password-utilities|jose|mipd|react-device-detect|ua-parser-js|preact|lit$|lit-|@lit|valtio|proxy-compare|pino|thread-stream|sonic-boom|on-exit-leak-free|real-require|atomic-sleep|quick-format-unescaped|safe-stable-stringify|unstorage|idb-keyval|multiformats|uint8arrays|big\.js|cross-fetch|ofetch|detect-browser|blakejs|destr|ohash|ufo|es-toolkit|keyvaluestorage-interface)/;

const SOLANA_PACKAGES = /^(@solana\/|@solana-program\/|@solana-mobile\/|@wallet-standard\/|jayson|rpc-websockets)/;

const VENDOR_CHUNKS: Array<{ chunk: string; packages: RegExp }> = [
  { chunk: "react", packages: /^(react|react-dom|react-is|scheduler|react-router|react-router-dom|use-sync-external-store)$/ },
  { chunk: "query", packages: /^@tanstack\// },
  { chunk: "zod", packages: /^zod$/ },
  { chunk: "chart", packages: /^(lightweight-charts|fancy-canvas)$/ },
  { chunk: "wallet", packages: WALLET_PACKAGES },
  { chunk: "solana", packages: SOLANA_PACKAGES },
];

/** Owning package of a module id, following nested installs to the innermost one. */
const packageOf = (path: string): string | undefined => {
  const at = path.lastIndexOf("node_modules/");
  if (at < 0) return undefined;
  return /^((?:@[^/]+\/)?[^/]+)/.exec(path.slice(at + "node_modules/".length))?.[1];
};

/**
 * Preloads what the first paint is actually blocked on: the entry module and the
 * latin subsets of the two variable fonts, plus a preconnect to the API the first
 * query hits. Font filenames are content hashed, so the hrefs have to be read off
 * the bundle rather than hardcoded in `index.html`.
 */
const preloadCriticalAssets = (): Plugin => {
  let apiOrigin = "";
  return {
    name: "ship:preload-critical-assets",
    apply: "build",
    configResolved(config) {
      try {
        apiOrigin = new URL(config.env.VITE_API_ORIGIN as string).origin;
      } catch {
        apiOrigin = "";
      }
    },
    transformIndexHtml: {
      order: "post",
      handler(_html, ctx) {
        const link = (attrs: Record<string, string>) => ({ tag: "link", attrs, injectTo: "head-prepend" as const });
        /*
         * The faces the first paint blocks on: Inter for body copy, JetBrains
         * Mono for every number, and both Silkscreen weights, which set display
         * type and labels above the fold. Latin subsets only — the rest are
         * unicode-range gated and never fetched for English. woff2 only:
         * fontsource also emits a legacy .woff for each face, which no browser
         * that supports preload will ever pick. Filenames are content hashed, so
         * they have to be read off the bundle.
         */
        const fonts = Object.keys(ctx.bundle ?? {}).filter((file) =>
          /(?:(?:inter|jetbrains-mono)-latin-wght-normal|silkscreen-latin-[47]00-normal)-[^/]*\.woff2$/.test(file),
        );
        return [
          ...(apiOrigin ? [link({ rel: "preconnect", href: apiOrigin, crossorigin: "" })] : []),
          ...fonts.map((file) => link({ rel: "preload", as: "font", type: "font/woff2", href: `/${file}`, crossorigin: "" })),
          // Vite emits modulepreload for the entry's *imports*, not the entry itself.
          ...(ctx.chunk ? [link({ rel: "modulepreload", href: `/${ctx.chunk.fileName}`, crossorigin: "" })] : []),
        ];
      },
    },
  };
};

/*
 * `sirv` in `server.mjs` serves `.br`/`.gz` siblings when the client asks for
 * them, and Vite does not emit any, so every asset was going out uncompressed:
 * 3.4 MB of JS on the wire instead of 1 MB. Compress at build time — once, at max
 * level — rather than per request in Node.
 *
 * This has to happen in `writeBundle`, reading the files back off disk. Vite's
 * own internal post plugins run *after* user post plugins, and one of them
 * replaces the `__VITE_PRELOAD__` placeholder in `generateBundle` — compressing
 * chunk.code there ships a .gz whose JS still contains the placeholder, and the
 * page dies with "__VITE_PRELOAD__ is not defined".
 */
const COMPRESSIBLE = /\.(js|css|html|svg|json)$/;

const precompressAssets = (): Plugin => ({
  name: "ship:precompress",
  apply: "build",
  enforce: "post",
  writeBundle(options, bundle) {
    const dir = options.dir;
    if (!dir) return;
    for (const fileName of Object.keys(bundle)) {
      if (!COMPRESSIBLE.test(fileName)) continue;
      const file = join(dir, fileName);
      // A second build writing the same outDir can have the file mid-replace.
      // Skipping one sibling is a missing optimisation; throwing here would kill
      // the whole build with no usable message.
      if (!existsSync(file)) {
        this.warn(`precompress: ${fileName} vanished before compression — another build writing ${dir}?`);
        continue;
      }
      const raw = readFileSync(file);
      // Below ~1 kB the header overhead makes compression pointless.
      if (raw.byteLength < 1024) continue;
      writeFileSync(
        `${file}.br`,
        brotliCompressSync(raw, {
          params: { [zlib.BROTLI_PARAM_QUALITY]: 11, [zlib.BROTLI_PARAM_SIZE_HINT]: raw.byteLength },
        }),
      );
      writeFileSync(`${file}.gz`, gzipSync(raw, { level: 9 }));
    }
  },
});

/*
 * Budget enforcement, in the build rather than in CI only.
 *
 * Vite's `chunkSizeWarningLimit` is one number applied to every chunk, which
 * cannot express the thing we care about: the initial graph must stay small, the
 * numbers that matter are the compressed ones a browser actually downloads, and
 * the deferred wallet chunk is allowed to be large because no first paint waits
 * on it. So this plugin states those budgets and fails the build when one is
 * blown. `chunkSizeWarningLimit` is set above the wallet chunk purely so the two
 * checks do not both shout; this plugin is the one with teeth, and
 * `scripts/audit.mjs` re-measures the same thing through a real browser.
 */
const BUDGETS = {
  /** Transferred (gzip) kB of any one chunk the HTML entry statically depends on. */
  initialChunkKb: 110,
  /** Transferred (gzip) kB of the whole initial graph: entry + its static imports. */
  initialTotalKb: 160,
  /** Raw kB of any lazily loaded chunk. The wallet stack sets this floor. */
  lazyChunkKb: 3600,
};

const bundleBudget = (): Plugin => ({
  name: "ship:bundle-budget",
  apply: "build",
  enforce: "post",
  writeBundle(options, bundle) {
    const dir = options.dir;
    if (!dir) return;
    const chunks = Object.values(bundle).filter((o): o is Extract<typeof o, { type: "chunk" }> => o.type === "chunk");
    const byFile: Record<string, string[]> = {};
    for (const chunk of chunks) byFile[chunk.fileName] = chunk.imports;
    const entry = chunks.find((c) => c.isEntry);
    if (!entry) return;

    const initial = new Set<string>();
    const walk = (fileName: string) => {
      if (initial.has(fileName)) return;
      initial.add(fileName);
      for (const dep of byFile[fileName] ?? []) walk(dep);
    };
    walk(entry.fileName);

    const sizeOf = (fileName: string) => {
      const file = join(dir, fileName);
      const raw = statSync(file).size;
      // What the browser gets: the precompressed sibling when we made one.
      const gzip = existsSync(`${file}.gz`) ? statSync(`${file}.gz`).size : raw;
      return { raw, gzip };
    };

    const problems: string[] = [];
    let initialGzip = 0;
    for (const fileName of initial) {
      const { gzip } = sizeOf(fileName);
      initialGzip += gzip;
      if (gzip / 1024 > BUDGETS.initialChunkKb) {
        problems.push(`${fileName} is ${(gzip / 1024).toFixed(0)} kB gzipped in the initial graph (limit ${BUDGETS.initialChunkKb} kB)`);
      }
      if (/(^|\/)wallet-/.test(fileName)) {
        problems.push(`${fileName} is in the initial graph — something imports the wallet stack outside the lazy auth/WalletStack.tsx`);
      }
    }
    if (initialGzip / 1024 > BUDGETS.initialTotalKb) {
      problems.push(
        `initial graph is ${(initialGzip / 1024).toFixed(0)} kB gzipped across ${initial.size} chunks (limit ${BUDGETS.initialTotalKb} kB)`,
      );
    }
    for (const chunk of chunks) {
      if (initial.has(chunk.fileName)) continue;
      const { raw } = sizeOf(chunk.fileName);
      if (raw / 1024 > BUDGETS.lazyChunkKb) {
        problems.push(`${chunk.fileName} is ${(raw / 1024).toFixed(0)} kB raw (lazy limit ${BUDGETS.lazyChunkKb} kB)`);
      }
    }

    const summary = `initial graph ${(initialGzip / 1024).toFixed(1)} kB gzipped across ${initial.size} chunks`;
    if (problems.length) this.error(`bundle budget blown — ${summary}\n  - ${problems.join("\n  - ")}`);
    this.warn(`budget ok — ${summary}`);
  },
});

/*
 * Dev only. Solana wallet-adapter reaches for the Node `Buffer` global. In a
 * production build the npm `buffer` polyfill is bundled (it lands in `base`), but
 * `vite dev` externalises the builtin, so the first route that mounts the wallet
 * stack dies with `ReferenceError: Buffer is not defined` and unmounts the whole
 * tree. Alias
 * the bare specifier to the real package and install the global before any module
 * runs. The trailing slash is what stops Node resolving its own builtin.
 */
const devBufferShim = (): Plugin => ({
  name: "ship:dev-buffer-shim",
  apply: "serve",
  config: () => ({
    resolve: { alias: { buffer: createRequire(import.meta.url).resolve("buffer/") } },
  }),
  transformIndexHtml: () => [
    {
      tag: "script",
      attrs: { type: "module" },
      children: 'import { Buffer } from "buffer";\nglobalThis.Buffer ??= Buffer;\nglobalThis.global ??= globalThis;',
      injectTo: "head-prepend",
    },
  ],
});

export default defineConfig({
  plugins: [react(), tailwindcss(), devBufferShim(), preloadCriticalAssets(), precompressAssets(), bundleBudget()],
  build: {
    target: "es2022",
    sourcemap: false,
    // Superseded by ship:bundle-budget above, which enforces the real budgets
    // (initial graph small, deferred wallet chunk capped). Set above the wallet
    // chunk so one deliberate 3.4 MB deferred bundle does not print a warning
    // that says nothing the stricter check does not already say.
    chunkSizeWarningLimit: BUDGETS.lazyChunkKb,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const path = id.replace(/\\/g, "/");
          // Vite's dynamic-import helper is imported by every chunk that has a
          // dynamic import. Left unassigned, rollup parks it in whichever vendor
          // chunk it likes — and if that is the wallet chunk, the entry statically
          // imports the wallet stack again. Pin it to a chunk the entry already
          // needs and that imports nothing itself.
          if (path.includes("vite/preload-helper")) return "react";
          const pkg = packageOf(path);
          if (!pkg) return;
          return VENDOR_CHUNKS.find((v) => v.packages.test(pkg))?.chunk ?? "base";
        },
      },
    },
  },
});
