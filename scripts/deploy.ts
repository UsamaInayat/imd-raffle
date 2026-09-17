import { ethers } from "hardhat";
import fs from "node:fs";
import path from "node:path";

const MAINNET_VRF_COORDINATOR = "0xD7f86b4b8Cae7D942340FF628F82735b7a20893a";
const MAINNET_KEY_HASH =
  "0x8077df514608a09f83e4e8d300645594e5d7234665448ba83f51a50f842bd3d9";

const VRF_COORDINATOR_ABI = [
  "function addConsumer(uint256 subId, address consumer) external",
  "function getSubscription(uint256 subId) external view returns (uint96 balance, uint96 nativeBalance, uint64 reqCount, address subOwner, address[] memory consumers)",
];

async function main() {
  const identityMD = "0x0000eC93127BAA929E58E97dd0095A2BFb38ec1D";
  const [deployer] = await ethers.getSigners();

  const vrfCoordinator =
    process.env.VRF_COORDINATOR_ADDRESS ?? MAINNET_VRF_COORDINATOR;
  const subscriptionId = BigInt(process.env.VRF_SUBSCRIPTION_ID ?? "0");
  const keyHash = process.env.VRF_KEY_HASH ?? MAINNET_KEY_HASH;
  const callbackGasLimit = Number(process.env.VRF_CALLBACK_GAS_LIMIT ?? "100000");
  const requestConfirmations = Number(process.env.VRF_REQUEST_CONFIRMATIONS ?? "3");
  const nativePayment = process.env.VRF_NATIVE_PAYMENT === "true";

  if (subscriptionId === 0n) {
    throw new Error("Set VRF_SUBSCRIPTION_ID before deploying to mainnet");
  }

  const vrfConfig = {
    keyHash,
    subscriptionId,
    callbackGasLimit,
    requestConfirmations,
    nativePayment,
  };

  console.log("Deploying with:", deployer.address);
  console.log("VRF Coordinator:", vrfCoordinator);
  console.log("VRF Subscription ID:", subscriptionId.toString());
  console.log("Callback gas limit:", callbackGasLimit);

  const Raffle = await ethers.getContractFactory("IdentityMDRaffle");
  const raffle = await Raffle.deploy(
    identityMD,
    vrfCoordinator,
    deployer.address,
    vrfConfig
  );
  await raffle.waitForDeployment();

  const address = await raffle.getAddress();
  console.log("\nIdentityMDRaffle deployed to:", address);

  const coordinator = new ethers.Contract(
    vrfCoordinator,
    VRF_COORDINATOR_ABI,
    deployer
  );

  try {
    const sub = await coordinator.getSubscription(subscriptionId);
    const consumers: string[] = sub.consumers ?? sub[4] ?? [];
    const alreadyConsumer = consumers.some(
      (c: string) => c.toLowerCase() === address.toLowerCase()
    );

    if (alreadyConsumer) {
      console.log("Already registered as VRF consumer.");
    } else if (sub.subOwner?.toLowerCase() === deployer.address.toLowerCase() ||
      sub[3]?.toLowerCase() === deployer.address.toLowerCase()) {
      const tx = await coordinator.addConsumer(subscriptionId, address);
      console.log("addConsumer tx:", tx.hash);
      await tx.wait();
      console.log("Registered as VRF consumer.");
    } else {
      console.log("\n⚠ Add", address, "as VRF consumer at https://vrf.chain.link");
    }
  } catch (err) {
    console.log("\n⚠ Could not auto-register VRF consumer:", err);
    console.log("Add", address, "manually at https://vrf.chain.link");
  }

  const deploymentInfo = {
    address,
    identityMD,
    vrfCoordinator,
    owner: deployer.address,
    vrfConfig: {
      keyHash,
      subscriptionId: subscriptionId.toString(),
      callbackGasLimit,
      requestConfirmations,
      nativePayment,
    },
    deployedAt: new Date().toISOString(),
  };

  const outPath = path.join(__dirname, "..", "deployments", "mainnet-latest.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("\nWrote deployment info to", outPath);

  const webEnvPath = path.join(__dirname, "..", "web", ".env.local");
  if (fs.existsSync(webEnvPath)) {
    let env = fs.readFileSync(webEnvPath, "utf8");
    if (/NEXT_PUBLIC_RAFFLE_CONTRACT_ADDRESS=/.test(env)) {
      env = env.replace(
        /NEXT_PUBLIC_RAFFLE_CONTRACT_ADDRESS=.*/,
        `NEXT_PUBLIC_RAFFLE_CONTRACT_ADDRESS=${address}`
      );
    } else {
      env += `\nNEXT_PUBLIC_RAFFLE_CONTRACT_ADDRESS=${address}\n`;
    }
    fs.writeFileSync(webEnvPath, env);
    console.log("Updated web/.env.local with new contract address.");
  }

  console.log("\nNext steps:");
  console.log("1. Fund VRF subscription with ~5 LINK if needed");
  console.log("2. Set NEXT_PUBLIC_RAFFLE_CONTRACT_ADDRESS=" + address, "on Railway");
  console.log("3. Run: npm run verify:mainnet");

  if (process.env.ETHERSCAN_API_KEY) {
    console.log("\nVerifying on Etherscan...");
    const hre = await import("hardhat");
    await hre.default.run("verify:verify", {
      address,
      constructorArguments: [
        identityMD,
        vrfCoordinator,
        deployer.address,
        [
          keyHash,
          subscriptionId,
          callbackGasLimit,
          requestConfirmations,
          nativePayment,
        ],
      ],
    });
    console.log(`Verified: https://etherscan.io/address/${address}#code`);
  } else {
    console.log("\nSet ETHERSCAN_API_KEY in .env to auto-verify after deploy.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
