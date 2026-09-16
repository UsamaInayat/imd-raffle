"use client";

import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { useIsAdmin, useIsHolder, useWalletAddress } from "@/hooks/use-chain";
import { shortAddress } from "@/lib/constants";

function ConnectButton() {
  const { ready, authenticated, login, logout } = usePrivy();
  const address = useWalletAddress();
  const { isHolder } = useIsHolder();
  const { isAdmin } = useIsAdmin();

  if (!ready) {
    return <span className="imd-btn imd-btn-sm opacity-50">CONNECT</span>;
  }

  if (!authenticated || !address) {
    return (
      <button type="button" className="imd-btn imd-btn-sm" onClick={login}>
        CONNECT
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-[10px] uppercase tracking-widest sm:inline">
        {isAdmin ? <span className="text-black">ADMIN · </span> : null}
        <span className={isHolder ? "text-black" : "text-neutral-500"}>
          {isHolder ? "IDMD HOLDER" : "NOT HOLDER"}
        </span>
      </span>
      <button type="button" className="imd-btn imd-btn-sm" onClick={logout}>
        {shortAddress(address)}
      </button>
    </div>
  );
}

export function SiteHeader() {
  const { authenticated } = usePrivy();
  const { isAdmin } = useIsAdmin();

  return (
    <header className="w-full border-b border-black">
      <nav
        aria-label="primary"
        className="flex w-full flex-wrap items-stretch"
      >
        <Link href="/" className="imd-nav-item imd-nav-logo">
          <span aria-hidden>◇</span> IMD
        </Link>
        <Link href="/raffles" className="imd-nav-item">
          RAFFLES
        </Link>
        <Link href="/verify" className="imd-nav-item">
          VERIFY
        </Link>
        {authenticated && isAdmin ? (
          <Link href="/admin" className="imd-nav-item">
            ADMIN
          </Link>
        ) : null}
        <a
          href="https://www.imd.fun/"
          target="_blank"
          rel="noreferrer"
          className="imd-nav-item"
        >
          IMD.FUN
        </a>
        <div className="imd-nav-item ml-auto border-l border-black">
          <ConnectButton />
        </div>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto w-full border-t border-black">
      <div className="grid md:grid-cols-2">
        <div className="border-b border-black p-6 md:border-r md:border-b-0">
          <div className="imd-box inline-flex items-center gap-2 px-3 py-1 text-sm">
            <span aria-hidden>◇</span> IMD RAFFLE
          </div>
          <p className="mt-4 max-w-md font-mono text-sm leading-relaxed">
            holder-gated on-chain raffles for Identity MD collectors. provably fair
            draws with holder re-check at winner selection.
          </p>
        </div>
        <div className="p-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
            LINKS
          </p>
          <dl className="mt-3 space-y-2 font-mono text-sm">
            <div className="flex gap-3">
              <dt className="text-neutral-500">collection</dt>
              <dd>
                <a
                  href="https://opensea.io/collection/identitymd"
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  identitymd
                </a>
              </dd>
            </div>
            <div className="flex gap-3">
              <dt className="text-neutral-500">main site</dt>
              <dd>
                <a href="https://www.imd.fun/" className="underline">
                  imd.fun
                </a>
              </dd>
            </div>
          </dl>
        </div>
      </div>
      <div className="border-t border-black px-6 py-3 font-mono text-[10px] uppercase tracking-widest text-neutral-500">
        © 2026 IMD RAFFLE · ethereum mainnet
      </div>
    </footer>
  );
}

export function PageHero({
  eyebrow,
  title,
  description,
  centered = false,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  centered?: boolean;
}) {
  return (
    <section
      className={`w-full border-b border-black px-6 py-8 sm:px-8 md:px-10 ${
        centered ? "text-center" : ""
      }`}
    >
      <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
        {eyebrow}
      </p>
      <h1 className="mt-2 font-mono text-3xl">{title}</h1>
      {description ? (
        <p
          className={`mt-3 font-mono text-sm text-neutral-600 ${
            centered ? "mx-auto max-w-2xl" : "max-w-3xl"
          }`}
        >
          {description}
        </p>
      ) : null}
    </section>
  );
}

export function PageBody({
  children,
  flush = false,
}: {
  children: React.ReactNode;
  flush?: boolean;
}) {
  return (
    <section
      className={`w-full flex-1 ${flush ? "" : "px-6 py-8 sm:px-8 md:px-10"}`}
    >
      {children}
    </section>
  );
}

export function AsciiOrb() {
  return (
    <pre className="select-none text-center font-mono text-[10px] leading-tight text-neutral-400 sm:text-xs">
      {`        . · · · · · · · · · · · · · · · .
     ·                                     ·
   ·                                         ·
  ·              ON-CHAIN RAFFLE              ·
   ·                                         ·
     ·                                     ·
        . · · · · · · · · · · · · · · · .`}
    </pre>
  );
}

export function StatCard({
  label,
  tag,
  value,
  sub,
  progress,
}: {
  label: string;
  tag?: string;
  value: React.ReactNode;
  sub?: string;
  progress?: { pct: number; bar: string };
}) {
  return (
    <div className="flex min-h-[140px] flex-col p-6">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] uppercase tracking-[0.15em]">{label}</p>
        {tag ? (
          <span className="border border-black px-1.5 py-0.5 text-[9px] uppercase tracking-wider">
            {tag}
          </span>
        ) : null}
      </div>
      <div className="mt-auto pt-4 font-mono text-xl sm:text-2xl">{value}</div>
      {progress ? (
        <div className="mt-3 font-mono text-[10px] text-neutral-600">
          <span className="tracking-widest">{progress.bar}</span>{" "}
          {progress.pct.toFixed(1)}%
        </div>
      ) : null}
      {sub ? (
        <p className="mt-2 font-mono text-[10px] text-neutral-500">{sub}</p>
      ) : null}
    </div>
  );
}
