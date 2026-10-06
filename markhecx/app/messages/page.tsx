import { Suspense } from "react";
import { MessagesPage } from "@/components/mark/marketplace/messages";
import Loading from "@/app/loading";
export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <MessagesPage />
    </Suspense>
  );
}
