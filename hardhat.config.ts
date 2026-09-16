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
    mainnet: {
      url: mainnetRpcUrl ?? "https://ethereum.publicnode.com",
      chainId: 1,
      ...(deployerKey ? { accounts: [deployerKey] } : {}),
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};

export default config;
