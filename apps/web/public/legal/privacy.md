# Privacy Policy

_Last updated: 17 September 2026_

This policy explains what Berth collects, why we collect it, who else sees it, and how long we keep it. It covers this website, the API, and every app hosted on a Berth domain or path. Apps built on Berth use our login, our storage, and our payments, so this one policy applies inside them too — an app cannot collect more than what is listed here, because the SDK is the only way it can store or read anything.

## What we collect

- **Account identifiers from Google Sign-In.** We use Google Sign-In to log you in. We receive your Google account id, email address, name, and avatar. If you connect one instead, we receive your Solana wallet address. **We never receive your Google password, private keys, or seed phrase.**
- **Your custodial Solana wallet.** When you sign in with Google, Berth creates and holds a Solana wallet on your behalf and signs every on-chain transaction for you; you can deposit to it and withdraw from it. This is a **custodial wallet** — we custody its private key on our servers and never expose that private key to your browser, but we do hold it. If you instead connect your own external Solana wallet, you keep sole control of that wallet's keys.
- **Wallet addresses and on-chain data.** Public addresses, token balances for Berth coins, and transaction signatures. This data is already public on Solana; we index it to compute holder tiers, vote weight, staking positions, and to verify that a payment actually happened.
- **What you submit when launching.** Your prompt, the generated spec, the app name, ticker, and image. Prompts go to an AI model for moderation and spec generation and end up in the app's public repository, so treat them as public.
- **App usage counters.** Inside a hosted app we record the app id, your user id, a first-seen and last-seen timestamp, and the key-value data the app stores for you through `ship.kv`. Counters are how the leaderboard shows user numbers. An app can read only the values it wrote for you; it cannot read another user's values or another app's data.
- **Payments.** Product id, price, paying wallet, transaction signature, and status for every purchase, subscription, and per-request charge. We keep these because Berth is the merchant of record.
- **Technical logs.** IP address, user agent, and request metadata, used for security, abuse detection, and rate limiting.
- **Reports and correspondence.** What you send us when you report an app or email us, including the contact details you provide.

We do **not** collect card numbers, bank details, government identifiers, biometrics, or precise location. We do not run third-party analytics or advertising trackers. Ads inside apps are served by Berth from other Berth apps and record only a per-campaign impression and click count — no profile of you.

## Why we use it

- **To run the platform:** sign you in, host apps, verify payments, apply holder perks, count votes, and track staking.
- **To build apps:** your prompt, your queue tasks, and votes are inputs to the automated build agent.
- **To keep it safe:** moderation of launches, the pre-deploy reviewer, abuse detection, rate limiting, and legal compliance.
- **To show public activity:** the leaderboard, build feeds, revenue ledgers, contributor lists, staking tables, and top-holder lists display wallet addresses, X handles, and amounts. All of it is either already public on-chain or was submitted to be published.

We do not sell personal data, and we do not use it to train models of our own.

## Who else sees it

- **Google** — authentication (sign-in).
- **Anthropic** — AI models. Prompts, specs, build context, and inputs to app functions that call `ship.llm` are processed by Anthropic under its API terms. Do not put secrets or sensitive personal data into a prompt or an app input.
- **E2B** — build sandboxes. They receive app source code, not user data.
- **GitHub** — hosts every app's public repository.
- **Helius and Solana RPC providers** — on-chain reads and webhooks.
- **X (Twitter)** — only when the platform posts about an app; posts contain public app information only.
- **Railway** — hosting for the site, the API, and the runner.
- **Authorities and claimants** — when the law requires it, for example a valid DMCA notice, subpoena, or court order.

## Cookies and local storage

The website keeps you signed in with a session token stored in your browser (localStorage). Each hosted app sets exactly one signed session cookie, `ship_app_session`, scoped to that app's own path or subdomain so one app's session can never be replayed at another. There are no analytics or advertising cookies anywhere on Berth.

## How long we keep it

- **Account, launch, ledger, purchase, staking, and build history:** for as long as Berth operates. These records document money movements and public build history, so they are not deleted on request.
- **Technical logs (IP, user agent, request metadata):** 30 days, then deleted.
- **App key-value data:** until you delete it through the app, the app is deleted, or your account is deleted.
- **Reports and correspondence:** 2 years after the matter is closed.
- **Killed apps:** the app stops serving immediately; its record and history stay in the database for audit and appeals.

## Your choices and rights

Depending on where you live you may have the right to access, correct, export, or delete your personal data, or to object to some processing. Email the privacy address below from the account concerned and we will answer within 30 days.

Two honest limits: we cannot delete anything recorded on the Solana blockchain or published in a public GitHub repository, because neither is ours to erase, and we keep the payment and ledger records we are required to keep. Deleting your account unlinks your identifiers from future activity; it does not rewrite the chain or the public build feed.

## Security

Session cookies are signed, app functions run in a memory- and time-limited sandbox with no network access beyond the platform API, and platform keys are never exposed to app code or to the browser. No system is perfect: if we discover a breach affecting your data we will tell affected users and, where required, regulators.

## Children

Berth is not for anyone under 18 and we do not knowingly collect data from children.

## Changes

The date at the top changes when this policy changes, and material changes are announced on the site.

## Contact

- Privacy and data requests: **privacy@berth.fun**
- Abuse, impersonation, and general reports: **report@berth.fun**, or the report form on any app page
- Copyright (DMCA) notices: **dmca@berth.fun**
