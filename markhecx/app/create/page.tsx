import { Suspense } from "react";
import { CreatePage } from "@/components/mark/create";
export default function Page() {
  return (
    <Suspense fallback={<p>Loading creation studio…</p>}>
      <CreatePage />
    </Suspense>
  );
}
