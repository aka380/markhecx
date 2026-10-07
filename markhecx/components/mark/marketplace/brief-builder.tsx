"use client";
import { useApp } from "../provider";
import { extractBrief } from "@/lib/mark/marketplace/brief-extractor";
import { useState } from "react";
import { api } from "@/lib/mark/api/client";
import type { BriefDraft } from "@/lib/mark/creative";
import { Button, Textarea, Input, Choice, Badge } from "../ui";
export function BriefBuilder({
  onAccept,
}: {
  onAccept: (draft: BriefDraft) => void;
}) {
  const { localMode } = useApp();
  const [prompt, setPrompt] = useState(""),
    [draft, setDraft] = useState<BriefDraft | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <section className="form-grid">
      <Badge tone="purple">{localMode ? "HECX · Local brief extraction" : "HECX brief assistant"}</Badge>
      <label className="field">
        Describe your campaign
        <Textarea
          value={prompt}
          maxLength={2000}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="I need a cinematic AI product launch video for Instagram."
        />
      </label>
      <Button
        type="button"
        disabled={busy || prompt.trim().length < 5}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            if (localMode) { setDraft(extractBrief(prompt)); return; }
            const r = await api<{ draft: BriefDraft }>("/hecx/brief", {
              method: "POST",
              body: { prompt },
            });
            setDraft(r.draft);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "HECX is drafting…" : "Suggest brief"}
      </Button>
      {error && <p role="alert">{error}</p>}
      {draft && (
        <>
          <p>
            {localMode ? "Local extraction uses only terms present in your idea. Complete the blanks and confirm rights, dates and deliverables." : "Review and edit this AI proposal."} Accepting updates this draft only; save or publish separately.
          </p>
          {(
            [
              "title",
              "objective",
              "timeline",
              "contentType",
              "style",
              "platform",
              "format",
              "aspectRatio",
            ] as const
          ).map((key) => (
            <label className="field" key={key}>
              {key}
              <Input
                value={draft[key] || ""}
                maxLength={
                  key === "style" ? 500 : key === "aspectRatio" ? 50 : 100
                }
                onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
              />
            </label>
          ))}
          <Choice
            label="Commercial use proposal"
            value={draft.commercialUse}
            options={["Unspecified", "Available", "Restricted"]}
            onChange={(v) =>
              setDraft({
                ...draft,
                commercialUse: v as BriefDraft["commercialUse"],
              })
            }
          />
          <label className="field">
            Deliverables (one per line)
            <Textarea
              value={(draft.deliverables || []).join("\n")}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  deliverables: e.target.value.split("\n").slice(0, 20),
                })
              }
            />
          </label>
          <label className="field">
            Requirements (one per line)
            <Textarea
              value={draft.requirements.join("\n")}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  requirements: e.target.value.split("\n").slice(0, 20),
                })
              }
            />
          </label>
          <Button
            type="button"
            className="btn-primary"
            onClick={() => {
              onAccept(draft);
              setDraft(null);
            }}
          >
            Accept edited draft
          </Button>
          <Button type="button" onClick={() => setDraft(null)}>
            Reject
          </Button>
        </>
      )}
    </section>
  );
}
