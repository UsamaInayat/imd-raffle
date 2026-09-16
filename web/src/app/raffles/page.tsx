import { PageBody, SiteFooter, SiteHeader } from "@/components/layout";
import { HolderGate } from "@/components/holder-gate";
import { RaffleGrid } from "@/components/raffles";

export default function RafflesPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex w-full flex-1 flex-col">
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
