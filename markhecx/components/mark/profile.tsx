"use client";
import { useState } from "react";
import { PublicProjectDialog } from "./phase2/public-project-dialog";
import { Pencil, MapPin, ExternalLink, Plus } from "lucide-react";
import { profileErrors } from "@/lib/mark/domain";
import { safeLink } from "@/lib/mark/store";
import { useApp, SignInGate } from "./provider";
import { PageTitle, Avatar, Card, Badge, Action, EmptyState } from "./ui";
import { ProjectCard } from "./phase2/project-card";
import type { CreatorProfile, Project } from "@/lib/mark/models";
export function ProfilePage() {
  const { state } = useApp();
  if (!state.signedIn) return <SignInGate />;
  return (
    <CreatorProfileContent
      profile={state.profile}
      projects={state.projects.filter((x) => x.status === "Published")}
      owner
    />
  );
}
/** Shared Phase 2 identity presentation for owner and discovered public profiles. */
export function CreatorProfileContent({
  profile: p,
  projects,
  owner = false,
  actions,
  label = "Public creator profile",
}: {
  profile: CreatorProfile;
  projects: Project[];
  owner?: boolean;
  actions?: React.ReactNode;
  label?: string;
}) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const errors = profileErrors(p);
  return (
    <div className="page-enter">
      <PageTitle
        eyebrow="PROFILE & IDENTITY"
        title={owner ? "Every side of you." : p.name}
        description={
          owner ? "Your identity. Your work. Your own words." : p.identity
        }
      >
        {owner ? (
          <>
            <Action href="/projects" secondary>
              Your projects
            </Action>
            <Action href="/profile/edit">
              <Pencil size={15} />
              Edit profile
            </Action>
          </>
        ) : (
          actions
        )}
      </PageTitle>
      <div className="profile-cover violet">
        <span>THE PERSON BEHIND THE WORK</span>
        <Badge>{owner ? "Your creator profile" : label}</Badge>
      </div>
      <div className="profile-heading">
        <Avatar name={p.name} image={p.avatar} large />
        <div>
          <h1>{p.name}</h1>
          {p.identity && (
            <p className="creator-identity-heading">{p.identity}</p>
          )}
          {p.username && <p>@{p.username}</p>}
        </div>
        {p.location && (
          <span className="row muted">
            <MapPin size={15} />
            {p.location}
          </span>
        )}
      </div>
      {p.creative && (
        <Card className="panel">
          <h2>Creative capabilities</h2>
          <Badge>Self-declared · not independently verified</Badge>
          <p>{p.creative.specialization}</p>
          {(
            ["tools", "models", "contentTypes", "platforms", "formats"] as const
          ).map((key) =>
            p.creative?.[key].length ? (
              <p key={key}>
                <strong>{key}: </strong>
                {p.creative[key].join(", ")}
              </p>
            ) : null,
          )}
          <p>{p.creative.workflow}</p>
          <p>
            Commercial use: {p.creative.commercialUse}. Confirm project
            licensing directly.
          </p>
        </Card>
      )}
      {owner && Object.keys(errors).length > 0 && (
        <div className="completion-notice">
          <div>
            <strong>Finish the essentials.</strong>
            <p>
              Name, username, creator identity, and 3–5 skills are all you need.
            </p>
          </div>
          <Action href="/profile/edit" secondary>
            Complete identity
          </Action>
        </div>
      )}
      <div className="profile-data-grid">
        {(p.bio || p.tags.length > 0) && (
          <Card className="panel">
            <span className="eyebrow">ABOUT</span>
            {p.bio && <p className="profile-bio">{p.bio}</p>}
            {p.tags.length > 0 && (
              <div className="tag-list">
                {p.tags.map((t) => (
                  <Badge key={t}>{t}</Badge>
                ))}
              </div>
            )}
          </Card>
        )}
        {p.skills.length > 0 && (
          <Card className="panel">
            <span className="eyebrow">CREATIVE TOOLKIT</span>
            <div className="profile-skills">
              {p.skills.map((s) => (
                <div key={s.id}>
                  <strong>{s.name}</strong>
                  <span>
                    {s.category}
                    {s.proficiency ? ` · ${s.proficiency}` : ""}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
      {(owner || projects.length > 0) && (
        <section className="profile-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">SELECTED WORK</span>
              <h2>Ideas made real.</h2>
            </div>
            {owner && (
              <Action href="/projects/new" secondary>
                <Plus size={15} />
                Add Project
              </Action>
            )}
          </div>
          {projects.length ? (
            <div className="project-grid">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  publicView={!owner}
                  onView={() => setSelectedProject(project)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No projects yet"
              description="Add something you made. Projects are optional; your story can start small."
            >
              <Action href="/projects/new">Add Project</Action>
            </EmptyState>
          )}
        </section>
      )}
      {[
        { title: "Experience", items: p.experience },
        { title: "Education", items: p.education },
        { title: "Achievements", items: p.achievements },
      ]
        .filter((group) => group.items.length)
        .map((group) => (
          <section className="profile-section" key={group.title}>
            <span className="eyebrow">YOUR STORY</span>
            <h2>{group.title}</h2>
            <div className="record-grid">
              {group.items.map((item) => (
                <Card className="panel" key={item.id}>
                  <h3>{item.title}</h3>
                  {"organization" in item && item.organization && (
                    <p className="section-copy">{item.organization}</p>
                  )}
                  {"institution" in item && item.institution && (
                    <p className="section-copy">{item.institution}</p>
                  )}
                  {"issuer" in item && item.issuer && (
                    <p className="section-copy">{item.issuer}</p>
                  )}
                  {"period" in item && item.period && (
                    <p className="small-note">{item.period}</p>
                  )}
                  {"date" in item && item.date && (
                    <p className="small-note">{item.date}</p>
                  )}
                  {item.description && (
                    <p className="section-copy profile-bio">
                      {item.description}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          </section>
        ))}
      {p.socialLinks.length > 0 && (
        <div className="profile-section">
          <h2>Elsewhere</h2>
          <div className="row section-copy">
            {p.socialLinks
              .filter((l) => safeLink(l.url, l.kind))
              .map((l) => (
                <a
                  className="social-link"
                  key={l.id}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink size={16} />
                  {l.kind}
                </a>
              ))}
          </div>
        </div>
      )}
      <PublicProjectDialog
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
      />
      {owner && (
        <>
          <Card className="panel portfolio-cta">
            <div>
              <span className="eyebrow">YOUR PUBLIC SHOWCASE</span>
              <h2>Give your work its own space.</h2>
              <p className="section-copy">
                Your portfolio draws from your profile. Make its presentation
                your own.
              </p>
            </div>
            <Action href="/portfolio">Open portfolio</Action>
          </Card>
          <div className="section-copy">
            <Action href="/hecx?module=Profile%20Analysis" secondary>
              Analyze with HECX
            </Action>
          </div>
        </>
      )}
    </div>
  );
}
