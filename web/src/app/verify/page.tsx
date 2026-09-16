import { Suspense } from "react";
import { PageBody, PageHero, SiteFooter, SiteHeader } from "@/components/layout";
import { VerifyPanel } from "@/components/verify-panel";

export default function VerifyPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex w-full flex-1 flex-col">
        <PageHero
          eyebrow="VERIFY"
          title="on-chain proof"
          description="audit any raffle by id — entries, vrf seed, and winners read straight from the contract."
        />
        <PageBody flush>
          <Suspense
            fallback={
              <div className="imd-stack p-6 font-mono text-sm opacity-60">
                loading…
              </div>
            }
          >
            <VerifyPanel />
          </Suspense>
        </PageBody>
      </main>
      <SiteFooter />
    </>
  );
}
