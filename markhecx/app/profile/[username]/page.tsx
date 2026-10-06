import { Suspense } from "react";
import { PublicCreatorProfile } from "@/components/mark/phase2/public-creator";
import { CreatorGridSkeleton } from "@/components/mark/discovery/loading";
export default async function Page({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return (
    <Suspense fallback={<CreatorGridSkeleton />}>
      <PublicCreatorProfile username={username} />
    </Suspense>
  );
}
