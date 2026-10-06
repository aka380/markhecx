"use client";
import { Plus, Pencil, ExternalLink, Code2 } from "lucide-react";
import { useApp, SignInGate } from "../provider";
import { PageTitle, Card, Badge, Action, EmptyState } from "../ui";
import { safeLink } from "@/lib/mark/store";
import { ProjectCard } from "./project-card";
export function ProjectsPage() {
  const { state } = useApp();
  if (!state.signedIn) return <SignInGate title="Give your work a home." />;
  return (
    <div className="page-enter">
      <PageTitle
        eyebrow="YOUR WORK"
        title="Ideas made real."
        description="Projects, experiments, and the work you’re proud of."
      >
        <Action href="/profile" secondary>
          View profile
        </Action>
        <Action href="/projects/new">
          <Plus size={16} />
          Add Project
        </Action>
      </PageTitle>
      {state.projects.length ? (
        <div className="project-grid">
          {state.projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No projects yet"
          description="Start with something you made. A small experiment is a good beginning."
        >
          <Action href="/projects/new">Add Project</Action>
        </EmptyState>
      )}
      <p className="sample-footnote">
        Your own projects only. Drafts are excluded from published portfolios.
      </p>
    </div>
  );
}
export function ProjectDetail({ id }: { id: string }) {
  const { state } = useApp();
  if (!state.signedIn) return <SignInGate />;
  const p = state.projects.find((p) => p.id === id);
  if (!p)
    return (
      <EmptyState
        title="Project not found"
        description="This project may not exist in your workspace."
      >
        <Action href="/projects">Your projects</Action>
      </EmptyState>
    );
  return (
    <div className="page-enter">
      <PageTitle
        eyebrow="YOUR WORK / PROJECT"
        title={p.title}
        description={p.description || undefined}
      >
        <Badge>{p.status}</Badge>
        <Action
          href={`/hecx?module=Project%20Analysis&project=${encodeURIComponent(p.id)}`}
          secondary
        >
          Analyze with HECX
        </Action>
        <Action href="/projects" secondary>
          All projects
        </Action>
        <Action href={`/projects/${p.id}/edit`}>
          <Pencil size={15} />
          Edit project
        </Action>
      </PageTitle>
      {p.media.length > 0 && (
        <div className="project-gallery">
          {p.media.map((m) =>
            m.type === "image" ? (
              <img key={m.id} src={m.url} alt={m.alt || p.title} />
            ) : (
              <Card key={m.id} className="panel">
                <a
                  className="text-link"
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink size={16} />
                  Watch project video
                </a>
                {m.alt && <p>{m.alt}</p>}
              </Card>
            ),
          )}
        </div>
      )}
      <div className="profile-layout">
        <div className="stack">
          {[
            ["The problem", p.problem],
            ["The solution", p.solution],
            ["My contribution", p.contribution],
          ]
            .filter(([, text]) => text.trim())
            .map(([label, text]) => (
              <Card className="panel" key={label}>
                <span className="eyebrow">{label.toUpperCase()}</span>
                <p className="profile-bio">{text}</p>
              </Card>
            ))}
          {!p.problem && !p.solution && !p.contribution && (
            <p className="small-note">
              You can add the story behind this project whenever you’re ready.
            </p>
          )}
        </div>
        <div className="stack">
          {p.techStack.length > 0 && (
            <Card className="panel">
              <h3>Built with</h3>
              <div className="tag-list">
                {p.techStack.map((t) => (
                  <Badge key={t}>{t}</Badge>
                ))}
              </div>
            </Card>
          )}
          {p.tags.length > 0 && (
            <Card className="panel">
              <h3>Project tags</h3>
              <div className="tag-list">
                {p.tags.map((t) => (
                  <Badge key={t}>{t}</Badge>
                ))}
              </div>
            </Card>
          )}
          {(p.github || p.liveDemo || p.date) && (
            <Card className="panel stack">
              {p.date && <p>{p.date}</p>}
              {p.github && safeLink(p.github, "GitHub") && (
                <a
                  className="text-link row"
                  href={p.github}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Code2 size={16} />
                  View GitHub repository
                </a>
              )}
              {p.liveDemo && safeLink(p.liveDemo) && (
                <a
                  className="text-link row"
                  href={p.liveDemo}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink size={16} />
                  Open live demo
                </a>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
