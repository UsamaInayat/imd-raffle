import { Suspense } from "react";
import { AsciiOrb, SiteFooter, SiteHeader } from "@/components/layout";
import { HomeStats } from "@/components/raffles";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        <p className="text-center text-[10px] uppercase tracking-[0.25em] text-neutral-500">
          IDENTITY MD HOLDERS · ON-CHAIN RAFFLES · ETHEREUM MAINNET
        </p>
        <h1 className="mt-6 text-center font-mono text-3xl sm:text-4xl">
          holder-gated raffle harness
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-center font-mono text-sm text-neutral-600">
          provably fair drops for Identity MD collectors. connect with privy,
          enter on-chain, verify any draw yourself.
        </p>

        <div className="my-10">
          <AsciiOrb />
        </div>

        <Suspense
          fallback={
            <div className="grid gap-4 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="imd-box h-36 animate-pulse" />
              ))}
            </div>
          }
        >
          <div className="grid gap-4 md:grid-cols-3">
            <HomeStats />
          </div>
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
