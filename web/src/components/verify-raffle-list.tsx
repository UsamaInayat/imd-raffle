"use client";

import Link from "next/link";
import { useAllRaffles } from "@/components/raffles";
import { formatStatus, RAFFLE_CONTRACT_ADDRESS } from "@/lib/constants";

export function VerifyRaffleList() {
  const { raffles, isLoading } = useAllRaffles();

  if (!RAFFLE_CONTRACT_ADDRESS || RAFFLE_CONTRACT_ADDRESS.endsWith("0000")) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-8">
        <div className="imd-box p-6 font-mono text-sm">
          contract address not configured.
        </div>
      </div>
    );
  }

  if (isLoading && raffles.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-8">
        <div className="imd-box p-6 font-mono text-sm opacity-60">loading raffles…</div>
      </div>
    );
  }

  if (raffles.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-8">
        <div className="imd-box p-6 font-mono text-sm text-neutral-600">
          no raffles on-chain yet.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-8 sm:px-8">
      <div className="space-y-3">
        {raffles.map((raffle) => (
          <Link
            key={raffle.id}
            href={`/verify/${raffle.id}`}
            className="imd-box imd-fade-in block p-5 font-mono text-xs transition-colors hover:bg-neutral-50"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm">
                #{raffle.id} · {raffle.title}
              </span>
              <span className="border border-black px-2 py-0.5 text-[10px] uppercase tracking-wider">
                {formatStatus(raffle.status)}
              </span>
            </div>
            <p className="mt-2 text-neutral-600">
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
