# IdentityMD Raffle — Contract Guide

## Overview

`IdentityMDRaffle` is a fully on-chain raffle system for [Identity MD](https://opensea.io/collection/identitymd) holders on Ethereum mainnet. Every entry, draw, and winner is stored on-chain and can be independently verified.

---

## How It Works (End-to-End)

### 1. Admin creates a raffle
- Callable by **admins only** (`createRaffle`)
- Sets: title, description, winner count, end timestamp
- Requires a **signed transaction** (gas paid by admin)
- Owner can add/remove admins via `addAdmin` / `removeAdmin`

### 2. Holders enter
- Callable by any wallet with `IdentityMD.balanceOf > 0`
- Requires a **signed transaction** (`enter(raffleId)`) — entrants **must sign and pay gas**
- One entry per wallet per raffle
- Entry blocked if raffle closed or user already entered

### 3. Raffle closes (time-based)
- After `endsAt`, no new entries accepted
- Anyone can call `requestDraw(raffleId)` — permissionless

### 4. Draw delay (5 blocks)
- Prevents same-block manipulation
- Must call `finalizeDraw` within **250 blocks** of request (blockhash expiry)

### 5. Finalize draw
- Filters entries → **only wallets still holding IDMD** at finalize block
- Derives random seed from:
  ```
  keccak256(prevrandao, blockhash(drawBlock), eligibleEntriesHash, raffleId, drawBlock)
  ```
- Selects winners via public `pickWinners(seed, eligibleEntries, winnerCount)`
- Stores eligible snapshot on-chain for verification

### 6. Verify
- Anyone calls `verifyWinners(raffleId)` or replays `pickWinners` off-chain
- Compares recomputed winners vs stored winners

---

## Draw Mechanism

| Step | Function | Who | Signed tx? |
|------|----------|-----|------------|
| Create | `createRaffle` | Admin | Yes |
| Enter | `enter` | Holder | **Yes** |
| Request draw | `requestDraw` | Anyone | Yes |
| Finalize | `finalizeDraw` | Anyone | Yes |
| Add admin | `addAdmin` | Owner | Yes |

**Winner selection:** deterministic Fisher-Yates-style sampling without replacement, seeded by on-chain randomness. Not Chainlink VRF — uses `prevrandao` + `blockhash` (standard for small-holder communities; see risks below).

---

## Flexibility

| Feature | Supported? | Notes |
|---------|------------|-------|
| Multiple admins | ✅ | Owner adds via `addAdmin` |
| Multiple concurrent raffles | ✅ | Unlimited `raffleId`s |
| Custom winner count | ✅ | Per raffle |
| Custom duration | ✅ | `endsAt` timestamp |
| Weighted entries (Rafael-style) | ❌ | 1 wallet = 1 entry (on-chain simplicity) |
| FCFS vs random draw | Random only | Rafael FCFS is off-chain pattern |
| Role multipliers | ❌ | Not on-chain |
| Entry without gas | ❌ | Must sign `enter()` tx |
| Change entries after submit | ❌ | Immutable once entered |
| Reroll winners | ❌ | Would need new contract version |

---

## Security & Exploit Analysis

### Mitigations built in
- **Holder gate at entry** — `balanceOf > 0` required
- **Holder gate at draw** — sold NFT before finalize = excluded from eligible pool
- **One entry per wallet** — prevents sybil within same wallet
- **ReentrancyGuard** on enter/finalize
- **Permissionless finalize** — no admin can secretly pick winners off-chain
- **Public verify** — `verifyWinners()` + `pickWinners()` replay
- **Draw window** — must finalize within 250 blocks or `DrawWindowExpired`

### Residual risks

| Risk | Severity | Detail |
|------|----------|--------|
| **prevrandao bias** | Low–Medium | Validators influence prevrandao slightly; acceptable for NFT raffles, not for high-value financial draws |
| **blockhash = 0** | Medium if ignored | If nobody finalizes within 250 blocks, draw must be re-requested (future enhancement) |
| **MEV / front-run finalize** | Low | Anyone can finalize; outcome is deterministic from seed — front-running doesn't change winners |
| **Admin trust** | Low | Admins only create raffles, not pick winners |
| **Owner centralization** | Medium | Owner controls admin list; use multisig for owner |
| **NFT flash-loan entry** | Low | Must hold at entry AND at finalize; flash loan can't span both unless they keep NFT |
| **Sell after winning** | N/A | Winner already selected; selling after is fine |

### Not exploitable (by design)
- Admin cannot pick arbitrary winners — algorithm is fixed and public
- Non-holders cannot enter
- Non-holders at draw time cannot win even if they entered earlier

---

## Comparison to Rafael

| Rafael (off-chain) | IMD Raffle (on-chain) |
|--------------------|------------------------|
| Discord OAuth | Wallet + NFT `balanceOf` |
| DB entries | On-chain entry array |
| Server random draw | `pickWinners` + stored seed |
| Role multipliers | 1 entry per wallet |
| Admin UI in app | Admin portal + on-chain admin mapping |
| FCFS / GTD modes | Timed random draw |

---

## Key Contract Addresses

- **Identity MD NFT:** `0x0000eC93127BAA929E58E97dd0095A2BFb38ec1D`
- **Raffle contract:** set after deploy → `NEXT_PUBLIC_RAFFLE_CONTRACT_ADDRESS`
