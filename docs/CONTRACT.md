# IdentityMD Raffle — Contract Guide (Chainlink VRF v2.5)

**Current mainnet deployment:** see `deployments/mainnet-latest.json`

## Draw flow (split finalize)

```
createRaffle (admin) → enter (holders) → time ends
→ requestDraw (anyone, ETH)
    → 2nd IDMD balanceOf check → eligible snapshot on-chain
    → (0 eligible) close immediately, 0 LINK
    → else request Chainlink VRF
→ VRF callback (LINK) → store randomSeed only → SEED_READY
→ finalizeDraw (anyone, ETH) → pickWinners → CLOSED
```

## Why split finalize is cheap

| Step | Payer | Work |
|------|-------|------|
| `requestDraw()` | ETH | Holder re-check + eligible snapshot |
| VRF callback | LINK | Store seed only (~100k gas limit) |
| `finalizeDraw()` | ETH | Pick winners from snapshot + seed |

LINK cost no longer scales with entry count in the VRF callback.

## Randomness source

**Chainlink VRF v2.5** on Ethereum mainnet.

- Coordinator: `0xD7f86b4b8Cae7D942340FF628F82735b7a20893a`
- Key hash (200 gwei lane): `0x8077df514608a09f83e4e8d300645594e5d7234665448ba83f51a50f842bd3d9`
- Default `callbackGasLimit`: **100,000**

## Holder checks

| When | Check |
|------|-------|
| Entry | `balanceOf > 0` required |
| `requestDraw()` | Re-filter — sold IDMD before draw = excluded |
| VRF callback | No holder checks |
| `finalizeDraw()` | Uses snapshotted eligible list only |

## Raffle statuses

| Value | Status | Meaning |
|-------|--------|---------|
| 0 | Open | Accepting entries |
| 1 | DrawRequested | VRF pending |
| 2 | SeedReady | Seed stored — call `finalizeDraw()` |
| 3 | Closed | Winners picked |
| 4 | Cancelled | Admin cancelled |

## Deploy

```bash
# .env: DEPLOYER_PRIVATE_KEY, MAINNET_RPC_URL, VRF_SUBSCRIPTION_ID
npm run deploy:mainnet

# Optional: ETHERSCAN_API_KEY for verification
npm run verify:mainnet
```

Deploy script auto-registers the contract as a VRF consumer when the deployer owns the subscription.

## Frontend env

```
NEXT_PUBLIC_RAFFLE_CONTRACT_ADDRESS=<address from deployments/mainnet-latest.json>
```

## Cost guidance

| Draw size | LINK (approx) | Notes |
|-----------|---------------|-------|
| Any with eligible | ~0.2–0.6 LINK | Tiny VRF callback |
| Zero eligible | 0 LINK | Closes in `requestDraw()` |
| `requestDraw` ETH | scales with entries | 1× balanceOf per entrant |
| `finalizeDraw` ETH | scales with entries | reads eligible snapshot |

Fund subscription with **~5 LINK** for many draws.
