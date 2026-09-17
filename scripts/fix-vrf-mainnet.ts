import { ethers } from "hardhat";

/**
 * One-time fix for mainnet deployment that used a non-existent VRF coordinator.
 *
 * Requires DEPLOYER_PRIVATE_KEY (contract owner) in .env
 *
 *   npx hardhat run scripts/fix-vrf-mainnet.ts --network mainnet
 */
const CONTRACT = "0x92492C34041263a2c9aE102D5ED8472F6Fb35c25";

/** Current Ethereum mainnet VRF v2.5 coordinator — https://docs.chain.link/vrf/v2-5/supported-networks */
const MAINNET_VRF_COORDINATOR = "0xD7f86b4b8Cae7D942340FF628F82735b7a20893a";

/** Cheapest lane on Ethereum mainnet VRF v2.5 (200 gwei ceiling, not tx gas price) */
const MAINNET_KEY_HASH_200GWEI =
  "0x8077df514608a09f83e4e8d300645594e5d7234665448ba83f51a50f842bd3d9";

const CALLBACK_GAS_LIMIT = 500_000;

const SUBSCRIPTION_ID =
  47584038332363573085755144741082866832892333353694184881311523362285687766175n;

const raffleAbi = [
  "function owner() view returns (address)",
  "function s_vrfCoordinator() view returns (address)",
  "function vrfConfig() view returns (bytes32 keyHash, uint256 subscriptionId, uint32 callbackGasLimit, uint16 requestConfirmations, bool nativePayment)",
  "function setCoordinator(address coordinator)",
  "function setVrfConfig((bytes32,uint256,uint32,uint16,bool) config)",
  "function requestDraw(uint256 raffleId)",
];

async function main() {
  const [signer] = await ethers.getSigners();
  const raffle = await ethers.getContractAt(raffleAbi, CONTRACT);

  const owner = await raffle.owner();
  if (owner.toLowerCase() !== signer.address.toLowerCase()) {
    throw new Error(`Signer ${signer.address} is not contract owner (${owner})`);
  }

  const currentCoordinator = await raffle.s_vrfCoordinator();
  console.log("Current coordinator:", currentCoordinator);
  console.log("Target coordinator:", MAINNET_VRF_COORDINATOR);

  if (currentCoordinator.toLowerCase() !== MAINNET_VRF_COORDINATOR.toLowerCase()) {
    console.log("\nSending setCoordinator…");
    const tx1 = await raffle.setCoordinator(MAINNET_VRF_COORDINATOR);
    console.log("tx:", tx1.hash);
    await tx1.wait();
    console.log("setCoordinator confirmed");
  } else {
    console.log("Coordinator already correct");
  }

  const cfg = await raffle.vrfConfig();
  const needsConfig =
    cfg.keyHash !== MAINNET_KEY_HASH_200GWEI ||
    cfg.subscriptionId !== SUBSCRIPTION_ID ||
    cfg.callbackGasLimit !== BigInt(CALLBACK_GAS_LIMIT) ||
    cfg.requestConfirmations !== 3n;

  if (needsConfig) {
    console.log("\nSending setVrfConfig…");
    const tx2 = await raffle.setVrfConfig([
      MAINNET_KEY_HASH_200GWEI,
      SUBSCRIPTION_ID,
      CALLBACK_GAS_LIMIT,
      3,
      false,
    ]);
    console.log("tx:", tx2.hash);
    await tx2.wait();
    console.log("setVrfConfig confirmed");
  } else {
    console.log("VRF config already correct");
  }

  console.log("\nSimulating requestDraw(0)…");
  await raffle.requestDraw.staticCall(0);
  console.log("Simulation OK — you can request the draw from the UI now.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
