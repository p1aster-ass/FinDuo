import assert from "node:assert/strict";
import test from "node:test";
import { createDataApi, DataApiError, isMissingTable } from "./dataApi.js";
import { createProfileApi } from "./profiles.js";

const BASE = "https://example.test/neondb/rest/v1/";
const json = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
  text: async () => (body === undefined ? "" : JSON.stringify(body)),
});

test("requests carry the user's JWT and hit the Data API root", async () => {
  let call;
  const request = createDataApi({
    baseUrl: BASE,
    getToken: async () => "jwt-token",
    fetchImpl: async (url, options) => {
      call = { url, options };
      return json(200, [{ ok: true }]);
    },
  });
  assert.deepEqual(await request("profiles?select=*"), [{ ok: true }]);
  assert.equal(
    call.url,
    "https://example.test/neondb/rest/v1/profiles?select=*",
  );
  assert.equal(call.options.headers.Authorization, "Bearer jwt-token");
  assert.equal(call.options.body, undefined);
});

test("missing configuration or session never reaches the network", async () => {
  const fetchImpl = () => assert.fail("Network must not be called");
  await assert.rejects(
    createDataApi({
      baseUrl: "http://insecure.test",
      getToken: async () => "t",
      fetchImpl,
    })("profiles"),
    /isn’t configured/,
  );
  await assert.rejects(
    createDataApi({ baseUrl: BASE, getToken: async () => null, fetchImpl })(
      "profiles",
    ),
    { status: 401 },
  );
});

test("session lookup failures become readable errors", async () => {
  const request = createDataApi({
    baseUrl: BASE,
    getToken: async () => {
      throw new TypeError("Cannot read properties of undefined");
    },
    fetchImpl: () => assert.fail("Network must not be called"),
  });
  await assert.rejects(request("profiles"), {
    message: /couldn’t check your session/,
  });
});

test("server errors keep their code but hide server details", async () => {
  const request = createDataApi({
    baseUrl: BASE,
    getToken: async () => "t",
    fetchImpl: async () =>
      json(404, {
        code: "PGRST205",
        message: "Could not find the table 'public.profiles'",
      }),
  });
  const error = await request("profiles").catch((e) => e);
  assert.ok(error instanceof DataApiError);
  assert.equal(error.code, "PGRST205");
  assert.doesNotMatch(error.message, /public\.profiles/);
  assert.equal(isMissingTable(error), true);
});

test("network failures reject with a recoverable message", async () => {
  const request = createDataApi({
    baseUrl: BASE,
    getToken: async () => "t",
    fetchImpl: async () => {
      throw new TypeError("Failed to fetch");
    },
  });
  await assert.rejects(request("profiles"), /internet connection/);
});

test("profiles load every gaming field from snake_case columns", async () => {
  const calls = [];
  const api = createProfileApi(async (path) => {
    calls.push(path);
    return [
      {
        username: "ember",
        region: "eu",
        bio: null,
        games: ["valorant"],
        rank: "Gold",
        comm_styles: ["mic"],
        roles: null,
        availability: ["late-nights"],
      },
    ];
  });
  assert.deepEqual(await api.load("u1"), {
    stored: true,
    exists: true,
    profile: {
      username: "ember",
      region: "eu",
      bio: "",
      games: ["valorant"],
      rank: "Gold",
      commStyles: ["mic"],
      roles: [],
      availability: ["late-nights"],
    },
  });
  assert.equal(
    calls[0],
    "profiles?user_id=eq.u1&select=username,region,bio,games,rank,comm_styles,roles,availability",
  );
});

test("a user without a row loads as not existing yet", async () => {
  const api = createProfileApi(async () => []);
  assert.deepEqual(await api.load("u1"), {
    stored: true,
    exists: false,
    profile: null,
  });
});

test("a new profile is a plain insert that needs no read-back", async () => {
  let call;
  const api = createProfileApi(async (path, options) => {
    call = { path, options };
    return null;
  });
  await api.create("u1", "Ember", {
    username: "ember",
    games: ["cs2"],
    region: "na-east",
    rank: "",
    commStyles: ["ping"],
    bio: "",
  });
  assert.equal(call.path, "profiles");
  assert.equal(call.options.method, "POST");
  assert.equal(call.options.prefer, "return=minimal");
  assert.deepEqual(call.options.body, {
    user_id: "u1",
    display_name: "Ember",
    username: "ember",
    region: "na-east",
    bio: "",
    games: ["cs2"],
    rank: null,
    comm_styles: ["ping"],
    roles: [],
    availability: [],
  });
});

test("updates target the user's row and report a blocked update", async () => {
  let call;
  const api = createProfileApi(async (path, options) => {
    call = { path, options };
    return [{ user_id: "u1" }];
  });
  await api.update("u1", "Ember", { region: "eu" });
  assert.equal(call.path, "profiles?user_id=eq.u1&select=user_id");
  assert.equal(call.options.method, "PATCH");
  assert.deepEqual(call.options.body, { display_name: "Ember", region: "eu" });

  const blocked = createProfileApi(async () => []);
  await assert.rejects(blocked.update("u1", "Ember", { region: "eu" }), {
    status: 403,
    code: "NO_ROWS_UPDATED",
  });
});

test("a taken username is reported on the username field", async () => {
  const taken = new DataApiError("x", {
    status: 409,
    code: "23505",
    detail: {
      message:
        'duplicate key value violates unique constraint "profiles_username_key"',
    },
  });
  const api = createProfileApi(async () => {
    throw taken;
  });
  await assert.rejects(api.create("u1", "Ember", { username: "ember" }), {
    field: "username",
    message: /username is taken/,
  });
  await assert.rejects(api.update("u1", "Ember", { username: "ember" }), {
    field: "username",
  });
  const otherDuplicate = createProfileApi(async () => {
    throw new DataApiError("dup", {
      code: "23505",
      detail: { message: 'unique constraint "profiles_pkey"' },
    });
  });
  await assert.rejects(otherDuplicate.create("u1", "Ember", {}), {
    message: "dup",
    field: null,
  });
});

test("403s explain themselves in logs and read clearly in the UI", async () => {
  const logged = [];
  const request = createDataApi({
    baseUrl: BASE,
    getToken: async () => "t",
    onError: (error) => logged.push(error),
    fetchImpl: async () =>
      json(403, {
        code: "42501",
        message:
          'new row violates row-level security policy for table "profiles"',
      }),
  });
  await assert.rejects(request("profiles", { method: "POST", body: {} }), {
    message: /didn’t allow this change/,
  });
  assert.equal(logged[0].code, "42501");
  assert.match(logged[0].detail.message, /row-level security/);
  assert.equal(logged[0].detail.path, "profiles");
});

test("a missing profiles table means not stored yet, other errors surface", async () => {
  const missing = createProfileApi(async () => {
    throw new DataApiError("x", { status: 404, code: "PGRST205" });
  });
  assert.deepEqual(await missing.load("u1"), {
    stored: false,
    exists: false,
    profile: null,
  });
  const offline = createProfileApi(async () => {
    throw new DataApiError("offline");
  });
  await assert.rejects(offline.load("u1"), /offline/);
});
