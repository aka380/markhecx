import type { Creator } from "./data";
export function normalize(value: string) {
  return value.toLocaleLowerCase().normalize("NFKC").trim();
}
export function canonicalCategory(value: string) {
  return (
    (
      { Development: "Programming", "AI & Data": "AI & Technology" } as Record<
        string,
        string
      >
    )[value] || value
  );
}
export function creatorCategories(c: Creator) {
  return [
    ...new Set(
      [c.category, ...(c.categories || [])]
        .filter(Boolean)
        .map(canonicalCategory),
    ),
  ];
}
export function searchable(c: Creator) {
  return [
    c.name,
    c.username,
    "@" + c.username,
    c.identity,
    c.category,
    ...creatorCategories(c),
    ...c.skills,
    ...c.tags,
    c.creative?.specialization || "",
    ...(c.creative?.tools || []),
    ...(c.creative?.models || []),
    ...(c.creative?.contentTypes || []),
    ...(c.creative?.platforms || []),
    ...(c.creative?.formats || []),
    ...c.projects.flatMap((p) => [p.name, p.detail]),
  ].join(" ");
}
export function searchCreatorPool(pool: Creator[], query: string) {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  return pool.filter((c) =>
    terms.every((t) => normalize(searchable(c)).includes(t)),
  );
}
