"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Eye, Save, Upload, Settings2, Check } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import {
  Portfolio,
  PortfolioSection,
  portfolioTypes,
  CreatorProfile,
} from "@/lib/mark/models";
import {
  visibleSections,
  publishPortfolio,
  profileErrors,
} from "@/lib/mark/domain";
import { safeLink } from "@/lib/mark/store";
import { useApp, SignInGate } from "./provider";
import {
  PageTitle,
  Card,
  Badge,
  Action,
  Button,
  Input,
  Textarea,
  Choice,
} from "./ui";
import { PortfolioCanvas } from "./phase2/portfolio-canvas";
import {
  TemplatePicker,
  AppearanceControls,
  SectionList,
} from "./phase2/portfolio-controls";
import { HecxAssist } from "./phase2/assist";
import { SkillEditor, ValidationSummary } from "./phase2/fields";
export function PortfolioBuilder() {
  const { state, update, log, ready } = useApp();
  const [view, setView] = useState("Editor");
  const [control, setControl] = useState("Sections");
  const [active, setActive] = useState("");
  const [remove, setRemove] = useState<PortfolioSection | null>(null);
  const [publish, setPublish] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [profileDraft, setProfileDraft] = useState<CreatorProfile | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  if (!ready || !state.signedIn)
    return <SignInGate title="A portfolio that feels like you." />;
  const portfolio = state.portfolio;
  const profile = profileDraft || state.profile;
  const selected = portfolio.sections.find((s) => s.id === active);
  const visible = visibleSections(portfolio, profile, state.projects);
  async function setPortfolio(p: Portfolio) {
    return update((s) => ({ ...s, portfolio: p }));
  }
  function patchSection(patch: Partial<PortfolioSection>) {
    setPortfolio({
      ...portfolio,
      sections: portfolio.sections.map((s) =>
        s.id === active ? { ...s, ...patch } : s,
      ),
    });
  }
  async function saveDraft() {
    if (!(await setPortfolio({ ...portfolio, savedAt: new Date().toISOString() }))) return;
    log("Saved portfolio draft");
    toast.success("Portfolio draft saved.");
  }
  async function publishNow() {
    try {
      if (profileDraft) {
        toast.error("Save or cancel your profile edits before publishing.");
        return;
      }
      for (const section of portfolio.sections) {
        if (
          section.enabled &&
          section.source === "custom" &&
          ["GitHub", "LinkedIn"].includes(section.type) &&
          section.content.trim() &&
          !safeLink(section.content.trim(), section.type)
        )
          throw Error(`Invalid ${section.type} URL in your portfolio.`);
      }
      const publication = publishPortfolio(
        portfolio,
        state.profile,
        state.projects,
      );
      if (!(await update((s) => ({
        ...s,
        publication,
        portfolio: {
          ...s.portfolio,
          savedAt: publication.publishedAt,
          status: publication.portfolio.status,
        },
      })))) return;
      log("Published portfolio: " + publication.portfolio.visibility);
      setPublish(false);
      toast.success("Your published portfolio is ready.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to publish.");
    }
  }
  const sectionEditor = selected && (
    <Card className="panel section-edit-panel">
      <div className="row">
        <h3>{selected.type}</h3>
        <Badge>
          {selected.source === "profile"
            ? "Linked to your profile"
            : "Portfolio only"}
        </Badge>
      </div>
      <div className="form-grid section-copy">
        <label className="field">
          Section title
          <Input
            maxLength={80}
            value={selected.title}
            onChange={(e) => patchSection({ title: e.target.value })}
          />
        </label>
        <label className="row">
          <Switch
            checked={selected.source === "profile"}
            onCheckedChange={(v) =>
              patchSection({ source: v ? "profile" : "custom" })
            }
          />
          Use profile information
        </label>
        {selected.source === "profile" ? (
          <>
            <p className="small-note">
              This section follows your profile and projects. Empty information
              stays hidden.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setProfileDraft(structuredClone(state.profile));
                setErrors({});
              }}
            >
              Edit source profile
            </Button>
          </>
        ) : (
          <label className="field">
            Portfolio content
            <Textarea
              rows={6}
              maxLength={6000}
              placeholder={
                ["GitHub", "LinkedIn"].includes(selected.type)
                  ? "https://…"
                  : "Your own words. Leave blank to hide this section."
              }
              value={selected.content}
              onChange={(e) => patchSection({ content: e.target.value })}
            />
            <span className="small-note">
              Edits here never change your profile.
            </span>
          </label>
        )}
        <HecxAssist
          key={selected.id}
          action="Improve Section"
          source={
            selected.source === "custom"
              ? selected.content
              : selected.type === "Hero"
                ? profile.name
                : selected.type === "About"
                  ? profile.bio
                  : selected.type === "Skills"
                    ? profile.skills.map((s) => s.name).join(", ")
                    : ""
          }
          onApply={(content) => patchSection({ source: "custom", content })}
        />
      </div>
    </Card>
  );
  const controls = (
    <>
      <Tabs value={control} onValueChange={setControl}>
        <div className="tabs-scroll">
          <TabsList className="studio-control-tabs">
            {["Sections", "Template", "Style", "Projects"].map((t) => (
              <TabsTrigger key={t} value={t}>
                {t}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="Sections">
          <SectionList
            portfolio={portfolio}
            onChange={setPortfolio}
            active={active}
            onSelect={(id) => setActive(id)}
            onRemove={setRemove}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="btn-secondary section-copy">
                <Plus size={15} />
                Add section
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="mark-menu" align="start">
              {portfolioTypes.map((type) => (
                <DropdownMenuItem
                  key={type}
                  onSelect={() => {
                    const s: PortfolioSection = {
                      id: crypto.randomUUID(),
                      type,
                      title: type,
                      content: "",
                      enabled: true,
                      source: "profile",
                    };
                    setPortfolio({
                      ...portfolio,
                      sections: [...portfolio.sections, s],
                    });
                    setActive(s.id);
                  }}
                >
                  {type}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="section-copy">{sectionEditor}</div>
          <div className="section-copy">
            <HecxAssist
              action="Generate Structure"
              source={portfolioTypes
                .filter(
                  (type) =>
                    visibleSections(
                      {
                        ...portfolio,
                        sections: [
                          {
                            id: type,
                            type,
                            title: type,
                            content: "",
                            enabled: true,
                            source: "profile",
                          },
                        ],
                      },
                      state.profile,
                      state.projects,
                    ).length,
                )
                .join("\n")}
              onApply={(text) => {
                const names = text
                  .split("\n")
                  .map((x) => x.trim())
                  .filter(Boolean);
                if (
                  names.some(
                    (x) =>
                      !portfolioTypes.includes(
                        x as (typeof portfolioTypes)[number],
                      ),
                  )
                ) {
                  toast.error("Choose only the supported section names.");
                  return false;
                }
                const ordered = [...new Set(names)].map(
                  (type) =>
                    portfolio.sections.find((s) => s.type === type) || {
                      id: crypto.randomUUID(),
                      type: type as (typeof portfolioTypes)[number],
                      title: type,
                      content: "",
                      enabled: true,
                      source: "profile" as const,
                    },
                );
                setPortfolio({
                  ...portfolio,
                  sections: [
                    ...ordered,
                    ...portfolio.sections.filter(
                      (s) => !ordered.some((o) => o.id === s.id),
                    ),
                  ],
                });
              }}
            />
          </div>
        </TabsContent>
        <TabsContent value="Template">
          <TemplatePicker portfolio={portfolio} onChange={setPortfolio} />
          <p className="small-note section-copy">
            Five layouts. One MarkHECX design system.
          </p>
        </TabsContent>
        <TabsContent value="Style">
          <AppearanceControls portfolio={portfolio} onChange={setPortfolio} />
        </TabsContent>
        <TabsContent value="Projects">
          <p className="small-note">
            Choose featured projects. If none are selected, all projects added
            to your profile appear. Draft projects never appear publicly.
          </p>
          <div className="featured-projects">
            {state.projects
              .filter((p) => p.status === "Published")
              .map((p) => (
                <label key={p.id} className="featured-project">
                  <Switch
                    aria-label={`Feature ${p.title}`}
                    checked={portfolio.featuredProjects.includes(p.id)}
                    onCheckedChange={(v) =>
                      setPortfolio({
                        ...portfolio,
                        featuredProjects: v
                          ? [...portfolio.featuredProjects, p.id]
                          : portfolio.featuredProjects.filter(
                              (id) => id !== p.id,
                            ),
                      })
                    }
                  />
                  <span>{p.title}</span>
                </label>
              ))}
          </div>
          <Action href="/projects/new" secondary>
            Add Project
          </Action>
        </TabsContent>
      </Tabs>
    </>
  );
  return (
    <div className="page-enter">
      <PageTitle
        eyebrow="PORTFOLIO / BUILDER"
        title="Your story, your way."
        description="Customize the presentation. Keep your identity intact."
      >
        <Action href="/portfolio" secondary>
          Overview
        </Action>
        <Button className="btn-secondary" onClick={saveDraft}>
          <Save size={15} />
          Save draft
        </Button>
        <Button className="btn-primary" onClick={() => setPublish(true)}>
          <Upload size={15} />
          Publish
        </Button>
      </PageTitle>
      <div className="studio-status">
        <Badge>{portfolio.template}</Badge>
        <span>{visible.length} visible sections</span>
        <span>
          Changes stay local. Published versions update only when you publish.
        </span>
      </div>
      <div className="mobile-builder-toolbar">
        <Tabs value={view} onValueChange={setView}>
          <TabsList>
            <TabsTrigger value="Editor">Editor</TabsTrigger>
            <TabsTrigger value="Preview">Preview</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button className="btn-secondary" onClick={() => setMobile(true)}>
          <Settings2 size={15} />
          Controls
        </Button>
      </div>
      <div className={`studio-grid view-${view.toLowerCase()}`}>
        <aside className="studio-controls">
          <Card className="panel">{controls}</Card>
        </aside>
        <div className="studio-preview">
          <div className="preview-caption">
            <span>
              <Eye size={15} />
              Live preview
            </span>
            <Action href="/portfolio/preview" secondary>
              Full preview
            </Action>
          </div>
          <PortfolioCanvas
            portfolio={portfolio}
            profile={profile}
            projects={state.projects}
          />
          <div className="section-copy">
            <HecxAssist
              action="Improve Portfolio"
              source={
                visible.length
                  ? `Your draft shows ${visible.map((s) => s.title).join(", ")}.\n${state.projects.some((p) => p.status === "Published") ? "Project details are available." : "Add a real project when you have one to share."}\nReview the section order and choose the work you want to lead with.`
                  : ""
              }
            />
          </div>
        </div>
      </div>
      <Sheet open={mobile} onOpenChange={setMobile}>
        <SheetContent side="bottom" className="studio-sheet">
          <SheetTitle>Portfolio controls</SheetTitle>
          <SheetDescription>
            Changes update the draft preview immediately.
          </SheetDescription>
          {controls}
        </SheetContent>
      </Sheet>
      <AlertDialog open={!!remove} onOpenChange={(v) => !v && setRemove(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Remove {remove?.title}?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the portfolio section only. Your profile and projects
            stay unchanged.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep section</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setPortfolio({
                  ...portfolio,
                  sections: portfolio.sections.filter(
                    (s) => s.id !== remove?.id,
                  ),
                });
                setRemove(null);
              }}
            >
              Remove section
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={publish} onOpenChange={setPublish}>
        <DialogContent className="mark-dialog">
          <DialogTitle>Ready for your next chapter?</DialogTitle>
          <DialogDescription>
            Review the sections and choose who can view this local published
            version. Optional information is never required.
          </DialogDescription>
          <div className="publish-summary">
            {visible.map((s) => (
              <Badge key={s.id}>
                <Check size={13} />
                {s.title}
              </Badge>
            ))}
            {!visible.length && (
              <p>No sections with content are enabled yet.</p>
            )}
          </div>
          <label className="field">
            Visibility
            <Choice
              label="Portfolio visibility"
              value={portfolio.visibility}
              onChange={(value) =>
                setPortfolio({
                  ...portfolio,
                  visibility: value as Portfolio["visibility"],
                })
              }
              options={["Public", "Unlisted", "Private"]}
            />
          </label>
          <p className="small-note">
            {portfolio.visibility === "Public"
              ? "Anyone using this browser can view the published route. It is eligible for local discovery."
              : portfolio.visibility === "Unlisted"
                ? "Accessible through the direct local link; excluded from discovery."
                : "Only visible while signed in to the local creator workspace."}{" "}
            These are UI access states, not secure server authorization.
          </p>
          <p className="small-note">
            Address: /u/{state.profile.username || "username"}. Cross-device
            sharing is not connected.
          </p>
          <Button
            className="btn-primary"
            onClick={publishNow}
            disabled={!visible.length}
          >
            Publish locally
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!profileDraft}
        onOpenChange={(v) => {
          if (!v) setProfileDraft(null);
        }}
      >
        <DialogContent className="mark-dialog">
          <DialogTitle>Edit source profile</DialogTitle>
          <DialogDescription>
            These fields are your actual creator identity. Changes appear in the
            live preview now and update your profile only when you save.
          </DialogDescription>
          <ValidationSummary errors={errors} />
          {profileDraft && (
            <div className="form-grid">
              <label className="field">
                Name
                <Input
                  maxLength={60}
                  value={profileDraft.name}
                  onChange={(e) =>
                    setProfileDraft({ ...profileDraft, name: e.target.value })
                  }
                />
              </label>
              <label className="field">
                Username
                <Input
                  maxLength={30}
                  value={profileDraft.username}
                  onChange={(e) =>
                    setProfileDraft({
                      ...profileDraft,
                      username: e.target.value,
                    })
                  }
                />
              </label>
              <label className="field">
                Creator identity
                <Input
                  maxLength={100}
                  value={profileDraft.identity}
                  onChange={(e) =>
                    setProfileDraft({
                      ...profileDraft,
                      identity: e.target.value,
                    })
                  }
                />
              </label>
              <label className="field">
                Bio <span className="optional">Optional</span>
                <Textarea
                  rows={4}
                  maxLength={1200}
                  value={profileDraft.bio}
                  onChange={(e) =>
                    setProfileDraft({ ...profileDraft, bio: e.target.value })
                  }
                />
              </label>
              <SkillEditor
                skills={profileDraft.skills}
                onChange={(skills) =>
                  setProfileDraft({ ...profileDraft, skills })
                }
              />
              <Button
                className="btn-primary"
                onClick={async () => {
                  const next = {
                    ...profileDraft,
                    name: profileDraft.name.trim(),
                    username: profileDraft.username.trim().toLowerCase(),
                    identity: profileDraft.identity.trim(),
                  };
                  const errors = profileErrors(next);
                  setErrors(errors);
                  if (Object.keys(errors).length) return;
                  if (!(await update((s) => ({
                    ...s,
                    profile: next,
                    portfolio: { ...s.portfolio, username: next.username },
                  })))) return;
                  setProfileDraft(null);
                  toast.success("Source profile updated.");
                }}
              >
                Save profile changes
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
