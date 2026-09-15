"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { StatCard } from "@/components/layout";
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

export function useAllRaffles() {
  const [raffles, setRaffles] = useState<RaffleData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { data: raffleCount } = useContractRead<bigint>({
    abi: RAFFLE_ABI,
    functionName: "getRaffleCount",
    refetchInterval: 15000,
  });

  useEffect(() => {
    async function load() {
      if (!raffleCount || RAFFLE_CONTRACT_ADDRESS.endsWith("0000")) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const count = Number(raffleCount);
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

      setRaffles(loaded.reverse());
      setIsLoading(false);
    }

    void load();
  }, [raffleCount]);

  return { raffles, isLoading, total: Number(raffleCount ?? 0n) };
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

function RaffleCard({ raffle, now }: { raffle: RaffleData; now: number }) {
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

  const isOpen =
    raffle.status === RaffleStatus.Open && Number(raffle.endsAt) > now;
  const fillPct =
    Number(raffle.winnerCount) === 0
      ? 0
      : (Number(raffle.entryCount) / Number(raffle.winnerCount)) * 100;

  return (
    <article className="imd-box flex flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.15em] text-neutral-500">
            RAFFLE #{raffle.id}
          </p>
          <h2 className="mt-1 font-mono text-lg">{raffle.title}</h2>
        </div>
        <span className="border border-black px-2 py-0.5 text-[10px] uppercase tracking-wider">
          {formatStatus(raffle.status)}
        </span>
      </div>

      {raffle.description ? (
        <p className="mt-3 font-mono text-xs leading-relaxed text-neutral-600">
          {raffle.description}
        </p>
      ) : null}

      <dl className="mt-4 grid grid-cols-2 gap-3 font-mono text-xs">
        <div>
          <dt className="text-neutral-500">WINNERS</dt>
          <dd>{raffle.winnerCount.toString()}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">ENTRIES</dt>
          <dd>{raffle.entryCount.toString()}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">ENDS</dt>
          <dd>{formatEthCountdown(raffle.endsAt, now)}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">YOUR STATUS</dt>
          <dd>{hasEntered ? "ENTERED" : address ? "NOT ENTERED" : "—"}</dd>
        </div>
      </dl>

      <div className="mt-3 font-mono text-[10px] text-neutral-500">
        {progressBar(Number(raffle.entryCount), Number(raffle.winnerCount) * 2)}{" "}
        {Math.min(fillPct, 100).toFixed(0)}% capacity
      </div>

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
        raffle.entryCount > 0n ? (
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

        <Link href={`/verify?id=${raffle.id}`} className="imd-btn imd-btn-sm">
          VERIFY
        </Link>
      </div>

      {raffle.status === RaffleStatus.Closed && raffle.winners.length > 0 ? (
        <div className="mt-4 border-t border-neutral-200 pt-3">
          <p className="text-[10px] uppercase tracking-widest text-neutral-500">
            WINNERS
          </p>
          <ul className="mt-2 space-y-1 font-mono text-xs">
            {raffle.winners.map((winner) => (
              <li key={winner}>{shortAddress(winner)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 font-mono text-xs text-red-600">{error}</p>
      ) : null}
      {txHash ? (
        <a
          href={`https://etherscan.io/tx/${txHash}`}
          target="_blank"
          rel="noreferrer"
          className="mt-2 font-mono text-[10px] underline"
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
      <div className="imd-box p-6 text-center font-mono text-sm">
        Set <code>NEXT_PUBLIC_RAFFLE_CONTRACT_ADDRESS</code> after deploying the
        raffle contract.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="imd-box p-6 text-center font-mono text-sm opacity-60">
        loading raffles…
      </div>
    );
  }

  if (raffles.length === 0) {
    return (
      <div className="imd-box p-6 text-center font-mono text-sm">
        no raffles yet. holders-only drops appear here when created on-chain.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {raffles.map((raffle) => (
        <RaffleCard key={raffle.id} raffle={raffle} now={now} />
      ))}
    </div>
  );
}

export function HomeStats() {
  const stats = useRaffleStats();
  return (
    <>
      <StatCard
        label="ACTIVE RAFFLES"
        value={stats.active}
        sub="open holder-gated drops · ethereum mainnet"
        progress={{
          pct: stats.activePct,
          bar: progressBar(stats.active, Math.max(stats.total, 1)),
        }}
      />
      <StatCard
        label="TOTAL ENTRIES"
        tag={stats.total === 0 ? "EMPTY" : "LIVE"}
        value={stats.entries.toString()}
        sub="on-chain entries · verifiable by anyone"
      />
      <StatCard
        label="FINALIZED"
        value={stats.closed.toString()}
        sub={`${stats.total} total raffles · provably fair draw`}
        progress={{
          pct: stats.closedPct,
          bar: progressBar(stats.closed, Math.max(stats.total, 1)),
        }}
      />
    </>
  );
}
