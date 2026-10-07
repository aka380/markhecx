"use client";
import { Creator } from "@/lib/mark/data";
import { CreatorFilters, creatorCategories, canonicalCategory } from "@/lib/mark/discovery";
import { Choice } from "../ui";
export function DiscoveryFilters({
  pool,
  facets,
  filters,
  onChange,
}: {
  pool: Creator[];
  facets?: { category: string[]; identity: string[]; skills: string[] };
  filters: CreatorFilters;
  onChange: (patch: Record<string, string | string[]>) => void;
}) {
  const unique = (values: string[]) => [...new Set(values)].sort();
  const fields = [
    {
      key: "category",
      label: "Category",
      values: unique([...pool.flatMap(creatorCategories), ...(facets?.category || []).map(canonicalCategory)]),
    },
    {
      key: "identity",
      label: "Creator identity",
      values: unique([...pool.map((c) => c.identity), ...(facets?.identity || [])]),
    },
    {
      key: "availability",
      label: "Availability",
      values: unique(pool.map((c) => c.availability || "Not specified")),
    },
    {
      key: "experience",
      label: "Experience",
      values: unique(
        pool.flatMap((c) => (c.experienceLevel ? [c.experienceLevel] : [])),
      ),
    },
    {
      key: "projects",
      label: "Projects",
      values: ["Has Projects", "No Projects"],
    },
    {
      key: "portfolio",
      label: "Portfolio",
      values: ["Has Public Portfolio", "No Public Portfolio"],
    },
  ];
  return (
    <div className="discovery-filter-fields">
      {fields
        .filter((f) => f.values.length)
        .map((f) => (
          <label className="field" key={f.key}>
            {f.label}
            <Choice
              label={f.label}
              value={
                (filters[f.key as keyof CreatorFilters] as string) || "Any"
              }
              onChange={(v) => onChange({ [f.key]: v === "Any" ? "" : v })}
              options={[
                "Any",
                ...unique([
                  ...f.values,
                  ...(filters[f.key as keyof CreatorFilters]
                    ? [String(filters[f.key as keyof CreatorFilters])]
                    : []),
                ]),
              ]}
            />
          </label>
        ))}
      <fieldset className="skill-filter">
        <legend>
          Skills <span className="small-note">Match all selected</span>
        </legend>
        <div>
          {unique([...pool.flatMap((c) => c.skills), ...(facets?.skills || []), ...filters.skills]).map((skill) => (
            <label key={skill}>
              <input
                type="checkbox"
                checked={filters.skills.includes(skill)}
                onChange={() =>
                  onChange({
                    skill: filters.skills.includes(skill)
                      ? filters.skills.filter((s) => s !== skill)
                      : [...filters.skills, skill],
                  })
                }
              />
              {skill}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
