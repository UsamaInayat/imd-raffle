import { PageBody, PageHero, SiteFooter, SiteHeader } from "@/components/layout";
import { AdminGate } from "@/components/holder-gate";
import { AdminPortal } from "@/components/admin-portal";

export default function AdminPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex w-full flex-1 flex-col">
        <PageHero
          title="raffle control"
          description="create raffles, manage admins, and trigger draws. all actions require signed transactions. admin wallets must hold Identity MD."
        />
        <PageBody flush>
          <AdminGate>
            <AdminPortal />
          </AdminGate>
        </PageBody>
      </main>
      <SiteFooter />
    </>
  );
}
