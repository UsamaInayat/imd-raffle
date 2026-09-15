import { ethers } from "hardhat";

async function main() {
  const identityMD = "0x0000eC93127BAA929E58E97dd0095A2BFb38ec1D";
  const [deployer] = await ethers.getSigners();

  console.log("Deploying with:", deployer.address);

  const Raffle = await ethers.getContractFactory("IdentityMDRaffle");
  const raffle = await Raffle.deploy(identityMD, deployer.address);
  await raffle.waitForDeployment();

  const address = await raffle.getAddress();
  console.log("IdentityMDRaffle deployed to:", address);
  console.log("Identity MD NFT:", identityMD);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
