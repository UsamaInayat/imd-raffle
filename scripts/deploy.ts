import { ethers } from "hardhat";

// Ethereum mainnet Chainlink VRF v2.5 — https://docs.chain.link/vrf/v2-5/supported-networks
const MAINNET_VRF_COORDINATOR = "0x9DdfaCa8183c41ad55329BdeeD8F964C1b1A9922";
const MAINNET_KEY_HASH =
  "0x787d74caea10b2b34310dada524d09513825a66cfc896b154862ccaba080b10e";

async function main() {
  const identityMD = "0x0000eC93127BAA929E58E97dd0095A2BFb38ec1D";
  const [deployer] = await ethers.getSigners();

  const vrfCoordinator =
    process.env.VRF_COORDINATOR_ADDRESS ?? MAINNET_VRF_COORDINATOR;
  const subscriptionId = BigInt(process.env.VRF_SUBSCRIPTION_ID ?? "0");
  const keyHash = process.env.VRF_KEY_HASH ?? MAINNET_KEY_HASH;
  const callbackGasLimit = Number(process.env.VRF_CALLBACK_GAS_LIMIT ?? "500000");
  const requestConfirmations = Number(process.env.VRF_REQUEST_CONFIRMATIONS ?? "3");
  const nativePayment = process.env.VRF_NATIVE_PAYMENT === "true";

  if (subscriptionId === 0n) {
    throw new Error("Set VRF_SUBSCRIPTION_ID before deploying to mainnet");
  }

  console.log("Deploying with:", deployer.address);
  console.log("VRF Coordinator:", vrfCoordinator);
  console.log("VRF Subscription ID:", subscriptionId.toString());

  const Raffle = await ethers.getContractFactory("IdentityMDRaffle");
  const raffle = await Raffle.deploy(identityMD, vrfCoordinator, deployer.address, {
    keyHash,
    subscriptionId,
    callbackGasLimit,
    requestConfirmations,
    nativePayment,
  });
  await raffle.waitForDeployment();

  const address = await raffle.getAddress();
  console.log("IdentityMDRaffle deployed to:", address);
  console.log("\nNext steps:");
  console.log("1. Add", address, "as a VRF consumer at https://vrf.chain.link");
  console.log("2. Fund your subscription with LINK");
  console.log("3. Set NEXT_PUBLIC_RAFFLE_CONTRACT_ADDRESS=" + address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
