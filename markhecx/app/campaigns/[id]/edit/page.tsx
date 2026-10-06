import { Suspense } from "react";
import { CampaignEditor } from "@/components/mark/marketplace/campaign-editor";
import Loading from "@/app/loading";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<Loading />}>
      <CampaignEditor id={id} />
    </Suspense>
  );
}
