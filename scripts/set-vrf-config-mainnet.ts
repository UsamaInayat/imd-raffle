import { ethers } from "hardhat";

/**
 * Cheapest practical VRF settings for Ethereum mainnet (100–200 entry raffles).
 *
 *   npx hardhat run scripts/set-vrf-config-mainnet.ts --network mainnet
 */
const CONTRACT = "0x92492C34041263a2c9aE102D5ED8472F6Fb35c25";

/** Lowest-cost lane on Ethereum mainnet VRF v2.5 */
const KEY_HASH_200GWEI =
  "0x8077df514608a09f83e4e8d300645594e5d7234665448ba83f51a50f842bd3d9";

const SUBSCRIPTION_ID =
  47584038332363573085755144741082866832892333353694184881311523362285687766175n;

/** Enough for ~200 entries (balanceOf filter + pickWinners). See docs/CONTRACT.md */
const CALLBACK_GAS_LIMIT = 500_000;

const raffleAbi = [
  "function owner() view returns (address)",
  "function vrfConfig() view returns (bytes32 keyHash, uint256 subscriptionId, uint32 callbackGasLimit, uint16 requestConfirmations, bool nativePayment)",
  "function setVrfConfig((bytes32,uint256,uint32,uint16,bool) config)",
];

async function main() {
  const [signer] = await ethers.getSigners();
  const raffle = await ethers.getContractAt(raffleAbi, CONTRACT);

  const owner = await raffle.owner();
  if (owner.toLowerCase() !== signer.address.toLowerCase()) {
    throw new Error(`Signer ${signer.address} is not contract owner (${owner})`);
  }

  const before = await raffle.vrfConfig();
  console.log("Before:", {
    keyHash: before.keyHash,
    callbackGasLimit: before.callbackGasLimit.toString(),
  });

  const tx = await raffle.setVrfConfig([
    KEY_HASH_200GWEI,
    SUBSCRIPTION_ID,
    CALLBACK_GAS_LIMIT,
    3,
    false,
  ]);
  console.log("setVrfConfig tx:", tx.hash);
  await tx.wait();

  const after = await raffle.vrfConfig();
  console.log("After:", {
    keyHash: after.keyHash,
    callbackGasLimit: after.callbackGasLimit.toString(),
  });
  console.log("\n200 gwei is the cheapest mainnet VRF lane — not a high gas price.");
  console.log("Fund subscription with ~5–10 LINK before the next requestDraw.");
  console.log("Note: the current pending VRF request still uses the old 500 gwei settings until it fails or you fund ~80 LINK.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
