# IMD Raffle

Holder-gated, fully on-chain raffle platform for [Identity MD](https://opensea.io/collection/identitymd) collectors. Layout mirrors [imd.fun](https://www.imd.fun/).

## Features

- **Privy wallet connect** on Ethereum mainnet
- **Holder gating** at entry and at winner selection
- **Multi-admin** support (owner adds admins on-chain)
- **Admin portal** — create raffles, manage admins, trigger draws
- **Chainlink VRF v2.5** — provably fair randomness, no blockhash window
- **Railway-ready** Next.js deployment

## Structure

```
imd-raffle/
├── contracts/IdentityMDRaffle.sol
├── docs/CONTRACT.md          ← full contract + security guide
├── test/
├── scripts/deploy.ts
├── web/                      ← Next.js frontend + API
└── railway.toml
```

## Quick start

### Contracts

```bash
npm install
npm test
VRF_SUBSCRIPTION_ID=123 npx hardhat run scripts/deploy.ts --network mainnet
# Then add contract as VRF consumer at https://vrf.chain.link
```

### Frontend

```bash
cd web
cp .env.example .env.local
# Set NEXT_PUBLIC_PRIVY_APP_ID
# Set NEXT_PUBLIC_RAFFLE_CONTRACT_ADDRESS
npm install
npm run dev
```

### Railway

1. Connect this repo to Railway
2. Set root directory (repo root — `railway.toml` handles build)
3. Env vars:
   - `NEXT_PUBLIC_PRIVY_APP_ID`
   - `NEXT_PUBLIC_RAFFLE_CONTRACT_ADDRESS`
   - `NEXT_PUBLIC_MAINNET_RPC_URL` (optional)
   - `PORT` (Railway sets automatically)

## Pages

| Route | Access | Purpose |
|-------|--------|---------|
| `/` | Public | Landing + stats |
| `/raffles` | IDMD holders | Enter raffles (signed tx) |
| `/verify?id=N` | Public | Verify draw proof |
| `/admin` | IDMD + admin | Create raffles, manage admins, **export winners CSV** |
| `/api/health` | Public | Railway healthcheck |

## Admin workflow

1. Deploy contract — deployer is owner + first admin
2. Owner adds admin wallets via `/admin` → `addAdmin()`
3. Admins create raffles (signed tx)
4. Holders enter (signed tx, gas required)
5. After end: `requestDraw()` → Chainlink VRF callback auto-finalizes
6. Verify on `/verify` + [vrf.chain.link](https://vrf.chain.link)
7. Export winners from `/admin` → **Winners Export** (CSV per raffle or all closed)

## Docs

See [docs/CONTRACT.md](./docs/CONTRACT.md) for:
- Complete draw mechanism
- Flexibility limits
- Exploit analysis
- Transaction signing requirements

## License

MIT
