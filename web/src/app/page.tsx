import { Suspense } from "react";
import {
  AsciiOrb,
  PageBody,
  PageHero,
  SiteFooter,
  SiteHeader,
} from "@/components/layout";
import { HomeStats } from "@/components/raffles";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main className="flex w-full flex-1 flex-col">
        <PageHero
          centered
          eyebrow="IDENTITY MD HOLDERS · ON-CHAIN RAFFLES · ETHEREUM MAINNET"
          title="holder-gated raffle harness"
          description="provably fair drops for Identity MD collectors. connect with privy, enter on-chain, verify any draw yourself."
        />
        <PageBody flush>
          <div className="border-b border-black py-10">
            <AsciiOrb />
          </div>
          <Suspense
            fallback={
              <div className="imd-panel-grid cols-3 grid-cols-1">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="min-h-[140px] animate-pulse bg-neutral-50" />
                ))}
              </div>
            }
          >
            <div className="imd-panel-grid cols-3 grid-cols-1">
              <HomeStats />
            </div>
          </Suspense>
        </PageBody>
      </main>
      <SiteFooter />
    </>
  );
}
