import fs from "node:fs";
import path from "node:path";
import { AbiCoder } from "ethers";

const CONTRACT_ADDRESS = "0x92492C34041263a2c9aE102D5ED8472F6Fb35c25";
const CONTRACT_NAME = "IdentityMDRaffle.sol:IdentityMDRaffle";

const IDENTITY_MD = "0x0000eC93127BAA929E58E97dd0095A2BFb38ec1D";
const VRF_COORDINATOR = "0x9DDfAca8183c41AD55329BdEed8F964c1b1A9922";
const INITIAL_OWNER = "0xDDb9AB1421E6F1d864c01BA63FB05B183d5ea4d4";
const VRF_KEY_HASH =
  "0x787d74caea10b2b34310dada524d09513825a66cfc896b154862ccaba080b10e";
const VRF_SUBSCRIPTION_ID =
  47584038332363573085755144741082866832892333353694184881311523362285687766175n;

function latestBuildInfoPath(): string {
  const dir = path.join(__dirname, "../artifacts/build-info");
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({
      file: path.join(dir, f),
      mtime: fs.statSync(path.join(dir, f)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime);

  if (files.length === 0) {
    throw new Error("No build-info found. Run: npm run compile");
  }

  return files[0].file;
}

function main() {
  const buildInfoPath = latestBuildInfoPath();
  const buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, "utf8")) as {
    solcLongVersion: string;
    input: unknown;
  };

  const outDir = path.join(__dirname, "../artifacts/etherscan");
  fs.mkdirSync(outDir, { recursive: true });

  const standardInputPath = path.join(outDir, "standard-input.json");
  fs.writeFileSync(standardInputPath, JSON.stringify(buildInfo.input, null, 2));

  const encodedConstructorArgs = AbiCoder.defaultAbiCoder().encode(
    [
      "address",
      "address",
      "address",
      "tuple(bytes32,uint256,uint32,uint16,bool)",
    ],
    [
      IDENTITY_MD,
      VRF_COORDINATOR,
      INITIAL_OWNER,
      [VRF_KEY_HASH, VRF_SUBSCRIPTION_ID, 500_000, 3, false],
    ],
  );

  const constructorArgsPath = path.join(outDir, "constructor-args.txt");
  fs.writeFileSync(constructorArgsPath, encodedConstructorArgs.slice(2));

  console.log("Etherscan manual verification\n");
  console.log("Contract address:", CONTRACT_ADDRESS);
  console.log("Compiler type: Solidity (Standard-Json-Input)");
  console.log("Compiler version: v" + buildInfo.solcLongVersion);
  console.log("License: MIT (3)");
  console.log("Contract name:", CONTRACT_NAME);
  console.log("\nUpload this file on step 2:");
  console.log(" ", standardInputPath);
  console.log("\nConstructor arguments (ABI-encoded, no 0x):");
  console.log(encodedConstructorArgs.slice(2));
  console.log("\nSaved constructor args to:", constructorArgsPath);
  console.log("\nVerify page:");
  console.log(`https://etherscan.io/verifyContract?a=${CONTRACT_ADDRESS}`);
}

main();
