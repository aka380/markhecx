import { api } from "../api/client";
import { z } from "zod";
import type { AppState } from "../store";
import { buildHECXContext } from "./context";
import {
  AIProvider,
  HecxError,
  HecxOptions,
  responseSchema,
  HecxResult,
  HecxContext,
} from "./contracts";
import { MockHECXProvider } from "./mock-provider";
import type { AssistanceAction } from "../assistance";
const suggestionSchema = z
  .object({
    text: z.string().max(12000),
    reason: z.string().max(2000),
    applicable: z.boolean(),
  })
  .strict();
export function validateHECXResponse(
  raw: unknown,
  context: HecxContext,
): HecxResult {
  const parsed = responseSchema.safeParse(raw);
  if (!parsed.success) throw new HecxError("invalid");
  const result = parsed.data;
  if (!context.authorized && result.suggestedChanges.length)
    throw new HecxError("invalid");
  for (const change of result.suggestedChanges) {
    if (change.sourceVersion !== context.sourceVersion)
      throw new HecxError("invalid");
    let before: string | string[] | undefined;
    if (change.target === "profile.bio") before = context.profile?.bio;
    if (change.target === "profile.identity")
      before = context.profile?.identity;
    if (change.target === "project.description")
      before = context.projects.find(
        (p) => p.id === change.targetId,
      )?.description;
    if (change.target === "portfolio.hero") {
      const s = context.portfolio?.sections.find(
        (s) => s.id === change.targetId && s.type === "Hero",
      );
      if (s) before = s.source === "custom" ? s.content : "";
    }
    if (change.target === "portfolio.order")
      before = context.portfolio?.sections.map((s) => s.id);
    if (change.target === "portfolio.featured")
      before = context.portfolio?.featuredProjects;
    if (
      before === undefined ||
      JSON.stringify(before) !== JSON.stringify(change.before)
    )
      throw new HecxError("invalid");
    const arrayTarget = ["portfolio.order", "portfolio.featured"].includes(
      change.target,
    );
    if (arrayTarget !== Array.isArray(change.value))
      throw new HecxError("invalid");
    if (Array.isArray(change.value)) {
      if (new Set(change.value).size !== change.value.length)
        throw new HecxError("invalid");
      const allowed =
        change.target === "portfolio.order"
          ? context.portfolio?.sections.map((s) => s.id) || []
          : context.projects
              .filter((p) => p.status === "Published")
              .map((p) => p.id);
      if (
        change.value.some((id) => !allowed.includes(id)) ||
        (change.target === "portfolio.order" &&
          change.value.length !== allowed.length)
      )
        throw new HecxError("invalid");
    }
  }
  return result;
}
async function bounded<T>(
  run: (signal: AbortSignal) => Promise<T>,
  external?: AbortSignal,
  timeout = 8000,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let abort: () => void = () => {};
  try {
    return await Promise.race([
      Promise.resolve().then(() => {
        if (external?.aborted) throw new HecxError("cancelled");
        return run(controller.signal);
      }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new HecxError("timeout"));
        }, timeout);
        abort = () => {
          controller.abort();
          reject(new HecxError("cancelled"));
        };
        external?.addEventListener("abort", abort, { once: true });
      }),
    ]);
  } catch (e) {
    if (e instanceof HecxError) throw e;
    if (e instanceof Error && e.name === "AbortError")
      throw new HecxError("cancelled");
    throw new HecxError("unavailable");
  } finally {
    if (timer) clearTimeout(timer);
    external?.removeEventListener("abort", abort);
  }
}
/** Future providers must be server-side adapters. Never configure secret keys here. */
export function createHECXService(
  provider: AIProvider = MockHECXProvider,
  timeout = 8000,
  resolveContext: typeof buildHECXContext = buildHECXContext,
) {
  return {
    async analyze(state: AppState, options: HecxOptions, signal?: AbortSignal) {
      const context = resolveContext(state, options);
      const raw = await bounded(
        (s) => provider.analyze(context, s),
        signal,
        timeout,
      );
      return validateHECXResponse(raw, context);
    },
    async suggest(
      action: AssistanceAction,
      source: string,
      signal?: AbortSignal,
    ) {
      const raw = await bounded(
        (s) => provider.suggest(action, source.slice(0, 12000), s),
        signal,
        timeout,
      );
      const parsed = suggestionSchema.safeParse(raw);
      if (!parsed.success) throw new HecxError("invalid");
      return parsed.data;
    },
  };
}
const localService = createHECXService();
export const hecxService: ReturnType<typeof createHECXService> = {
  analyze(state, options, signal) {
    return typeof window === "undefined"
      ? localService.analyze(state, options, signal)
      : api("/hecx/analyze", { method: "POST", body: options, signal });
  },
  suggest(action, source, signal) {
    return typeof window === "undefined"
      ? localService.suggest(action, source, signal)
      : api("/hecx/field", {
          method: "POST",
          body: { action, source },
          signal,
        });
  },
};
