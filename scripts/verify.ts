import fs from "node:fs";
import path from "node:path";
import hre from "hardhat";

const IDENTITY_MD = "0x0000eC93127BAA929E58E97dd0095A2BFb38ec1D";
const VRF_COORDINATOR = "0xD7f86b4b8Cae7D942340FF628F82735b7a20893a";
const MAINNET_KEY_HASH =
  "0x8077df514608a09f83e4e8d300645594e5d7234665448ba83f51a50f842bd3d9";

function loadDeployment() {
  const file = path.join(__dirname, "..", "deployments", "mainnet-latest.json");
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8")) as {
    address: string;
    owner: string;
    vrfConfig: {
      keyHash: string;
      subscriptionId: string;
      callbackGasLimit: number;
      requestConfirmations: number;
      nativePayment: boolean;
    };
  };
}

async function main() {
  if (!process.env.ETHERSCAN_API_KEY) {
    throw new Error(
      "Set ETHERSCAN_API_KEY in .env (https://etherscan.io/myapikey) then run: npm run verify:mainnet"
    );
  }

  const deployed = loadDeployment();
  const contractAddress =
    process.env.CONTRACT_ADDRESS ?? deployed?.address ?? "";

  if (!contractAddress) {
    throw new Error("Deploy first or set CONTRACT_ADDRESS in .env");
  }

  const cfg = deployed?.vrfConfig;
  const owner = deployed?.owner ?? process.env.INITIAL_OWNER ?? "";

  if (!owner || !cfg) {
    throw new Error("Missing deployment metadata — redeploy or pass full constructor args");
  }

  console.log("Verifying IdentityMDRaffle on Etherscan...");
  console.log("Contract:", contractAddress);

  await hre.run("verify:verify", {
    address: contractAddress,
    constructorArguments: [
      IDENTITY_MD,
      VRF_COORDINATOR,
      owner,
      [
        cfg.keyHash ?? MAINNET_KEY_HASH,
        BigInt(cfg.subscriptionId),
        cfg.callbackGasLimit ?? 100_000,
        cfg.requestConfirmations ?? 3,
        cfg.nativePayment ?? false,
      ],
    ],
  });

  console.log("\nVerified:");
  console.log(`https://etherscan.io/address/${contractAddress}#code`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
