import "dotenv/config";
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const mainnetRpcUrl = process.env.MAINNET_RPC_URL;
const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.26",
    settings: {
      evmVersion: "cancun",
      optimizer: { enabled: true, runs: 1000 },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
  },
  networks: {
    hardhat: {},
    ...(mainnetRpcUrl && deployerKey
      ? {
          mainnet: {
            url: mainnetRpcUrl,
            accounts: [deployerKey],
            chainId: 1,
          },
        }
      : {}),
  },
};

export default config;
