import test from "node:test";
import assert from "node:assert/strict";
import { creators, searchCreators, modes } from "../lib/mark/data";
import { emptyState, localRepository, safeLink } from "../lib/mark/store";
import { demoHecx } from "../lib/mark/hecx";

test("creator search supports every documented discovery dimension", () => {
  const queries = [
    "Ava Chen",
    "avachen",
    "Product Designer",
    "Figma",
    "Forma",
    "Design",
    "Minimalist",
  ];
  for (const query of queries)
    assert.ok(
      searchCreators(query).some((c) => c.id === "ava-chen"),
      query,
    );
  assert.equal(searchCreators("typescript react")[0].id, "marcus-reed");
  assert.equal(searchCreators("not-a-real-creator").length, 0);
  assert.equal(searchCreators("  ").length, creators.length);
});

test("local repository survives corrupt and unavailable browser storage", () => {
  let raw: string | null = null;
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: () => raw,
      setItem: (_key: string, value: string) => {
        raw = value;
      },
    },
  });
  assert.deepEqual(localRepository.read(), emptyState);
  raw = "{invalid";
  assert.deepEqual(localRepository.read(), emptyState);
  raw = JSON.stringify({ signedIn: true });
  assert.deepEqual(localRepository.read(), emptyState);
  const state = {
    ...emptyState,
    signedIn: true,
    profile: { ...emptyState.profile, name: "Test creator" },
    saved: ["ava-chen"],
  };
  localRepository.write(state);
  assert.deepEqual(localRepository.read(), state);
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: () => {
        throw Error("blocked");
      },
    },
  });
  assert.deepEqual(localRepository.read(), emptyState);
});

test("external portfolio URLs accept only safe matching profiles", () => {
  assert.equal(safeLink("javascript:alert(1)"), null);
  assert.equal(safeLink("data:text/html,test"), null);
  assert.equal(safeLink("https://github.com.example.org/name", "GitHub"), null);
  assert.equal(safeLink("https://example.org", "LinkedIn"), null);
  assert.equal(
    safeLink("https://github.com/creator", "GitHub"),
    "https://github.com/creator",
  );
  assert.equal(
    safeLink("https://www.linkedin.com/in/creator", "LinkedIn"),
    "https://www.linkedin.com/in/creator",
  );
});

test("all HECX modes disclose scripted responses and handle empty data", async () => {
  const results = await Promise.all(
    modes.map((mode) =>
      demoHecx.respond({ mode, message: "Hello", profile: null, sections: [] }),
    ),
  );
  for (const response of results)
    assert.match(response, /scripted example, not a personalized AI analysis/);
  assert.match(results[modes.indexOf("Profile Analysis")], /No local profile/);
  assert.match(
    results[modes.indexOf("Portfolio Improvements")],
    /0 filled sections/,
  );
});
