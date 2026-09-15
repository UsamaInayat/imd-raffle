import { Suspense } from "react";
import { SiteFooter, SiteHeader } from "@/components/layout";
import { VerifyPanel } from "@/components/verify-panel";

export default function VerifyPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
          VERIFY
        </p>
        <h1 className="mt-2 font-mono text-3xl">on-chain proof</h1>
        <p className="mt-3 max-w-2xl font-mono text-sm text-neutral-600">
          inspect entries, random seeds, and winner selection for any raffle.
          no trust required — replay the algorithm yourself.
        </p>
        <div className="mt-8">
          <Suspense
            fallback={
              <div className="imd-box p-6 font-mono text-sm opacity-60">
                loading…
              </div>
            }
          >
            <VerifyPanel />
          </Suspense>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
