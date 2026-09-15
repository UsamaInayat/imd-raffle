# IdentityMD Raffle — Contract Guide (Chainlink VRF v2.5)

## Draw flow

```
createRaffle (admin) → enter (holders, signed tx) → time ends
→ requestDraw (anyone, signed tx) → Chainlink VRF callback
→ fulfillRandomWords → filter eligible holders → pickWinners → CLOSED
```

## Randomness source

**Chainlink VRF v2.5** — not blockhash/prevrandao.

1. `requestDraw()` calls `s_vrfCoordinator.requestRandomWords(...)`
2. Chainlink oracle generates randomness + cryptographic proof
3. Coordinator calls `fulfillRandomWords(requestId, randomWords)` on your contract
4. Contract uses `randomWords[0]` as seed for `pickWinners()`

Verify on [vrf.chain.link](https://vrf.chain.link) using the stored `vrfRequestId`.

## Holder checks

| When | Check |
|------|-------|
| Entry | `balanceOf > 0` required |
| VRF callback | Re-filter entries — sold IDMD = excluded from eligible pool |

## Deployment requirements

1. Create VRF subscription at [vrf.chain.link](https://vrf.chain.link)
2. Fund subscription with LINK
3. Deploy contract with `VRF_SUBSCRIPTION_ID` env var
4. **Add deployed contract address as VRF consumer** on your subscription
5. Set `NEXT_PUBLIC_RAFFLE_CONTRACT_ADDRESS`

```bash
VRF_SUBSCRIPTION_ID=123 npx hardhat run scripts/deploy.ts --network mainnet
```

## Mainnet addresses

| Param | Value |
|-------|-------|
| VRF Coordinator | `0x9DdfaCa8183c41ad55329BdeeD8F964C1b1A9922` |
| Key hash (500 gwei) | `0x787d74caea10b2b34310dada524d09513825a66cfc896b154862ccaba080b10e` |
| Identity MD NFT | `0x0000eC93127BAA929E58E97dd0095A2BFb38ec1D` |

## Signed transactions required

| Action | Signed tx? |
|--------|------------|
| Create raffle | Yes (admin) |
| Enter raffle | **Yes (holder)** |
| Request draw | Yes (anyone) |
| VRF fulfill | No — Chainlink calls your contract |
| Add admin | Yes (owner) |

## No finalize window

Unlike the old blockhash design, there is **no 250-block deadline**. After `requestDraw()`, Chainlink delivers randomness asynchronously (typically 1–3 blocks + oracle latency). You can request a draw hours or days after the raffle ends.

## Security notes

- VRF randomness is stronger than prevrandao/blockhash
- Small LINK fee per draw from your subscription
- If subscription runs out of LINK, VRF requests fail — keep it funded
- Owner can update `vrfConfig` via `setVrfConfig()`
