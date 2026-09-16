"use client";

import { useState } from "react";
import type { RaffleData } from "@/components/raffles";
import { RaffleStatus } from "@/lib/constants";
import {
  exportRaffleEntriesCsv,
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
      {error ? <p className="imd-type-meta mt-1 text-red-600">{error}</p> : null}
    </div>
  );
}

export function AdminRaffleExports({ raffle }: { raffle: RaffleData }) {
  const hasEntries = Number(raffle.entryCount) > 0;
  const hasWinners =
    raffle.status === RaffleStatus.Closed && raffle.winners.length > 0;
  const canFullReport = raffle.status === RaffleStatus.Closed;

  return (
    <div className="space-y-3 border-t border-neutral-200 pt-4">
      <p className="imd-type-label">
        EXPORT
      </p>
      <div className="flex flex-wrap gap-2">
        <ExportButton
          label="ENTRIES CSV"
          disabled={!hasEntries}
          onClick={() => exportRaffleEntriesCsv(raffle.id, raffle.title)}
        />
        <ExportButton
          label="WINNERS CSV"
          disabled={!hasWinners}
          onClick={() => exportRaffleWinnersCsv(raffle.id, raffle.title)}
        />
        <ExportButton
          label="FULL REPORT CSV"
          disabled={!canFullReport}
          onClick={() => exportRaffleFullReportCsv(raffle.id, raffle.title)}
        />
      </div>
      <p className="imd-type-meta">
        entries: any time · winners &amp; full report: after status = closed
      </p>
    </div>
  );
}
