"use client";
import { BriefBuilder } from "./brief-builder";
import { api } from "@/lib/mark/api/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Campaign,
  blankCampaign,
  objectives,
  platforms,
  Deliverable,
} from "@/lib/mark/marketplace/models";
import {
  campaignService,
  campaignErrors,
  briefReadiness,
} from "@/lib/mark/marketplace/services";
import {
  campaignHECXActions,
  CampaignHECXAction,
  suggestCampaign,
} from "@/lib/mark/hecx/campaign";
import { Suggestion } from "@/lib/mark/assistance";
import { SuggestionReview } from "../hecx/suggestion-review";
import {
  Card,
  Button,
  Input,
  Textarea,
  Choice,
  PageTitle,
  Action,
  EmptyState,
  Badge,
} from "../ui";
import { useMarketplace } from "./provider";
import { Access, Budget } from "./shared";
const steps = [
  "Basics",
  "Brief",
  "Creator requirements",
  "Budget & timeline",
  "Platforms & deliverables",
  "Review",
  "Publish",
];
const split = (s: string) => [
  ...new Set(
    s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean),
  ),
];
export function CampaignEditor({ id }: { id?: string }) {
  return (
    <Access role="Brand">
      <Editor key={id || "new"} id={id} />
    </Access>
  );
}
function Editor({ id }: { id?: string }) {
  const { data, actor, change } = useMarketplace();
  const router = useRouter();
  const existing = data.campaigns.find(
    (c) => c.id === id && c.brandId === actor.id,
  );
  const [draft, setDraft] = useState<Campaign>(() =>
      existing ? structuredClone(existing) : blankCampaign(actor.id),
    ),
    [step, setStep] = useState(0),
    [error, setError] = useState(""),
    [suggestion, setSuggestion] = useState<{
      action: CampaignHECXAction;
      result: Suggestion;
      before: string;
    } | null>(null),
    [busy, setBusy] = useState(false);
  const readiness = briefReadiness(draft);
  if (id && !existing)
    return (
      <EmptyState
        title="Campaign unavailable"
        description="You can edit only campaigns in your brand workspace."
      >
        <Action href="/brand">Brand dashboard</Action>
      </EmptyState>
    );
  const patch = (p: Partial<Campaign>) => setDraft((d) => ({ ...d, ...p }));
  function field(
    key: keyof Campaign,
    label: string,
    multiline = false,
    type = "text",
  ) {
    return (
      <label className="field" key={key}>
        {label}
        {multiline ? (
          <Textarea
            value={String(draft[key] || "")}
            maxLength={6000}
            onChange={(e) => patch({ [key]: e.target.value })}
          />
        ) : (
          <Input
            type={type}
            value={String(draft[key] || "")}
            maxLength={200}
            onChange={(e) => patch({ [key]: e.target.value })}
          />
        )}
      </label>
    );
  }
  function req(
    key: "requiredSkills" | "preferredSkills" | "categories",
    label: string,
  ) {
    return (
      <label className="field" key={key}>
        {label}
        <Input
          key={draft.requirements[key].join(", ")}
          defaultValue={draft.requirements[key].join(", ")}
          onBlur={(e) =>
            patch({
              requirements: {
                ...draft.requirements,
                [key]: split(e.target.value),
              },
            })
          }
          placeholder="Separate values with commas"
        />
      </label>
    );
  }
  async function save(publish = false) {
    setError("");
    const errors = campaignErrors(draft, publish || draft.status !== "Draft");
    if (errors.length) {
      setError(errors.join(" "));
      return;
    }
    if (
      await change((s) => {
        const saved = campaignService.save(s, actor, draft);
        return publish
          ? campaignService.status(saved, actor, draft.id, "Published")
          : saved;
      })
    ) {
      toast.success(publish ? "Campaign published." : "Campaign saved.");
      router.push(`/campaigns/${draft.id}`);
    }
  }
  function assist(action: CampaignHECXAction) {
    setBusy(true);
    queueMicrotask(async () => {
      try {
        setSuggestion({
          action,
          result: await api<ReturnType<typeof suggestCampaign>>(
            "/hecx/campaign",
            { method: "POST", body: { action, campaign: draft } },
          ),
          before: JSON.stringify(draft),
        });
      } catch {
        setError("HECX could not analyze the campaign. Try again.");
      } finally {
        setBusy(false);
      }
    });
  }
  function updateDeliverable(id: string, p: Partial<Deliverable>) {
    patch({
      deliverables: draft.deliverables.map((d) =>
        d.id === id ? { ...d, ...p } : d,
      ),
    });
  }
  return (
    <div className="page-enter">
      <PageTitle
        eyebrow="BRAND / CAMPAIGN STUDIO"
        title={id ? "Refine your campaign." : "Start with a clear brief."}
        description="Save your work as a draft. Publish only when you are ready."
      />
      {draft.status !== "Draft" && (
        <p className="small-note">
          Saving changes updates the campaign. Review the details before saving.
        </p>
      )}
      <nav className="campaign-steps" aria-label="Campaign steps">
        {steps.map((s, i) => (
          <Button
            key={s}
            variant={step === i ? "secondary" : "ghost"}
            aria-current={step === i ? "step" : undefined}
            onClick={() => setStep(i)}
          >
            {i + 1}. {s}
          </Button>
        ))}
      </nav>
      <div className="campaign-editor-grid">
        <Card className="panel">
          <h2>{steps[step]}</h2>
          {step === 1 && (
            <BriefBuilder
              onAccept={(v) =>
                patch({
                  title: v.title || draft.title,
                  objective: v.objective || draft.objective,
                  turnaround: v.timeline || draft.turnaround,
                  deliverables: v.deliverables?.length
                    ? v.deliverables
                        .filter(Boolean)
                        .map((description) => ({
                          id: crypto.randomUUID(),
                          type: v.contentType,
                          quantity: 1,
                          description,
                          deadline: "",
                          requirements: "",
                        }))
                    : draft.deliverables,
                  contentType: v.contentType,
                  creativeDirection: v.style,
                  platforms: v.platform ? [v.platform] : [],
                  format: v.format,
                  aspectRatio: v.aspectRatio,
                  commercialUse: v.commercialUse,
                  brief: v.requirements.join("\n"),
                })
              }
            />
          )}
          {step === 4 && (
            <div className="form-grid">
              {field("contentType", "Content type")}
              {field("format", "Format")}
              {field("aspectRatio", "Aspect ratio")}
              <label className="field">
                Required tools
                <Input
                  value={(draft.tools || []).join(", ")}
                  onChange={(e) => patch({ tools: split(e.target.value) })}
                />
              </label>
              <Choice
                label="Commercial use requirements"
                value={draft.commercialUse || "Unspecified"}
                options={["Unspecified", "Available", "Restricted"]}
                onChange={(v) =>
                  patch({ commercialUse: v as Campaign["commercialUse"] })
                }
              />
            </div>
          )}

          <div className="form-grid">
            {step === 0 && (
              <>
                {field("title", "Campaign name")}
                <p>
                  Brand:{" "}
                  {data.brands.find((b) => b.id === actor.id)?.name ||
                    "Complete your brand profile before publishing"}{" "}
                  ·{" "}
                  <Action href="/brand/profile" secondary>
                    Edit brand
                  </Action>
                </p>
                {field("category", "Campaign category")}
                <label className="field">
                  Objective
                  <Choice
                    label="Campaign objective"
                    value={draft.objective || "Choose objective"}
                    options={["Choose objective", ...objectives]}
                    onChange={(v) =>
                      patch({ objective: v === "Choose objective" ? "" : v })
                    }
                  />
                </label>
                {field("description", "Short description", true)}
              </>
            )}
            {step === 1 && (
              <>
                <h3>What the brand wants</h3>
                {field("brief", "Campaign description / brief", true)}
                {field("problem", "Problem or objective", true)}
                {field("outcome", "Desired outcome", true)}
                {field("targetAudience", "Target audience (if known)", true)}
                {field("keyMessage", "Key message", true)}
                {field("creativeDirection", "Creative direction", true)}
                {field("restrictions", "Restrictions", true)}
                <p className="small-note">
                  Creator outputs are defined separately in Platforms &
                  deliverables.
                </p>
              </>
            )}
            {step === 2 && (
              <>
                {req("requiredSkills", "Required skills")}
                {req("preferredSkills", "Preferred skills")}
                {req("categories", "Creator categories")}
                <label className="field">
                  Creator identity
                  <Input
                    value={draft.requirements.creatorIdentity}
                    onChange={(e) =>
                      patch({
                        requirements: {
                          ...draft.requirements,
                          creatorIdentity: e.target.value,
                        },
                      })
                    }
                  />
                </label>
                <label className="field">
                  Experience
                  <Choice
                    label="Required experience"
                    value={
                      draft.requirements.experienceLevel || "No preference"
                    }
                    options={[
                      "No preference",
                      "Beginner",
                      "Intermediate",
                      "Advanced",
                    ]}
                    onChange={(v) =>
                      patch({
                        requirements: {
                          ...draft.requirements,
                          experienceLevel: v === "No preference" ? "" : v,
                        },
                      })
                    }
                  />
                </label>
                <label className="field">
                  Availability
                  <Choice
                    label="Required availability"
                    value={draft.requirements.availability || "No preference"}
                    options={[
                      "No preference",
                      "Available",
                      "Open to Opportunities",
                    ]}
                    onChange={(v) =>
                      patch({
                        requirements: {
                          ...draft.requirements,
                          availability: v === "No preference" ? "" : v,
                        },
                      })
                    }
                  />
                </label>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={draft.requirements.portfolioRequired}
                    onChange={(e) =>
                      patch({
                        requirements: {
                          ...draft.requirements,
                          portfolioRequired: e.target.checked,
                        },
                      })
                    }
                  />{" "}
                  Public portfolio required
                </label>
              </>
            )}
            {step === 3 && (
              <>
                <label className="field">
                  Budget (optional)
                  <Input
                    type="number"
                    min="0"
                    value={draft.budget ?? ""}
                    onChange={(e) =>
                      patch({
                        budget:
                          e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </label>
                <label className="field">
                  Currency
                  <Choice
                    label="Budget currency"
                    value={draft.currency}
                    options={["USD", "INR", "EUR", "GBP"]}
                    onChange={(currency) => patch({ currency })}
                  />
                </label>
                {field("startDate", "Start date", false, "date")}
                {field("endDate", "End date", false, "date")}
                {field(
                  "applicationDeadline",
                  "Application deadline",
                  false,
                  "date",
                )}
                {field("turnaround", "Expected turnaround (optional)")}
              </>
            )}
            {step === 4 && (
              <>
                <h3>What the creator needs to deliver</h3>
                <div className="tag-list">
                  {platforms.map((p) => (
                    <label key={p} className="check-label">
                      <input
                        type="checkbox"
                        checked={draft.platforms.includes(p)}
                        onChange={() =>
                          patch({
                            platforms: draft.platforms.includes(p)
                              ? draft.platforms.filter((x) => x !== p)
                              : [...draft.platforms, p],
                          })
                        }
                      />
                      {p}
                    </label>
                  ))}
                </div>
                {draft.deliverables.map((d, i) => (
                  <fieldset className="deliverable" key={d.id}>
                    <legend>Deliverable {i + 1}</legend>
                    <label className="field">
                      Type
                      <Input
                        value={d.type}
                        onChange={(e) =>
                          updateDeliverable(d.id, { type: e.target.value })
                        }
                      />
                    </label>
                    <label className="field">
                      Quantity
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={d.quantity}
                        onChange={(e) =>
                          updateDeliverable(d.id, {
                            quantity: Number(e.target.value),
                          })
                        }
                      />
                    </label>
                    <label className="field">
                      Description
                      <Textarea
                        value={d.description}
                        onChange={(e) =>
                          updateDeliverable(d.id, {
                            description: e.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="field">
                      Deadline
                      <Input
                        type="date"
                        value={d.deadline}
                        onChange={(e) =>
                          updateDeliverable(d.id, { deadline: e.target.value })
                        }
                      />
                    </label>
                    <label className="field">
                      Requirements
                      <Textarea
                        value={d.requirements}
                        onChange={(e) =>
                          updateDeliverable(d.id, {
                            requirements: e.target.value,
                          })
                        }
                      />
                    </label>
                    <Button
                      variant="ghost"
                      onClick={() =>
                        patch({
                          deliverables: draft.deliverables.filter(
                            (x) => x.id !== d.id,
                          ),
                        })
                      }
                    >
                      Remove deliverable {i + 1}
                    </Button>
                  </fieldset>
                ))}
                <Button
                  variant="outline"
                  disabled={draft.deliverables.length >= 20}
                  onClick={() =>
                    patch({
                      deliverables: [
                        ...draft.deliverables,
                        {
                          id: crypto.randomUUID(),
                          type: "",
                          quantity: 1,
                          description: "",
                          deadline: "",
                          requirements: "",
                        },
                      ],
                    })
                  }
                >
                  Add deliverable
                </Button>
              </>
            )}
            {step >= 5 && (
              <>
                <Badge>{draft.status}</Badge>
                <h3>{draft.title || "Untitled campaign"}</h3>
                <p>
                  {draft.category} · {draft.objective}
                </p>
                <p>{draft.description}</p>
                <p>
                  {[draft.contentType, draft.format, draft.aspectRatio]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <p>
                  Tools: {draft.tools?.join(", ") || "Not specified"}.
                  Commercial use: {draft.commercialUse || "Unspecified"}.
                </p>
                <h4>Brief</h4>
                <p className="profile-bio">{draft.brief || "Not provided"}</p>
                {[
                  draft.problem,
                  draft.outcome,
                  draft.targetAudience,
                  draft.keyMessage,
                  draft.creativeDirection,
                  draft.restrictions,
                ]
                  .filter(Boolean)
                  .map((v, i) => (
                    <p key={i}>{v}</p>
                  ))}
                <h4>Requirements</h4>
                <p>
                  Required:{" "}
                  {draft.requirements.requiredSkills.join(", ") ||
                    "None specified"}
                </p>
                <p>
                  Preferred:{" "}
                  {draft.requirements.preferredSkills.join(", ") ||
                    "None specified"}
                </p>
                <p>
                  {[
                    draft.requirements.creatorIdentity,
                    ...draft.requirements.categories,
                    draft.requirements.experienceLevel,
                    draft.requirements.availability,
                    draft.requirements.portfolioRequired
                      ? "Public portfolio required"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <Budget campaign={draft} />
                <p>
                  {draft.startDate || "Start not specified"} →{" "}
                  {draft.endDate || "End not specified"}
                </p>
                <p>
                  Application deadline:{" "}
                  {draft.applicationDeadline || "Not specified"} ·{" "}
                  {draft.turnaround}
                </p>
                <p>
                  Platforms: {draft.platforms.join(", ") || "Not specified"}
                </p>
                <ul>
                  {draft.deliverables.map((d) => (
                    <li key={d.id}>
                      {d.quantity} × {d.type}: {d.description} ·{" "}
                      {d.deadline || "No deadline"} {d.requirements}
                    </li>
                  ))}
                </ul>
                {step === 6 && (
                  <>
                    <p>
                      Publishing makes this campaign visible in creator
                      experience.
                    </p>
                    <Button
                      className="btn-primary"
                      disabled={draft.status !== "Draft"}
                      onClick={() => save(true)}
                    >
                      Publish campaign
                    </Button>
                  </>
                )}
              </>
            )}
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            <div className="row">
              <Button variant="outline" onClick={() => save()}>
                Save {draft.status === "Draft" ? "draft" : "changes"}
              </Button>
              {step > 0 && (
                <Button variant="ghost" onClick={() => setStep(step - 1)}>
                  Back
                </Button>
              )}
              {step < 6 && (
                <Button
                  className="btn-primary"
                  onClick={() => setStep(step + 1)}
                >
                  Continue
                </Button>
              )}
            </div>
          </div>
        </Card>
        <Card className="panel hecx-campaign-tools">
          <Badge tone="purple">HECX / BRIEF ASSISTANT</Badge>
          <div className="brief-readiness">
            <strong>{readiness.score}% brief readiness</strong>
            <div className="readiness-track" aria-label={`${readiness.score}% brief readiness`}>
              <span style={{ width: `${readiness.score}%` }} />
            </div>
            <p className="small-note">
              {readiness.missing.length
                ? `Add: ${readiness.missing.join(", ")}.`
                : "The brief covers every matching input. Review it before publishing."}
            </p>
          </div>
          <h2>Clarity before commitment.</h2>
          <p>
            Suggestions use only your supplied campaign information. Review
            every change.
          </p>
          {campaignHECXActions.map((a) => (
            <Button
              key={a}
              variant="outline"
              className="ai-action"
              disabled={busy}
              onClick={() => assist(a)}
            >
              {a}
            </Button>
          ))}
          {busy && <p role="status">HECX is analyzing…</p>}
        </Card>
      </div>
      {suggestion && (
        <SuggestionReview
          title={suggestion.action}
          reason={suggestion.result.reason}
          value={suggestion.result.text}
          onReject={() => setSuggestion(null)}
          onAccept={
            suggestion.result.applicable
              ? (value) => {
                  if (JSON.stringify(draft) !== suggestion.before) {
                    toast.error("Campaign changed. Analyze again.");
                    return false;
                  }
                  if (suggestion.action === "Improve Campaign Brief")
                    patch({ brief: value });
                  if (suggestion.action === "Suggest Creator Skills")
                    patch({
                      requirements: {
                        ...draft.requirements,
                        requiredSkills: split(value),
                      },
                    });
                  if (suggestion.action === "Suggest Creator Identity")
                    patch({
                      requirements: {
                        ...draft.requirements,
                        creatorIdentity: value,
                      },
                    });
                  if (suggestion.action === "Improve Deliverables") {
                    const lines = value.split("\n").filter(Boolean);
                    if (lines.length !== draft.deliverables.length) {
                      toast.error(
                        "Keep one description per existing deliverable.",
                      );
                      return false;
                    }
                    patch({
                      deliverables: draft.deliverables.map((d, i) => ({
                        ...d,
                        description: lines[i],
                      })),
                    });
                  }
                  setSuggestion(null);
                  return true;
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
