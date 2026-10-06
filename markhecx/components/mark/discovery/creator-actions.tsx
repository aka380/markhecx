"use client";
import { Creator } from "@/lib/mark/data";
import { useApp } from "../provider";
import { Button, Action } from "../ui";
import { InviteCreator } from "../marketplace/shared";
export function CreatorActions({
  creator,
  campaignId,
}: {
  creator: Creator;
  campaignId?: string;
}) {
  const { state, openAuth } = useApp();
  if (creator.source !== "local") return <p className="small-note">Sample showcase · no account to contact</p>;
  return (
    <div className="creator-contact-actions">
      {!state.signedIn ? (
        <>
          <Button
            aria-label={`Message ${creator.name}`}
            variant="ghost"
            onClick={() => openAuth()}
          >
            Message
          </Button>
          <Button
            aria-label={`Invite ${creator.name}`}
            variant="ghost"
            onClick={() => openAuth()}
          >
            Invite
          </Button>
        </>
      ) : state.accountType === "Brand" ? (
        <>
          <Action
            href={`/messages?creator=${creator.id}${campaignId ? `&campaign=${encodeURIComponent(campaignId)}` : ""}`}
            secondary
          >
            Message
          </Action>
          <InviteCreator creatorId={creator.id} campaignId={campaignId} />
        </>
      ) : (
        <Action href="/campaigns" secondary>
          Discover campaigns
        </Action>
      )}
    </div>
  );
}
