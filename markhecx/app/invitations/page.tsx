import { Suspense } from "react";
import { InvitationsPage } from "@/components/mark/marketplace/pages";
import Loading from "@/app/loading";
export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <InvitationsPage />
    </Suspense>
  );
}
