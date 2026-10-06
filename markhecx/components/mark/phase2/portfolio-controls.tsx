"use client";
import {
  Check,
  ChevronUp,
  ChevronDown,
  Pencil,
  Trash2,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Portfolio,
  PortfolioSection,
  Template,
} from "@/lib/mark/models";
import { Choice, Card, Badge, Button } from "../ui";
import { moveSection } from "@/lib/mark/domain";
const templates: Record<Template, string> = {
  Minimal: "Quiet typography. One clear story.",
  Creator: "A visual showcase with a flexible grid.",
  Developer: "A compact index for projects and craft.",
  AI: "A focused layout with space to explore.",
  Editorial: "Bold headings and a reading-first flow.",
};
export function TemplatePicker({
  portfolio,
  onChange,
}: {
  portfolio: Portfolio;
  onChange: (p: Portfolio) => void;
}) {
  return (
    <div className="template-grid">
      {Object.entries(templates).map(([name, description]) => (
        <button
          key={name}
          className={`template-option ${portfolio.template === name ? "selected" : ""}`}
          aria-pressed={portfolio.template === name}
          onClick={() => onChange({ ...portfolio, template: name as Template })}
        >
          <span
            className={`template-layout layout-${name.toLowerCase()}`}
            aria-hidden="true"
          >
            <i />
            <i />
            <i />
          </span>
          <strong>
            {name}
            {portfolio.template === name && <Check size={14} />}
          </strong>
          <span>{description}</span>
        </button>
      ))}
    </div>
  );
}
export function AppearanceControls({
  portfolio,
  onChange,
}: {
  portfolio: Portfolio;
  onChange: (p: Portfolio) => void;
}) {
  return (
    <div className="form-grid">
      {(
        [
          {
            key: "typography",
            label: "Typography",
            options: ["Standard", "Expressive"],
          },
          {
            key: "layout",
            label: "Spacing",
            options: ["Comfortable", "Compact"],
          },
          {
            key: "appearance",
            label: "Surface depth",
            options: ["Subtle", "Elevated"],
          },
          {
            key: "heroStyle",
            label: "Hero alignment",
            options: ["Left aligned", "Centered"],
          },
          {
            key: "buttonStyle",
            label: "Button shape",
            options: ["Rounded", "Pill"],
          },
        ] as const
      ).map(({ key, label, options }) => (
        <label className="field" key={key}>
          {label}
          <Choice
            label={label}
            value={portfolio.settings[key]}
            options={[...options]}
            onChange={(value) =>
              onChange({
                ...portfolio,
                settings: { ...portfolio.settings, [key]: value },
              })
            }
          />
        </label>
      ))}
    </div>
  );
}
export function SectionList({
  portfolio,
  onChange,
  active,
  onSelect,
  onRemove,
}: {
  portfolio: Portfolio;
  onChange: (p: Portfolio) => void;
  active: string;
  onSelect: (id: string) => void;
  onRemove: (s: PortfolioSection) => void;
}) {
  return (
    <div className="stack section-list">
      {portfolio.sections.map((s, i) => (
        <Card
          className={`studio-section ${active === s.id ? "selected-card" : ""}`}
          key={s.id}
        >
          <div className="studio-section-label">
            <Switch
              checked={s.enabled}
              onCheckedChange={(enabled) =>
                onChange({
                  ...portfolio,
                  sections: portfolio.sections.map((x) =>
                    x.id === s.id ? { ...x, enabled } : x,
                  ),
                })
              }
              aria-label={`Show ${s.title}`}
            />
            <button
              className="section-label-button"
              onClick={() => onSelect(s.id)}
            >
              {s.title}
            </button>
            <Badge>{s.source === "profile" ? "Linked" : "Custom"}</Badge>
          </div>
          <div className="section-controls">
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Move ${s.title} up`}
              disabled={i === 0}
              onClick={() => onChange(moveSection(portfolio, s.id, -1))}
            >
              <ChevronUp size={15} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Move ${s.title} down`}
              disabled={i === portfolio.sections.length - 1}
              onClick={() => onChange(moveSection(portfolio, s.id, 1))}
            >
              <ChevronDown size={15} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Edit ${s.title}`}
              onClick={() => onSelect(s.id)}
            >
              <Pencil size={15} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Remove ${s.title}`}
              onClick={() => onRemove(s)}
            >
              <Trash2 size={15} />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
