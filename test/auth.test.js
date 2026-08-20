import assert from "node:assert/strict";
import test from "node:test";

process.env.AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || "tenant.example.auth0.com";
process.env.AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE || "https://api.liftmetrics.test";

const { requireAuth } = await import("../server/auth.js");

test("rejects requests without a bearer access token", async () => {
  const req = { get: () => undefined };
  let response;
  const res = { status: (status) => ({ json: (body) => { response = { status, body }; } }) };
  await requireAuth(req, res, () => assert.fail("next must not run"));
  assert.deepEqual(response, { status: 401, body: { error: "A bearer access token is required." } });
});
