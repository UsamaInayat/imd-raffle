import { SiteFooter, SiteHeader } from "@/components/layout";
import { HolderGate } from "@/components/holder-gate";
import { RaffleGrid } from "@/components/raffles";

export default function RafflesPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
          RAFFLES
        </p>
        <h1 className="mt-2 font-mono text-3xl">active drops</h1>
        <p className="mt-3 max-w-2xl font-mono text-sm text-neutral-600">
          each raffle lives entirely on ethereum. entries, draws, and winners are
          public. only wallets holding Identity MD can enter.
        </p>
        <div className="mt-8">
          <HolderGate>
            <RaffleGrid />
          </HolderGate>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
