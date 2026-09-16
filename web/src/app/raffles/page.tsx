import { PageBody, PageHero, SiteFooter, SiteHeader } from "@/components/layout";
import { HolderGate } from "@/components/holder-gate";
import { RaffleGrid } from "@/components/raffles";

export default function RafflesPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex w-full flex-1 flex-col">
        <PageHero
          title="holder drops"
          description="connect with Identity MD to enter on-chain. gas only."
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
