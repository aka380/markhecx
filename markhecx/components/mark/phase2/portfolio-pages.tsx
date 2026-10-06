"use client";
import { Eye, Pencil, Copy, Globe, Lock } from "lucide-react";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import { creators } from "@/lib/mark/data";
import {
  hasPortfolio,
  sampleProfile,
  sampleProjects,
  samplePortfolio,
  safeDiscoveryReturn,
} from "@/lib/mark/discovery";
import { useApp, SignInGate } from "../provider";
import { PageTitle, Card, Badge, Action, Button, EmptyState } from "../ui";
import { visibleSections, canViewPublication } from "@/lib/mark/domain";
import { PortfolioCanvas } from "./portfolio-canvas";
export function PortfolioHome() {
  const { state } = useApp();
  if (!state.signedIn)
    return <SignInGate title="A portfolio that feels like you." />;
  const sections = visibleSections(
    state.portfolio,
    state.profile,
    state.projects,
  );
  return (
    <div className="page-enter">
      <PageTitle
        eyebrow="YOUR PUBLIC SHOWCASE"
        title="Your work deserves its own space."
        description="Build from your real identity. Make the presentation yours."
      >
        <Action href="/hecx?module=Portfolio%20Improvements" secondary>
          Optimize with HECX
        </Action>
        <Action href="/portfolio/builder">
          <Pencil size={15} />
          {sections.length ? "Open builder" : "Create portfolio"}
        </Action>
      </PageTitle>
      <div className="portfolio-overview">
        <Card className="panel">
          <span className="eyebrow">YOUR DRAFT</span>
          <h2>{state.profile.name || "Your portfolio"}</h2>
          <div className="row section-copy">
            <Badge>{state.portfolio.template}</Badge>
            <Badge>{sections.length} visible sections</Badge>
            <Badge>{state.portfolio.visibility}</Badge>
          </div>
          <p className="section-copy">
            {state.portfolio.savedAt
              ? `Last saved ${new Date(state.portfolio.savedAt).toLocaleString()}`
              : "Start with your profile. Empty sections will stay hidden."}
          </p>
          <div className="row section-copy">
            <Action href="/portfolio/builder">Customize</Action>
            <Action href="/portfolio/preview" secondary>
              <Eye size={15} />
              Preview draft
            </Action>
          </div>
        </Card>
        <Card className="panel">
          <span className="eyebrow">PUBLISHED VERSION</span>
          {state.publication ? (
            <>
              <h2>{state.publication.portfolio.status}</h2>
              <p className="section-copy">
                /u/{state.publication.portfolio.username}
              </p>
              <p className="small-note section-copy">
                Published{" "}
                {new Date(state.publication.publishedAt).toLocaleString()}. Your
                draft changes stay separate until you republish.
              </p>
              <div className="row section-copy">
                <Action
                  href={`/u/${state.publication.portfolio.username}`}
                  secondary
                >
                  View portfolio
                </Action>
              </div>
            </>
          ) : (
            <>
              <h2>Ready when you are.</h2>
              <p className="section-copy">
                Customize your draft, preview it, then publish a local version.
              </p>
            </>
          )}
        </Card>
      </div>
      <div className="info-line section-copy">
        <Globe size={17} />
        Phase 2 uses browser-local data. Public and unlisted links work on this
        browser; sharing to another device requires future hosting and storage.
      </div>
    </div>
  );
}
export function PortfolioPreview() {
  const { state } = useApp();
  if (!state.signedIn) return <SignInGate />;
  return (
    <div className="page-enter">
      <PageTitle
        eyebrow="PORTFOLIO / PREVIEW"
        title="See it through fresh eyes."
        description="A live view of your current draft. This has not changed your published version."
      >
        <Action href="/portfolio/builder" secondary>
          Back to builder
        </Action>
      </PageTitle>
      <PortfolioCanvas
        portfolio={state.portfolio}
        profile={state.profile}
        projects={state.projects}
      />
    </div>
  );
}
export function PublicPortfolio({ username }: { username: string }) {
  const { state, ready } = useApp();
  const params = useSearchParams();
  const back = safeDiscoveryReturn(params.get("from"));
  const sample = creators.find(
    (c) => c.username.toLowerCase() === username.toLowerCase(),
  );
  if (sample)
    return hasPortfolio(sample) ? (
      <div className="page-enter">
        <PageTitle
          eyebrow="SAMPLE PORTFOLIO"
          title={sample.name}
          description="Fictional creator showcase · no invented credentials or analytics"
        >
          <Action
            href={`/profile/${sample.username}?from=${encodeURIComponent(back)}`}
            secondary
          >
            Back to profile
          </Action>
          <Action href={back} secondary>
            Back to discovery
          </Action>
        </PageTitle>
        <PortfolioCanvas
          portfolio={samplePortfolio(sample)}
          profile={sampleProfile(sample)}
          projects={sampleProjects(sample)}
        />
      </div>
    ) : (
      <EmptyState
        title="No public portfolio yet"
        description="This sample creator has not added a public portfolio."
      >
        <Action href={`/profile/${sample.username}`} secondary>
          View profile
        </Action>
      </EmptyState>
    );
  if (!ready) return <p role="status">Loading portfolio…</p>;
  if (!canViewPublication(state.publication, username, state.signedIn))
    return (
      <EmptyState
        title="This portfolio isn’t available."
        description="It may be private, unpublished, or not saved on this browser."
      >
        <Action href="/">Back to MarkHECX</Action>
      </EmptyState>
    );
  const pub = state.publication!;
  return (
    <div className="page-enter">
      <div className="discovery-back">
        <Action href={back} secondary>
          Back to discovery
        </Action>
      </div>
      <div className="published-toolbar">
        <Badge>
          {pub.portfolio.visibility === "Private" ? (
            <Lock size={13} />
          ) : (
            <Globe size={13} />
          )}{" "}
          {pub.portfolio.status}
        </Badge>
        <span className="small-note">
          Local published version · /u/{pub.portfolio.username}
        </span>
        {state.signedIn && (
          <Action href="/portfolio/builder" secondary>
            Edit your draft
          </Action>
        )}
        <Button
          className="btn-secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(
                `${location.origin}/u/${encodeURIComponent(pub.portfolio.username)}`,
              );
              toast(
                "Link copied. It works only on this browser until hosting is connected.",
              );
            } catch {
              toast.error(
                "Clipboard unavailable. Copy the address from your browser.",
              );
            }
          }}
        >
          <Copy size={14} />
          Copy local link
        </Button>
      </div>
      <h1 className="sr-only">{pub.profile.name}’s portfolio</h1>
      <PortfolioCanvas
        portfolio={pub.portfolio}
        profile={pub.profile}
        projects={pub.projects}
      />
    </div>
  );
}
