"use client";

import Link from "next/link";
import { useState } from "react";
import { isAddress } from "viem";
import {
  useContractWrite,
  useIsOwner,
  useWalletAddress,
} from "@/hooks/use-chain";
import { formatStatus, RAFFLE_ABI, shortAddress } from "@/lib/constants";
import { useAllRaffles } from "@/components/raffles";

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
    <form onSubmit={handleCreate} className="imd-panel-inner space-y-4">
      <p className="imd-type-label">CREATE RAFFLE</p>
      <label className="block imd-type-xs">
        TITLE
        <input required value={title} onChange={(e) => setTitle(e.target.value)} className="imd-input" />
      </label>
      <label className="block imd-type-xs">
        DESCRIPTION
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="imd-input" rows={3} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block imd-type-xs">
          WINNERS
          <input required type="number" min={1} value={winnerCount} onChange={(e) => setWinnerCount(e.target.value)} className="imd-input" />
        </label>
        <label className="block imd-type-xs">
          ENDS IN (HOURS)
          <input required type="number" min={1} value={endsInHours} onChange={(e) => setEndsInHours(e.target.value)} className="imd-input" />
        </label>
      </div>
      <button type="submit" className="imd-btn" disabled={isPending}>
        {isPending ? "SIGNING TX…" : "CREATE ON-CHAIN"}
      </button>
      <p className="imd-type-meta">requires signed transaction · gas paid by admin wallet</p>
      {success && !error ? <p className="imd-type-xs text-green-700">raffle created</p> : null}
      {error ? <p className="imd-type-xs text-red-600">{error}</p> : null}
      {txHash ? <a href={`https://etherscan.io/tx/${txHash}`} target="_blank" rel="noreferrer" className="imd-type-meta underline">view tx</a> : null}
    </form>
  );
}

function ManageAdmins() {
  const { isOwner, isLoading: ownerLoading } = useIsOwner();
  const address = useWalletAddress();
  const { write, isPending, error, txHash } = useContractWrite();
  const [newAdmin, setNewAdmin] = useState("");
  const [removeAdmin, setRemoveAdmin] = useState("");

  if (ownerLoading) {
    return (
      <div className="imd-panel-inner imd-type-sm opacity-60">loading owner status…</div>
    );
  }

  if (!isOwner) {
    return (
      <div className="imd-panel-inner">
        <p className="imd-type-label">ADMINS</p>
        <p className="imd-type-sm imd-muted mt-3">only the contract owner can add or remove admins.</p>
        <p className="imd-type-xs mt-2">your wallet: {address ? shortAddress(address) : "—"}</p>
      </div>
    );
  }

  return (
    <div className="imd-panel-inner space-y-4">
      <p className="imd-type-label">MANAGE ADMINS</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!isAddress(newAdmin)) return;
          await write({ abi: RAFFLE_ABI, functionName: "addAdmin", args: [newAdmin] });
          setNewAdmin("");
        }}
        className="space-y-2"
      >
        <label className="block imd-type-xs">
          ADD ADMIN WALLET
          <input value={newAdmin} onChange={(e) => setNewAdmin(e.target.value)} placeholder="0x…" className="imd-input" />
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
        <label className="block imd-type-xs">
          REMOVE ADMIN WALLET
          <input value={removeAdmin} onChange={(e) => setRemoveAdmin(e.target.value)} placeholder="0x…" className="imd-input" />
        </label>
        <button type="submit" className="imd-btn imd-btn-sm" disabled={isPending || !isAddress(removeAdmin)}>
          REMOVE ADMIN
        </button>
      </form>
      {error ? <p className="imd-type-xs text-red-600">{error}</p> : null}
      {txHash ? <a href={`https://etherscan.io/tx/${txHash}`} target="_blank" rel="noreferrer" className="imd-type-meta underline">view tx</a> : null}
    </div>
  );
}

function AdminRaffleList({
  raffles,
  isLoading,
}: {
  raffles: ReturnType<typeof useAllRaffles>["raffles"];
  isLoading: boolean;
}) {
  if (isLoading && raffles.length === 0) {
    return <div className="imd-panel-inner imd-type-sm opacity-60">loading…</div>;
  }

  if (raffles.length === 0) {
    return (
      <div className="imd-panel-inner imd-type-sm imd-muted">
        no raffles yet — create one on the left.
      </div>
    );
  }

  return (
    <div className="imd-panel-inner">
      <p className="imd-type-label">MANAGE RAFFLES</p>
      <div className="mt-4 space-y-3">
        {raffles.map((raffle) => (
          <Link
            key={raffle.id}
            href={`/admin/raffles/${raffle.id}`}
            className="imd-box imd-box-pad block imd-type-xs transition-colors hover:bg-neutral-50"
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
            <span className="imd-btn imd-btn-sm mt-3 inline-flex">OPEN</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function AdminPortal() {
  const { raffles, isLoading } = useAllRaffles();

  return (
    <div className="imd-stack">
      <div className="grid lg:grid-cols-2">
        <div className="border-b border-black lg:border-r lg:border-b-0">
          <CreateRaffleForm />
          <div className="border-t border-black">
            <ManageAdmins />
          </div>
        </div>
        <AdminRaffleList raffles={raffles} isLoading={isLoading} />
      </div>
    </div>
  );
}
