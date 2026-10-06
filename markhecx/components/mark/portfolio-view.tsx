"use client";
import { ExternalLink } from "lucide-react";
import { Section, Profile, safeLink } from "@/lib/mark/store";
import { Avatar, Badge, EmptyState } from "./ui";
export function PortfolioView({
  sections,
  profile,
  sample = false,
}: {
  sections: Section[];
  profile: Profile;
  sample?: boolean;
}) {
  const visible = sections.filter((s) => s.content.trim());
  return (
    <div className="portfolio-canvas">
      <div className="portfolio-mast">
        <span>{profile.name || "Your portfolio"}</span>
        <Badge tone="purple">
          {sample ? "Sample portfolio" : "Personal portfolio"}
        </Badge>
      </div>
      {visible.length ? (
        visible.map((s, i) => (
          <section
            className={`portfolio-section section-${s.type.toLowerCase()}`}
            key={s.id}
          >
            <span className="portfolio-index">
              {String(i + 1).padStart(2, "0")} / {s.type.toUpperCase()}
            </span>
            {s.type === "Hero" ? (
              <>
                <Avatar name={profile.name} image={profile.avatar} large />
                <h1>{s.content}</h1>
                {profile.identity && <p>{profile.identity}</p>}
              </>
            ) : (
              <>
                <h2>{s.title}</h2>
                {["GitHub", "LinkedIn"].includes(s.type) &&
                safeLink(s.content, s.type) ? (
                  <a
                    className="portfolio-link"
                    href={safeLink(s.content, s.type)!}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink size={17} />
                    Visit {s.type}
                  </a>
                ) : s.type === "Skills" ? (
                  <div className="tag-list">
                    {s.content
                      .split(",")
                      .filter((t) => t.trim())
                      .map((t, k) => (
                        <Badge key={k} tone="purple">
                          {t.trim()}
                        </Badge>
                      ))}
                  </div>
                ) : (
                  <p className="portfolio-text">{s.content}</p>
                )}
              </>
            )}
          </section>
        ))
      ) : (
        <EmptyState
          title="Your story starts with a section."
          description="Add and fill out a section in the editor to see your portfolio take shape."
        />
      )}
      <div className="portfolio-signature">
        Made with <strong>MarkHECX</strong>
      </div>
    </div>
  );
}
