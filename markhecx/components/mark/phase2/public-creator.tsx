"use client";
import { useAPIResource } from "../api-resource";
import type { Creator } from "@/lib/mark/data";
import type { Publication } from "@/lib/mark/models";
import { useSearchParams } from "next/navigation";
import { Bookmark } from "lucide-react";
import {
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
  const target = localOnly ? state.publication?.profile.username : username;
  const resource = useAPIResource<{creator: Creator; publication: Publication}>(target ? `/creators/username/${encodeURIComponent(target)}` : null);
  if (!ready || resource.loading) return <CreatorGridSkeleton />;
  const publication = resource.data?.publication;
  const c = resource.data?.creator;
  if (!c)
    return (
      <EmptyState
        title="Creator not available"
        description="This creator has no public profile available."
      >
        {resource.error && <Button onClick={resource.retry}>Retry</Button>}
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
            ? "Published creator"
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
