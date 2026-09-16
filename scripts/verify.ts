import hre from "hardhat";

/** Mainnet deployment — https://etherscan.io/address/0x92492C34041263a2c9aE102D5ED8472F6Fb35c25 */
const CONTRACT_ADDRESS = "0x92492C34041263a2c9aE102D5ED8472F6Fb35c25";

const IDENTITY_MD = "0x0000eC93127BAA929E58E97dd0095A2BFb38ec1D";
const VRF_COORDINATOR = "0x9DDfAca8183c41AD55329BdEed8F964c1b1A9922";
const INITIAL_OWNER = "0xDDb9AB1421E6F1d864c01BA63FB05B183d5ea4d4";

const VRF_KEY_HASH =
  "0x787d74caea10b2b34310dada524d09513825a66cfc896b154862ccaba080b10e";
const VRF_SUBSCRIPTION_ID =
  47584038332363573085755144741082866832892333353694184881311523362285687766175n;

async function main() {
  if (!process.env.ETHERSCAN_API_KEY) {
    throw new Error(
      "Set ETHERSCAN_API_KEY in .env (https://etherscan.io/myapikey) then run: npm run verify:mainnet",
    );
  }

  console.log("Verifying IdentityMDRaffle on Etherscan...");
  console.log("Contract:", CONTRACT_ADDRESS);

  await hre.run("verify:verify", {
    address: CONTRACT_ADDRESS,
    constructorArguments: [
      IDENTITY_MD,
      VRF_COORDINATOR,
      INITIAL_OWNER,
      [
        VRF_KEY_HASH,
        VRF_SUBSCRIPTION_ID,
        500_000,
        3,
        false,
      ],
    ],
  });

  console.log("\nVerified:");
  console.log(`https://etherscan.io/address/${CONTRACT_ADDRESS}#code`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
