import test from "node:test";
import assert from "node:assert/strict";
import { start, account } from "./helpers";
import { sessions, users } from "../models/auth";
import { creatorDocuments } from "../models/creators";
import { tokenHash } from "../services/auth";
import { backendHECX } from "../services/hecx";
import { MockHECXProvider } from "../../lib/mark/hecx/mock-provider";
import { publishPortfolio } from "../../lib/mark/domain";
import { api, APIError } from "../../lib/mark/api/client";

test("6H concurrent writes, malformed input, privacy, account changes and expiry", async () => {
  const t = await start();
  try {
    const a = await account(t.base),
      other = await account(t.base);
    const call = (
      path: string,
      method = "GET",
      body?: unknown,
      headers: Record<string, string> = a.headers,
    ) =>
      fetch(t.base + path, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    let w = await (await call("/workspace")).json();
    const writes = await Promise.all(
      ["First", "Second"].map((name) =>
        call("/workspace", "PUT", {
          state: { ...w.state, profile: { ...w.state.profile, name } },
          revision: w.revision,
        }),
      ),
    );
    assert.deepEqual(writes.map((r) => r.status).sort(), [200, 409]);
    w = await (await call("/workspace")).json();
    assert.equal(w.revision, 1);
    assert.equal(w.state.activity.length, 1);
    assert.equal(
      (
        await call("/workspace", "PUT", {
          state: {
            ...w.state,
            profile: { ...w.state.profile, bio: "a".repeat(12001) },
          },
          revision: w.revision,
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await call("/workspace", "PUT", {
          state: { signedIn: true },
          revision: w.revision,
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await call("/workspace", "PUT", {
          state: {
            ...w.state,
            profile: {
              ...w.state.profile,
              socialLinks: [
                { id: "bad", kind: "Website", url: "javascript:alert(1)" },
              ],
            },
          },
          revision: w.revision,
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await call(
          "/workspace",
          "PUT",
          { state: w.state, revision: w.revision },
          { ...a.headers, "x-csrf-token": "wrong" },
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await call("/workspace", "GET", undefined, {
          ...a.headers,
          "x-account-id": other.user.id,
        })
      ).status,
      401,
    );
    assert.equal(
      (await call("/workspace", "GET", undefined, other.headers)).status,
      200,
    );
    assert.equal((await call(`/creators/${a.user.id}`)).status, 404);
    const cookie = a.headers.cookie.split("=")[1];
    await sessions.updateOne(
      { _id: tokenHash(cookie) },
      { $set: { expiresAt: new Date(0) } },
    );
    assert.equal((await call("/auth/me")).status, 401);
    assert.equal(
      (
        await call("/workspace", "PUT", {
          state: w.state,
          revision: w.revision,
        })
      ).status,
      401,
    );
    assert.equal(
      (await creatorDocuments.findOne({ _id: a.user.id }))?.revision,
      1,
    );
    const preflight = await fetch(t.base + "/workspace", {
      method: "OPTIONS",
      headers: {
        origin: "http://127.0.0.1:3001",
        "access-control-request-method": "PUT",
        "access-control-request-headers":
          "content-type,x-csrf-token,x-account-id",
      },
    });
    assert.equal(preflight.status, 204);
    assert.match(
      preflight.headers.get("access-control-allow-headers")!,
      /X-Account-ID/,
    );
  } finally {
    await t.close();
  }
});

test("6H HECX receives only the requested real public creator and reports missing evidence", async () => {
  const t = await start();
  try {
    const a = await account(t.base),
      brand = await account(t.base, "Brand");
    let w = await (
      await fetch(t.base + "/workspace", { headers: a.headers })
    ).json();
    w.state.profile = {
      ...w.state.profile,
      name: "Evidence Creator",
      username: `evidence-${crypto.randomUUID().slice(0, 8)}`,
      identity: "Developer",
      skills: ["React", "Node.js", "TypeScript"].map((name) => ({
        id: name,
        name,
        category: "Development",
      })),
    };
    w.state.portfolio.visibility = "Unlisted";
    w.state.publication = publishPortfolio(
      w.state.portfolio,
      w.state.profile,
      [],
    );
    let response = await fetch(t.base + "/workspace", {
      method: "PUT",
      headers: a.headers,
      body: JSON.stringify({ state: w.state, revision: w.revision }),
    });
    assert.equal(response.status, 200);
    w = await response.json();
    assert.equal(
      (await fetch(t.base + `/public/portfolios/${w.state.profile.username}`))
        .status,
      200,
    );
    assert.equal((await fetch(t.base + `/creators/${a.user.id}`)).status, 404);
    w.state.portfolio.visibility = "Public";
    w.state.publication = publishPortfolio(
      w.state.portfolio,
      w.state.profile,
      [],
    );
    response = await fetch(t.base + "/workspace", {
      method: "PUT",
      headers: a.headers,
      body: JSON.stringify({ state: w.state, revision: w.revision }),
    });
    assert.equal(response.status, 200);
    w = await response.json();
    const publishedBio = w.state.publication.profile.bio;
    const oldPublication = {
      ...w.state.publication,
      publishedAt: "2000-01-01T00:00:00.000Z",
    };
    const saved = await fetch(t.base + "/workspace", {
      method: "PUT",
      headers: a.headers,
      body: JSON.stringify({
        state: {
          ...w.state,
          profile: {
            ...w.state.profile,
            bio: "Private draft after publication",
          },
          publication: oldPublication,
        },
        revision: w.revision,
        publicationAction: "none",
      }),
    });
    assert.equal(saved.status, 200);
    const publicSnapshot = await (
      await fetch(t.base + `/public/portfolios/${w.state.profile.username}`)
    ).json();
    assert.equal(publicSnapshot.publication.profile.bio, publishedBio);
    assert.notEqual(
      publicSnapshot.publication.publishedAt,
      oldPublication.publishedAt,
    );
    const saveCreator = await fetch(t.base + "/marketplace/commands", {
      method: "POST",
      headers: brand.headers,
      body: JSON.stringify({ type: "creator.save", id: a.user.id }),
    });
    assert.equal(saveCreator.status, 200);
    const brandSaves = await (
      await fetch(t.base + "/saved-creators", { headers: brand.headers })
    ).json();
    assert.ok(brandSaves.ids.includes(a.user.id));
    const creatorSaves = await (
      await fetch(t.base + "/saved-creators", { headers: a.headers })
    ).json();
    assert.deepEqual(creatorSaves.ids, []);
    const user = (await users.findOne({ _id: brand.user.id }))!;
    let seen = false;
    const service = backendHECX({
      ...MockHECXProvider,
      async analyze(context, signal) {
        seen = true;
        assert.equal(context.publicCreator?.id, a.user.id);
        assert.equal(context.publicCreator?.name, "Evidence Creator");
        assert.equal(context.publicCreator?.avatar, undefined);
        assert.ok(!JSON.stringify(context).includes("passwordHash"));
        return MockHECXProvider.analyze(context, signal);
      },
    });
    const result = await service.analyze(user, {
      module: "Match Analyzer",
      creatorId: a.user.id,
    });
    assert.ok(seen);
    assert.ok(
      result.gaps.some((g) => g.includes("insufficient comparable data")),
    );
    assert.equal(result.confidence, "Limited data");
    assert.equal(result.suggestedChanges.length, 0);
  } finally {
    await t.close();
  }
});

test("6H transport surfaces errors without retrying mutations", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  try {
    globalThis.fetch = async () => {
      calls++;
      throw new TypeError("offline");
    };
    await assert.rejects(
      api("/workspace", { method: "PUT", body: {} }),
      (e) => e instanceof APIError && e.status === 0,
    );
    assert.equal(calls, 1);
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: { message: "Conflict" } }), {
        status: 409,
      });
    await assert.rejects(
      api("/workspace", { method: "PUT", body: {} }),
      (e) =>
        e instanceof APIError && e.status === 409 && e.message === "Conflict",
    );
  } finally {
    globalThis.fetch = original;
  }
});
