import { Suspense } from "react";
import { BrandProfile } from "@/components/mark/marketplace/pages";
import Loading from "@/app/loading";
export default async function Page({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return (
    <Suspense fallback={<Loading />}>
      <BrandProfile username={username} />
    </Suspense>
  );
}
