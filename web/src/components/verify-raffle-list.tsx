"use client";

import Link from "next/link";
import { useAllRaffles } from "@/components/raffles";
import { formatStatus, RAFFLE_CONTRACT_ADDRESS } from "@/lib/constants";

export function VerifyRaffleList() {
  const { raffles, isLoading } = useAllRaffles();

  if (!RAFFLE_CONTRACT_ADDRESS || RAFFLE_CONTRACT_ADDRESS.endsWith("0000")) {
    return (
      <div className="mx-auto max-w-2xl imd-section-pad">
        <div className="imd-box imd-panel-inner imd-type-sm">
          contract address not configured.
        </div>
      </div>
    );
  }

  if (isLoading && raffles.length === 0) {
    return (
      <div className="mx-auto max-w-2xl imd-section-pad">
        <div className="imd-box imd-panel-inner imd-type-sm opacity-60">loading raffles…</div>
      </div>
    );
  }

  if (raffles.length === 0) {
    return (
      <div className="mx-auto max-w-2xl imd-section-pad">
        <div className="imd-box imd-panel-inner imd-type-sm imd-muted">
          no raffles on-chain yet.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl imd-section-pad">
      <div className="space-y-3">
        {raffles.map((raffle) => (
          <Link
            key={raffle.id}
            href={`/verify/${raffle.id}`}
            className="imd-box imd-box-pad imd-fade-in block imd-type-xs transition-colors hover:bg-neutral-50"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="imd-type-sm">
                #{raffle.id} · {raffle.title}
              </span>
              <span className="imd-tag">
                {formatStatus(raffle.status)}
              </span>
            </div>
            <p className="imd-muted mt-2">
              {raffle.entryCount.toString()} entries · {raffle.winnerCount.toString()} winner
              slots
            </p>
            <span className="imd-btn imd-btn-sm mt-3 inline-flex">VIEW PROOF</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
