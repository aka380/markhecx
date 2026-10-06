import { PublicPortfolio } from "@/components/mark/phase2/portfolio-pages";
export default async function Page({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return <PublicPortfolio username={username} />;
}
