import { ProjectEditor } from "@/components/mark/phase2/project-editor";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProjectEditor id={id} />;
}
