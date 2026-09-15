import { SiteFooter, SiteHeader } from "@/components/layout";
import { AdminGate } from "@/components/holder-gate";
import { AdminPortal } from "@/components/admin-portal";

export default function AdminPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">ADMIN</p>
        <h1 className="mt-2 font-mono text-3xl">raffle control</h1>
        <p className="mt-3 max-w-2xl font-mono text-sm text-neutral-600">
          create raffles, manage admins, and trigger draws. all actions require signed
          transactions. admin wallets must hold Identity MD.
        </p>
        <div className="mt-8">
          <AdminGate>
            <AdminPortal />
          </AdminGate>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
