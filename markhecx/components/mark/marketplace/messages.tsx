"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMarketplace } from "./provider";
import { Access } from "./shared";
import {
  Card,
  PageTitle,
  Button,
  Textarea,
  EmptyState,
  Action,
  Badge,
} from "../ui";
import {
  messageService,
  readableCampaign,
  owns,
} from "@/lib/mark/marketplace/services";
import { useDiscoveryCreators } from "../discovery/use-discovery";
export function MessagesPage() {
  const params = useSearchParams();
  return (
    <Access>
      <Messages
        key={params.toString()}
        campaignId={params.get("campaign") || ""}
        creatorId={params.get("creator") || ""}
        username={params.get("to") || ""}
      />
    </Access>
  );
}
function Messages({
  campaignId,
  creatorId,
  username,
}: {
  campaignId: string;
  creatorId: string;
  username: string;
}) {
  const { data, actor, change } = useMarketplace();
  const pool = useDiscoveryCreators();
  const [selected, setSelected] = useState(""),
    [campaign, setCampaign] = useState(campaignId),
    [creator, setCreator] = useState(
      creatorId || pool.find((c) => c.username === username)?.id || "",
    ),
    [text, setText] = useState("");
  const conversations = messageService.list(data, actor);
  const current = conversations.find((c) => c.id === selected);
  const campaigns = data.campaigns.filter((c) =>
    actor.role === "Brand"
      ? owns(actor, c)
      : !!readableCampaign(data, actor, c.id),
  );
  const activeCampaign = campaigns.find(
    (c) => c.id === (current?.campaignId || campaign),
  );
  const recipient =
    actor.role === "Creator" ? actor.id : current?.creatorId || creator;
  const choices = [
    ...pool.map((c) => ({ id: c.id, name: c.name })),
    ...data.applications
      .filter(
        (a) =>
          data.campaigns.some((c) => c.id === a.campaignId && owns(actor, c)) &&
          a.creatorSnapshot &&
          !pool.some((c) => c.id === a.creatorId),
      )
      .map((a) => ({ id: a.creatorId, name: a.creatorSnapshot!.name })),
  ].filter((c, i, all) => all.findIndex((x) => x.id === c.id) === i);
  return (
    <div className="page-enter">
      <PageTitle
        eyebrow="MESSAGES / LOCAL CONVERSATIONS"
        title="Turn interest into a conversation."
        description="Messages stay in this browser. No real delivery, read receipts, or simulated replies."
      />
      <div className="campaign-editor-grid">
        <Card className="panel">
          <h2>Conversations</h2>
          <Button
            variant="outline"
            onClick={() => {
              setSelected("");
              setText("");
            }}
          >
            New conversation
          </Button>
          {conversations.map((c) => (
            <Button
              className="conversation-link"
              variant={c.id === selected ? "secondary" : "ghost"}
              key={c.id}
              onClick={() => {
                setSelected(c.id);
                setText("");
              }}
            >
              {c.campaignTitle || "Campaign"} ·{" "}
              {actor.role === "Brand"
                ? choices.find((x) => x.id === c.creatorId)?.name || "Creator"
                : "Brand"}
            </Button>
          ))}
          {!conversations.length && (
            <p>
              No conversations yet. Choose a campaign and recipient to start
              one.
            </p>
          )}
        </Card>
        <Card className="panel">
          <div className="form-grid">
            {!current && (
              <>
                <label className="field">
                  Campaign
                  <select
                    value={campaign}
                    onChange={(e) => setCampaign(e.target.value)}
                  >
                    <option value="">Choose campaign</option>
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </label>
                {actor.role === "Brand" && (
                  <label className="field">
                    Creator
                    <select
                      value={creator}
                      onChange={(e) => setCreator(e.target.value)}
                    >
                      <option value="">Choose creator</option>
                      {choices.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </>
            )}
            {current && (
              <h2>{current.campaignTitle || "Campaign conversation"}</h2>
            )}
            <div className="conversation-messages" aria-live="polite">
              {current?.messages.map((m) => (
                <div
                  className={`message-bubble ${m.sender === actor.role ? "own" : ""}`}
                  key={m.id}
                >
                  <Badge>{m.sender}</Badge>
                  <p>{m.text}</p>
                  <time className="small-note" dateTime={m.sentAt}>
                    {new Date(m.sentAt).toLocaleString()}
                  </time>
                </div>
              ))}
            </div>
            {activeCampaign && recipient ? (
              <form
                className="form-grid"
                onSubmit={(e) => {
                  e.preventDefault();
                  const target = {
                    campaignId: activeCampaign.id,
                    brandId: activeCampaign.brandId,
                    creatorId: recipient,
                  };
                  let nextId = "";
                  if (
                    change((s) => {
                      const next = messageService.send(
                        s,
                        actor,
                        target,
                        text,
                        choices.map((c) => c.id),
                      );
                      nextId = next.conversations.find(
                        (c) =>
                          c.brandId === target.brandId &&
                          c.creatorId === target.creatorId &&
                          c.campaignId === target.campaignId,
                      )!.id;
                      return next;
                    })
                  ) {
                    setText("");
                    setSelected(nextId);
                  }
                }}
              >
                <label className="field">
                  Message
                  <Textarea
                    required
                    maxLength={6000}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                </label>
                <Button className="btn-primary" type="submit">
                  Save local message
                </Button>
                <p className="small-note">
                  Switch account type to inspect the other side of a
                  conversation with your local creator. Sample creators do not
                  send replies.
                </p>
              </form>
            ) : (
              <EmptyState
                title="Choose a conversation"
                description="Select an available campaign and recipient. Brands can message public creators or applicants."
              >
                <Action href="/campaigns">Browse campaigns</Action>
              </EmptyState>
            )}
            {!current &&
              activeCampaign &&
              conversations
                .filter(
                  (c) =>
                    c.campaignId === activeCampaign.id &&
                    c.creatorId === recipient,
                )
                .map((c) => (
                  <Button key={c.id} onClick={() => setSelected(c.id)}>
                    Open saved conversation ({c.messages.length} messages)
                  </Button>
                ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
