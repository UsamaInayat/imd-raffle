import { PageBody, PageHero, SiteFooter, SiteHeader } from "@/components/layout";
import { HolderGate } from "@/components/holder-gate";
import { RaffleGrid } from "@/components/raffles";

export default function RafflesPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex w-full flex-1 flex-col">
        <PageHero
          eyebrow="RAFFLES"
          title="active drops"
          description="enter open raffles with your wallet. each card shows where it is in the flow — enter → wait → draw → verify."
        />
        <PageBody flush>
          <HolderGate>
            <RaffleGrid />
          </HolderGate>
        </PageBody>
      </main>
      <SiteFooter />
    </>
  );
}
