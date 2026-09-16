import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageBody, PageHero, SiteFooter, SiteHeader } from "@/components/layout";
import { VerifyRaffleList } from "@/components/verify-raffle-list";

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  if (id !== undefined && id !== "") {
    redirect(`/verify/${id}`);
  }

  return (
    <>
      <SiteHeader />
      <main className="flex w-full flex-1 flex-col">
        <PageHero
          eyebrow="VERIFY"
          title="public record"
          description="pick a draw to see who entered and who won."
        />
        <PageBody flush>
          <Suspense
            fallback={
              <div className="imd-stack imd-panel-inner imd-type-sm opacity-60">
                loading…
              </div>
            }
          >
            <VerifyRaffleList />
          </Suspense>
        </PageBody>
      </main>
      <SiteFooter />
    </>
  );
}
