import { Suspense } from "react";
import { CampaignEditor } from "@/components/mark/marketplace/campaign-editor";
import Loading from "@/app/loading";
export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <CampaignEditor />
    </Suspense>
  );
}
