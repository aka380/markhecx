import { Suspense } from "react";
import { CampaignDiscovery } from "@/components/mark/marketplace/pages";
import Loading from "@/app/loading";
export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <CampaignDiscovery saved />
    </Suspense>
  );
}
