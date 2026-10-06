"use client";
import { FolderOpen, ExternalLink, Code2 } from "lucide-react";
import { Project } from "@/lib/mark/models";
import { safeLink } from "@/lib/mark/store";
import { Card, Badge, Action, Button } from "../ui";
export function ProjectCard({
  project: p,
  publicView = false,
  onView,
}: {
  project: Project;
  publicView?: boolean;
  onView?: () => void;
}) {
  const visual = p.media.find((m) => m.type === "image");
  return (
    <Card interactive className="project-card">
      <div className="project-visual">
        {visual ? (
          <img src={visual.url} alt={visual.alt || p.title} loading="lazy" />
        ) : (
          <FolderOpen size={33} aria-hidden="true" />
        )}
        {!publicView && <Badge>{p.status}</Badge>}
      </div>
      <div className="project-card-body">
        <h3>{p.title}</h3>
        {p.description && <p>{p.description}</p>}
        {!!p.techStack.length && (
          <div className="tag-list">
            {p.techStack.map((t) => (
              <Badge key={t}>{t}</Badge>
            ))}
          </div>
        )}
        {!!p.tags.length && (
          <div className="project-tags">
            {p.tags.map((t) => (
              <span key={t}>#{t}</span>
            ))}
          </div>
        )}
        <div className="project-links">
          {p.github && safeLink(p.github, "GitHub") && (
            <a href={p.github} target="_blank" rel="noopener noreferrer">
              <Code2 size={15} />
              GitHub
            </a>
          )}
          {p.liveDemo && safeLink(p.liveDemo) && (
            <a href={p.liveDemo} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={15} />
              Live demo
            </a>
          )}
        </div>
        {publicView && onView && (
          <Button className="btn-secondary" onClick={onView}>
            View Project
          </Button>
        )}
        {!publicView && (
          <Action href={`/projects/${p.id}`} secondary>
            View Project
          </Action>
        )}
      </div>
    </Card>
  );
}
