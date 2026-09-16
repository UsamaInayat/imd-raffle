import { Suspense } from "react";
import { PageBody, PageHero, SiteFooter, SiteHeader } from "@/components/layout";
import { VerifyRaffleDetail } from "@/components/verify-raffle-detail";

export default async function VerifyRafflePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const raffleId = Number(id);

  return (
    <>
      <SiteHeader />
      <main className="flex w-full flex-1 flex-col">
        <PageHero eyebrow="VERIFY" title={`raffle #${id}`} />
        <PageBody flush>
          <Suspense
            fallback={
              <div className="imd-stack p-6 font-mono text-sm opacity-60">
                loading…
              </div>
            }
          >
            <VerifyRaffleDetail raffleId={raffleId} />
          </Suspense>
        </PageBody>
      </main>
      <SiteFooter />
    </>
  );
}
