# Berth — web front-end (open)

The public front-end of **[Berth](https://berth.fun)** — a Solana launchpad where a coin's trading
fees fund an AI agent that builds a real app, and the app's revenue buys back and burns the coin.

This repository is published for **transparency**: you can read exactly how the interface works and
what the browser does. It is a faithful mirror of the code that runs at berth.fun.

## What's in here

- `apps/web` — the React + Vite single-page app (the entire berth.fun UI) and its production static server (`server.mjs`, which sets the CSP).
- `packages/shared` — the shared TypeScript types, zod schemas, and economic constants the UI relies on.

## What's intentionally **not** here (and why)

Berth is a **custodial** platform: it derives and holds wallets and signs transactions on users'
behalf. The code that touches money, keys, and auth is kept private, because publishing it would hand
attackers a map of a fund-holding system. So the following are **not** in this repo:

- the API server, the build/runner engine, the database schema
- custodial wallet derivation and server-side transaction signing
- anything reading the platform master seed, treasury keys, or provider credentials

Nothing in this repository contains a secret — the browser only ever sees public config
(`VITE_*`: the API origin, the Google OAuth **client** id, a Solana RPC URL, the public treasury
address). There are no keys here.

## $BERTH governance — how the community shapes Berth

Holders of **≥3% of $BERTH** can propose improvements to Berth itself at
[berth.fun/governance](https://berth.fun/governance); every $BERTH holder can vote (token-weighted,
capped per wallet), and the whole board is public. It is advisory: the team builds what wins, and
every change ships through the owner. That board is the intended way to contribute for now — this
mirror exists so anyone can see how the thing they're steering actually works.

## Run it locally

```bash
npm install
# provide the public client config:
export VITE_API_ORIGIN=https://api.berth.fun
export VITE_GOOGLE_CLIENT_ID=<your Google OAuth web client id>
export VITE_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
export VITE_APP_DOMAIN=berth.fun
export VITE_SHIP_MINT=            # $BERTH mint (once launched)
export VITE_TREASURY_WALLET=53pWcdTUE739ApddT1DfUQ1LQG9Wd63XNW4XF7aoLmPb
npm run dev
```

## License

Source-available for transparency. All rights reserved unless a license file is added later.
