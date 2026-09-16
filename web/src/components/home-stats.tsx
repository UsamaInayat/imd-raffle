"use client";

import { useRaffleStats } from "@/components/raffles";

export function HomeStatsPanel() {
  const stats = useRaffleStats();
  const liveTag = stats.total === 0 ? "EMPTY" : stats.active > 0 ? "LIVE" : "IDLE";

  return (
    <div className="imd-stats">
      <div className="imd-card">
        <div className="imd-card-head">
          <span className="imd-card-label">ACTIVE RAFFLES</span>
          <div className="imd-figure">
            <span className="imd-figure-big">{stats.active}</span>
            <span className="imd-figure-of">/ {stats.total} on-chain</span>
          </div>
        </div>
        <p className="imd-card-foot">
          open holder-gated drops · ethereum mainnet
        </p>
      </div>

      <div className="imd-card">
        <div className="imd-card-head">
          <div className="imd-label-row">
            <span className="imd-card-label">TOTAL ENTRIES</span>
            <span className="imd-tag">{liveTag}</span>
          </div>
          <div className="imd-figure">
            <span className="imd-figure-big">{stats.entries}</span>
            <span className="imd-figure-of">wallet signatures · gas only</span>
          </div>
        </div>
        <p className="imd-card-foot">
          on-chain entries · verifiable by anyone
        </p>
      </div>

      <div className="imd-card">
        <div className="imd-card-head">
          <div className="imd-label-row">
            <span className="imd-card-label">DRAW STATUS</span>
            <span className="imd-tag">{stats.closed > 0 ? "VERIFIED" : "PENDING"}</span>
          </div>
          <div className="imd-figure">
            <span className="imd-figure-big">{stats.closed}</span>
            <span className="imd-figure-of">draws finalized</span>
          </div>
        </div>
        <p className="imd-card-foot">
          {stats.active} open · {stats.entries} entries collected · chainlink vrf
        </p>
      </div>
    </div>
  );
}
