"use client";

import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { useIsAdmin, useIsHolder, useWalletAddress } from "@/hooks/use-chain";
import {
  IDENTITY_MD_OPENSEA,
  RAFFLE_CONTRACT_ADDRESS,
  SITE_NAME,
  shortAddress,
} from "@/lib/constants";

const RAFAEL_URL = "https://rafaelbot.xyz";

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
          <span aria-hidden>◇</span> {SITE_NAME}
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
  const contractHref = RAFFLE_CONTRACT_ADDRESS.endsWith("0000")
    ? undefined
    : `https://etherscan.io/address/${RAFFLE_CONTRACT_ADDRESS}`;

  return (
    <footer className="imd-foot mt-auto w-full">
      <div className="imd-foot-row">
        <div className="imd-foot-brand">
          <Link href="/" className="imd-pill" aria-label={`${SITE_NAME} home`}>
            <span className="imd-pill-mark" aria-hidden="true">
              ◇
            </span>
            <span className="imd-pill-brand imd-pill-brand-long">{SITE_NAME}</span>
          </Link>
          <p className="imd-blurb">on-chain raffles for Identity MD holders</p>
        </div>
        <div className="imd-foot-projects">
          <div className="imd-foot-label">LINKS</div>
          <dl className="imd-projects">
            <dt>raffles</dt>
            <dd>
              <Link href="/raffles">enter active drops</Link>
            </dd>
            <dt>verify</dt>
            <dd>
              <Link href="/verify">audit any draw</Link>
            </dd>
            {contractHref ? (
              <>
                <dt>contract</dt>
                <dd>
                  <a href={contractHref} target="_blank" rel="noreferrer">
                    {RAFFLE_CONTRACT_ADDRESS}
                  </a>
                </dd>
              </>
            ) : null}
            <dt>pass &amp; identity</dt>
            <dd>
              <a href={IDENTITY_MD_OPENSEA} target="_blank" rel="noreferrer">
                opensea.io/collection/identitymd
              </a>
            </dd>
          </dl>
        </div>
      </div>
      <div className="imd-foot-bar">
        <span>
          powered by{" "}
          <a href={RAFAEL_URL} target="_blank" rel="noreferrer">
            rafael
          </a>
        </span>
        <Link href="/raffles">Raffles</Link>
        <Link href="/verify">Verify</Link>
        <a href="https://www.imd.fun/" target="_blank" rel="noreferrer">
          imd.fun
        </a>
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
