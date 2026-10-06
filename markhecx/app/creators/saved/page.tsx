import { Suspense } from "react";
import { CreatorsPage } from "@/components/mark/creators";
import { CreatorGridSkeleton } from "@/components/mark/discovery/loading";
export default function Page() {
  return (
    <Suspense fallback={<CreatorGridSkeleton />}>
      <CreatorsPage savedRoute />
    </Suspense>
  );
}
