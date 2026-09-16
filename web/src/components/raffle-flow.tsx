"use client";

import { RaffleStatus } from "@/lib/constants";

const STEPS = [
  { id: "enter", label: "ENTER", hint: "sign tx to join" },
  { id: "wait", label: "WAIT", hint: "until timer ends" },
  { id: "draw", label: "DRAW", hint: "chainlink vrf picks winners" },
  { id: "verify", label: "VERIFY", hint: "anyone can audit proof" },
] as const;

function stepIndex(status: RaffleStatus, isOpen: boolean): number {
  if (status === RaffleStatus.Cancelled) return -1;
  if (status === RaffleStatus.Closed) return 3;
  if (status === RaffleStatus.DrawRequested) return 2;
  if (isOpen) return 0;
  return 1;
}

export function RaffleFlowSteps({
  status,
  isOpen = status === RaffleStatus.Open,
  compact = false,
}: {
  status: RaffleStatus;
  isOpen?: boolean;
  compact?: boolean;
}) {
  const active = stepIndex(status, isOpen);

  if (status === RaffleStatus.Cancelled) {
    return (
      <p className="font-mono text-xs text-neutral-500">this raffle was cancelled by admin.</p>
    );
  }

  return (
    <ol
      className={`grid gap-2 ${compact ? "grid-cols-4" : "grid-cols-2 sm:grid-cols-4"}`}
      aria-label="raffle flow"
    >
      {STEPS.map((step, index) => {
        const isActive = index === active;
        const isDone = active > index;

        return (
          <li
            key={step.id}
            className={`imd-flow-step border p-2 text-center transition-all duration-300 ${
              isActive
                ? "imd-flow-step-active border-black bg-black text-white"
                : isDone
                  ? "border-black bg-neutral-100"
                  : "border-neutral-300 text-neutral-400"
            }`}
          >
            <p className="text-[9px] tracking-[0.15em]">{step.label}</p>
            {!compact ? (
              <p className={`mt-1 text-[9px] leading-tight ${isActive ? "text-neutral-300" : ""}`}>
                {step.hint}
              </p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export function RaffleHowItWorks() {
  return (
    <div className="imd-fade-in mx-auto max-w-3xl">
      <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
        how it works
      </p>
      <RaffleFlowSteps status={RaffleStatus.Open} isOpen />
      <p className="mt-3 font-mono text-xs leading-relaxed text-neutral-600">
        connect → enter → wait for timer → vrf draw → verify proof on-chain.
      </p>
    </div>
  );
}
