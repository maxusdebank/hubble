# Hubble web application

This directory contains the latest Hubble user-interface source. It is a Create React App project covering the shared shell, protocol dashboard, Engine Room, trading/liquidity views, bridge, portfolio, and coin-flip interface.

The production application is available at [app.xhubble.xyz](https://app.xhubble.xyz).

## Requirements

- [Node.js](https://nodejs.org/) 20 or newer
- npm 10 or newer
- A modern browser
- A wallet configured for Sonic, if you want to exercise transaction flows

The checked-in dependency lockfile should be used so local installations resolve the same package versions.

## Run locally

From the repository root:

```bash
cd site
npm ci
npm start
```

The development server opens [http://localhost:3000](http://localhost:3000). If it does not open automatically, visit that URL manually.

The interface can read public chain state without a connected wallet. Connecting a wallet is required for staking, trading, redemption, and other transactions.

## Production build

```bash
cd site
npm ci
npm run build
```

The optimized static bundle is written to `site/build/`. Build output is intentionally ignored by Git because it can be reproduced from the source and lockfile.

## Tests

```bash
cd site
npm test
```

Create React App starts the test runner in watch mode. For a single non-interactive run:

```bash
npm test -- --watchAll=false
```

## Source layout

| Path | Purpose |
|---|---|
| `src/protocol/` | Hubble staking, Mission Control, liquidity, and redemption UI |
| `src/engine/` | Engine Room and epoch controls |
| `src/trade/` | Swap and liquidity interface |
| `src/dashboard/` | Portfolio dashboard |
| `src/bridge/` | Bridge interface |
| `src/flip/` | Coin-flip interface |
| `src/components/` | Shared navigation and shell components |
| `public/` | Static HTML, manifest, icons, and public images |

## Network configuration

The production interface targets Sonic mainnet (chain ID `146`) and uses public Sonic RPC endpoints. Some Engine Room and coin-flip configuration also includes Sonic Blaze testnet for their testnet flows.

The WalletConnect project ID committed in the frontend is a public browser-client identifier, not a private key. Never add wallet private keys, seed phrases, privileged API secrets, or deployment credentials to this directory.

## Known build warnings

The current source produces a valid production build but reports warnings from wallet dependencies about optional React Native modules and unavailable upstream source maps. It also reports existing ESLint accessibility and unused-variable warnings. These warnings are retained from the current production source and do not prevent the bundle from compiling.

## Updating this snapshot

When publishing a newer UI version:

1. Update `src/`, `public/`, `package.json`, and `package-lock.json` together.
2. Do not commit `node_modules/` or `build/`.
3. Run `npm ci` and `npm run build`.
4. Review the diff for secrets, private endpoints, and generated artifacts before committing.
