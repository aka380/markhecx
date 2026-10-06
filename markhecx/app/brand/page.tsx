import { Suspense } from "react";
import { BrandDashboard } from "@/components/mark/marketplace/pages";
import Loading from "@/app/loading";
export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <BrandDashboard />
    </Suspense>
  );
}
