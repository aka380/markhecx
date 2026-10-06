import { CreatorGridSkeleton } from "@/components/mark/discovery/loading";
import { Suspense } from "react";
import { CreatorsPage } from "@/components/mark/creators";
export default function Page() {
  return (
    <Suspense fallback={<CreatorGridSkeleton />}>
      <CreatorsPage />
    </Suspense>
  );
}
