import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID, generateKeyPairSync, sign } from "node:crypto";
import { OAuth2Client, type TokenPayload } from "google-auth-library";
import {
  googleAuthService,
  googleChallenge,
  consumeGoogleChallenge,
} from "../services/google";
import { start, account } from "./helpers";
import {
  users,
  sessions,
  passwordResets,
  googleChallenges,
} from "../models/auth";
import { newSession, tokenHash } from "../services/auth";
import { passwordResetService } from "../services/password-reset";
const audience = "unit-test.apps.googleusercontent.com";
function claims(): TokenPayload & { nonce: string } {
  const now = Math.floor(Date.now() / 1000);
  return {
    iss: "https://accounts.google.com",
    aud: audience,
    sub: randomUUID(),
    iat: now,
    exp: now + 3600,
    email: randomUUID() + "@example.test",
    email_verified: true,
    name: "Google Test",
    nonce: "challenge",
  };
}
test("Google verified identities reuse accounts and require explicit authenticated linking", async () => {
  const t = await start();
  const ids: string[] = [];
  try {
    const p = claims(),
      login = googleAuthService(async () => p, audience);
    const first = await login("test", "challenge", "Creator");
    ids.push(first._id);
    assert.equal(first.passwordHash, undefined);
    assert.equal(first.googleSubject, p.sub);
    const again = await login("test", "challenge", "Brand");
    assert.equal(again._id, first._id);
    assert.equal(again.role, "Creator");
    assert.equal(await users.countDocuments({ googleSubject: p.sub }), 1);
    const session = await newSession(first._id);
    const headers = { cookie: "markhecx_session=" + session.token };
    assert.equal((await fetch(t.base + "/auth/me", { headers })).status, 200);
    assert.equal(
      (await fetch(t.base + "/auth/me", { headers: { ...headers } })).status,
      200,
    );
    const local = await account(t.base);
    ids.push(local.user.id);
    const old = await users.findOne({ _id: local.user.id }),
      linkedClaims = { ...claims(), email: local.user.email };
    const link = googleAuthService(async () => linkedClaims, audience);
    await assert.rejects(
      () => link("test", "challenge", "Brand"),
      /existing MarkHECX account/,
    );
    const linked = await link("test", "challenge", "Brand", local.user.id);
    assert.equal(linked._id, local.user.id);
    assert.equal(linked.passwordHash, old?.passwordHash);
    assert.equal(linked.role, "Creator");
    assert.equal(await users.countDocuments({ email: local.user.email }), 1);
  } finally {
    for (const id of ids) {
      await users.deleteOne({ _id: id });
      await sessions.deleteMany({ userId: id });
    }
    await t.close();
  }
});
test("Google rejects wrong issuer, audience, expiry, nonce and unverified or incomplete identity", async () => {
  const base = claims();
  for (const patch of [
    { iss: "https://evil.example" },
    { aud: "other" },
    { exp: 1 },
    { nonce: "wrong" },
    { email_verified: false },
    { sub: "" },
    { email: "invalid" },
    { iat: Math.floor(Date.now() / 1000) + 500 },
  ])
    await assert.rejects(() =>
      googleAuthService(async () => ({ ...base, ...patch }), audience)(
        "test",
        "challenge",
        "Creator",
      ),
    );
});
test("official Google verifier rejects bad JWT signatures and wrong audience using controlled signing certificates", async () => {
  const pair = generateKeyPairSync("rsa", { modulusLength: 2048 }),
    p = claims();
  const head = Buffer.from(
      JSON.stringify({ alg: "RS256", kid: "test" }),
    ).toString("base64url"),
    body = Buffer.from(JSON.stringify(p)).toString("base64url"),
    data = head + "." + body,
    signature = sign("RSA-SHA256", Buffer.from(data), pair.privateKey).toString(
      "base64url",
    ),
    jwt = data + "." + signature;
  const client = new OAuth2Client(),
    certs = {
      test: pair.publicKey.export({ type: "spki", format: "pem" }).toString(),
    };
  assert.equal(
    (
      await client.verifySignedJwtWithCertsAsync(jwt, certs, audience, [
        "https://accounts.google.com",
      ])
    ).getPayload()?.sub,
    p.sub,
  );
  await assert.rejects(() =>
    client.verifySignedJwtWithCertsAsync(jwt, certs, "wrong", [
      "https://accounts.google.com",
    ]),
  );
  await assert.rejects(() =>
    client.verifySignedJwtWithCertsAsync(
      data + "." + signature.slice(0, -5) + "aaaaa",
      certs,
      audience,
      ["https://accounts.google.com"],
    ),
  );
});
test("email rejection propagates and invalidates OTP for existing and unknown accounts", async () => {
  const t = await start();
  let id = "";
  const unknown = randomUUID() + "@example.test";
  try {
    const a = await account(t.base);
    id = a.user.id;
    let calls = 0;
    const reset = passwordResetService({
      async send() {
        calls++;
        throw Error("provider rejected");
      },
    });
    for (const email of [a.user.email, unknown]) {
      await assert.rejects(() => reset.request(email), /could not be sent/);
      assert.equal(
        await passwordResets.countDocuments({ _id: tokenHash(email) }),
        0,
      );
    }
    assert.equal(calls, 2);
  } finally {
    await users.deleteOne({ _id: id });
    await sessions.deleteMany({ userId: id });
    await t.close();
  }
});

test("Google challenges bind browser and nonce, expire, and can only be consumed once", async () => {
  const t = await start();
  try {
    const c = await googleChallenge(audience);
    const row = await googleChallenges.findOne({ _id: tokenHash(c.cookie) });
    assert.ok(row);
    assert.notEqual(row.nonceHash, c.nonce);
    assert.equal(await consumeGoogleChallenge(c.cookie, "wrong"), false);
    assert.equal(await consumeGoogleChallenge(c.cookie, c.nonce), true);
    assert.equal(await consumeGoogleChallenge(c.cookie, c.nonce), false);
    const expired = await googleChallenge(audience);
    await googleChallenges.updateOne(
      { _id: tokenHash(expired.cookie) },
      { $set: { expiresAt: new Date(0) } },
    );
    assert.equal(
      await consumeGoogleChallenge(expired.cookie, expired.nonce),
      false,
    );
    await googleChallenges.deleteOne({ _id: tokenHash(expired.cookie) });
  } finally {
    await t.close();
  }
});
