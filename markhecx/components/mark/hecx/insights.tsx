"use client";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { HecxResult, HecxChange } from "@/lib/mark/hecx/contracts";
import { applyHECXChange } from "@/lib/mark/hecx/apply";
import { useApp } from "../provider";
import { Card, Badge, Button, Action } from "../ui";
import { SuggestionReview } from "./suggestion-review";
export function HecxInsights({ result }: { result: HecxResult }) {
  const { state, update } = useApp();
  const [selected, setSelected] = useState<HecxChange | null>(null),
    [decisions, setDecisions] = useState<Record<string, string>>({});
  const labels = new Map([
    ...state.portfolio.sections.map(
      (s, i) => [s.id, `${s.title} · section ${i + 1}`] as const,
    ),
    ...state.projects.map(
      (p, i) => [p.id, `${p.title} · project ${i + 1}`] as const,
    ),
  ]);
  const display = (value: string | string[]) =>
    Array.isArray(value)
      ? value.map((id) => labels.get(id) || "Unavailable item").join("\n")
      : value;
  async function accept(text: string) {
    if (!selected) return;
    const value = Array.isArray(selected.value)
      ? text
          .split("\n")
          .filter((line) => line.trim())
          .map(
            (x) =>
              [...labels].find(([, label]) => label === x.trim())?.[0] || "",
          )
      : text;
    try {
      if (!(await update((current) => applyHECXChange(current, selected, "accept", value)))) return;
      setDecisions((d) => ({ ...d, [selected.id]: "Applied" }));
      setSelected(null);
      toast.success("Applied to your draft. Re-analyze for fresh suggestions.");
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : "This suggestion could not be applied.",
      );
      return false;
    }
  }
  return (
    <div className="hecx-insights">
      <div className="hecx-result-heading">
        <Badge tone="purple">{result.module}</Badge>
        <Badge>{result.confidence}</Badge>
      </div>
      <h2>{result.summary}</h2>
      <p className="small-note">
        {result.provider}. No external AI request was made.
      </p>
      {result.requiresUserInput.length > 0 && (
        <Card className="panel hecx-needs">
          <h3>HECX needs more information.</h3>
          <ul>
            {result.requiresUserInput.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <div className="row">
            {!["Workload Analyzer", "Match Analyzer"].includes(
              result.module,
            ) && (
              <Action
                href={
                  result.module === "Project Analysis"
                    ? "/projects/new"
                    : "/profile/edit"
                }
                secondary
              >
                {result.module === "Project Analysis"
                  ? "Add Project"
                  : "Edit profile"}
              </Action>
            )}
          </div>
        </Card>
      )}
      <div className="insight-grid">
        {[
          ["Current data", result.facts],
          ["Strengths", result.strengths],
          ["Missing information", result.gaps],
          ["Recommendations", result.recommendations],
          ["Priority actions", result.priorityActions],
        ]
          .filter(([, items]) => (items as string[]).length)
          .map(([title, items]) => (
            <Card className="panel" key={String(title)}>
              <details
                open={title === "Current data" || title === "Priority actions"}
              >
                <summary>{String(title)}</summary>
                <ul>
                  {(items as string[]).map((text, i) => (
                    <li key={i}>{text}</li>
                  ))}
                </ul>
              </details>
            </Card>
          ))}
      </div>
      {!!result.suggestedChanges.length && (
        <section>
          <h3>Suggestions for your review</h3>
          <div className="insight-grid">
            {result.suggestedChanges.map((change) => (
              <Card key={change.id} className="panel">
                <Badge tone="purple">
                  {decisions[change.id] || "AI suggestion · not applied"}
                </Badge>
                <h3 className="section-copy">{change.label}</h3>
                <p className="small-note section-copy">{change.reason}</p>
                <Button
                  className="ai-action section-copy"
                  variant="outline"
                  disabled={!!decisions[change.id] || !state.signedIn}
                  onClick={() => setSelected(change)}
                >
                  <Sparkles size={15} />
                  Review suggestion
                </Button>
              </Card>
            ))}
          </div>
        </section>
      )}
      {selected && (
        <SuggestionReview
          key={selected.id}
          title={selected.label}
          reason={
            selected.reason +
            (Array.isArray(selected.value)
              ? " Edit one item per line using the displayed names."
              : "")
          }
          before={display(selected.before)}
          value={display(selected.value)}
          allowEmpty={selected.target === "portfolio.featured"}
          onAccept={accept}
          onReject={() => {
            setDecisions((d) => ({ ...d, [selected.id]: "Rejected" }));
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}
