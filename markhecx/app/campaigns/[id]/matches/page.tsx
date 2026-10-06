import { Suspense } from "react";
import { CampaignMatches } from "@/components/mark/marketplace/pages";
import Loading from "@/app/loading";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<Loading />}>
      <CampaignMatches id={id} />
    </Suspense>
  );
}
