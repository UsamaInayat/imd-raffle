"use client";

import { useRaffleStats } from "@/components/raffles";

function imdBar(pct: number, width = 40) {
  const count = Math.round(Math.min(100, Math.max(0, pct)) / 100 * width);
  return {
    filled: "=".repeat(count),
    empty: "·".repeat(Math.max(0, width - count)),
    pct,
  };
}

export function HomeStatsPanel() {
  const stats = useRaffleStats();
  const activeBar = imdBar(stats.activePct);
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
        <pre className="imd-bar">
          [<b>{activeBar.filled}</b>
          {activeBar.empty}] {activeBar.pct.toFixed(1)}%{"\n"}open holder-gated drops · ethereum
          mainnet
        </pre>
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
        <pre className="imd-bar">
          [<b>{stats.entries > 0 ? "=" : ""}</b>
          {"·".repeat(stats.entries > 0 ? 39 : 40)}]{" "}
          {stats.entries > 0 ? "live" : "0%"}
          {"\n"}on-chain entries · verifiable by anyone
        </pre>
      </div>

      <div className="imd-card imd-card-wide">
        <div className="imd-label-row">
          <span className="imd-card-label">DRAW STATUS</span>
          <span className="imd-tag">{stats.closed > 0 ? "VERIFIED" : "PENDING"}</span>
        </div>
        <span className="imd-card-lines">
          {stats.active} raffles open
          <br />
          {stats.entries} entries collected
          <br />
          {stats.closed} draws finalized
        </span>
      </div>
    </div>
  );
}
