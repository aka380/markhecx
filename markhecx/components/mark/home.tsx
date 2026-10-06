"use client";
import { Sparkles, Layers, Compass, Plus, Command, Star } from "lucide-react";
import { useApp } from "./provider";
import { useDiscoveryCreators } from "./discovery/use-discovery";
import { Card, Badge, Action, Brand } from "./ui";
import { BrandDashboard } from "./marketplace/pages";
import { CreatorCard } from "./creator-card";
export function HomePage() {
  const { state } = useApp();
  const creators = useDiscoveryCreators();
  if (state.signedIn && state.accountType === "Brand")
    return <BrandDashboard />;
  return (
    <div className="page-enter">
      <div className="home-kicker">
        <span>
          {state.signedIn
            ? `WELCOME BACK, ${state.profile.name.toUpperCase()}`
            : "THE CREATOR ECOSYSTEM"}
        </span>
        <Badge tone="purple">Built for what’s next</Badge>
      </div>
      <section className="home-hero">
        <div className="hero-copy">
          <h1>
            Your work.
            <br />
            Your identity.
            <br />
            <span>Your next chapter.</span>
          </h1>
          <p>
            A home for the things you create and the person you’re becoming.
            Discover your people. Build your portfolio. Grow with HECX.
          </p>
          <div className="hero-actions">
            <Action href="/creators">
              <Compass size={17} />
              Explore creators
            </Action>
            <Action href="/portfolio" secondary>
              <Plus size={17} />
              Build your portfolio
            </Action>
          </div>
          <div className="row section-copy">
            <Action href="/campaigns" secondary>
              Discover campaigns
            </Action>
          </div>
          <div className="hero-note">
            <div className="mini-avatars">
              <span>AC</span>
              <span>MR</span>
              <span>SP</span>
            </div>
            <p>
              Different talents. <strong>Shared possibilities.</strong>
            </p>
          </div>
        </div>
        <Card className="hero-workspace">
          <div className="workspace-caption">
            <span>
              <Command size={15} /> YOUR CREATIVE SPACE
            </span>
            <span className="tiny">01 / FOUNDATION</span>
          </div>
          <div className="identity-preview">
            <div className="identity-top">
              <Brand small />
              <Badge tone="purple">Creator identity</Badge>
            </div>
            <p className="tiny">MORE THAN A JOB TITLE</p>
            <h2>
              Made of everything
              <br />
              you love to do.
            </h2>
            <div className="identity-tags">
              <span>Designer</span>
              <Plus size={14} />
              <span>Builder</span>
              <Plus size={14} />
              <span>Dreamer</span>
            </div>
            <div className="identity-line">
              <span>YOUR SKILLS, CONNECTED</span>
              <span>∞ possibilities</span>
            </div>
          </div>
          <div className="hecx-mini">
            <span className="sparkle-box">
              <Sparkles size={21} />
            </span>
            <div>
              <strong>A little clarity. A new possibility.</strong>
              <p>Meet HECX, your creative thinking partner.</p>
            </div>
            <Star size={16} />
          </div>
          <div className="workspace-bottom">
            <span>One identity. Endless potential.</span>
            <span>MarkHECX®</span>
          </div>
        </Card>
      </section>
      <section className="pathways">
        <Card interactive>
          <span className="feature-icon">
            <Compass />
          </span>
          <div>
            <h3>Find your people</h3>
            <p>Discover talent beyond the algorithm.</p>
          </div>
          <Action href="/creators" secondary>
            Discover
          </Action>
        </Card>
        <Card interactive>
          <span className="feature-icon">
            <Layers />
          </span>
          <div>
            <h3>Let your work speak</h3>
            <p>A portfolio that feels like you.</p>
          </div>
          <Action href="/portfolio" secondary>
            Create
          </Action>
        </Card>
        <Card interactive>
          <span className="feature-icon">
            <Sparkles />
          </span>
          <div>
            <h3>See what’s possible</h3>
            <p>Explore your next move with HECX.</p>
          </div>
          <Action href="/hecx" secondary>
            Try HECX
          </Action>
        </Card>
      </section>
      <section className="home-creators">
        <div className="section-heading">
          <div>
            <span className="eyebrow">GOOD COMPANY</span>
            <h2>Meet the minds making things.</h2>
          </div>
          <Action href="/creators" secondary>
            Discover all creators
          </Action>
        </div>
        <div className="creator-grid">
          {creators.slice(0, 3).map((c) => (
            <CreatorCard key={c.id} creator={c} />
          ))}
        </div>
        <p className="sample-footnote">
          Published creator profiles · Information is supplied by each creator.
        </p>
      </section>
    </div>
  );
}
