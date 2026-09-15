"use client";

import { useState } from "react";
import { isAddress } from "viem";
import {
  useContractWrite,
  useIsOwner,
  useWalletAddress,
} from "@/hooks/use-chain";
import {
  formatStatus,
  RAFFLE_ABI,
  RaffleStatus,
  shortAddress,
} from "@/lib/constants";
import { useAllRaffles } from "@/components/raffles";
import { RaffleExportActions, WinnerExportModule } from "@/components/winner-export";

function CreateRaffleForm() {
  const { write, isPending, error, txHash } = useContractWrite();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [winnerCount, setWinnerCount] = useState("1");
  const [endsInHours, setEndsInHours] = useState("24");
  const [success, setSuccess] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSuccess(false);
    const endsAt = BigInt(Math.floor(Date.now() / 1000) + Number(endsInHours) * 3600);
    await write({
      abi: RAFFLE_ABI,
      functionName: "createRaffle",
      args: [title, description, BigInt(winnerCount), endsAt],
    });
    setSuccess(true);
    setTitle("");
    setDescription("");
  }

  return (
    <form onSubmit={handleCreate} className="imd-box space-y-4 p-6">
      <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">CREATE RAFFLE</p>
      <label className="block font-mono text-xs">
        TITLE
        <input required value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full border border-black px-3 py-2 text-sm" />
      </label>
      <label className="block font-mono text-xs">
        DESCRIPTION
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full border border-black px-3 py-2 text-sm" rows={3} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block font-mono text-xs">
          WINNERS
          <input required type="number" min={1} value={winnerCount} onChange={(e) => setWinnerCount(e.target.value)} className="mt-1 w-full border border-black px-3 py-2 text-sm" />
        </label>
        <label className="block font-mono text-xs">
          ENDS IN (HOURS)
          <input required type="number" min={1} value={endsInHours} onChange={(e) => setEndsInHours(e.target.value)} className="mt-1 w-full border border-black px-3 py-2 text-sm" />
        </label>
      </div>
      <button type="submit" className="imd-btn" disabled={isPending}>
        {isPending ? "SIGNING TX…" : "CREATE ON-CHAIN"}
      </button>
      <p className="font-mono text-[10px] text-neutral-500">requires signed transaction · gas paid by admin wallet</p>
      {success && !error ? <p className="font-mono text-xs text-green-700">raffle created</p> : null}
      {error ? <p className="font-mono text-xs text-red-600">{error}</p> : null}
      {txHash ? <a href={`https://etherscan.io/tx/${txHash}`} target="_blank" rel="noreferrer" className="font-mono text-[10px] underline">view tx</a> : null}
    </form>
  );
}

function ManageAdmins() {
  const { isOwner } = useIsOwner();
  const address = useWalletAddress();
  const { write, isPending, error, txHash } = useContractWrite();
  const [newAdmin, setNewAdmin] = useState("");
  const [removeAdmin, setRemoveAdmin] = useState("");

  if (!isOwner) {
    return (
      <div className="imd-box p-6">
        <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">ADMINS</p>
        <p className="mt-3 font-mono text-sm text-neutral-600">only the contract owner can add or remove admins.</p>
        <p className="mt-2 font-mono text-xs">your wallet: {address ? shortAddress(address) : "—"}</p>
      </div>
    );
  }

  return (
    <div className="imd-box space-y-4 p-6">
      <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">MANAGE ADMINS</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!isAddress(newAdmin)) return;
          await write({ abi: RAFFLE_ABI, functionName: "addAdmin", args: [newAdmin] });
          setNewAdmin("");
        }}
        className="space-y-2"
      >
        <label className="block font-mono text-xs">
          ADD ADMIN WALLET
          <input value={newAdmin} onChange={(e) => setNewAdmin(e.target.value)} placeholder="0x…" className="mt-1 w-full border border-black px-3 py-2 text-sm" />
        </label>
        <button type="submit" className="imd-btn imd-btn-sm" disabled={isPending || !isAddress(newAdmin)}>
          ADD ADMIN
        </button>
      </form>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!isAddress(removeAdmin)) return;
          await write({ abi: RAFFLE_ABI, functionName: "removeAdmin", args: [removeAdmin] });
          setRemoveAdmin("");
        }}
        className="space-y-2 border-t border-neutral-200 pt-4"
      >
        <label className="block font-mono text-xs">
          REMOVE ADMIN WALLET
          <input value={removeAdmin} onChange={(e) => setRemoveAdmin(e.target.value)} placeholder="0x…" className="mt-1 w-full border border-black px-3 py-2 text-sm" />
        </label>
        <button type="submit" className="imd-btn imd-btn-sm" disabled={isPending || !isAddress(removeAdmin)}>
          REMOVE ADMIN
        </button>
      </form>
      {error ? <p className="font-mono text-xs text-red-600">{error}</p> : null}
      {txHash ? <a href={`https://etherscan.io/tx/${txHash}`} target="_blank" rel="noreferrer" className="font-mono text-[10px] underline">view tx</a> : null}
    </div>
  );
}

function AdminRaffleList({ raffles, isLoading }: { raffles: ReturnType<typeof useAllRaffles>["raffles"]; isLoading: boolean }) {
  const { write, isPending, error } = useContractWrite();

  if (isLoading) return <div className="imd-box p-6 font-mono text-sm opacity-60">loading…</div>;

  return (
    <div className="imd-box p-6">
      <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">MANAGE RAFFLES</p>
      <div className="mt-4 space-y-3">
        {raffles.map((raffle) => (
          <div key={raffle.id} className="border border-neutral-200 p-4 font-mono text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm">#{raffle.id} · {raffle.title}</span>
              <span className="border border-black px-2 py-0.5">{formatStatus(raffle.status)}</span>
            </div>
            <p className="mt-2 text-neutral-600">{raffle.entryCount.toString()} entries · {raffle.winnerCount.toString()} winners</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {raffle.status === RaffleStatus.Open ? (
                <button type="button" className="imd-btn imd-btn-sm" disabled={isPending} onClick={() => write({ abi: RAFFLE_ABI, functionName: "cancelRaffle", args: [BigInt(raffle.id)] })}>
                  CANCEL
                </button>
              ) : null}
              {raffle.status === RaffleStatus.Open && Number(raffle.endsAt) <= Math.floor(Date.now() / 1000) ? (
                <button type="button" className="imd-btn imd-btn-sm" disabled={isPending} onClick={() => write({ abi: RAFFLE_ABI, functionName: "requestDraw", args: [BigInt(raffle.id)] })}>
                  REQUEST VRF DRAW
                </button>
              ) : null}
              {raffle.status === RaffleStatus.DrawRequested ? (
                <span className="text-neutral-500">VRF pending — Chainlink will callback automatically</span>
              ) : null}
            </div>
            <RaffleExportActions raffle={raffle} />
          </div>
        ))}
      </div>
      {error ? <p className="mt-3 font-mono text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

export function AdminPortal() {
  const { raffles, isLoading } = useAllRaffles();

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <CreateRaffleForm />
          <ManageAdmins />
        </div>
        <AdminRaffleList raffles={raffles} isLoading={isLoading} />
      </div>
      <WinnerExportModule raffles={raffles} />
    </div>
  );
}
