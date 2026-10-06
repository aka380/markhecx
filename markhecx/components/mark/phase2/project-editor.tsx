"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, Plus, X, Upload } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Project, blankProject } from "@/lib/mark/models";
import { projectErrors, splitList } from "@/lib/mark/domain";
import { safeLink } from "@/lib/mark/store";
import { useApp, SignInGate } from "../provider";
import {
  PageTitle,
  Card,
  Input,
  Textarea,
  Button,
  Action,
  EmptyState,
} from "../ui";
import { ValidationSummary } from "./fields";
import { HecxAssist } from "./assist";
export function ProjectEditor({ id }: { id?: string }) {
  const { state, ready } = useApp();
  if (!ready || !state.signedIn) return <SignInGate />;
  const existing = id ? state.projects.find((p) => p.id === id) : undefined;
  if (id && !existing)
    return (
      <EmptyState
        title="Project not found"
        description="Choose a project from your workspace."
      >
        <Action href="/projects">All projects</Action>
      </EmptyState>
    );
  return (
    <ProjectEditorForm key={id || "new"} initial={existing || blankProject()} />
  );
}
function ProjectEditorForm({ initial }: { initial: Project }) {
  const { update, log } = useApp();
  const router = useRouter();
  const [draft, setDraft] = useState(() => structuredClone(initial));
  const [tech, setTech] = useState(initial.techStack.join(", "));
  const [tags, setTags] = useState(initial.tags.join(", "));
  const [video, setVideo] = useState("");
  const [tab, setTab] = useState("Overview");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [reading, setReading] = useState(false);
  function field(key: keyof Project, value: unknown) {
    setDraft((p) => ({ ...p, [key]: value }));
  }
  async function save(status: Project["status"]) {
    const next = {
      ...draft,
      title: draft.title.trim(),
      github: draft.github.trim(),
      liveDemo: draft.liveDemo.trim(),
      techStack: splitList(tech),
      tags: splitList(tags),
      status,
      updatedAt: new Date().toISOString(),
    };
    const errors = projectErrors(next);
    setErrors(errors);
    if (Object.keys(errors).length) {
      setTab(errors.title ? "Overview" : errors.media ? "Media" : "Details");
      return;
    }
    if (!(await update((s) => ({
      ...s,
      projects: s.projects.some((p) => p.id === next.id)
        ? s.projects.map((p) => (p.id === next.id ? next : p))
        : [next, ...s.projects],
    })))) return;
    log(
      `${status === "Draft" ? "Saved draft" : "Added project"}: ${next.title}`,
    );
    toast.success(
      status === "Draft"
        ? "Project draft saved."
        : "Project added to your profile.",
    );
    router.push(`/projects/${next.id}`);
  }
  return (
    <div className="page-enter">
      <PageTitle
        eyebrow="YOUR WORK / EDIT"
        title={
          initial.title
            ? "Refine your project."
            : "Start with something you made."
        }
        description="Only a title is required. Tell the rest of the story when you’re ready."
      >
        <Action href="/projects" secondary>
          Cancel
        </Action>
        <Button
          className="btn-secondary"
          disabled={reading}
          onClick={() => save("Draft")}
        >
          <Save size={15} />
          Save draft
        </Button>
        <Button
          className="btn-primary"
          disabled={reading}
          onClick={() => save("Published")}
        >
          {initial.status === "Published" ? "Save project" : "Add to profile"}
        </Button>
      </PageTitle>
      <ValidationSummary errors={errors} />
      <Card className="panel project-edit-panel">
        <Tabs value={tab} onValueChange={setTab}>
          <div className="tabs-scroll">
            <TabsList className="discovery-tabs" variant="line">
              {["Overview", "Details", "Media"].map((t) => (
                <TabsTrigger key={t} value={t}>
                  {t}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <TabsContent value="Overview">
            <div className="form-grid">
              <label className="field">
                Project title
                <Input
                  maxLength={120}
                  value={draft.title}
                  onChange={(e) => field("title", e.target.value)}
                  aria-invalid={!!errors.title}
                  placeholder="Give your project a name"
                />
              </label>
              <label className="field">
                Short description <span className="optional">Optional</span>
                <Textarea
                  rows={4}
                  maxLength={1500}
                  value={draft.description}
                  onChange={(e) => field("description", e.target.value)}
                  placeholder="What did you make? Who is it for?"
                />
              </label>
              <div className="row">
                <HecxAssist
                  action="Improve Description"
                  source={draft.description}
                  onApply={(text) => {
                    if (text.length > 1500) {
                      toast.error(
                        "Keep the description under 1,500 characters.",
                      );
                      return false;
                    }
                    field("description", text);
                  }}
                />
                <HecxAssist
                  action="Summarize Project"
                  source={draft.description}
                  onApply={(text) => {
                    field("description", text);
                  }}
                />
              </div>
              <label className="field">
                Problem <span className="optional">Optional</span>
                <Textarea
                  rows={4}
                  maxLength={3000}
                  value={draft.problem}
                  onChange={(e) => field("problem", e.target.value)}
                />
              </label>
              <label className="field">
                Solution <span className="optional">Optional</span>
                <Textarea
                  rows={4}
                  maxLength={3000}
                  value={draft.solution}
                  onChange={(e) => field("solution", e.target.value)}
                />
              </label>
              <HecxAssist
                action="Improve Technical Explanation"
                source={draft.solution}
                onApply={(text) => {
                  if (text.length > 3000) return false;
                  field("solution", text);
                }}
              />
            </div>
          </TabsContent>
          <TabsContent value="Details">
            <div className="form-grid">
              <label className="field">
                Your role / contribution{" "}
                <span className="optional">Optional</span>
                <Textarea
                  rows={4}
                  maxLength={2000}
                  value={draft.contribution}
                  onChange={(e) => field("contribution", e.target.value)}
                />
              </label>
              <label className="field">
                Tech stack{" "}
                <span className="optional">Optional · comma separated</span>
                <Input
                  maxLength={300}
                  value={tech}
                  onChange={(e) => setTech(e.target.value)}
                  placeholder="Only technologies you used"
                />
              </label>
              <label className="field">
                Tags{" "}
                <span className="optional">Optional · comma separated</span>
                <Input
                  maxLength={300}
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                />
              </label>
              <HecxAssist
                action="Suggest Tags"
                source={splitList(tech).join(", ")}
                onApply={(text) => {
                  setTags(text);
                }}
              />
              <div className="form-columns">
                <label className="field">
                  GitHub URL <span className="optional">Optional</span>
                  <Input
                    type="url"
                    maxLength={500}
                    value={draft.github}
                    onChange={(e) => field("github", e.target.value)}
                    aria-invalid={!!errors.github}
                    placeholder="https://github.com/…"
                  />
                </label>
                <label className="field">
                  Live demo URL <span className="optional">Optional</span>
                  <Input
                    type="url"
                    maxLength={500}
                    value={draft.liveDemo}
                    onChange={(e) => field("liveDemo", e.target.value)}
                    aria-invalid={!!errors.liveDemo}
                    placeholder="https://…"
                  />
                </label>
              </div>
              <label className="field">
                Project date <span className="optional">Optional</span>
                <Input
                  type="date"
                  value={draft.date}
                  onChange={(e) => field("date", e.target.value)}
                />
              </label>
            </div>
          </TabsContent>
          <TabsContent value="Media">
            <div className="stack">
              <p className="small-note">
                Images are saved with your project. Add up to three PNG, JPEG, or WebP
                images, each under 300 KB. Video links open on their original
                site.
              </p>
              <label className="upload-label">
                <Upload size={18} />
                {reading ? "Reading images…" : "Add project images"}
                <input
                  aria-label="Project images"
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/webp"
                  disabled={reading}
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    e.target.value = "";
                    if (
                      files.length +
                        draft.media.filter((m) => m.type === "image").length >
                      3
                    ) {
                      toast.error("Use up to three images per project.");
                      return;
                    }
                    if (
                      files.some(
                        (f) =>
                          !["image/png", "image/jpeg", "image/webp"].includes(
                            f.type,
                          ) || f.size > 300 * 1024,
                      )
                    ) {
                      toast.error(
                        "Choose PNG, JPEG, or WebP images under 300 KB.",
                      );
                      return;
                    }
                    setReading(true);
                    try {
                      const media = await Promise.all(
                        files.map(
                          (f) =>
                            new Promise<{
                              id: string;
                              type: "image";
                              url: string;
                              alt: string;
                            }>((resolve, reject) => {
                              const r = new FileReader();
                              r.onload = () =>
                                resolve({
                                  id: crypto.randomUUID(),
                                  type: "image",
                                  url: String(r.result),
                                  alt: f.name,
                                });
                              r.onerror = reject;
                              r.readAsDataURL(f);
                            }),
                        ),
                      );
                      setDraft((p) => ({
                        ...p,
                        media: [...p.media, ...media],
                      }));
                    } catch {
                      toast.error("An image could not be read.");
                    } finally {
                      setReading(false);
                    }
                  }}
                />
              </label>
              <div className="media-edit-grid">
                {draft.media.map((m) => (
                  <Card key={m.id} className="media-edit">
                    {m.type === "image" ? (
                      <img src={m.url} alt={m.alt || "Project image"} />
                    ) : (
                      <p className="small-note">{m.url}</p>
                    )}
                    <label className="field">
                      {m.type === "image"
                        ? "Image description"
                        : "Video description"}
                      <Input
                        value={m.alt}
                        maxLength={200}
                        onChange={(e) =>
                          field(
                            "media",
                            draft.media.map((x) =>
                              x.id === m.id ? { ...x, alt: e.target.value } : x,
                            ),
                          )
                        }
                      />
                    </label>
                    <Button
                      variant="ghost"
                      type="button"
                      onClick={() =>
                        field(
                          "media",
                          draft.media.filter((x) => x.id !== m.id),
                        )
                      }
                    >
                      <X size={15} />
                      Remove media
                    </Button>
                  </Card>
                ))}
              </div>
              <div className="form-columns">
                <label className="field">
                  Video URL <span className="optional">Optional</span>
                  <Input
                    type="url"
                    maxLength={500}
                    value={video}
                    onChange={(e) => setVideo(e.target.value)}
                    placeholder="https://…"
                  />
                </label>
                <Button
                  className="btn-secondary align-end"
                  onClick={() => {
                    const url = safeLink(video.trim());
                    if (!url) {
                      toast.error("Enter a valid https:// video URL.");
                      return;
                    }
                    if (draft.media.some((m) => m.url === url)) {
                      toast.error("This video is already added.");
                      return;
                    }
                    field("media", [
                      ...draft.media,
                      { id: crypto.randomUUID(), type: "video", url, alt: "" },
                    ]);
                    setVideo("");
                  }}
                  disabled={!video.trim()}
                >
                  <Plus size={15} />
                  Add video link
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
