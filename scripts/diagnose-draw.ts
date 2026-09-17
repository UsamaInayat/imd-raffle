import { ethers } from "hardhat";

const CONTRACT = "0x92492C34041263a2c9aE102D5ED8472F6Fb35c25";
const VRF_COORDINATOR = "0x9DDfAca8183c41AD55329BdEed8F964C1b1A9922";

const raffleAbi = [
  "function getRaffle(uint256) view returns (string title, string description, uint256 winnerCount, uint256 endsAt, uint8 status, uint256 vrfRequestId, uint256 randomSeed, address[] winners)",
  "function getEntryCount(uint256) view returns (uint256)",
  "function vrfConfig() view returns (bytes32 keyHash, uint256 subscriptionId, uint32 callbackGasLimit, uint16 requestConfirmations, bool nativePayment)",
  "function requestDraw(uint256 raffleId)",
];

const coordinatorAbi = [
  "function getSubscription(uint256 subId) view returns (uint96 balance, uint96 nativeBalance, uint64 reqCount, address owner, address[] memory consumers)",
];

async function main() {
  const coordinatorAddress = ethers.getAddress(
    "0x9ddfac8183c41ad55329bdeed8f964c1b1a9922"
  );
  const raffle = await ethers.getContractAt(raffleAbi, CONTRACT);
  const coordinator = await ethers.getContractAt(coordinatorAbi, coordinatorAddress);

  const raffleId = 0n;
  const [title, , winnerCount, endsAt, status, vrfRequestId] = await raffle.getRaffle(raffleId);
  const entryCount = await raffle.getEntryCount(raffleId);
  const cfg = await raffle.vrfConfig();
  const now = BigInt(Math.floor(Date.now() / 1000));

  console.log("=== Raffle #0 ===");
  console.log("title:", title);
  console.log("status:", status, "(0=Open, 1=DrawRequested, 2=Closed, 3=Cancelled)");
  console.log("endsAt:", endsAt.toString(), now >= endsAt ? "(ended)" : "(still open)");
  console.log("entries:", entryCount.toString());
  console.log("winnerCount:", winnerCount.toString());
  console.log("vrfRequestId:", vrfRequestId.toString());

  console.log("\n=== VRF config on contract ===");
  console.log("subscriptionId:", cfg.subscriptionId.toString());
  console.log("keyHash:", cfg.keyHash);
  console.log("callbackGasLimit:", cfg.callbackGasLimit);
  console.log("nativePayment:", cfg.nativePayment);

  try {
    const sub = await coordinator.getSubscription(cfg.subscriptionId);
    console.log("\n=== Chainlink subscription ===");
    console.log("LINK balance (juels):", sub.balance.toString());
    console.log("native balance (wei):", sub.nativeBalance.toString());
    console.log("request count:", sub.reqCount.toString());
    console.log("owner:", sub.owner);
    console.log("consumers:", sub.consumers);
    const isConsumer = sub.consumers.some(
      (c: string) => c.toLowerCase() === CONTRACT.toLowerCase()
    );
    console.log("contract is consumer:", isConsumer);
  } catch (err) {
    console.error("\nFailed to read subscription:", err);
  }

  console.log("\n=== Simulating requestDraw(0) ===");
  try {
    await raffle.requestDraw.staticCall(0);
    console.log("staticCall: SUCCESS");
  } catch (err: unknown) {
    console.error("staticCall: REVERT");
    console.error(err);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
