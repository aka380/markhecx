import { CreatorProfile } from "@/components/mark/creators";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CreatorProfile id={id} />;
}
