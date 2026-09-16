"use client";

import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";
import { useIsAdmin, useIsHolder } from "@/hooks/use-chain";
import { IDENTITY_MD_OPENSEA } from "@/lib/constants";

export function HolderGate({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, login } = usePrivy();
  const { isHolder, isLoading } = useIsHolder();

  if (!ready) {
    return <div className="imd-stack imd-panel-inner text-center imd-type-sm opacity-60">initializing…</div>;
  }

  if (authenticated && isLoading) {
    return (
      <div className="imd-stack imd-panel-inner text-center imd-type-sm">
        checking IDMD balance…
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="imd-stack imd-panel-inner text-center">
        <p className="imd-type-label">HOLDER GATED</p>
        <h2 className="imd-type-section-title mt-3">Connect to enter</h2>
        <p className="imd-type-sm imd-muted mt-3 leading-relaxed">
          only Identity MD collectors can connect and enter raffles.
        </p>
        <button type="button" className="imd-btn mt-6" onClick={login}>CONNECT WALLET</button>
        <p className="imd-type-xs imd-muted mt-6">
          <a href={IDENTITY_MD_OPENSEA} target="_blank" rel="noreferrer" className="underline">get IDMD on opensea</a>
        </p>
      </div>
    );
  }

  if (!isHolder) {
    return (
      <div className="imd-stack imd-panel-inner text-center">
        <p className="imd-type-label">NOT ELIGIBLE</p>
        <h2 className="imd-type-section-title mt-3">Identity MD required</h2>
        <p className="imd-type-sm imd-muted mt-3">on-chain balanceOf check failed for your wallet.</p>
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
    return <div className="imd-stack imd-panel-inner text-center imd-type-sm opacity-60">initializing…</div>;
  }

  if (!authenticated) {
    return (
      <div className="imd-stack imd-panel-inner text-center">
        <h2 className="imd-type-section-title">Admin portal</h2>
        <p className="imd-type-sm imd-muted mt-3">connect your admin wallet to continue.</p>
        <button type="button" className="imd-btn mt-6" onClick={login}>CONNECT WALLET</button>
      </div>
    );
  }

  if (authenticated && (holderLoading || adminLoading)) {
    return (
      <div className="imd-stack imd-panel-inner text-center imd-type-sm">
        loading admin access…
      </div>
    );
  }

  if (!isHolder) {
    return (
      <div className="imd-stack imd-panel-inner text-center">
        <h2 className="imd-type-section-title">IDMD required</h2>
        <p className="imd-type-sm imd-muted mt-3">admin wallets must also hold Identity MD.</p>
        <Link href="/raffles" className="imd-btn mt-6 inline-block">BACK</Link>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="imd-stack imd-panel-inner text-center">
        <h2 className="imd-type-section-title">Not an admin</h2>
        <p className="imd-type-sm imd-muted mt-3">this wallet is not on the admin list.</p>
        <Link href="/" className="imd-btn mt-6 inline-block">HOME</Link>
      </div>
    );
  }

  return <>{children}</>;
}
