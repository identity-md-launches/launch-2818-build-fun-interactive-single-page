# Squeek Tales

A small, illustrated story game powered by confirmed Squeekchain rounds on Sepolia. A real 10-minute round becomes a chapter: **Nap** at 0 work, **Jog** at 1–499, and **Zoomies** at 500+. The static production website is included in `dist/`.

## Install, run, and rebuild

Use Node.js 22.18 or newer (validated with Node 22.22.2) and npm.

```sh
npm ci
npm run dev
```

Open the local URL Vite prints. To rebuild and preview the actual export:

```sh
npm run typecheck
npm test
npm run build
npm run check:export
npm run preview
```

`vite.config.ts` sets `base: './'`. Serve **all of `dist/`**, including `art/`, `fonts/`, `wallets/`, and `assets/`. Navigation uses hashes, so static hosting needs no route rewrites. The IMD delivery process assigns the public imd.site location from this export after submission; this repository does not contain a guessed public URL or a separate deployment command.

No API key, private key, relay, project ID, environment file, server, or voting contract is needed.

## Play

1. Read the newest chapter or explore the chapter book.
2. Connect your wallet and use Sepolia. Choose a plan before the current round's timer ends; you can change it until then.
3. When that round is confirmed, the real outcome writes the next chapter and changes its illustration. Your selected plan adds a personal passage.
4. Receive 10 story points for participating in a settled round, plus 20 if your plan matches its outcome.

**Choices, chapters, and the leaderboard are local to this browser.** There is no shared election, global ranking, transaction, signature, token prize, or payment. The interface discloses this in the guide and leaderboard. Multiple connected wallets on one device can appear in that device's ranking. Browser data can be edited and is not suitable for a competitive prize system.

The timer marks a round's end, **not its settlement**. Pending choices stay unscored until a confirmed chapter exists. The outcome is never guessed from live telemetry or elapsed time. The app saves at most 512 confirmed chapters and 2,000 choices; rankings count choices saved here and score only the saved confirmed chapters. Clearing site data resets progress. With storage blocked, progress lasts for the current visit.

## Round data and wallets

- Read-only `GET https://api.squeekchain.com/v1/core`, every 15 seconds while visible; requests time out after 12 seconds. A failed check or a check older than 45 seconds disables new choices and offers Retry. Existing chapters remain readable.
- The parser requires schema version 1, Sepolia chain ID `11155111`, a 600-second duration, the response's core identity, and events at or below its safe block and settled frontier.
- Work comes from individual `RoundRecorded` events grouped with a complete `BatchSettled` transaction. Zero is inferred only for omitted rounds in a completely represented certified batch. A truncated active batch stays unknown. Repeated polls are idempotent; a receding frontier removes chapters beyond it.
- Contract identity, genesis, and frontier come from the live API, so there is no obsolete deployment address hardcoded into runtime code. The API is the data authority; this app does not independently verify it with a second RPC. No chain state is written.
- wagmi + viem provide EIP-6963 discovery, a generic browser-wallet fallback, Coinbase Wallet/Smart Wallet, reconnect, disconnect, and Sepolia switch/add support. Phones without an injected provider receive MetaMask, Coinbase Wallet, Rabby, and Phantom app links. No WalletConnect relay is configured.
- The official livestream link opens the [Squeekchain Sepolia site](https://sepolia.squeekchain.com/).

API behavior and settlement semantics were checked against the [official API reference](https://docs.squeekchain.com/developers/api/) and [SqueekCore reference](https://docs.squeekchain.com/developers/core/). Rabby's link parameters were checked against its [mobile link handler](https://github.com/RabbyHub/rabby-mobile/blob/develop/apps/mobile/src/hooks/universalLink.ts) and [production link prefix](https://github.com/RabbyHub/rabby-mobile/blob/develop/apps/mobile/src/constant/universalLink.ts).

## Verification

Worker checks on 2026-11-01:

| Check | Actual result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm test` | 13 game, timing, settlement, storage, and scoring tests passed |
| `npm run build` | Passed; nonfatal upstream Rollup annotation warnings |
| `npm run check:export` | Passed; relative assets complete and submission below 8 MiB |
| `node scripts/interaction-check.mjs` | 14 browser checks passed, including Chromium and WebKit wallet/choice/settlement flows |
| Pinned taste@1 probe | 16/16 passed at 320, 390, and 1440 CSS pixels |
| axe on the story screen | 0 automated WCAG A/AA violations |

See [the complete validation record](artifacts/validation.md), [DESIGN.md](DESIGN.md), and the JSON evidence in `artifacts/`. The browser validation serves `dist/` under `/preview/` in a bounded process and closes the browser and server afterward. Normal rendering was checked with the real API; wallet actions and settlement advancement used an explicitly simulated EIP-1193 provider and intercepted API fixtures, without signing or broadcasting anything.

To repeat browser validation, install Playwright and its browsers outside the submission, for example:

```sh
npm install --prefix /tmp/squeek-checks playwright @axe-core/playwright
/tmp/squeek-checks/node_modules/.bin/playwright install chromium webkit
IMD_PLAYWRIGHT=/tmp/squeek-checks/node_modules/playwright/index.mjs \
IMD_AXE=/tmp/squeek-checks/node_modules/@axe-core/playwright/dist/index.mjs \
node scripts/interaction-check.mjs
```

The host needs Playwright's browser system libraries. `IMD_PLAYWRIGHT` and `IMD_AXE` point only to those optional validation packages; the website itself has no environment configuration. The script reports WebKit as skipped if its runtime cannot launch. Native screen-reader use, physical phones, real wallet approval, and real Coinbase passkey creation remain unverified. Automated checks are worker evidence, not independent certification.

## Source map and delivery budget

- `src/lib/api.ts`: confirmed-event parser and API fetch.
- `src/lib/game.ts`: round clock, three story paths, choices, scoring, and local ranking.
- `src/lib/wallet.ts`, `src/components/WalletSheet.tsx`: wallet configuration and connection UI.
- `src/App.tsx`, `src/style.css`: game screens, components, and responsive design.
- `public/`: complete local artwork, fonts, wallet marks, and licenses.
- `scripts/create-art.mjs`: regenerates the original SVG scenes and favicon; the share PNG is also included as a source asset.
- `scripts/game.test.ts`, `scripts/interaction-check.mjs`, `scripts/check-export.mjs`: delivered checks.

The explicit `.gitignore` path budget is **512 bytes** (implemented file: 157 bytes). Its rules exclude generated `node_modules/`, `.vite/`, `.cache/`, `coverage/`, TypeScript build metadata at every depth, and disposable `test/scratch/`. It deliberately includes `dist/`. Package caches, browser binaries, downloaded system libraries, and dependency archives used during validation stay outside the submitted tree. The export checker counts the complete deliverable against the 8,388,608-byte limit.

Artwork is original to this project. Font, icon, and design-reference attributions are in [THIRD_PARTY.md](THIRD_PARTY.md).
