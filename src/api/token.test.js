import assert from "node:assert/strict";
import test from "node:test";
import { createInternalNeonAuth } from "@neondatabase/auth";
import { BetterAuthReactAdapter } from "@neondatabase/auth/react/adapters";
import { getDataApiToken } from "./token.js";

test("installed Neon SDK container exposes a real JWT getter with the React adapter", () => {
  const auth = createInternalNeonAuth("https://example.invalid/auth", {
    adapter: BetterAuthReactAdapter(),
  });
  assert.equal(Object.hasOwn(auth, "getJWTToken"), true);
  assert.equal(typeof auth.getJWTToken, "function");
  assert.ok(auth.adapter);
});

test("Data API tokens come from the SDK JWT getter, never a session field", async () => {
  let calls = 0;
  const auth = {
    getJWTToken: async () => { calls += 1; return "test-jwt"; },
    getSession: () => assert.fail("session token must not be read directly"),
  };
  assert.equal(await getDataApiToken(auth), "test-jwt");
  assert.equal(calls, 1);
});

test("missing auth and signed-out sessions yield no bearer token", async () => {
  assert.equal(await getDataApiToken(null), null);
  assert.equal(await getDataApiToken({ getJWTToken: async () => null }), null);
});

test("token retrieval failures propagate", async () => {
  const error = new Error("Token unavailable");
  await assert.rejects(getDataApiToken({ getJWTToken: async () => { throw error; } }), (caught) => caught === error);
});
