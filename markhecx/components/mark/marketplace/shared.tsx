"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Card, Badge, Button, Action, EmptyState, Textarea } from "../ui";
import { SignInGate, useApp } from "../provider";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Campaign, CreatorMatch } from "@/lib/mark/marketplace/models";
import { accepting, invitationService } from "@/lib/mark/marketplace/services";
import { useMarketplace } from "./provider";
import { useDiscoveryCreators } from "../discovery/use-discovery";
export function Access({
  role,
  children,
}: {
  role?: "Brand" | "Creator";
  children: React.ReactNode;
}) {
  const { actor, ready } = useMarketplace();
  if (!ready) return <Skeleton className="h-64 w-full" />;
  if (!actor.signedIn) return <SignInGate />;
  if (role && actor.role !== role)
    return (
      <EmptyState
        title={`${role} workspace`}
        description={`Sign in with a ${role} account to use this workspace.`}
      >
        <Action href={actor.role === "Brand" ? "/brand" : "/campaigns"}>
          Back to your workspace
        </Action>
      </EmptyState>
    );
  return <>{children}</>;
}
export function Budget({ campaign: c }: { campaign: Campaign }) {
  return (
    <span>
      {c.budget === null
        ? "Budget not specified"
        : `${c.currency} ${c.budget.toLocaleString()}`}
    </span>
  );
}
export function CampaignCard({
  campaign: c,
  match,
}: {
  campaign: Campaign;
  match?: CreatorMatch;
}) {
  return (
    <Card interactive className="panel campaign-card">
      <div className="row">
        <Badge>{c.status}</Badge>
        {c.demo && <Badge>Demo campaign</Badge>}
      </div>
      <h2>{c.title}</h2>
      <p>{c.description || "Draft description not provided."}</p>
      <div className="tag-list">
        {c.requirements.requiredSkills.map((s) => (
          <Badge key={s}>{s}</Badge>
        ))}
      </div>
      <div className="row">
        <Budget campaign={c} />
        {c.applicationDeadline && <span>Apply by {c.applicationDeadline}</span>}
      </div>
      {match && (
        <Badge tone="purple">
          HECX{" "}
          {match.score === null
            ? "Needs more evidence"
            : `${match.score}% · ${match.coverage}% evidence coverage`}
        </Badge>
      )}
      <Action href={`/campaigns/${c.id}`} secondary>
        View campaign
      </Action>
    </Card>
  );
}
export function MatchAnalysis({ match: m }: { match: CreatorMatch }) {
  return (
    <div className="match-analysis">
      <Badge tone="purple">HECX · Explainable matching</Badge>
      <h3 className="match-score">
        {m.score === null ? "Not enough data" : `${m.score}% match`}
      </h3>
      <p>{m.explanation}</p>
      <p className="small-note">
        Score = sum of (factor alignment × weight) ÷ known-factor weights.
        Unknown factors are excluded, never assumed positive. Evidence coverage:{" "}
        {m.coverage}%.
      </p>
      <div className="factor-list">
        {m.factors.map((f) => (
          <div key={f.key}>
            <strong>{f.label}</strong>
            <span>
              {f.value === null
                ? "Not enough data"
                : `${Math.round(f.value * 100)}% alignment`}{" "}
              · weight {f.weight}
            </span>
            <p>{f.evidence}</p>
          </div>
        ))}
      </div>
      <h4>Potential gaps / information to confirm</h4>
      {m.gaps.length ? (
        <ul>
          {m.gaps.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      ) : (
        <p>
          No gaps in the compared factors. Confirm the remaining campaign
          expectations directly.
        </p>
      )}
    </div>
  );
}
export function ConfirmAction({
  label,
  description,
  onConfirm,
  disabled = false,
}: {
  label: string;
  description: string;
  onConfirm: () => boolean | Promise<boolean>;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="outline"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="mark-dialog">
          <DialogTitle>{label}?</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
          <div className="row">
            <Button
              className="btn-primary"
              onClick={async () => {
                if (await onConfirm()) setOpen(false);
              }}
            >
              Confirm {label.toLowerCase()}
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
export function InviteCreator({
  creatorId,
  campaignId,
}: {
  creatorId: string;
  campaignId?: string;
}) {
  const { data, actor, change } = useMarketplace();
  const { openAuth } = useApp();
  const creators = useDiscoveryCreators();
  const [open, setOpen] = useState(false),
    [selected, setSelected] = useState(campaignId || ""),
    [message, setMessage] = useState(""),
    [note, setNote] = useState(""),
    [review, setReview] = useState(false);
  const campaigns = data.campaigns.filter(
    (c) => c.brandId === actor.id && accepting(c),
  );
  const campaign = campaignId
    ? campaigns.find((c) => c.id === campaignId)
    : campaigns.find((c) => c.id === selected) || campaigns[0];
  return (
    <>
      <Button
        variant="outline"
        onClick={() => {
          if (!actor.signedIn) {
            openAuth();
            return;
          }
          setOpen(true);
        }}
      >
        Invite
      </Button>
      <Dialog open={open && actor.signedIn} onOpenChange={setOpen}>
        <DialogContent className="mark-dialog campaign-dialog">
          <DialogTitle>Invite creator</DialogTitle>
          <DialogDescription>
            The creator receives this invitation in their MarkHECX account.
          </DialogDescription>
          {actor.role !== "Brand" ? (
            <p>Sign in with a Brand account to invite creators.</p>
          ) : !campaign ? (
            <EmptyState
              title="No open campaigns"
              description={
                campaignId
                  ? "This campaign must be published or active with an open application deadline before inviting creators."
                  : "Create and publish a campaign before inviting a creator."
              }
            >
              <Action
                href={
                  campaignId ? `/campaigns/${campaignId}` : "/campaigns/new"
                }
              >
                {campaignId ? "Open campaign" : "Create campaign"}
              </Action>
            </EmptyState>
          ) : (
            <>
              <label className="field">
                Campaign
                <select
                  aria-label="Campaign for invitation"
                  disabled={!!campaignId}
                  value={campaign.id}
                  onChange={(e) => {
                    setSelected(e.target.value);
                    setReview(false);
                  }}
                >
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </label>
              <h3>{campaign.title}</h3>
              <Budget campaign={campaign} />
              <p>
                Application deadline:{" "}
                {campaign.applicationDeadline || "Not specified"}
              </p>
              <ul>
                {campaign.deliverables.map((d) => (
                  <li key={d.id}>
                    {d.quantity} × {d.type}: {d.description}
                  </li>
                ))}
              </ul>
              <label className="field">
                Message
                <Textarea
                  value={message}
                  maxLength={6000}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    setReview(false);
                  }}
                />
              </label>
              <label className="field">
                Optional note
                <Textarea
                  value={note}
                  maxLength={2000}
                  onChange={(e) => {
                    setNote(e.target.value);
                    setReview(false);
                  }}
                />
              </label>
              {review ? (
                <>
                  <p>
                    Review the campaign, deliverables and your message above.
                    The creator receives an in-app notification.
                  </p>
                  <Button
                    className="btn-primary"
                    onClick={async () => {
                      if (
                        await change((s) =>
                          invitationService.send(
                            s,
                            actor,
                            {
                              id: crypto.randomUUID(),
                              campaignId: campaign.id,
                              creatorId,
                              message,
                              note,
                              status: "Pending",
                              createdAt: new Date().toISOString(),
                              demo: false,
                            },
                            creators.map((c) => c.id),
                          ),
                        )
                      ) {
                        toast.success(
                          "Invitation sent.",
                        );
                        setOpen(false);
                        setMessage("");
                        setReview(false);
                      }
                    }}
                  >
                    Send invitation
                  </Button>
                </>
              ) : (
                <Button
                  disabled={!message.trim()}
                  className="btn-primary"
                  onClick={() => setReview(true)}
                >
                  Review invitation
                </Button>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
