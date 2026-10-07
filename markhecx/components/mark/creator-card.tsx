"use client";
import Link from "next/link";
import { Bookmark, FolderOpen, Sparkles } from "lucide-react";
import { useApp } from "./provider";
import { Creator } from "@/lib/mark/data";
import { hasPortfolio, Recommendation } from "@/lib/mark/discovery";
import { Card, Avatar, Badge, Action, Button } from "./ui";
import { CreatorActions } from "./discovery/creator-actions";
export function CreatorCard({
  creator: c,
  saved,
  onSave,
  returnTo = "/creators",
  recommendation,
  campaignId,
}: {
  creator: Creator;
  saved?: boolean;
  onSave?: (id: string) => void;
  returnTo?: string;
  recommendation?: Recommendation;
  campaignId?: string;
}) {
  const { state, toggleSave } = useApp();
  const isSaved =
    state.signedIn &&
    (saved ??
      (state.accountType === "Brand" ? state.brandSaved : state.saved).includes(
        c.id,
      ));
  const query = "?from=" + encodeURIComponent(returnTo) + (c.source !== "local" ? "&sample=1" : "");
  const profileHref = `/profile/${encodeURIComponent(c.username)}${query}`;
  return (
    <Card interactive className="creator-card">
      <div
        className={`creator-cover ${c.color} ${c.banner ? "has-banner" : ""}`}
        style={c.banner ? { backgroundImage: `url(${c.banner})` } : undefined}
      >
        <span className="cover-label">{c.category}</span>
        <Button
          variant="ghost"
          disabled={c.source !== "local"}
          size="icon"
          className={`save-button ${isSaved ? "saved" : ""}`}
          aria-label={`${isSaved ? "Unsave" : "Save"} ${c.name}`}
          aria-pressed={isSaved}
          onClick={() => {
            if (!state.signedIn) toggleSave(c.id);
            else (onSave || toggleSave)(c.id);
          }}
        >
          <Bookmark size={17} fill={isSaved ? "currentColor" : "none"} />
        </Button>
        <div className="cover-monogram" aria-hidden="true">
          {c.name
            .split(" ")
            .map((x) => x[0])
            .join("")}
        </div>
      </div>
      <div className="creator-body">
        <Avatar name={c.name} color={c.color} image={c.avatar} />
        <span className="sample-label">
          {c.source === "local"
            ? "Published creator"
            : "Sample creator"}
        </span>
        <h3>
          <Link href={profileHref}>{c.name}</Link>
        </h3>
        <span className="creator-username">@{c.username}</span>
        <p className="creator-identity">{c.identity}</p>
        {c.bio && <p className="creator-short-bio">{c.bio}</p>}
        <div className="tag-list">
          {c.skills.slice(0, 4).map((s) => (
            <Badge key={s}>{s}</Badge>
          ))}
        </div>
        {!!c.creative?.tools.length && (
          <p className="small-note">Tools: {c.creative.tools.slice(0, 4).join(" · ")}</p>
        )}
        {!!c.creative?.contentTypes.length && (
          <p className="small-note">Creates: {c.creative.contentTypes.join(" · ")}</p>
        )}
        {!!c.tags.length && (
          <div className="creator-tags">
            {c.tags.slice(0, 2).map((t) => (
              <span key={t}>#{t}</span>
            ))}
          </div>
        )}
        {c.availability && <span className="small-note">{c.availability}</span>}
        {c.joinedAt && (
          <span className="small-note">Joined {c.joinedAt.slice(0, 10)}{c.source === "sample" ? " · sample date" : ""}</span>
        )}
        <div className="creator-meta">
          <span>
            <FolderOpen size={14} />
            {c.projects.length}{" "}
            {c.projects.length === 1 ? "project" : "projects"}
          </span>
          {!!c.achievementCount && (
            <span>{c.achievementCount} achievements</span>
          )}
          <span>
            {hasPortfolio(c) ? "Public portfolio" : "No public portfolio"}
          </span>
        </div>
        {recommendation && state.signedIn && (
          <details className="hecx-recommendation">
            <summary>
              <Sparkles size={14} />
              Recommended by HECX
            </summary>
            <p>Local matching · {recommendation.reasons.join(" ")}</p>
          </details>
        )}
        <div className="card-actions">
          <Action href={profileHref} secondary>
            View Profile
          </Action>
          {hasPortfolio(c) && (
            <Action
              href={`/u/${encodeURIComponent(c.username)}${query}`}
              secondary
            >
              View Portfolio
            </Action>
          )}
        </div>
        {!campaignId && c.source === "local" && (
          <Action
            href={`/hecx?module=Match%20Analyzer&creator=${encodeURIComponent(c.id)}&q=${encodeURIComponent(new URLSearchParams(returnTo.split("?")[1] || "").get("q") || "")}`}
            secondary
          >
            Explain Match
          </Action>
        )}
        <CreatorActions creator={c} campaignId={campaignId} />
      </div>
    </Card>
  );
}
