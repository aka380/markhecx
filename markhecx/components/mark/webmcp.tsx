"use client";
import { useEffect } from "react";
import { searchCreators } from "@/lib/mark/data";
// Optional browser capability. Uses the same search function as creator discovery.
export function WebMcp() {
  useEffect(() => {
    type Registry = {
      registerTool: (
        tool: {
          name: string;
          description: string;
          inputSchema: object;
          annotations: object;
          execute: (input: unknown) => unknown;
        },
        options: { signal: AbortSignal },
      ) => void | Promise<void>;
    };
    const context = (document as Document & { modelContext?: Registry })
      .modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      Promise.resolve(
        context.registerTool(
          {
            name: "search_sample_creators",
            description:
              "Search the illustrative MarkHECX creator directory by name, username, identity, skills, project, category, or tag. Does not change the page or save any data.",
            inputSchema: {
              type: "object",
              properties: { query: { type: "string", maxLength: 200 } },
              required: ["query"],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: true, untrustedContentHint: false },
            execute(input: unknown) {
              if (
                !input ||
                typeof input !== "object" ||
                !("query" in input) ||
                typeof input.query !== "string" ||
                input.query.length > 200 ||
                Object.keys(input).some((k) => k !== "query")
              )
                throw new Error(
                  "Provide only a query string of up to 200 characters.",
                );
              return {
                sample: true,
                creators: searchCreators(input.query).map((c) => ({
                  name: c.name,
                  identity: c.identity,
                  skills: c.skills,
                  profilePath: `/creators/${c.id}`,
                  portfolioPath: `/portfolio/${c.id}`,
                })),
              };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {
        /* Optional capability; normal UI remains available. */
      });
    } catch {
      /* Unsupported browser implementation. */
    }
    return () => lifecycle.abort();
  }, []);
  return null;
}
