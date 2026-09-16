"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminRaffleExports } from "@/components/winner-export";
import { useAllRaffles } from "@/components/raffles";
import { useContractWrite } from "@/hooks/use-chain";
import {
  formatEthCountdown,
  formatStatus,
  RAFFLE_ABI,
  RaffleStatus,
  shortAddress,
} from "@/lib/constants";

export function AdminRaffleDetail({ raffleId }: { raffleId: number }) {
  const now = useNow();
  const { raffles, isLoading } = useAllRaffles();
  const { write, isPending, error } = useContractWrite();

  const raffle = useMemo(
    () => raffles.find((item) => item.id === raffleId),
    [raffles, raffleId]
  );

  if (isLoading && !raffle) {
    return (
      <div className="mx-auto max-w-2xl imd-section-pad">
        <div className="imd-box imd-panel-inner imd-type-sm opacity-60">loading raffle…</div>
      </div>
    );
  }

  if (!raffle) {
    return (
      <div className="mx-auto max-w-2xl imd-section-pad">
        <div className="imd-box imd-panel-inner imd-type-sm">
          <p className="imd-type-label">
            NOT FOUND
          </p>
          <p className="mt-3">raffle #{raffleId} does not exist.</p>
          <Link href="/admin" className="imd-btn imd-btn-sm mt-4 inline-flex">
            BACK TO ADMIN
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 imd-section-pad">
      <Link href="/admin" className="imd-type-xs underline">
        ← back to admin
      </Link>

      <article className="imd-box imd-panel-inner">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="imd-type-label">
              RAFFLE #{raffle.id}
            </p>
            <h1 className="imd-type-section-title mt-1">{raffle.title}</h1>
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
            <dt className="imd-muted">ENTRIES</dt>
            <dd>{raffle.entryCount.toString()}</dd>
          </div>
          <div>
            <dt className="imd-muted">WINNERS</dt>
            <dd>{raffle.winnerCount.toString()}</dd>
          </div>
          <div>
            <dt className="imd-muted">ENDS</dt>
            <dd>{formatEthCountdown(raffle.endsAt, now)}</dd>
          </div>
          <div>
            <dt className="imd-muted">VRF REQUEST</dt>
            <dd>{raffle.vrfRequestId > BigInt(0) ? raffle.vrfRequestId.toString() : "—"}</dd>
          </div>
        </dl>

        {raffle.status === RaffleStatus.Closed && raffle.winners.length > 0 ? (
          <div className="mt-4 border-t border-neutral-200 pt-4">
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

        <div className="mt-4 flex flex-wrap gap-2 border-t border-neutral-200 pt-4">
          {raffle.status === RaffleStatus.Open ? (
            <button
              type="button"
              className="imd-btn imd-btn-sm"
              disabled={isPending}
              onClick={() =>
                write({
                  abi: RAFFLE_ABI,
                  functionName: "cancelRaffle",
                  args: [BigInt(raffle.id)],
                })
              }
            >
              CANCEL RAFFLE
            </button>
          ) : null}

          {raffle.status === RaffleStatus.Open &&
          Number(raffle.endsAt) <= now &&
          raffle.entryCount > BigInt(0) ? (
            <button
              type="button"
              className="imd-btn imd-btn-sm"
              disabled={isPending}
              onClick={() =>
                write({
                  abi: RAFFLE_ABI,
                  functionName: "requestDraw",
                  args: [BigInt(raffle.id)],
                })
              }
            >
              REQUEST VRF DRAW
            </button>
          ) : null}

          {raffle.status === RaffleStatus.DrawRequested ? (
            <span className="imd-type-xs imd-muted">
              vrf pending — chainlink will callback automatically
            </span>
          ) : null}

          <Link href={`/verify/${raffle.id}`} className="imd-btn imd-btn-sm">
            VERIFY
          </Link>
        </div>

        {error ? <p className="imd-type-xs mt-3 text-red-600">{error}</p> : null}

        <AdminRaffleExports raffle={raffle} />
      </article>
    </div>
  );
}

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const timer = setInterval(() => setNow(Math.floor(Date.now() / 1000)), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
