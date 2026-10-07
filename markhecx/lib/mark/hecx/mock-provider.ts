import { createSuggestion } from "../assistance";
import { getRecommendations } from "../discovery";
import { searchCreatorPool } from "../creator-search";
import type {
  AIProvider,
  HecxContext,
  HecxResult,
  HecxChange,
  HecxModule,
} from "./contracts";
const tidy = (text: string) =>
  text
    .trim()
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n");
function inferModule(c: HecxContext): HecxModule {
  if (c.module !== "AI Chat") return c.module;
  const q = c.message.toLowerCase();
  if (/bio|profile|improve first|strong/.test(q)) return "Profile Analysis";
  if (/portfolio|hero|section|featured/.test(q))
    return "Portfolio Improvements";
  if (/identity|position/.test(q)) return "Creator Identity";
  if (/achievement|badge/.test(q)) return "Achievement Analysis";
  if (/skill|learn/.test(q)) return "Skill Analysis";
  if (/project/.test(q)) return "Project Analysis";
  if (/match|creator|campaign/.test(q)) return "Match Analyzer";
  if (/workload|deadline|capacity/.test(q)) return "Workload Analyzer";
  if (/career|direction/.test(q)) return "Career Insights";
  const previous = c.history.at(-1)?.module;
  return previous && previous !== "AI Chat" ? previous : "AI Chat";
}
function result(module: HecxModule): HecxResult {
  return {
    module,
    summary: "",
    facts: [],
    strengths: [],
    gaps: [],
    recommendations: [],
    priorityActions: [],
    suggestedChanges: [],
    confidence: "Based on supplied data",
    requiresUserInput: [],
    provider: "MockHECX · Local deterministic analysis",
  };
}
export function analyzeLocal(c: HecxContext): HecxResult {
  const analysisModule = inferModule(c),
    r = result(analysisModule),
    p = c.profile;
  const change = (
    target: HecxChange["target"],
    label: string,
    before: string | string[],
    value: string | string[],
    reason: string,
    targetId?: string,
  ) => {
    if (JSON.stringify(before) !== JSON.stringify(value))
      r.suggestedChanges.push({
        id: target + (targetId || ""),
        target,
        label,
        before,
        value,
        reason,
        targetId,
        sourceVersion: c.sourceVersion,
      });
  };
  if (!c.authorized) {
    r.summary = "Sign in to analyze your own MarkHECX data.";
    r.confidence = "Insufficient data";
    r.requiresUserInput = [
      "Sign in to the local workspace. No private profile data was included.",
    ];
    return r;
  }
  if (analysisModule === "AI Chat") {
    const message = c.message.trim();
    const greeting = /^(hi|hello|hey|yo|good (morning|afternoon|evening))[!.?\s]*$/i.test(message);
    const thanks = /^(thanks|thank you|thx)[!.?\s]*$/i.test(message);
    r.summary = greeting
      ? "Hey! I’m HECX. I can help improve your profile, review projects, compare creators for a campaign, or turn a rough brief into practical next steps. What are you working on?"
      : thanks
        ? "You’re welcome. Tell me what you want to work on next—your profile, a project, a campaign brief, or a creator comparison."
        : "I can help with that, but I need a little more direction. Ask about your profile, portfolio, projects, skills, workload, campaign brief, or creator matches.";
    r.confidence = "Limited data";
    return r;
  }
  if (c.goal) r.facts.push(`Your stated goal: ${c.goal}`);
  if (analysisModule === "Workload Analyzer") {
    r.facts.push(
      `${c.projects.length} project records. A project date is not assumed to be a deadline.`,
    );
    const w = c.workload;
    if (
      !w ||
      !w.commitments.length ||
      !Number.isFinite(w.availableHours) ||
      w.availableHours < 0 ||
      w.commitments.some(
        (x) =>
          !x.title.trim() ||
          !/^\d{4}-\d{2}-\d{2}$/.test(x.deadline) ||
          !Number.isFinite(Date.parse(x.deadline)) ||
          new Date(x.deadline).toISOString().slice(0, 10) !== x.deadline ||
          !Number.isFinite(x.hours) ||
          x.hours < 0,
      )
    ) {
      r.summary = "HECX needs more information.";
      r.requiresUserInput = [
        "Provide commitments, deadlines, estimated hours, and available hours for the same planning window.",
      ];
      r.confidence = "Insufficient data";
      return r;
    }
    const total = w.commitments.reduce((n, x) => n + x.hours, 0);
    r.summary = "Workload estimate from your supplied planning window.";
    r.facts.push(
      `${total} estimated hours across ${w.commitments.length} commitments; ${w.availableHours} available hours supplied.`,
    );
    if (total > w.availableHours)
      r.gaps.push(
        `Estimated work exceeds your stated available time by ${total - w.availableHours} hours.`,
      );
    else
      r.strengths.push(
        "Your estimates fit inside the stated available hours. This is not a capacity guarantee.",
      );
    const dates = [...new Set(w.commitments.map((x) => x.deadline))];
    for (const date of dates) {
      const same = w.commitments.filter((x) => x.deadline === date);
      if (same.length > 1)
        r.gaps.push(
          `Shared deadline ${date}: ${same.map((x) => x.title).join(", ")}. Review possible overlap.`,
        );
    }
    r.priorityActions = [
      "Confirm estimates and deadlines, then choose which scope to adjust.",
    ];
    r.confidence = "Limited data";
    return r;
  }
  if (!p) {
    r.summary = "HECX needs more information.";
    r.requiresUserInput = ["Add your creator profile."];
    r.confidence = "Insufficient data";
    return r;
  }
  if (
    analysisModule === "Profile Analysis" ||
    analysisModule === "Career Insights"
  ) {
    r.summary =
      analysisModule === "Career Insights"
        ? "Possible directions based on your current profile; no outcome is guaranteed."
        : "Profile readiness based on supplied fields, not an AI score.";
    const required: [
      [string, boolean],
      [string, boolean],
      [string, boolean],
      [string, boolean],
    ] = [
      ["Name", !!p.name.trim()],
      ["Username", !!p.username.trim()],
      ["Creator identity", !!p.identity.trim()],
      ["3–5 skills", p.skills.length >= 3 && p.skills.length <= 5],
    ];
    r.facts.push(
      `${required.filter(([, ok]) => ok).length} of 4 required profile areas supplied.`,
      ...(p.identity ? [`Current identity: ${p.identity}`] : []),
      ...(p.skills.length
        ? [`Current skills: ${p.skills.map((s) => s.name).join(", ")}`]
        : []),
    );
    required.forEach(([label, ok]) =>
      ok
        ? r.strengths.push(`${label} supplied.`)
        : r.gaps.push(`${label} missing or incomplete.`),
    );
    for (const [label, exists] of [
      ["Bio", !!p.bio.trim()],
      ["Projects", !!c.projects.length],
      ["Achievements", !!p.achievements.length],
      ["Experience", !!p.experience.length],
      ["Education", !!p.education.length],
      ["Social links", !!p.socialLinks.length],
      ["Published portfolio", !!c.publishedVisibility],
    ] as const) {
      if (exists) r.strengths.push(`${label} supplied.`);
      else r.gaps.push(`${label} not provided; optional.`);
    }
    r.priorityActions = required
      .filter(([, ok]) => !ok)
      .map(([label]) => `Complete ${label.toLowerCase()}.`);
    if (!r.priorityActions.length)
      r.priorityActions.push(
        c.projects.length
          ? "Review one project’s problem, contribution, and evidence."
          : "Consider adding a project to demonstrate your skills; projects remain optional.",
      );
    r.recommendations.push(
      "Optional experience, education, and achievements should be added only when they are accurate and relevant.",
    );
    const bio = p.bio
      ? tidy(p.bio)
      : [
          p.identity ? `Creator identity: ${p.identity}.` : "",
          p.skills.length
            ? `Skills: ${p.skills.map((s) => s.name).join(", ")}.`
            : "",
        ]
          .filter(Boolean)
          .join(" ");
    if (bio)
      change(
        "profile.bio",
        "Suggested bio",
        p.bio,
        bio,
        "Uses only your current identity and skill names, or tidies your existing words.",
      );
    if (analysisModule === "Career Insights")
      r.recommendations.push(
        p.skills.length
          ? `One possible project direction is to demonstrate ${p.skills[0].name} in a small, documented example. This is a recommendation, not existing work.`
          : "Choose a skill you actually want to practice before selecting a project direction.",
      );
  }
  if (analysisModule === "Project Analysis") {
    r.summary = c.projects.length
      ? "Project presentation review using your supplied records."
      : "HECX needs more information.";
    if (!c.projects.length)
      r.requiresUserInput.push(
        "Add at least one project. A description and tech stack make analysis more useful.",
      );
    for (const project of c.projects.slice(0, 6)) {
      r.facts.push(
        `${project.title || "Untitled project"} · ${project.status}`,
      );
      const fields = [
        ["title", project.title],
        ["description", project.description],
        ["problem", project.problem],
        ["solution", project.solution],
        ["contribution", project.contribution],
        ["tech stack", project.techStack.join(", ")],
        ["GitHub", project.github],
        ["live demo", project.liveDemo],
        ["media", project.mediaCount ? `${project.mediaCount} items` : ""],
        ["tags", project.tags.join(", ")],
      ];
      const present = fields.filter(([, value]) => value),
        missing = fields.filter(([, value]) => !value);
      r.strengths.push(
        `${project.title}: supplied ${present.map(([key]) => key).join(", ") || "no detail"}.`,
      );
      if (missing.length)
        r.gaps.push(
          `${project.title}: missing ${missing.map(([key]) => key).join(", ")}. Optional fields may remain empty.`,
        );
      const description = project.description
        ? tidy(project.description)
        : [
            project.problem && `Problem: ${project.problem}`,
            project.solution && `Solution: ${project.solution}`,
            project.contribution && `My contribution: ${project.contribution}`,
          ]
            .filter(Boolean)
            .join("\n");
      if (description)
        change(
          "project.description",
          `Description · ${project.title}`,
          project.description,
          description,
          "Only supplied project text is reused. No metrics or results are added.",
          project.id,
        );
    }
    if (c.projects.length > 6)
      r.recommendations.push(
        "Select a specific project to review records beyond the first six.",
      );
    r.priorityActions.push(
      "Use the structure: problem → approach → your contribution → evidence you can support.",
    );
  }
  if (analysisModule === "Skill Analysis") {
    r.summary =
      "Current skills and learning recommendations are kept separate.";
    r.facts = p.skills.map(
      (s) =>
        `${s.name} · ${s.category}${s.proficiency ? ` · self-reported ${s.proficiency}` : " · proficiency not provided"}`,
    );
    r.strengths = p.skills
      .filter((s) => s.proficiency === "Advanced")
      .map(
        (s) => `${s.name}: self-reported Advanced; not independently verified.`,
      );
    r.recommendations = p.skills
      .filter(
        (s) => s.proficiency === "Learning" || s.proficiency === "Practicing",
      )
      .map(
        (s) => `Developing skill: ${s.name} (${s.proficiency}, self-reported).`,
      );
    const technologies = [...new Set(c.projects.flatMap((x) => x.techStack))];
    const missing = technologies.filter(
      (t) => !p.skills.some((s) => s.name.toLowerCase() === t.toLowerCase()),
    );
    if (missing.length)
      r.gaps.push(
        `Project technologies not listed as profile skills: ${missing.join(", ")}. Confirm your proficiency before adding them.`,
      );
    const next: Record<string, string> = {
      python: "Pandas",
      react: "Accessibility testing",
      sql: "Data modeling",
      figma: "Usability testing",
    };
    for (const skill of p.skills) {
      const name = next[skill.name.toLowerCase()];
      if (
        name &&
        !p.skills.some((s) => s.name.toLowerCase() === name.toLowerCase())
      )
        r.recommendations.push(
          `Recommended next skill, not an existing skill: ${name}, related to ${skill.name}.`,
        );
    }
    if (!p.skills.length)
      r.requiresUserInput.push(
        "Add your current skills. No skill level can be inferred from an empty profile.",
      );
    if (p.experience.length)
      r.facts.push(
        `${p.experience.length} experience entries supplied; these do not establish proficiency on their own.`,
      );
  }
  if (analysisModule === "Achievement Analysis") {
    r.summary = p.achievements.length
      ? "Achievement evidence review. No badges are awarded by HECX."
      : "HECX needs more information.";
    for (const a of p.achievements) {
      r.facts.push(`Recorded achievement: ${a.title}`);
      if (a.description) r.strengths.push(`${a.title}: description supplied.`);
      else
        r.gaps.push(
          `${a.title}: describe what you did and how it can be checked.`,
        );
      if (!a.issuer && !a.date)
        r.gaps.push(`${a.title}: issuer and date not provided.`);
    }
    r.recommendations = [
      "A possible future badge category is Project Completion, only after a project and supporting evidence satisfy defined system criteria. This is not an earned or verified badge.",
    ];
    if (!p.achievements.length)
      r.requiresUserInput.push(
        "Add an achievement you actually earned, with a description or evidence.",
      );
  }
  if (analysisModule === "Creator Identity") {
    r.summary =
      "Suggested positioning based on your existing skills. You decide what represents you.";
    r.facts = [
      ...(p.identity ? [`Current identity: ${p.identity}`] : []),
      ...p.skills.map((s) => `Current skill: ${s.name}`),
    ];
    const skills = p.skills.map((s) => s.name.toLowerCase());
    let identity = "";
    if (skills.includes("python") && skills.includes("machine learning"))
      identity = "AI Developer";
    else if (
      skills.includes("react") &&
      (skills.includes("node.js") || skills.includes("sql"))
    )
      identity = "Full-Stack Developer";
    else if (skills.includes("figma") || skills.includes("ui/ux"))
      identity = "UI/UX Designer";
    else if (p.identity) identity = tidy(p.identity);
    else if (p.skills.length) identity = `${p.skills[0].name} Creator`;
    if (identity)
      change(
        "profile.identity",
        "Suggested identity",
        p.identity,
        identity,
        `Suggested from the supplied skills: ${p.skills.map((s) => s.name).join(", ")}. This is positioning, not a verified credential.`,
      );
    else
      r.requiresUserInput.push(
        "Add your actual skills or an identity before asking for positioning.",
      );
    if (identity === p.identity)
      r.strengths.push(
        "Your current identity already matches this conservative suggestion.",
      );
  }
  if (analysisModule === "Portfolio Improvements") {
    const portfolio = c.portfolio;
    r.summary =
      "Portfolio presentation suggestions; source identity and published versions stay separate.";
    if (!portfolio) {
      r.requiresUserInput.push(
        "Open your portfolio draft to analyze its sections.",
      );
    } else {
      r.facts.push(
        `Template: ${portfolio.template}. ${portfolio.sections.filter((s) => s.enabled).length} enabled sections.`,
        c.publishedVisibility
          ? `Published snapshot visibility: ${c.publishedVisibility}.`
          : "No published snapshot.",
      );
      const dataTypes = [
        ...(p.name ? ["Hero"] : []),
        ...(p.bio ? ["About"] : []),
        ...(p.skills.length ? ["Skills"] : []),
        ...(c.projects.some((x) => x.status === "Published")
          ? ["Projects"]
          : []),
        ...(p.experience.length ? ["Experience"] : []),
        ...(p.education.length ? ["Education"] : []),
        ...(p.achievements.length ? ["Achievements"] : []),
        ...(p.socialLinks.length ? ["Contact"] : []),
      ];
      for (const type of dataTypes)
        if (!portfolio.sections.some((s) => s.type === type && s.enabled))
          r.gaps.push(
            `${type} has source data but no enabled section. Enable it in the builder if you want to show it.`,
          );
      const order = [
        "Hero",
        "About",
        "Projects",
        "Skills",
        "Experience",
        "Education",
        "Achievements",
        "Contact",
        "GitHub",
        "LinkedIn",
      ];
      const sorted = [...portfolio.sections].sort(
        (a, b) => order.indexOf(a.type) - order.indexOf(b.type),
      );
      change(
        "portfolio.order",
        "Suggested section order",
        portfolio.sections.map((s) => s.id),
        sorted.map((s) => s.id),
        "Identity first, then available work and skills. Disabled sections remain disabled.",
      );
      const hero = portfolio.sections.find((s) => s.type === "Hero");
      const heroText = [p.name, p.identity].filter(Boolean).join(" — ");
      if (hero && heroText)
        change(
          "portfolio.hero",
          "Suggested hero text",
          hero.source === "custom" ? hero.content : "",
          heroText,
          "Reuses only your name and current identity; applies to portfolio presentation only.",
          hero.id,
        );
      const candidates = c.projects
        .filter((x) => x.status === "Published")
        .sort(
          (a, b) =>
            Number(!!b.description) +
            Number(!!b.contribution) -
            Number(!!a.description) -
            Number(!!a.contribution),
        )
        .slice(0, 3);
      if (candidates.length)
        change(
          "portfolio.featured",
          "Suggested featured projects",
          portfolio.featuredProjects,
          candidates.map((x) => x.id),
          "Prioritizes published projects with a supplied description and contribution; not a quality score.",
        );
      if (!p.bio)
        r.recommendations.push(
          "Add a bio if you want an About section. HECX will not invent your background.",
        );
      r.priorityActions.push(
        "Review suggestions in the draft, preview, and publish separately when ready.",
      );
    }
  }
  if (analysisModule === "Match Analyzer") {
    r.summary =
      "Matching uses only supplied factors. Unknown factors stay unknown.";
    if (c.publicCreator) {
      const candidate = c.publicCreator;
      r.facts.push(
        `Public creator: ${candidate.name} · ${candidate.identity}`,
        `Public skills: ${candidate.skills.join(", ")}`,
      );
      const rec = getRecommendations(
        {
          profile: { ...p, avatar: "", location: "" },
          projects: c.projects.map((x) => ({ ...x, media: [] })),
        },
        [candidate],
      )[0];
      if (rec) r.strengths.push(...rec.reasons);
      else
        r.gaps.push(
          "No shared skill, category, identity, project technology, or interest match was found.",
        );
      if (c.query) {
        r.facts.push(`Search: ${c.query}`);
        r.recommendations.push(
          searchCreatorPool([candidate], c.query).length
            ? "The public creator record contains all search terms. This is text relevance, not an endorsement."
            : "The full query does not match this creator’s public record.",
        );
      }
    }
    const campaign = c.campaign;
    if (campaign) {
      r.facts.push(`User-provided campaign context: ${campaign.name}`);
      const matched = campaign.requiredSkills.filter((s) =>
        p.skills.some((x) => x.name.toLowerCase() === s.toLowerCase()),
      );
      const gaps = campaign.requiredSkills.filter((s) => !matched.includes(s));
      r.strengths.push(
        `Required skills present: ${matched.join(", ") || "none"}.`,
      );
      if (gaps.length)
        r.gaps.push(`Required skills not listed: ${gaps.join(", ")}.`);
      if (!campaign.requiredSkills.length)
        r.requiresUserInput.push(
          "Provide required skills before evaluating a skill match.",
        );
      if (campaign.identity)
        r.facts.push(
          `Identity requirement: ${campaign.identity}; current identity: ${p.identity || "not provided"}.`,
        );
    }
    if (!c.publicCreator && !campaign)
      r.requiresUserInput.push(
        "Choose Explain Match on a public creator, or provide a campaign name and required skills.",
      );
    r.gaps.push(
      "Audience fit, budget fit, and mutual availability: insufficient comparable data.",
    );
    r.confidence = "Limited data";
  }
  if (!r.facts.length && !r.strengths.length) {
    r.confidence = "Insufficient data";
    if (!r.requiresUserInput.length)
      r.requiresUserInput.push("Add relevant profile or project information.");
  } else if (r.requiresUserInput.length) r.confidence = "Limited data";
  if (c.module === "AI Chat" && c.history.length)
    r.recommendations.push(
      `Continuing the session’s ${analysisModule.toLowerCase()} context. Suggestions still require your review.`,
    );
  return r;
}
export const MockHECXProvider: AIProvider = {
  async analyze(context, signal) {
    if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
    return analyzeLocal(context);
  },
  async suggest(action, source, signal) {
    if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
    return createSuggestion(
      action as Parameters<typeof createSuggestion>[0],
      source,
    );
  },
};
