"use client";
import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { PublicProjectDialog } from "./public-project-dialog";
import {
  CreatorProfile,
  Portfolio,
  Project,
  PortfolioSection,
} from "@/lib/mark/models";
import { selectedProjects, visibleSections } from "@/lib/mark/domain";
import { safeLink } from "@/lib/mark/store";
import { Avatar, Badge, Card, EmptyState } from "../ui";
import { ProjectCard } from "./project-card";
export function PortfolioCanvas({
  portfolio,
  profile,
  projects,
}: {
  portfolio: Portfolio;
  profile: CreatorProfile;
  projects: Project[];
}) {
  const sections = visibleSections(portfolio, profile, projects);
  const [project, setProject] = useState<Project | null>(null);
  const featured = selectedProjects(portfolio, projects);
  const links = profile.socialLinks.filter((l) => safeLink(l.url, l.kind));
  function content(s: PortfolioSection) {
    if (s.source === "custom") {
      if (
        ["GitHub", "LinkedIn"].includes(s.type) &&
        safeLink(s.content, s.type)
      )
        return (
          <a
            className="social-link"
            href={s.content}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink size={15} />
            Visit {s.type}
          </a>
        );
      if (s.type === "Skills")
        return (
          <div className="tag-list">
            {s.content
              .split(",")
              .filter((x) => x.trim())
              .map((v, i) => (
                <Badge key={i}>{v.trim()}</Badge>
              ))}
          </div>
        );
      return (
        <p
          className={s.type === "Hero" ? "showcase-headline" : "portfolio-text"}
        >
          {s.content}
        </p>
      );
    }
    switch (s.type) {
      case "Hero":
        return (
          <>
            <Avatar name={profile.name} image={profile.avatar} large />
            <h2 className="showcase-headline">{profile.name}</h2>
            {profile.identity && (
              <p className="showcase-identity">{profile.identity}</p>
            )}
            {profile.bio && <p className="showcase-bio">{profile.bio}</p>}
            {links.length > 0 && (
              <div className="row section-copy">
                {links.map((l) => (
                  <a
                    className="social-link"
                    key={l.id}
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {l.kind}
                    <ExternalLink size={14} />
                  </a>
                ))}
              </div>
            )}
          </>
        );
      case "About":
        return <p className="portfolio-text">{profile.bio}</p>;
      case "Skills":
        return (
          <div className="showcase-skills">
            {profile.skills.map((skill) => (
              <Card key={skill.id} className="skill-row">
                <div>
                  <strong>{skill.name}</strong>
                  <span>
                    {skill.category}
                    {skill.proficiency ? ` · ${skill.proficiency}` : ""}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        );
      case "Projects":
        return (
          <div className="showcase-projects">
            {featured.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                publicView
                onView={() => setProject(p)}
              />
            ))}
          </div>
        );
      case "Experience":
      case "Education":
      case "Achievements": {
        const entries =
          s.type === "Experience"
            ? profile.experience
            : s.type === "Education"
              ? profile.education
              : profile.achievements;
        return (
          <div className="showcase-records">
            {entries.map((item) => (
              <Card className="panel" key={item.id}>
                <h3>{item.title}</h3>
                {"organization" in item && item.organization && (
                  <p>{item.organization}</p>
                )}
                {"institution" in item && item.institution && (
                  <p>{item.institution}</p>
                )}
                {"issuer" in item && item.issuer && <p>{item.issuer}</p>}
                {"period" in item && item.period && (
                  <span className="small-note">{item.period}</span>
                )}
                {"date" in item && item.date && (
                  <span className="small-note">{item.date}</span>
                )}
                {item.description && (
                  <p className="portfolio-text">{item.description}</p>
                )}
              </Card>
            ))}
          </div>
        );
      }
      case "GitHub":
      case "LinkedIn":
      case "Contact":
        return (
          <div className="row">
            {links
              .filter((l) => s.type === "Contact" || l.kind === s.type)
              .map((l) => (
                <a
                  className="social-link"
                  href={l.url}
                  key={l.id}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink size={15} />
                  {l.kind}
                </a>
              ))}
          </div>
        );
    }
  }
  const settings = portfolio.settings;
  return (
    <div
      className={`portfolio-canvas showcase template-${portfolio.template.toLowerCase()} typography-${settings.typography.toLowerCase()} layout-${settings.layout.toLowerCase()} appearance-${settings.appearance.toLowerCase()} hero-${settings.heroStyle === "Centered" ? "centered" : "left"} buttons-${settings.buttonStyle.toLowerCase()}`}
    >
      <div className="portfolio-mast">
        <span>{profile.name || "Your portfolio"}</span>
        <span>
          {profile.username ? `@${profile.username}` : portfolio.template}
        </span>
      </div>
      {sections.length ? (
        <div className="showcase-body">
          {sections.map((s, i) => (
            <section
              key={s.id}
              className={`portfolio-section section-${s.type.toLowerCase()}`}
            >
              <span className="portfolio-index">
                {String(i + 1).padStart(2, "0")} / {s.type.toUpperCase()}
              </span>
              {s.type !== "Hero" && <h2>{s.title}</h2>}
              {content(s)}
            </section>
          ))}
        </div>
      ) : (
        <EmptyState
          title="A little space for your story."
          description="Add your own profile information or enable a section with content to see your portfolio here."
        />
      )}
      <div className="portfolio-signature">
        Made with <strong>MarkHECX</strong>
      </div>
      <PublicProjectDialog project={project} onClose={() => setProject(null)} />
    </div>
  );
}
