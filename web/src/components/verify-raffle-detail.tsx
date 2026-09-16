"use client";

import Link from "next/link";
import { useContractRead } from "@/hooks/use-chain";
import {
  formatStatus,
  RAFFLE_ABI,
  RAFFLE_CONTRACT_ADDRESS,
  RaffleStatus,
  shortAddress,
} from "@/lib/constants";

type RaffleTuple = readonly [
  string,
  string,
  bigint,
  bigint,
  number,
  bigint,
  bigint,
  readonly `0x${string}`[],
];

export function VerifyRaffleDetail({ raffleId }: { raffleId: number }) {
  const {
    data: raffle,
    isLoading: raffleLoading,
    error: raffleError,
  } = useContractRead<RaffleTuple>({
    abi: RAFFLE_ABI,
    functionName: "getRaffle",
    args: [BigInt(raffleId)],
  });

  const { data: entries } = useContractRead<readonly `0x${string}`[]>({
    abi: RAFFLE_ABI,
    functionName: "getEntries",
    args: [BigInt(raffleId)],
  });

  const { data: eligible } = useContractRead<readonly `0x${string}`[]>({
    abi: RAFFLE_ABI,
    functionName: "getEligibleEntriesAtDraw",
    args: [BigInt(raffleId)],
    enabled: raffle?.[4] === RaffleStatus.Closed,
  });

  const { data: verification } = useContractRead<
    readonly [boolean, readonly `0x${string}`[], readonly `0x${string}`[]]
  >({
    abi: RAFFLE_ABI,
    functionName: "verifyWinners",
    args: [BigInt(raffleId)],
    enabled: raffle?.[4] === RaffleStatus.Closed,
  });

  if (!RAFFLE_CONTRACT_ADDRESS || RAFFLE_CONTRACT_ADDRESS.endsWith("0000")) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="imd-box p-6 font-mono text-sm">
          contract address not configured.
        </div>
      </div>
    );
  }

  if (raffleLoading && !raffle) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="imd-box p-6 font-mono text-sm opacity-60">
          loading raffle #{raffleId}…
        </div>
      </div>
    );
  }

  if (raffleError || !raffle) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="imd-box p-6 font-mono text-sm">
          <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
            NOT FOUND
          </p>
          <p className="mt-3">raffle #{raffleId} does not exist on-chain yet.</p>
          <Link href="/verify" className="imd-btn imd-btn-sm mt-4 inline-flex">
            BACK TO VERIFY
          </Link>
          {raffleError ? (
            <p className="mt-3 text-xs text-red-600">{raffleError}</p>
          ) : null}
        </div>
      </div>
    );
  }

  const [
    title,
    description,
    winnerCount,
    endsAt,
    status,
    vrfRequestId,
    randomSeed,
  ] = raffle;

  const [valid, recomputed, stored] = verification ?? [
    undefined,
    [] as readonly `0x${string}`[],
    [] as readonly `0x${string}`[],
  ];

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-6 py-8 sm:px-8">
      <Link
        href="/verify"
        className="inline-block font-mono text-[10px] uppercase tracking-widest text-neutral-500 underline"
      >
        ← all raffles
      </Link>

      <div className="imd-box imd-fade-in p-6">
        <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
          RAFFLE #{raffleId}
        </p>
        <h1 className="mt-2 font-mono text-2xl">{title}</h1>
        {description ? (
          <p className="mt-2 font-mono text-sm text-neutral-600">{description}</p>
        ) : null}

        <dl className="mt-6 grid gap-3 font-mono text-sm sm:grid-cols-2">
          <div>
            <dt className="text-neutral-500">STATUS</dt>
            <dd>{formatStatus(status as RaffleStatus)}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">WINNER SLOTS</dt>
            <dd>{winnerCount.toString()}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">ENTRIES</dt>
            <dd>{entries?.length ?? 0}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">ENDS AT (UNIX)</dt>
            <dd>{endsAt.toString()}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">VRF REQUEST ID</dt>
            <dd>
              {vrfRequestId > BigInt(0) ? (
                <a
                  href={`https://vrf.chain.link/mainnet/${vrfRequestId.toString()}`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  {vrfRequestId.toString()}
                </a>
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">VRF RANDOM WORD</dt>
            <dd className="break-all">{randomSeed.toString()}</dd>
          </div>
        </dl>
      </div>

      <div className="imd-box p-6">
        <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
          ON-CHAIN ENTRIES ({entries?.length ?? 0})
        </p>
        <ul className="mt-4 space-y-1 font-mono text-xs">
          {(entries ?? []).map((entry, i) => (
            <li key={`${entry}-${i}`} className="break-all">
              {i + 1}. {entry}
            </li>
          ))}
          {(entries ?? []).length === 0 ? (
            <li className="text-neutral-500">no entries</li>
          ) : null}
        </ul>
      </div>

      {status === RaffleStatus.Closed && (eligible ?? []).length > 0 ? (
        <div className="imd-box p-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
            ELIGIBLE AT DRAW ({eligible?.length ?? 0})
          </p>
          <ul className="mt-4 space-y-1 font-mono text-xs">
            {(eligible ?? []).map((entry, i) => (
              <li key={`${entry}-${i}`} className="break-all">
                {i + 1}. {entry}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {status === RaffleStatus.Closed ? (
        <div className="imd-box p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
              VERIFICATION
            </p>
            <span
              className={`border px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                valid
                  ? "border-black bg-black text-white"
                  : "border-red-600 text-red-600"
              }`}
            >
              {valid ? "VALID ✓" : "INVALID ✗"}
            </span>
          </div>

          <p className="mt-4 font-mono text-sm leading-relaxed text-neutral-600">
            anyone can replay <code>pickWinners(seed, eligibleEntries, winnerCount)</code>{" "}
            using the Chainlink VRF random word and eligible entry snapshot. wallets that sold
            IDMD before the VRF callback were excluded.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-neutral-500">
                STORED WINNERS
              </p>
              <ul className="mt-2 space-y-1 font-mono text-xs">
                {stored.map((w) => (
                  <li key={w}>{shortAddress(w)}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-neutral-500">
                RECOMPUTED
              </p>
              <ul className="mt-2 space-y-1 font-mono text-xs">
                {recomputed.map((w) => (
                  <li key={w}>{shortAddress(w)}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-6 font-mono text-xs text-neutral-500">
            <p className="font-semibold text-black">Chainlink VRF flow</p>
            <ol className="mt-2 list-decimal space-y-1 pl-4">
              <li>After the raffle ends, anyone calls requestDraw().</li>
              <li>Contract requests random words from Chainlink VRF v2.5.</li>
              <li>Chainlink callback delivers randomWord → filters eligible holders → pickWinners().</li>
              <li>Verify proof at vrf.chain.link + replay pickWinners() off-chain.</li>
            </ol>
          </div>
        </div>
      ) : (
        <div className="imd-box p-6 font-mono text-sm text-neutral-600">
          <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
            waiting for draw
          </p>
          <p className="mt-3">
            proof unlocks when status = closed. entries and metadata above stay readable
            on this page as the list grows.
          </p>
        </div>
      )}
    </div>
  );
}
