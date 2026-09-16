"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { RaffleCarousel } from "@/components/raffle-carousel";
import {
  useContractRead,
  useContractWrite,
  useWalletAddress,
} from "@/hooks/use-chain";
import {
  formatEthCountdown,
  formatStatus,
  RAFFLE_ABI,
  RAFFLE_CONTRACT_ADDRESS,
  RaffleStatus,
  shortAddress,
} from "@/lib/constants";
import { publicClient } from "@/lib/viem-client";

export type RaffleData = {
  id: number;
  title: string;
  description: string;
  winnerCount: bigint;
  endsAt: bigint;
  status: RaffleStatus;
  vrfRequestId: bigint;
  randomSeed: bigint;
  winners: readonly `0x${string}`[];
  entryCount: bigint;
};

function progressBar(filled: number, total = 40): string {
  const pct = total === 0 ? 0 : Math.min(1, filled / total);
  const count = Math.round(pct * total);
  return `[${"·".repeat(count)}${" ".repeat(Math.max(0, total - count))}]`;
}

function useRaffleActions(raffleId: number) {
  const { write, isPending, txHash, error } = useContractWrite();

  return {
    enter: () => write({ abi: RAFFLE_ABI, functionName: "enter", args: [BigInt(raffleId)] }),
    requestDraw: () =>
      write({ abi: RAFFLE_ABI, functionName: "requestDraw", args: [BigInt(raffleId)] }),
    isPending,
    txHash,
    error,
  };
}

async function fetchAllRaffles(count: number): Promise<RaffleData[]> {
  const loaded: RaffleData[] = [];

  for (let id = 0; id < count; id++) {
    const [raffle, entryCount] = await Promise.all([
      publicClient.readContract({
        address: RAFFLE_CONTRACT_ADDRESS,
        abi: RAFFLE_ABI,
        functionName: "getRaffle",
        args: [BigInt(id)],
      }),
      publicClient.readContract({
        address: RAFFLE_CONTRACT_ADDRESS,
        abi: RAFFLE_ABI,
        functionName: "getEntryCount",
        args: [BigInt(id)],
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

    loaded.push({
      id,
      title,
      description,
      winnerCount,
      endsAt,
      status: status as RaffleStatus,
      vrfRequestId,
      randomSeed,
      winners,
      entryCount: entryCount as bigint,
    });
  }

  return loaded.reverse();
}

export function useAllRaffles() {
  const { data: raffleCount } = useContractRead<bigint>({
    abi: RAFFLE_ABI,
    functionName: "getRaffleCount",
    refetchInterval: 15000,
  });

  const count = raffleCount !== undefined ? Number(raffleCount) : undefined;

  const query = useQuery({
    queryKey: ["all-raffles", RAFFLE_CONTRACT_ADDRESS, count ?? "pending"],
    queryFn: async () => {
      if (count === 0) return [] as RaffleData[];
      return fetchAllRaffles(count ?? 0);
    },
    enabled:
      count !== undefined && !RAFFLE_CONTRACT_ADDRESS.endsWith("0000"),
    staleTime: 10_000,
    refetchInterval: 15_000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  return {
    raffles: query.data ?? [],
    isLoading: query.isPending,
    total: count ?? 0,
    refetch: query.refetch,
  };
}

export function useRaffleStats() {
  const { raffles, total } = useAllRaffles();

  return useMemo(() => {
    let active = 0;
    let closed = 0;
    let entries = 0;

    for (const raffle of raffles) {
      if (raffle.status === RaffleStatus.Open) active++;
      if (raffle.status === RaffleStatus.Closed) closed++;
      entries += Number(raffle.entryCount);
    }

    return {
      total,
      active,
      closed,
      entries,
      activePct: total ? (active / total) * 100 : 0,
      closedPct: total ? (closed / total) * 100 : 0,
    };
  }, [raffles, total]);
}

function actionHint(raffle: RaffleData, now: number, hasEntered?: boolean): string {
  if (raffle.status === RaffleStatus.Cancelled) return "cancelled — no further action";
  if (raffle.status === RaffleStatus.Closed) return "draw complete — view winners or verify proof";
  if (raffle.status === RaffleStatus.DrawRequested) return "chainlink vrf is picking winners…";
  if (Number(raffle.endsAt) <= now) return "raffle ended — request vrf draw";
  if (hasEntered) return "you're in — wait for the timer to end";
  return "connect wallet to enter";
}

function RaffleCard({
  raffle,
  now,
  index = 0,
}: {
  raffle: RaffleData;
  now: number;
  index?: number;
}) {
  const { authenticated } = usePrivy();
  const address = useWalletAddress();

  const { data: hasEntered } = useContractRead<boolean>({
    abi: RAFFLE_ABI,
    functionName: "hasEntered",
    args: address ? [BigInt(raffle.id), address] : undefined,
    enabled: Boolean(address),
  });

  const { enter, requestDraw, isPending, error, txHash } =
    useRaffleActions(raffle.id);

  const fillPct =
    Number(raffle.winnerCount) === 0
      ? 0
      : (Number(raffle.entryCount) / Number(raffle.winnerCount)) * 100;

  const isOpen =
    raffle.status === RaffleStatus.Open && Number(raffle.endsAt) > now;

  return (
    <article
      className="imd-box imd-box-pad imd-fade-in flex h-full flex-col"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="imd-type-label">
            RAFFLE #{raffle.id}
          </p>
          <h2 className="imd-type-card-title mt-1">{raffle.title}</h2>
        </div>
        <span className="imd-tag">
          {formatStatus(raffle.status)}
        </span>
      </div>

      {raffle.description ? (
        <p className="imd-type-xs imd-muted mt-3 leading-relaxed">
          {raffle.description}
        </p>
      ) : null}

      <dl className="imd-type-xs mt-4 grid grid-cols-2 gap-3">
        <div>
          <dt className="imd-muted">WINNERS</dt>
          <dd>{raffle.winnerCount.toString()}</dd>
        </div>
        <div>
          <dt className="imd-muted">ENTRIES</dt>
          <dd>{raffle.entryCount.toString()}</dd>
        </div>
        <div>
          <dt className="imd-muted">ENDS</dt>
          <dd>{formatEthCountdown(raffle.endsAt, now)}</dd>
        </div>
        <div>
          <dt className="imd-muted">YOUR STATUS</dt>
          <dd>{hasEntered ? "ENTERED" : address ? "NOT ENTERED" : "—"}</dd>
        </div>
      </dl>

      <div className="imd-type-meta mt-3">
        {progressBar(Number(raffle.entryCount), Number(raffle.winnerCount) * 2)}{" "}
        {Math.min(fillPct, 100).toFixed(0)}% capacity
      </div>

      <p className="imd-type-meta mt-3 border border-dashed border-neutral-300 px-2 py-1.5 leading-relaxed">
        {actionHint(raffle, now, hasEntered)}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {isOpen && authenticated ? (
          <button
            type="button"
            className="imd-btn imd-btn-sm"
            disabled={isPending || hasEntered}
            onClick={enter}
          >
            {hasEntered ? "ENTERED" : isPending ? "…" : "ENTER RAFFLE"}
          </button>
        ) : null}

        {raffle.status === RaffleStatus.Open &&
        Number(raffle.endsAt) <= now &&
        raffle.entryCount > BigInt(0) ? (
          <button
            type="button"
            className="imd-btn imd-btn-sm"
            disabled={isPending}
            onClick={requestDraw}
          >
            REQUEST VRF DRAW
          </button>
        ) : null}

        {raffle.status === RaffleStatus.DrawRequested ? (
          <span className="imd-btn imd-btn-sm opacity-60">
            VRF PENDING…
          </span>
        ) : null}
      </div>

      {isOpen && authenticated && !hasEntered ? (
        <p className="imd-type-meta mt-2">
          its a gas only transaction
        </p>
      ) : null}

      {raffle.status === RaffleStatus.Closed && raffle.winners.length > 0 ? (
        <div className="mt-4 border-t border-neutral-200 pt-3">
          <p className="imd-type-label">
            WINNERS
          </p>
          <ul className="imd-type-xs mt-2 space-y-1">
            {raffle.winners.map((winner) => (
              <li key={winner}>{shortAddress(winner)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? (
        <p className="imd-type-xs mt-3 text-red-600">{error}</p>
      ) : null}
      {txHash ? (
        <a
          href={`https://etherscan.io/tx/${txHash}`}
          target="_blank"
          rel="noreferrer"
          className="imd-type-meta mt-2 underline"
        >
          view tx
        </a>
      ) : null}
    </article>
  );
}

export function RaffleGrid() {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const { raffles, isLoading } = useAllRaffles();

  useEffect(() => {
    const timer = setInterval(
      () => setNow(Math.floor(Date.now() / 1000)),
      1000
    );
    return () => clearInterval(timer);
  }, []);

  if (!RAFFLE_CONTRACT_ADDRESS || RAFFLE_CONTRACT_ADDRESS.endsWith("0000")) {
    return (
      <div className="imd-stack imd-panel-inner text-center imd-type-sm">
        Set <code>NEXT_PUBLIC_RAFFLE_CONTRACT_ADDRESS</code> after deploying the
        raffle contract.
      </div>
    );
  }

  if (isLoading && raffles.length === 0) {
    return (
      <div className="imd-stack imd-panel-inner text-center imd-type-sm opacity-60">
        loading raffles…
      </div>
    );
  }

  if (raffles.length === 0) {
    return (
      <div className="imd-page-fill imd-section-pad">
        <div className="imd-box imd-panel-inner w-full max-w-lg text-center imd-type-sm">
          no raffles yet. holders-only drops appear here when created on-chain.
        </div>
      </div>
    );
  }

  const renderCard = (raffle: RaffleData, index: number) => (
    <RaffleCard key={raffle.id} raffle={raffle} now={now} index={index} />
  );

  return (
    <div className={`w-full imd-section-pad ${raffles.length === 1 ? "imd-page-fill" : ""}`}>
        {raffles.length === 1 ? (
          <div className="mx-auto w-full max-w-lg">{renderCard(raffles[0], 0)}</div>
        ) : null}

        {raffles.length === 2 ? (
          <div className="mx-auto grid w-full max-w-3xl gap-4 sm:grid-cols-2">
            {raffles.map((raffle, index) => renderCard(raffle, index))}
          </div>
        ) : null}

        {raffles.length >= 3 ? (
          <div className="mx-auto w-full max-w-4xl">
            <RaffleCarousel raffles={raffles} renderCard={renderCard} />
          </div>
        ) : null}
    </div>
  );
}

