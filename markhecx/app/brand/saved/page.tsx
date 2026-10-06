import { Suspense } from "react";
import { SavedCreatorsPage } from "@/components/mark/marketplace/pages";
import Loading from "@/app/loading";
export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <SavedCreatorsPage />
    </Suspense>
  );
}
