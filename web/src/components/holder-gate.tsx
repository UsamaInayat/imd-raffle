"use client";

import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";
import { useIsAdmin, useIsHolder } from "@/hooks/use-chain";
import { IDENTITY_MD_OPENSEA } from "@/lib/constants";

export function HolderGate({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, login } = usePrivy();
  const { isHolder, isLoading } = useIsHolder();

  if (!ready) {
    return <div className="imd-box mx-auto max-w-lg p-8 text-center font-mono text-sm">initializing…</div>;
  }

  if (authenticated && isLoading) {
    return (
      <div className="imd-box mx-auto max-w-lg p-8 text-center font-mono text-sm">
        checking IDMD balance…
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="imd-box mx-auto max-w-lg p-8 text-center">
        <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">HOLDER GATED</p>
        <h2 className="mt-3 font-mono text-xl">Connect to enter</h2>
        <p className="mt-3 font-mono text-sm leading-relaxed text-neutral-600">
          only Identity MD collectors can connect and enter raffles.
        </p>
        <button type="button" className="imd-btn mt-6" onClick={login}>CONNECT WALLET</button>
        <p className="mt-6 font-mono text-xs text-neutral-500">
          <a href={IDENTITY_MD_OPENSEA} target="_blank" rel="noreferrer" className="underline">get IDMD on opensea</a>
        </p>
      </div>
    );
  }

  if (!isHolder) {
    return (
      <div className="imd-box mx-auto max-w-lg p-8 text-center">
        <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">NOT ELIGIBLE</p>
        <h2 className="mt-3 font-mono text-xl">Identity MD required</h2>
        <p className="mt-3 font-mono text-sm text-neutral-600">on-chain balanceOf check failed for your wallet.</p>
        <a href={IDENTITY_MD_OPENSEA} target="_blank" rel="noreferrer" className="imd-btn mt-6 inline-block">GET IDMD</a>
      </div>
    );
  }

  return <>{children}</>;
}

export function AdminGate({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, login } = usePrivy();
  const { isHolder, isLoading: holderLoading } = useIsHolder();
  const { isAdmin, isLoading: adminLoading } = useIsAdmin();

  if (!ready) {
    return <div className="imd-box p-8 text-center font-mono text-sm">initializing…</div>;
  }

  if (!authenticated) {
    return (
      <div className="imd-box mx-auto max-w-lg p-8 text-center">
        <h2 className="font-mono text-xl">Admin portal</h2>
        <p className="mt-3 font-mono text-sm text-neutral-600">connect your admin wallet to continue.</p>
        <button type="button" className="imd-btn mt-6" onClick={login}>CONNECT WALLET</button>
      </div>
    );
  }

  if (authenticated && (holderLoading || adminLoading)) {
    return (
      <div className="imd-box p-8 text-center font-mono text-sm">
        loading admin access…
      </div>
    );
  }

  if (!isHolder) {
    return (
      <div className="imd-box mx-auto max-w-lg p-8 text-center">
        <h2 className="font-mono text-xl">IDMD required</h2>
        <p className="mt-3 font-mono text-sm text-neutral-600">admin wallets must also hold Identity MD.</p>
        <Link href="/raffles" className="imd-btn mt-6 inline-block">BACK</Link>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="imd-box mx-auto max-w-lg p-8 text-center">
        <h2 className="font-mono text-xl">Not an admin</h2>
        <p className="mt-3 font-mono text-sm text-neutral-600">this wallet is not on the admin list.</p>
        <Link href="/" className="imd-btn mt-6 inline-block">HOME</Link>
      </div>
    );
  }

  return <>{children}</>;
}
