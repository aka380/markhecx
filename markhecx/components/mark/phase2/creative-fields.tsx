"use client";
import { creativeSchema, type CreativeCapabilities } from "@/lib/mark/creative";
import { Input, Textarea, Choice } from "../ui";
export function CreativeFields({
  value,
  onChange,
}: {
  value?: CreativeCapabilities;
  onChange: (value: CreativeCapabilities) => void;
}) {
  const v = creativeSchema.parse(value || {}),
    patch = (p: Partial<CreativeCapabilities>) => onChange({ ...v, ...p });
  return (
    <fieldset className="form-grid">
      <legend>Creative capabilities · optional, self-declared</legend>
      <label className="field">
        Specialization
        <Input
          value={v.specialization}
          maxLength={200}
          onChange={(e) => patch({ specialization: e.target.value })}
        />
      </label>
      {(
        ["tools", "models", "contentTypes", "formats", "platforms"] as const
      ).map((key) => (
        <label className="field" key={key}>
          {key === "contentTypes" ? "Content types" : key}
          <Input
            defaultValue={v[key].join(", ")}
            placeholder="Separate with commas"
            maxLength={2000}
            onBlur={(e) =>
              patch({
                [key]: [
                  ...new Set(
                    e.target.value
                      .split(",")
                      .map((x) => x.trim())
                      .filter(Boolean),
                  ),
                ].slice(0, 30),
              })
            }
          />
        </label>
      ))}
      <label className="field">
        Aspect ratio
        <Input
          value={v.aspectRatio}
          maxLength={50}
          onChange={(e) => patch({ aspectRatio: e.target.value })}
        />
      </label>
      <label className="field">
        Workflow
        <Textarea
          value={v.workflow}
          maxLength={2000}
          onChange={(e) => patch({ workflow: e.target.value })}
        />
      </label>
      <label className="field">
        Workflow steps
        <Input
          defaultValue={v.workflowSteps.join(", ")}
          placeholder="Concept, generate, composite, edit, grade"
          onBlur={(e) => patch({ workflowSteps: e.target.value.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 30) })}
        />
      </label>
      <label className="field">
        Your human contribution
        <Textarea
          value={v.humanContribution}
          maxLength={1200}
          placeholder="Describe your direction, editing, compositing, sound or other work."
          onChange={(e) => patch({ humanContribution: e.target.value })}
        />
      </label>
      <label className="field">
        Source assets
        <Textarea
          value={v.sourceAssets}
          maxLength={1200}
          placeholder="Describe supplied footage, product images, licensed assets or original inputs."
          onChange={(e) => patch({ sourceAssets: e.target.value })}
        />
      </label>
      {([
        ["toolEvidence", "Tool evidence", "Generation screenshots or source-file links"],
        ["workflowEvidence", "Workflow evidence", "Process breakdown or version-history links"],
        ["pastWorkEvidence", "Past-work evidence", "Published work or client-reference links"],
      ] as const).map(([key, label, placeholder]) => (
        <label className="field" key={key}>
          {label}
          <Input
            defaultValue={v[key].join(", ")}
            placeholder={placeholder}
            onBlur={(e) => patch({ [key]: e.target.value.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 30) })}
          />
        </label>
      ))}
      <label className="field">
        Commercial use
        <Choice
          label="Commercial use"
          value={v.commercialUse}
          options={["Unspecified", "Available", "Restricted"]}
          onChange={(x) =>
            patch({ commercialUse: x as CreativeCapabilities["commercialUse"] })
          }
        />
      </label>
      <label className="field">
        Minimum project budget (optional)
        <Input
          type="number"
          min={0}
          value={v.minimumBudget ?? ""}
          onChange={(e) =>
            patch({
              minimumBudget:
                e.target.value === "" ? null : Number(e.target.value),
            })
          }
        />
      </label>
      <Choice
        label="Budget currency"
        value={v.currency}
        options={["USD", "INR", "EUR", "GBP"]}
        onChange={(x) =>
          patch({ currency: x as CreativeCapabilities["currency"] })
        }
      />
      <p className="small-note">
        Claims remain creator-declared and not independently verified. Evidence references are shown separately so brands can inspect what was supplied.
      </p>
    </fieldset>
  );
}
