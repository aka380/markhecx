"use client";
import { useMarketplace } from "./provider";
import { useDiscoveryCreators } from "../discovery/use-discovery";
import { Action, Badge, Card, EmptyState, PageTitle } from "../ui";

export function EngagementsPage() {
  const { data, actor } = useMarketplace();
  const creators = useDiscoveryCreators();
  const accepted = data.applications.filter(
    (application) =>
      application.status === "Accepted" &&
      (actor.role === "Creator"
        ? application.creatorId === actor.id
        : data.campaigns.some(
            (campaign) =>
              campaign.id === application.campaignId &&
              campaign.brandId === actor.id,
          )),
  );
  return (
    <div className="page-enter">
      <PageTitle
        eyebrow="ENGAGEMENTS / DELIVERY"
        title="Move approved work through delivery."
        description="Accepted applications, campaign deliverables, deadlines and conversations stay connected."
      />
      {!actor.signedIn ? (
        <EmptyState title="Sign in to view engagements" description="Your delivery workspace is private to campaign participants." />
      ) : !accepted.length ? (
        <EmptyState title="No active engagements" description="An engagement appears after a campaign application is accepted." />
      ) : (
        <div className="campaign-grid">
          {accepted.map((application) => {
            const campaign = data.campaigns.find((item) => item.id === application.campaignId) || application.campaignSnapshot;
            const creator = creators.find((item) => item.id === application.creatorId) || application.creatorSnapshot;
            const conversation = data.conversations.find(
              (item) => item.campaignId === application.campaignId && item.creatorId === application.creatorId,
            );
            if (!campaign) return null;
            return (
              <Card className="panel" key={application.id}>
                <Badge tone="purple">{campaign.status} engagement</Badge>
                <h2>{campaign.title}</h2>
                <p>{actor.role === "Brand" ? creator?.name || "Creator" : campaign.objective || "Accepted collaboration"}</p>
                <h3>Delivery checklist</h3>
                {campaign.deliverables.map((deliverable) => (
                  <div className="deliverable" key={deliverable.id}>
                    <strong>{deliverable.quantity} × {deliverable.type}</strong>
                    <p>{deliverable.description}</p>
                    <span className="small-note">Due {deliverable.deadline || campaign.endDate || "date to be confirmed"} · {deliverable.requirements || "No extra requirements"}</span>
                  </div>
                ))}
                <div className="row">
                  <Action href={`/campaigns/${campaign.id}`} secondary>Campaign brief</Action>
                  <Action href={conversation ? `/messages?conversation=${conversation.id}` : "/messages"}>Open messages</Action>
                </div>
                <p className="small-note">Use the shared conversation for submissions, revision notes and approval records. The brand can mark the campaign completed after final acceptance.</p>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
