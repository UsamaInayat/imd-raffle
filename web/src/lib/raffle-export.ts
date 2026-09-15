import {
  RAFFLE_ABI,
  RAFFLE_CONTRACT_ADDRESS,
  RaffleStatus,
  formatStatus,
} from "@/lib/constants";
import { publicClient } from "@/lib/viem-client";

export type RaffleExportRow = {
  raffleId: number;
  title: string;
  description: string;
  status: RaffleStatus;
  winnerCount: bigint;
  entryCount: number;
  eligibleCount: number;
  endsAt: bigint;
  vrfRequestId: bigint;
  randomSeed: bigint;
  winners: readonly `0x${string}`[];
  entries: readonly `0x${string}`[];
  eligible: readonly `0x${string}`[];
  verificationValid: boolean | null;
};

export type WinnerCsvRow = {
  raffleId: number;
  raffleTitle: string;
  winnerRank: number;
  walletAddress: string;
  endsAtUnix: string;
  entryCount: number;
  eligibleCount: number;
  vrfRequestId: string;
  randomSeed: string;
  verificationValid: string;
};

function csvEscape(value: string): string {
  // Neutralize spreadsheet formula injection (=, +, -, @, tab).
  const safe =
    /^[=+\-@\t\r]/.test(value) || /^[+\-@]/.test(value) ? `'${value}` : value;
  if (/[",\n\r]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

function rowsToCsv(headers: string[], rows: string[][]): string {
  const lines = [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => row.map(csvEscape).join(",")),
  ];
  return lines.join("\r\n");
}

export function buildWinnersCsv(rows: WinnerCsvRow[]): string {
  return rowsToCsv(
    [
      "raffle_id",
      "raffle_title",
      "winner_rank",
      "wallet_address",
      "ends_at_unix",
      "entry_count",
      "eligible_count",
      "vrf_request_id",
      "random_seed",
      "verification_valid",
      "exported_at_unix",
    ],
    rows.map((row) => [
      String(row.raffleId),
      row.raffleTitle,
      String(row.winnerRank),
      row.walletAddress,
      row.endsAtUnix,
      String(row.entryCount),
      String(row.eligibleCount),
      row.vrfRequestId,
      row.randomSeed,
      row.verificationValid,
      String(Math.floor(Date.now() / 1000)),
    ])
  );
}

export function buildFullReportCsv(data: RaffleExportRow): string {
  const metaHeaders = ["field", "value"];
  const metaRows: string[][] = [
    ["raffle_id", String(data.raffleId)],
    ["title", data.title],
    ["description", data.description],
    ["status", formatStatus(data.status)],
    ["winner_count", data.winnerCount.toString()],
    ["entry_count", String(data.entryCount)],
    ["eligible_count", String(data.eligibleCount)],
    ["ends_at_unix", data.endsAt.toString()],
    ["vrf_request_id", data.vrfRequestId.toString()],
    ["random_seed", data.randomSeed.toString()],
    ["verification_valid", data.verificationValid === null ? "n/a" : String(data.verificationValid)],
    ["exported_at_unix", String(Math.floor(Date.now() / 1000))],
  ];

  const winnerSet = new Set(data.winners.map((w) => w.toLowerCase()));
  const eligibleSet = new Set(data.eligible.map((w) => w.toLowerCase()));

  const participantHeaders = [
    "wallet_address",
    "entered",
    "eligible_at_draw",
    "won",
    "winner_rank",
  ];

  const participantRows = data.entries.map((wallet) => {
    const lower = wallet.toLowerCase();
    const won = winnerSet.has(lower);
    const rank = won
      ? data.winners.findIndex((w) => w.toLowerCase() === lower) + 1
      : 0;
    return [
      wallet,
      "true",
      eligibleSet.has(lower) ? "true" : "false",
      won ? "true" : "false",
      won ? String(rank) : "",
    ];
  });

  return [
    "# RAFFLE METADATA",
    rowsToCsv(metaHeaders, metaRows),
    "",
    "# WINNERS",
    rowsToCsv(
      ["winner_rank", "wallet_address"],
      data.winners.map((wallet, i) => [String(i + 1), wallet])
    ),
    "",
    "# ALL ENTRIES",
    rowsToCsv(participantHeaders, participantRows),
    "",
    "# ELIGIBLE AT DRAW",
    rowsToCsv(
      ["wallet_address"],
      data.eligible.map((wallet) => [wallet])
    ),
  ].join("\r\n");
}

export function winnerRowsFromExport(data: RaffleExportRow): WinnerCsvRow[] {
  const verification = data.verificationValid === null ? "n/a" : String(data.verificationValid);
  return data.winners.map((wallet, index) => ({
    raffleId: data.raffleId,
    raffleTitle: data.title,
    winnerRank: index + 1,
    walletAddress: wallet,
    endsAtUnix: data.endsAt.toString(),
    entryCount: data.entryCount,
    eligibleCount: data.eligibleCount,
    vrfRequestId: data.vrfRequestId.toString(),
    randomSeed: data.randomSeed.toString(),
    verificationValid: verification,
  }));
}

export async function fetchRaffleExportData(raffleId: number): Promise<RaffleExportRow> {
  const [raffle, entries, eligible] = await Promise.all([
    publicClient.readContract({
      address: RAFFLE_CONTRACT_ADDRESS,
      abi: RAFFLE_ABI,
      functionName: "getRaffle",
      args: [BigInt(raffleId)],
    }),
    publicClient.readContract({
      address: RAFFLE_CONTRACT_ADDRESS,
      abi: RAFFLE_ABI,
      functionName: "getEntries",
      args: [BigInt(raffleId)],
    }),
    publicClient.readContract({
      address: RAFFLE_CONTRACT_ADDRESS,
      abi: RAFFLE_ABI,
      functionName: "getEligibleEntriesAtDraw",
      args: [BigInt(raffleId)],
    }),
  ]);

  const [
    title,
    description,
    winnerCount,
    endsAt,
    status,
    vrfRequestId,
    randomSeed,
    winners,
  ] = raffle;

  let verificationValid: boolean | null = null;
  if (status === RaffleStatus.Closed) {
    const [valid] = await publicClient.readContract({
      address: RAFFLE_CONTRACT_ADDRESS,
      abi: RAFFLE_ABI,
      functionName: "verifyWinners",
      args: [BigInt(raffleId)],
    });
    verificationValid = valid;
  }

  return {
    raffleId,
    title,
    description,
    status: status as RaffleStatus,
    winnerCount,
    entryCount: entries.length,
    eligibleCount: eligible.length,
    endsAt,
    vrfRequestId,
    randomSeed,
    winners,
    entries,
    eligible,
    verificationValid,
  };
}

export async function fetchAllClosedRaffleExports(): Promise<RaffleExportRow[]> {
  const count = await publicClient.readContract({
    address: RAFFLE_CONTRACT_ADDRESS,
    abi: RAFFLE_ABI,
    functionName: "getRaffleCount",
  });

  const exports: RaffleExportRow[] = [];
  for (let id = 0; id < Number(count); id++) {
    const data = await fetchRaffleExportData(id);
    if (data.status === RaffleStatus.Closed && data.winners.length > 0) {
      exports.push(data);
    }
  }
  return exports.reverse();
}

export function downloadTextFile(filename: string, content: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "raffle";
}

export async function exportRaffleWinnersCsv(raffleId: number, title: string) {
  const data = await fetchRaffleExportData(raffleId);
  if (data.status !== RaffleStatus.Closed || data.winners.length === 0) {
    throw new Error("Raffle is not closed or has no winners yet");
  }
  const csv = buildWinnersCsv(winnerRowsFromExport(data));
  const slug = slugifyTitle(title);
  downloadTextFile(`imd-raffle-${raffleId}-${slug}-winners.csv`, csv);
}

export async function exportRaffleFullReportCsv(raffleId: number, title: string) {
  const data = await fetchRaffleExportData(raffleId);
  if (data.status !== RaffleStatus.Closed) {
    throw new Error("Full report requires a closed raffle");
  }
  const csv = buildFullReportCsv(data);
  const slug = slugifyTitle(title);
  downloadTextFile(`imd-raffle-${raffleId}-${slug}-full-report.csv`, csv);
}

export async function exportAllWinnersCsv() {
  const all = await fetchAllClosedRaffleExports();
  if (all.length === 0) {
    throw new Error("No closed raffles with winners to export");
  }
  const rows = all.flatMap(winnerRowsFromExport);
  const csv = buildWinnersCsv(rows);
  downloadTextFile(`imd-raffle-all-winners-${Date.now()}.csv`, csv);
}
