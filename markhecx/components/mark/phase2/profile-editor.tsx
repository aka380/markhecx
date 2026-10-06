"use client";
import { CreativeFields } from "./creative-fields";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, Check } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CreatorProfile, SocialLink } from "@/lib/mark/models";
import { profileErrors, splitList } from "@/lib/mark/domain";
import { useApp, SignInGate } from "../provider";
import { PageTitle, Card, Input, Textarea, Button, Action, Badge } from "../ui";
import {
  SkillEditor,
  ProfilePhoto,
  RecordEditor,
  ValidationSummary,
} from "./fields";
import { HecxAssist } from "./assist";
export function ProfileEditor() {
  const { state, ready } = useApp();
  if (!ready || !state.signedIn) return <SignInGate />;
  return <ProfileEditorForm initial={state.profile} />;
}
function ProfileEditorForm({ initial }: { initial: CreatorProfile }) {
  const { state, update, log } = useApp();
  const router = useRouter();
  const [draft, setDraft] = useState<CreatorProfile>(() =>
    structuredClone(initial),
  );
  const [tab, setTab] = useState("Identity");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tags, setTags] = useState(draft.tags.join(", "));
  const field = (key: keyof CreatorProfile, value: unknown) =>
    setDraft((p) => ({ ...p, [key]: value }));
  const evidence = Array.from(
    new Set(state.projects.flatMap((p) => p.techStack)),
  )
    .filter(
      (name) =>
        !draft.skills.some((s) => s.name.toLowerCase() === name.toLowerCase()),
    )
    .join(", ");
  async function save() {
    const next = {
      ...draft,
      name: draft.name.trim(),
      username: draft.username.trim().toLowerCase(),
      identity: draft.identity.trim(),
      tags: splitList(tags),
      socialLinks: draft.socialLinks
        .filter((l) => l.url.trim())
        .map((l) => ({ ...l, url: l.url.trim() })),
    };
    const errors = profileErrors(next);
    setErrors(errors);
    if (Object.keys(errors).length) {
      setTab(
        errors.skills
          ? "Skills"
          : errors.name || errors.username || errors.identity
            ? "Identity"
            : "Links",
      );
      return;
    }
    if (
      !(await update((s) => ({
        ...s,
        profile: next,
        portfolio: { ...s.portfolio, username: next.username },
      })))
    )
      return;
    log("Updated creator profile");
    toast.success("Your profile is saved.");
    router.push("/profile");
  }
  return (
    <div className="page-enter">
      <PageTitle
        eyebrow="PROFILE / EDIT"
        title="Make it yours."
        description="Your identity first. Everything else at your pace."
      >
        <Action href="/profile" secondary>
          Cancel
        </Action>
        <Button className="btn-primary" onClick={save}>
          <Save size={16} />
          Save profile
        </Button>
      </PageTitle>
      <ValidationSummary errors={errors} />
      <div className="profile-editor-layout">
        <Card className="panel">
          <Tabs value={tab} onValueChange={setTab}>
            <div className="tabs-scroll">
              <TabsList className="discovery-tabs" variant="line">
                {["Identity", "Skills", "Story", "Links"].map((t) => (
                  <TabsTrigger key={t} value={t}>
                    {t}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            <TabsContent value="Identity">
              <div className="form-grid">
                <ProfilePhoto
                  profile={draft}
                  onChange={(v) => field("avatar", v)}
                />
                <label className="field">
                  Name{" "}
                  <Input
                    maxLength={60}
                    value={draft.name}
                    aria-invalid={!!errors.name}
                    onChange={(e) => field("name", e.target.value)}
                  />
                </label>
                <label className="field">
                  Username
                  <Input
                    maxLength={30}
                    value={draft.username}
                    aria-invalid={!!errors.username}
                    onChange={(e) => field("username", e.target.value)}
                    placeholder="your-name"
                  />
                  <span className="small-note">
                    Your portfolio address: /u/{draft.username || "username"}.
                    Your handle must be unique across creator accounts.
                  </span>
                </label>
                <label className="field">
                  Creator identity
                  <Input
                    maxLength={100}
                    value={draft.identity}
                    aria-invalid={!!errors.identity}
                    onChange={(e) => field("identity", e.target.value)}
                    placeholder="How do you describe what you create?"
                  />
                </label>
                <HecxAssist
                  action="Suggest Creator Identity"
                  source={
                    draft.identity ||
                    draft.skills.map((s) => s.name).join(" · ")
                  }
                  onApply={(text) => {
                    if (text.length > 100) {
                      toast.error("Keep your identity under 100 characters.");
                      return false;
                    }
                    field("identity", text);
                  }}
                />
                <label className="field">
                  Bio <span className="optional">Optional</span>
                  <Textarea
                    rows={5}
                    maxLength={1200}
                    value={draft.bio}
                    onChange={(e) => field("bio", e.target.value)}
                    placeholder="A little about the person behind the work."
                  />
                </label>
                <HecxAssist
                  action="Improve Bio"
                  source={draft.bio}
                  onApply={(text) => {
                    if (text.length > 1200) {
                      toast.error("Keep your bio under 1,200 characters.");
                      return false;
                    }
                    field("bio", text);
                  }}
                />
                <div className="form-columns">
                  <label className="field">
                    Location <span className="optional">Optional</span>
                    <Input
                      maxLength={100}
                      value={draft.location}
                      onChange={(e) => field("location", e.target.value)}
                    />
                  </label>
                  <label className="field">
                    Creator tags{" "}
                    <span className="optional">Optional · comma separated</span>
                    <Input
                      maxLength={200}
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                    />
                  </label>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="Skills">
              <CreativeFields
                value={draft.creative}
                onChange={(v) => field("creative", v)}
              />
              <SkillEditor
                skills={draft.skills}
                onChange={(v) => field("skills", v)}
              />
              <div className="section-copy">
                <HecxAssist
                  action="Suggest Skills"
                  source={evidence}
                  onApply={(text) => {
                    const names = splitList(text);
                    const allowed = splitList(evidence);
                    if (names.some((n) => !allowed.includes(n))) {
                      toast.error(
                        "Only skills supported by your project technologies can be suggested here. Add other skills manually.",
                      );
                      return false;
                    }
                    if (draft.skills.length + names.length > 5) {
                      toast.error(
                        "Keep 3–5 core skills. Edit the suggestion to choose fewer skills.",
                      );
                      return false;
                    }
                    field("skills", [
                      ...draft.skills,
                      ...names.map((name) => ({
                        id: crypto.randomUUID(),
                        name,
                        category: "From project",
                      })),
                    ]);
                  }}
                />
              </div>
            </TabsContent>
            <TabsContent value="Story">
              <div className="stack">
                <RecordEditor
                  kind="Experience"
                  items={draft.experience}
                  onChange={(v) => field("experience", v)}
                />
                <div className="aside-divider" />
                <RecordEditor
                  kind="Education"
                  items={draft.education}
                  onChange={(v) => field("education", v)}
                />
                <div className="aside-divider" />
                <RecordEditor
                  kind="Achievements"
                  items={draft.achievements}
                  onChange={(v) => field("achievements", v)}
                />
              </div>
            </TabsContent>
            <TabsContent value="Links">
              <div className="form-grid">
                <p>Only the links you provide will appear on your profile.</p>
                {(["GitHub", "LinkedIn", "Website"] as const).map((kind) => (
                  <label className="field" key={kind}>
                    {kind} <span className="optional">Optional</span>
                    <Input
                      type="url"
                      value={
                        draft.socialLinks.find((l) => l.kind === kind)?.url ||
                        ""
                      }
                      maxLength={500}
                      placeholder="https://"
                      aria-invalid={!!errors[kind]}
                      onChange={(e) => {
                        const link: SocialLink = {
                          id: kind.toLowerCase(),
                          kind,
                          url: e.target.value,
                        };
                        field("socialLinks", [
                          ...draft.socialLinks.filter((l) => l.kind !== kind),
                          link,
                        ]);
                      }}
                    />
                  </label>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </Card>
        <Card className="panel profile-edit-note">
          <Badge>Just the essentials</Badge>
          <h3 className="section-copy">Your identity, in four pieces.</h3>
          <ul>
            {[
              ["Name", !!draft.name.trim()],
              ["Username", !!draft.username.trim()],
              ["Creator identity", !!draft.identity.trim()],
              [
                "3–5 skills",
                draft.skills.length >= 3 && draft.skills.length <= 5,
              ],
            ].map(([label, complete]) => (
              <li key={String(label)}>
                <Check size={16} className={complete ? "complete" : ""} />
                {String(label)}
              </li>
            ))}
          </ul>
          <p className="small-note">
            Bio, photo, projects, experience, education, achievements, location,
            and links are optional. Empty sections stay hidden.
          </p>
          <Button className="btn-primary section-copy" onClick={save}>
            Save profile
          </Button>
        </Card>
      </div>
    </div>
  );
}
