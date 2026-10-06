"use client";
import { useSearchParams } from "next/navigation";
import { Bookmark } from "lucide-react";
import {
  discoveryCreators,
  hasPortfolio,
  safeDiscoveryReturn,
  sampleProfile,
  sampleProjects,
} from "@/lib/mark/discovery";
import { useApp } from "../provider";
import { Action, EmptyState, Button } from "../ui";
import { CreatorProfileContent } from "../profile";
import { CreatorActions } from "../discovery/creator-actions";
import { CreatorGridSkeleton } from "../discovery/loading";
export function PublicCreatorProfile({
  username,
  localOnly = false,
}: {
  username?: string;
  localOnly?: boolean;
}) {
  const { state, ready, toggleSave } = useApp();
  const params = useSearchParams();
  const back = safeDiscoveryReturn(params.get("from"));
  if (!ready) return <CreatorGridSkeleton />;
  const publication =
    state.publication?.portfolio.visibility === "Public"
      ? state.publication
      : null;
  const c = discoveryCreators(publication).find((c) =>
    localOnly
      ? c.source === "local"
      : c.username.toLowerCase() === username?.toLowerCase(),
  );
  if (!c)
    return (
      <EmptyState
        title="Creator not available"
        description="This creator has no public profile available in this demo."
      >
        <Action href={back}>Back to discovery</Action>
      </EmptyState>
    );
  const p = c.source === "local" ? publication!.profile : sampleProfile(c);
  const projects =
    c.source === "local"
      ? publication!.projects.filter((p) => p.status === "Published")
      : sampleProjects(c);
  const actions = (
    <>
      <Button
        className="btn-secondary"
        onClick={() => toggleSave(c.id)}
        aria-pressed={
          state.signedIn &&
          (state.accountType === "Brand"
            ? state.brandSaved
            : state.saved
          ).includes(c.id)
        }
      >
        <Bookmark size={15} />
        {state.signedIn &&
        (state.accountType === "Brand"
          ? state.brandSaved
          : state.saved
        ).includes(c.id)
          ? "Saved"
          : "Save creator"}
      </Button>
      {hasPortfolio(c) && (
        <Action
          href={`/u/${encodeURIComponent(c.username)}?from=${encodeURIComponent(back)}`}
        >
          View Portfolio
        </Action>
      )}
      <CreatorActions creator={c} />
    </>
  );
  return (
    <>
      <div className="discovery-back">
        <Action href={back} secondary>
          Back to discovery
        </Action>
      </div>
      <CreatorProfileContent
        profile={p}
        projects={projects}
        actions={actions}
        label={
          c.source === "local"
            ? "Published on this browser"
            : "Sample creator · fictional profile"
        }
      />
      {!hasPortfolio(c) && (
        <EmptyState
          title="No public portfolio yet"
          description="This creator has not added a public portfolio. Their available profile information is shown above."
        >
          <Action href={back} secondary>
            Explore more creators
          </Action>
        </EmptyState>
      )}
    </>
  );
}
