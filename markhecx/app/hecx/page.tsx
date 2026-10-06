import { Suspense } from "react";
import { HecxPage } from "@/components/mark/hecx";
import Loading from "../loading";
export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <HecxPage />
    </Suspense>
  );
}
