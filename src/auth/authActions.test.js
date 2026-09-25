import assert from "node:assert/strict";
import test from "node:test";
import { AuthActionError, authErrorMessage, createAuthActions } from "./authActions.js";

const signup = {
  email: " player@example.com ",
  password: "test password",
  displayName: " Player ",
  confirmPassword: "test password",
};

test("signup sends the display name and never sends password confirmation", async () => {
  let payload;
  const actions = createAuthActions({ signUp: { email: async (input) => {
    payload = input;
    return { data: { user: { name: input.name }, token: null }, error: null };
  } } });
  const result = await actions.signUp(signup);
  assert.deepEqual(payload, { email: "player@example.com", password: signup.password, name: "Player" });
  assert.equal(result.token, null); // Account creation does not imply a session.
});

test("invalid signup never reaches Neon", async () => {
  const actions = createAuthActions({ signUp: { email: () => assert.fail("Network must not be called") } });
  for (const [input, message] of [
    [{ email: "invalid" }, /valid email/],
    [{ displayName: "  " }, /display name/],
    [{ password: "short", confirmPassword: "short" }, /at least 8/],
    [{ password: "a".repeat(129) }, /128/],
    [{ confirmPassword: "different" }, /do not match/],
  ]) {
    await assert.rejects(actions.signUp({ ...signup, ...input }), message);
  }
});

test("sign-in trims email but preserves the password exactly", async () => {
  const actions = createAuthActions({ signIn: { email: async (input) => {
    assert.deepEqual(input, { email: "player@example.com", password: "  secret  " });
    return { data: { user: { id: "user-id" } }, error: null };
  } } });
  await actions.signIn({ email: signup.email, password: "  secret  " });
});

test("SDK result errors reject, with readable messages and no server details", async () => {
  const actions = createAuthActions({ signIn: { email: async () => ({
    error: { code: "INVALID_EMAIL_OR_PASSWORD", message: "internal detail" },
  }) } });
  await assert.rejects(actions.signIn(signup), { message: "Email or password is incorrect." });
  assert.equal(authErrorMessage({ code: "UNKNOWN", message: "sensitive detail" }), "We couldn't complete your request. Please try again.");
  assert.match(authErrorMessage({ code: "USER_ALREADY_EXISTS" }), /already exists/);
  assert.match(authErrorMessage({ code: "EMAIL_NOT_VERIFIED" }), /Verify your email/);
  assert.match(authErrorMessage({ status: 429 }), /Too many attempts/);
});

test("network failures reject with a recoverable message", async () => {
  const actions = createAuthActions({ signIn: { email: async () => { throw new TypeError("Failed to fetch"); } } });
  await assert.rejects(actions.signIn(signup), /Check your internet connection/);
});

test("Neon normalized thrown errors are handled as well as result errors", async () => {
  const actions = createAuthActions({ signIn: { email: async () => {
    throw Object.assign(new Error("Internal server detail"), { code: "invalid_credentials", status: 401 });
  } } });
  await assert.rejects(actions.signIn(signup), { message: "Email or password is incorrect." });
  assert.match(authErrorMessage({ code: "user_already_exists" }), /already exists/);
  assert.match(authErrorMessage({ code: "validation_failed", message: "User already exists. Use another email." }), /already exists/);
  assert.match(authErrorMessage({ code: "email_not_confirmed" }), /Verify your email/);
});

test("sign-out waits for Neon and rejects service failures", async () => {
  let called = false;
  await createAuthActions({ signOut: async () => { called = true; return { data: { success: true } }; } }).signOut();
  assert.equal(called, true);
  await assert.rejects(createAuthActions({ signOut: async () => ({ error: { status: 500 } }) }).signOut(), AuthActionError);
});

test("missing configuration fails safely", async () => {
  await assert.rejects(createAuthActions(null).signIn(signup), /not configured/);
});
