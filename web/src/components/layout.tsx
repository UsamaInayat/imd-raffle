"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useIsAdmin, useIsHolder, useWalletAddress } from "@/hooks/use-chain";
import {
  IDENTITY_MD_OPENSEA,
  RAFFLE_CONTRACT_ADDRESS,
  SITE_NAME,
  SITE_NAV_MARK,
  shortAddress,
} from "@/lib/constants";

const RAFAEL_URL = "https://rafaelbot.xyz";

function ConnectButton() {
  const { ready, authenticated, login, logout } = usePrivy();
  const address = useWalletAddress();
  const { isHolder } = useIsHolder();
  const { isAdmin } = useIsAdmin();

  if (!ready) {
    return (
      <span className="imd-pill-cell imd-pill-cell-idle" aria-hidden="true">
        CONNECT
      </span>
    );
  }

  if (!authenticated || !address) {
    return (
      <button type="button" className="imd-pill-cell" onClick={login}>
        CONNECT
      </button>
    );
  }

  const status = isAdmin
    ? "admin · idmd holder"
    : isHolder
      ? "idmd holder"
      : "not holder";

  return (
    <button
      type="button"
      className="imd-pill-cell imd-pill-cell-active"
      onClick={logout}
      title={status}
    >
      {shortAddress(address)}
    </button>
  );
}

function NavLink({
  href,
  children,
  external = false,
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}) {
  const pathname = usePathname();
  const active = !external && pathname === href;

  const className = `imd-pill-cell${active ? " imd-pill-cell-current" : ""}`;

  if (external) {
    return (
      <a href={href} className={className} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export function SiteHeader() {
  const { authenticated } = usePrivy();
  const { isAdmin } = useIsAdmin();

  return (
    <header className="imd-site-header">
      <nav className="imd-nav" aria-label="primary">
        <Link href="/" className="imd-pill" aria-label={`${SITE_NAME} home`}>
          <span className="imd-pill-mark" aria-hidden="true">
            ◇
          </span>
          <span className="imd-pill-brand">{SITE_NAV_MARK}</span>
        </Link>

        <div className="imd-pill">
          <NavLink href="/raffles">RAFFLES</NavLink>
          <NavLink href="/verify">VERIFY</NavLink>
          {authenticated && isAdmin ? (
            <NavLink href="/admin">ADMIN</NavLink>
          ) : null}
          <NavLink href="https://www.imd.fun/" external>
            IMD.FUN
          </NavLink>
        </div>

        <div className="imd-pill">
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
              <Link href="/verify">check any draw</Link>
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
        <a href={IDENTITY_MD_OPENSEA} target="_blank" rel="noreferrer">
          identity md collection
        </a>
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
    <section className={`imd-hero-copy ${centered ? "imd-hero-copy-center" : ""}`}>
      <p className="imd-eyebrow">{eyebrow}</p>
      <h1 className="imd-headline">{title}</h1>
      {description ? <p className="imd-lede">{description}</p> : null}
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
      className={`w-full flex-1 ${flush ? "" : "imd-section-pad"}`}
    >
      {children}
    </section>
  );
}

