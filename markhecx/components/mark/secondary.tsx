"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Bell,
  MessageSquare,
  Clock,
  Sparkles,
  Shield,
  Layers,
  FolderOpen,
  Award,
} from "lucide-react";
import { information } from "@/lib/mark/content";
import { creators } from "@/lib/mark/data";
import { useApp, SignInGate } from "./provider";
import {
  Card,
  PageTitle,
  Badge,
  Action,
  Button,
  EmptyState,
  Choice,
} from "./ui";
import { MessagesPage } from "./marketplace/messages";
import { CreatorCard } from "./creator-card";
export const secondaryRoutes = [
  "about",
  "samples",
  "guidelines",
  "help",
  "activity",
  "resources",
  "settings",
  "messages",
  "notifications",
];
export function SecondaryPage({ section }: { section: string }) {
  const { state, logout } = useApp();
  const params = useSearchParams();
  const recipient =
    creators.find((c) => c.username === params.get("to")) ||
    (state.publication?.portfolio.visibility === "Public" &&
    state.publication.profile.username === params.get("to")
      ? state.publication.profile
      : null);
  const [sampleType, setSampleType] = useState("Creators");
  const privatePage = [
    "activity",
    "settings",
    "messages",
    "notifications",
  ].includes(section);
  if (privatePage && !state.signedIn)
    return <SignInGate title="Your workspace, all together." />;
  if (information[section]) {
    const content = information[section];
    return (
      <div className="page-enter">
        <PageTitle
          eyebrow={content.eyebrow}
          title={content.title}
          description={content.description}
        />
        <div className="information-grid">
          {content.sections.map((s, i) => (
            <Card className="panel information-card" key={s.title}>
              <span className="eyebrow">0{i + 1}</span>
              <h2>{s.title}</h2>
              <p>{s.body}</p>
            </Card>
          ))}
        </div>
        <div className="section-copy">
          <Action
            href={section === "help" ? "/guidelines" : "/creators"}
            secondary
          >
            {section === "help" ? "Read guidelines" : "Explore creators"}
          </Action>
        </div>
      </div>
    );
  }
  if (section === "samples")
    return (
      <div className="page-enter">
        <PageTitle
          eyebrow="A FEW POSSIBILITIES"
          title="A little inspiration."
          description="Explore illustrative creators, portfolios, projects, and badges."
        >
          <Badge tone="purple">All content is sample data</Badge>
        </PageTitle>
        <div className="sample-filter">
          <Choice
            label="Sample type"
            value={sampleType}
            onChange={setSampleType}
            options={["Creators", "Portfolios", "Projects", "Badges"]}
          />
        </div>
        {sampleType === "Creators" ? (
          <div className="creator-grid">
            {creators.map((c) => (
              <CreatorCard key={c.id} creator={c} />
            ))}
          </div>
        ) : (
          <div className="creation-grid">
            {creators.map((c) => (
              <Card className="panel" key={c.id}>
                {sampleType === "Portfolios" ? (
                  <Layers className="accent-icon" />
                ) : sampleType === "Projects" ? (
                  <FolderOpen className="accent-icon" />
                ) : (
                  <Award className="accent-icon" />
                )}
                <h3>
                  {sampleType === "Portfolios"
                    ? `${c.name}’s portfolio`
                    : sampleType === "Projects"
                      ? c.projects[0]?.name || "No projects yet"
                      : c.badge}
                </h3>
                <p className="section-copy">
                  {sampleType === "Projects"
                    ? c.projects[0]?.detail ||
                      "This sample has not added a project."
                    : c.identity}
                </p>
                <div className="section-copy">
                  <Action
                    href={
                      sampleType === "Badges"
                        ? `/creators/${c.id}`
                        : `/portfolio/${c.id}`
                    }
                    secondary
                  >
                    {sampleType === "Badges"
                      ? "View creator"
                      : "View portfolio"}
                  </Action>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  if (section === "settings")
    return (
      <div className="page-enter">
        <PageTitle
          eyebrow="SETTINGS & MODELS"
          title="Your space, your settings."
          description="A clear view of what’s connected—and what’s still to come."
        />
        <div className="settings-grid">
          <Card className="panel">
            <Shield className="accent-icon" />
            <h2>Local profile</h2>
            <p className="section-copy">
              Signed in as <strong>{state.profile.name}</strong>. This is a
              local demo, with no password or identity verification.
            </p>
            <div className="row section-copy">
              <Action href="/profile" secondary>
                Edit profile
              </Action>
              <Button variant="ghost" onClick={logout}>
                Logout
              </Button>
            </div>
          </Card>
          <Card className="panel">
            <Sparkles className="accent-icon" />
            <h2>HECX model</h2>
            <p className="section-copy">
              Scripted demo adapter. No AI provider, API key, or production
              model is connected.
            </p>
            <div className="section-copy">
              <Badge tone="purple">Demo only</Badge>
            </div>
          </Card>
          <Card className="panel">
            <Layers className="accent-icon" />
            <h2>Appearance</h2>
            <p className="section-copy">
              MarkHECX dark. The interface follows your device’s reduced-motion
              preference.
            </p>
            <div className="section-copy">
              <Badge>Unified Phase 1 theme</Badge>
            </div>
          </Card>
          <Card className="panel">
            <Clock className="accent-icon" />
            <h2>Data on this device</h2>
            <p className="section-copy">
              Your profile, saved creators, drafts, and local published snapshot
              stay in this browser. Clearing browser site data removes them. No
              cloud backup is connected.
            </p>
          </Card>
        </div>
      </div>
    );
  if (section === "activity")
    return (
      <div className="page-enter">
        <PageTitle
          eyebrow="YOUR CREATIVE TRAIL"
          title="Little steps add up."
          description="Recent changes in your local workspace."
        />
        {state.activity.length ? (
          <Card className="panel">
            <div className="activity-list">
              {state.activity.map((a) => (
                <div key={a.id}>
                  <Clock size={17} />
                  <p>{a.text}</p>
                  <time dateTime={a.time}>
                    {new Date(a.time).toLocaleString()}
                  </time>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <EmptyState
            title="Your next chapter starts here."
            description="Profile edits and portfolio changes will appear in this local activity log."
          >
            <Action href="/portfolio">Open portfolio studio</Action>
          </EmptyState>
        )}
      </div>
    );
  if (section === "messages") return <MessagesPage />;
  if (section === "notifications") {
    const messages = false;
    return (
      <div className="page-enter">
        <PageTitle
          eyebrow="YOUR WORKSPACE"
          title={
            messages
              ? "Good conversations start here."
              : "A little space for updates."
          }
          description={
            messages
              ? recipient
                ? `Message ${recipient.name} · @${recipient.username}`
                : "Your messages will have a home here."
              : "Your notifications will appear here."
          }
        />
        <Card className="panel">
          <div className="empty-icon">
            {messages ? <MessageSquare /> : <Bell />}
          </div>
          <EmptyState
            title={messages ? "No conversations yet" : "You’re all caught up"}
            description={
              messages
                ? "Messaging is a future feature. No conversations or contacts are connected in this demo."
                : "No notification service is connected yet. This view demonstrates the signed-in shell."
            }
          >
            <Action href="/creators" secondary>
              Explore creators
            </Action>
          </EmptyState>
        </Card>
      </div>
    );
  }
  return (
    <EmptyState
      title="This page couldn’t be found."
      description="Let’s get you back to your creative space."
    >
      <Action href="/">Back home</Action>
    </EmptyState>
  );
}
