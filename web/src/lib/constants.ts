export const IDENTITY_MD_ADDRESS =
  "0x0000eC93127BAA929E58E97dd0095A2BFb38ec1D" as const;

export const IDENTITY_MD_OPENSEA =
  "https://opensea.io/collection/identitymd" as const;

export const RAFFLE_CONTRACT_ADDRESS = (process.env
  .NEXT_PUBLIC_RAFFLE_CONTRACT_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

export const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";

export const CHAIN_ID = 1;

export const RAFFLE_ABI = [
  { type: "function", name: "getRaffleCount", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  {
    type: "function",
    name: "getRaffle",
    inputs: [{ name: "raffleId", type: "uint256" }],
    outputs: [
      { name: "title", type: "string" },
      { name: "description", type: "string" },
      { name: "winnerCount", type: "uint256" },
      { name: "endsAt", type: "uint256" },
      { name: "status", type: "uint8" },
      { name: "drawRequestedAt", type: "uint256" },
      { name: "randomSeed", type: "uint256" },
      { name: "winners", type: "address[]" },
    ],
    stateMutability: "view",
  },
  { type: "function", name: "getEntries", inputs: [{ name: "raffleId", type: "uint256" }], outputs: [{ type: "address[]" }], stateMutability: "view" },
  { type: "function", name: "getEligibleEntriesAtDraw", inputs: [{ name: "raffleId", type: "uint256" }], outputs: [{ type: "address[]" }], stateMutability: "view" },
  { type: "function", name: "previewEligibleEntries", inputs: [{ name: "raffleId", type: "uint256" }], outputs: [{ type: "address[]" }], stateMutability: "view" },
  { type: "function", name: "getEntryCount", inputs: [{ name: "raffleId", type: "uint256" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "hasEntered", inputs: [{ name: "raffleId", type: "uint256" }, { name: "participant", type: "address" }], outputs: [{ type: "bool" }], stateMutability: "view" },
  { type: "function", name: "isIdentityMDHolder", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "bool" }], stateMutability: "view" },
  { type: "function", name: "isAdmin", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "bool" }], stateMutability: "view" },
  { type: "function", name: "owner", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
  { type: "function", name: "enter", inputs: [{ name: "raffleId", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "requestDraw", inputs: [{ name: "raffleId", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "finalizeDraw", inputs: [{ name: "raffleId", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "verifyWinners", inputs: [{ name: "raffleId", type: "uint256" }], outputs: [{ type: "bool" }, { type: "address[]" }, { type: "address[]" }], stateMutability: "view" },
  { type: "function", name: "pickWinners", inputs: [{ name: "seed", type: "uint256" }, { name: "entries", type: "address[]" }, { name: "winnerCount", type: "uint256" }], outputs: [{ type: "address[]" }], stateMutability: "pure" },
  { type: "function", name: "createRaffle", inputs: [{ name: "title", type: "string" }, { name: "description", type: "string" }, { name: "winnerCount", type: "uint256" }, { name: "endsAt", type: "uint256" }], outputs: [{ type: "uint256" }], stateMutability: "nonpayable" },
  { type: "function", name: "addAdmin", inputs: [{ name: "account", type: "address" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "removeAdmin", inputs: [{ name: "account", type: "address" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "DRAW_DELAY_BLOCKS", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "DRAW_FINALIZE_WINDOW", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
] as const;

export const ERC721_ABI = [
  { type: "function", name: "balanceOf", inputs: [{ name: "owner", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
] as const;

export enum RaffleStatus {
  Open = 0,
  DrawRequested = 1,
  Closed = 2,
}

export function formatStatus(status: RaffleStatus): string {
  switch (status) {
    case RaffleStatus.Open: return "OPEN";
    case RaffleStatus.DrawRequested: return "DRAW REQUESTED";
    case RaffleStatus.Closed: return "CLOSED";
    default: return "UNKNOWN";
  }
}

export function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function formatEthCountdown(endsAt: bigint, nowSec: number): string {
  const diff = Number(endsAt) - nowSec;
  if (diff <= 0) return "ENDED";
  const hours = Math.floor(diff / 3600);
  const mins = Math.floor((diff % 3600) / 60);
  const secs = diff % 60;
  if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  return `${hours}h ${mins}m ${secs}s`;
}

export function isConfiguredContract(): boolean {
  return Boolean(RAFFLE_CONTRACT_ADDRESS && !RAFFLE_CONTRACT_ADDRESS.endsWith("0000"));
}
