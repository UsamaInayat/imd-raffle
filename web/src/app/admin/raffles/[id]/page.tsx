import { PageBody, PageHero, SiteFooter, SiteHeader } from "@/components/layout";
import { AdminGate } from "@/components/holder-gate";
import { AdminRaffleDetail } from "@/components/admin-raffle-detail";

export default async function AdminRafflePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <>
      <SiteHeader />
      <main className="flex w-full flex-1 flex-col">
        <PageHero
          eyebrow="ADMIN · RAFFLE"
          title={`raffle #${id}`}
          description="manage draw actions and export entries or winners."
        />
        <PageBody flush>
          <AdminGate>
            <AdminRaffleDetail raffleId={Number(id)} />
          </AdminGate>
        </PageBody>
      </main>
      <SiteFooter />
    </>
  );
}
