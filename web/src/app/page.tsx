import { Suspense } from "react";
import { HomeStatsPanel } from "@/components/home-stats";
import { LuckyDrawMachine } from "@/components/lucky-draw-machine";
import { SiteFooter, SiteHeader } from "@/components/layout";

export default function HomePage() {
  return (
    <>
      <main className="imd-hero">
        <div className="imd-hero-body">
          <SiteHeader />

          <div className="imd-hero-copy imd-hero-copy-center">
            <p className="imd-eyebrow">
              onchain verifiable probability machine
            </p>
            <h1 className="imd-headline">identity draw</h1>
          </div>

          <LuckyDrawMachine />

          <Suspense
            fallback={
              <div className="imd-stats">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="imd-card min-h-[140px] animate-pulse bg-neutral-50" />
                ))}
              </div>
            }
          >
            <HomeStatsPanel />
          </Suspense>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
