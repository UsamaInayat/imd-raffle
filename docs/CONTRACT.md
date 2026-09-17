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
| VRF Coordinator | `0xD7f86b4b8Cae7D942340FF628F82735b7a20893a` |
| Key hash (200 gwei — cheapest mainnet lane) | `0x8077df514608a09f83e4e8d300645594e5d7234665448ba83f51a50f842bd3d9` |
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

## Gas & flexibility (pre-mainnet)

| Feature | Detail |
|---------|--------|
| Optimizer | 1000 runs — lower runtime gas on `enter()` / VRF callback |
| Storage packing | `endsAt` (uint64), `winnerCount` (uint32), `status` (uint8) in one slot |
| VRF callback event | Emits counts only — winners/eligible read from storage (saves callback gas) |
| `MAX_WINNERS` | 256 — prevents callback OOG from absurd winner counts |
| String limits | Title 128 chars, description 512 — prevents storage griefing |
| `cancelRaffle()` | Admin can cancel open raffles before draw (no redeploy needed for mistakes) |
| Zero eligible at draw | Closes cleanly with zero winners instead of stuck VRF state |
| `setVrfConfig()` | Owner can bump `callbackGasLimit` if entry counts grow |

### VRF callback gas vs entries

Each entry costs ~2× `balanceOf` external calls during the draw filter. Rough guidance:

| Entries | Suggested `callbackGasLimit` |
|---------|------------------------------|
| ≤ 200 | 500,000 (default) |
| 200–500 | 750,000–1,000,000 |
| 500+ | Increase via `setVrfConfig()` and test on a fork |

No hard on-chain entry cap — tune gas limit instead so large community raffles stay supported.
