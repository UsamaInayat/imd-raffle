"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAllRaffles } from "@/components/raffles";
import {
  formatEthCountdown,
  formatPublicStatus,
  RAFFLE_CONTRACT_ADDRESS,
  RaffleStatus,
} from "@/lib/constants";

function VerifyRaffleCard({
  raffle,
  now,
}: {
  raffle: ReturnType<typeof useAllRaffles>["raffles"][number];
  now: number;
}) {
  const isOpen =
    raffle.status === RaffleStatus.Open && Number(raffle.endsAt) > now;
  const endsLabel = isOpen
    ? formatEthCountdown(raffle.endsAt, now)
    : raffle.status === RaffleStatus.Closed
      ? "draw complete"
      : "ended";

  return (
    <Link
      href={`/verify/${raffle.id}`}
      className="imd-box imd-fade-in block transition-colors hover:bg-neutral-50"
    >
      <div className="imd-box-pad border-b border-black">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="imd-type-label">RAFFLE #{raffle.id}</p>
            <h2 className="imd-type-card-title mt-1">{raffle.title}</h2>
          </div>
          <span className="imd-tag">{formatPublicStatus(raffle.status)}</span>
        </div>
        {raffle.description ? (
          <p className="imd-type-xs imd-muted mt-3 leading-relaxed">
            {raffle.description}
          </p>
        ) : null}
      </div>

      <dl className="imd-type-xs imd-box-pad grid grid-cols-2 gap-3 border-b border-black">
        <div>
          <dt className="imd-muted">ENTRIES</dt>
          <dd className="imd-type-sm mt-0.5">{raffle.entryCount.toString()}</dd>
        </div>
        <div>
          <dt className="imd-muted">WINNER SLOTS</dt>
          <dd className="imd-type-sm mt-0.5">{raffle.winnerCount.toString()}</dd>
        </div>
        <div>
          <dt className="imd-muted">ENDS</dt>
          <dd className="imd-type-sm mt-0.5">{endsLabel}</dd>
        </div>
      </dl>

      <div className="imd-box-pad flex flex-wrap items-center justify-between gap-3">
        <p className="imd-type-meta">
          {raffle.status === RaffleStatus.Closed
            ? `${raffle.winners.length} winner${raffle.winners.length === 1 ? "" : "s"} recorded on-chain`
            : raffle.status === RaffleStatus.DrawRequested
              ? "raffle ended — proof after finalize"
              : "full entry list and draw proof after close"}
        </p>
        <span className="imd-btn imd-btn-sm inline-flex shrink-0">VIEW PROOF</span>
      </div>
    </Link>
  );
}

function VerifyListShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="imd-page-fill imd-section-pad">
      <div className="w-full max-w-lg">{children}</div>
    </div>
  );
}

export function VerifyRaffleList() {
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
      <VerifyListShell>
        <div className="imd-box imd-panel-inner imd-type-sm">
          contract address not configured.
        </div>
      </VerifyListShell>
    );
  }

  if (isLoading && raffles.length === 0) {
    return (
      <VerifyListShell>
        <div className="imd-box imd-panel-inner imd-type-sm opacity-60">
          loading raffles…
        </div>
      </VerifyListShell>
    );
  }

  if (raffles.length === 0) {
    return (
      <VerifyListShell>
        <div className="imd-box imd-panel-inner imd-type-sm imd-muted">
          no raffles on-chain yet.
        </div>
      </VerifyListShell>
    );
  }

  return (
    <VerifyListShell>
      <div className="space-y-4">
        {raffles.map((raffle) => (
          <VerifyRaffleCard key={raffle.id} raffle={raffle} now={now} />
        ))}
      </div>
    </VerifyListShell>
  );
}
