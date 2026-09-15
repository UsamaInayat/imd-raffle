"use client";

import { useState } from "react";
import type { RaffleData } from "@/components/raffles";
import { RaffleStatus } from "@/lib/constants";
import {
  exportAllWinnersCsv,
  exportRaffleFullReportCsv,
  exportRaffleWinnersCsv,
} from "@/lib/raffle-export";

function ExportButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => Promise<void>;
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  return (
    <div>
      <button
        type="button"
        className="imd-btn imd-btn-sm"
        disabled={disabled || loading}
        onClick={async () => {
          setLoading(true);
          setError(undefined);
          try {
            await onClick();
          } catch (err) {
            setError(err instanceof Error ? err.message : "export failed");
          } finally {
            setLoading(false);
          }
        }}
      >
        {loading ? "…" : label}
      </button>
      {error ? <p className="mt-1 font-mono text-[10px] text-red-600">{error}</p> : null}
    </div>
  );
}

export function RaffleExportActions({ raffle }: { raffle: RaffleData }) {
  const canExport = raffle.status === RaffleStatus.Closed && raffle.winners.length > 0;

  if (!canExport) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2 border-t border-neutral-200 pt-3">
      <ExportButton
        label="EXPORT WINNERS CSV"
        onClick={() => exportRaffleWinnersCsv(raffle.id, raffle.title)}
      />
      <ExportButton
        label="FULL REPORT CSV"
        onClick={() => exportRaffleFullReportCsv(raffle.id, raffle.title)}
      />
    </div>
  );
}

export function WinnerExportModule({ raffles }: { raffles: RaffleData[] }) {
  const closed = raffles.filter(
    (r) => r.status === RaffleStatus.Closed && r.winners.length > 0
  );

  return (
    <div className="imd-box space-y-4 p-6">
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
          WINNERS EXPORT
        </p>
        <p className="mt-2 font-mono text-xs leading-relaxed text-neutral-600">
          download winner wallets and audit data from on-chain raffle state. exports
          include vrf request id, random seed, and verification flag.
        </p>
      </div>

      <ExportButton
        label="EXPORT ALL CLOSED WINNERS"
        disabled={closed.length === 0}
        onClick={exportAllWinnersCsv}
      />

      {closed.length === 0 ? (
        <p className="font-mono text-xs text-neutral-500">
          no closed raffles with winners yet.
        </p>
      ) : (
        <div className="space-y-2 border-t border-neutral-200 pt-4">
          <p className="text-[10px] uppercase tracking-widest text-neutral-500">
            BY RAFFLE
          </p>
          {closed.map((raffle) => (
            <div
              key={raffle.id}
              className="flex flex-wrap items-center justify-between gap-2 border border-neutral-200 p-3 font-mono text-xs"
            >
              <span>
                #{raffle.id} · {raffle.title} · {raffle.winners.length} winner
                {raffle.winners.length === 1 ? "" : "s"}
              </span>
              <div className="flex flex-wrap gap-2">
                <ExportButton
                  label="WINNERS"
                  onClick={() => exportRaffleWinnersCsv(raffle.id, raffle.title)}
                />
                <ExportButton
                  label="FULL REPORT"
                  onClick={() => exportRaffleFullReportCsv(raffle.id, raffle.title)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
