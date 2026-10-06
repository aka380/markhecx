import { notFound } from "next/navigation";
import { SecondaryPage } from "@/components/mark/secondary";
export default async function Page({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (
    ![
      "about",
      "samples",
      "guidelines",
      "help",
      "activity",
      "resources",
      "settings",
      "messages",
      "notifications",
    ].includes(section)
  )
    notFound();
  return <SecondaryPage section={section} />;
}
