import { Suspense } from "react";
import { PremiumPage } from "@/components/mark/premium";
export default function Page() {
  return (
    <Suspense fallback={<p>Loading Premium…</p>}>
      <PremiumPage />
    </Suspense>
  );
}
