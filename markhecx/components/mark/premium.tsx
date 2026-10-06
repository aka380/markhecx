"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Gem,
  Sparkles,
  ChartNoAxesCombined,
  PanelsTopLeft,
  Users,
  Infinity,
  Check,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { premiumFeatures } from "@/lib/mark/data";
import { Card, Badge, Button, Action } from "./ui";
const icons = [Sparkles, ChartNoAxesCombined, PanelsTopLeft, Users, Infinity];
export function PremiumPage() {
  const params = useSearchParams();
  const feature = params.get("feature") || "Premium";
  const [open, setOpen] = useState(false);
  return (
    <div className="page-enter">
      <div className="premium-intro">
        <span className="premium-symbol">
          <Gem size={29} />
        </span>
        <Badge tone="purple">MARKHECX PREMIUM</Badge>
        <h1>
          More room for
          <br />
          <span>your potential.</span>
        </h1>
        <p>Thoughtful tools for the next stage of your creative journey.</p>
        <span className="small-note">
          Local preview · Plans and pricing are not yet available
        </span>
      </div>
      <div className="plans">
        <Card className="plan panel">
          <span className="eyebrow">YOUR FOUNDATION</span>
          <h2>Creator</h2>
          <div className="plan-price">
            Free<span>Local demo</span>
          </div>
          <p>Start shaping your creative identity.</p>
          <ul>
            {[
              "Your profile & creator identity",
              "Personal portfolio studio",
              "Creator discovery & saved collection",
              "HECX sample conversations",
            ].map((t) => (
              <li key={t}>
                <Check size={16} />
                {t}
              </li>
            ))}
          </ul>
          <Action href="/portfolio" secondary>
            Start creating
          </Action>
        </Card>
        <Card className="plan premium-plan panel">
          <div className="plan-heading">
            <span className="eyebrow">YOUR NEXT CHAPTER</span>
            <Badge tone="purple">Planned</Badge>
          </div>
          <h2>Premium</h2>
          <div className="plan-price">
            More possibilities<span>Pricing to be announced</span>
          </div>
          <p>A deeper toolkit for ambitious creators.</p>
          <ul>
            {[
              "Everything in Creator",
              "AI Pro & Unlimited HECX",
              "Advanced Analytics & Matching",
              "Premium Portfolio customization",
            ].map((t) => (
              <li key={t}>
                <Check size={16} />
                {t}
              </li>
            ))}
          </ul>
          <Button className="btn-primary" onClick={() => setOpen(true)}>
            Explore upgrade
          </Button>
        </Card>
      </div>
      <div className="section-heading premium-features-heading">
        <div>
          <span className="eyebrow">WHAT’S AHEAD</span>
          <h2>A little more of what moves you.</h2>
        </div>
        <Badge>Feature preview</Badge>
      </div>
      <div className="premium-features">
        {premiumFeatures.map(([name, description], i) => {
          const Icon = icons[i];
          return (
            <Card
              key={name}
              className={`panel ${feature === name ? "selected-card" : ""}`}
            >
              <Icon className="accent-icon" size={24} />
              <h3>{name}</h3>
              <p>{description}</p>
              <Badge>Planned</Badge>
            </Card>
          );
        })}
      </div>
      {feature === "Upgrade" && (
        <div className="upgrade-banner">
          <h3>Ready when the next chapter is.</h3>
          <p>
            Premium upgrades are not available in Phase 1. No payment details
            are collected.
          </p>
          <Button className="btn-secondary" onClick={() => setOpen(true)}>
            View upgrade status
          </Button>
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="mark-dialog">
          <Gem className="accent-icon" size={28} />
          <DialogTitle>Premium is on the horizon.</DialogTitle>
          <DialogDescription>
            This is the local product preview. Plans, pricing, and checkout will
            be introduced in a future phase. You haven’t subscribed, and no
            payment has been taken.
          </DialogDescription>
          <Button className="btn-primary" onClick={() => setOpen(false)}>
            Keep exploring
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
