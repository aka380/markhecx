import { Suspense } from "react";
import { ApplicationsPage } from "@/components/mark/marketplace/pages";
import Loading from "@/app/loading";
export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <ApplicationsPage />
    </Suspense>
  );
}
