"use client";
import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Layers, FolderPlus, Award, Code2, Sparkles, Plus } from "lucide-react";
import { ProjectEditor } from "./phase2/project-editor";
import { useApp, SignInGate } from "./provider";
import { PageTitle, Card, Badge, Button, Input, Textarea, Action } from "./ui";
export function CreatePage() {
  const params = useSearchParams();
  return <CreateContent key={params.get("type") || ""} />;
}
function CreateContent() {
  const { state, update, log } = useApp();
  const p = useSearchParams();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const requested = p.get("type") || "";
  const type = ["Project", "Achievement", "Skill", "AI Generation"].includes(
    requested,
  )
    ? requested
    : "";
  if (!state.signedIn)
    return <SignInGate title="Make something that’s yours." />;
  if (type === "Project") return <ProjectEditor />;
  if (type === "Skill")
    return (
      <div className="page-enter">
        <PageTitle
          eyebrow="YOUR TOOLKIT"
          title="Skills that tell your story."
          description="Choose and organize 3–5 core skills in your profile."
        />
        <Action href="/profile/edit">Edit your skills</Action>
      </div>
    );
  return (
    <div className="page-enter">
      <PageTitle
        eyebrow="CREATE SOMETHING"
        title={
          type
            ? `Add ${type === "AI Generation" ? "a little inspiration" : `a ${type.toLowerCase()}`}`
            : "What will you create next?"
        }
        description="Small beginnings. Meaningful work. Your next chapter starts here."
      />
      {!type ? (
        <div className="creation-grid">
          {[
            ["Portfolio", "A space for your complete creative story.", Layers],
            ["Project", "Show what you made and why it matters.", FolderPlus],
            ["Achievement", "Celebrate a milestone you’re proud of.", Award],
            ["Skill", "Add a new part of your creative toolkit.", Code2],
            [
              "AI Generation",
              "Explore a starting point with the HECX demo.",
              Sparkles,
            ],
          ].map(([label, desc, Icon]) => (
            <Card interactive className="panel" key={String(label)}>
              {typeof Icon !== "string" && (
                <Icon size={26} className="accent-icon" />
              )}
              <h2>{String(label)}</h2>
              <p className="section-copy">{String(desc)}</p>
              <div className="section-copy">
                <Action
                  href={
                    label === "Portfolio"
                      ? "/portfolio"
                      : "/create?type=" + encodeURIComponent(String(label))
                  }
                  secondary
                >
                  Start {String(label).toLowerCase()}
                </Action>
              </div>
            </Card>
          ))}
        </div>
      ) : type === "AI Generation" ? (
        <Card className="panel create-form">
          <Badge tone="purple">Scripted demo</Badge>
          <h2 className="section-copy">Find a starting point.</h2>
          <p className="section-copy">
            HECX offers sample prompts for creator identities, projects, and
            portfolio improvements. Generated content is not connected to a live
            AI model.
          </p>
          <div className="section-copy">
            <Action href="/hecx">Open HECX</Action>
          </div>
        </Card>
      ) : (
        <Card className="panel create-form">
          <Badge>Saved to your profile</Badge>
          <form
            className="form-grid section-copy"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!title.trim()) return;
              if (
                !(await update((s) => ({
                  ...s,
                  profile: {
                    ...s.profile,
                    achievements: [
                      ...s.profile.achievements,
                      {
                        id: crypto.randomUUID(),
                        title: title.trim(),
                        description: detail.trim(),
                      },
                    ],
                  },
                })))
              )
                return;
              log(`Added ${type.toLowerCase()}: ${title.trim()}`);
              toast.success(`${type} saved.`);
              router.push("/profile");
            }}
          >
            <label className="field">
              {type === "Skill" ? "Skill name" : `${type} title`}
              <Input
                required
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  type === "Project"
                    ? "Give your project a name"
                    : type === "Skill"
                      ? "e.g. Product design"
                      : "What did you accomplish?"
                }
              />
            </label>
            {type !== "Skill" && (
              <label className="field">
                Your story <span className="optional">Optional</span>
                <Textarea
                  rows={7}
                  maxLength={3000}
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  placeholder="Your role, what you learned, and what made it meaningful…"
                />
              </label>
            )}
            <div className="row">
              <Button className="btn-primary" type="submit">
                <Plus size={16} />
                Save {type.toLowerCase()}
              </Button>
              <Action href="/create" secondary>
                Cancel
              </Action>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
