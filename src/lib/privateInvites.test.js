import assert from "node:assert/strict";
import test from "node:test";
import { createWorldApi } from "../api/world.js";
import { DataApiError } from "../api/dataApi.js";
import { answerAndJoin, respondToInvite } from "./privateInvites.js";

const invite = { id: "room-1", from: "creator", to: "invitee" };

for (const scenario of [
  { name: "confirmed acceptance enters the room", status: "accepted", rows: [{ id: invite.id, status: "accepted" }], success: true, enters: true },
  { name: "confirmed decline does not enter", status: "declined", rows: [{ id: invite.id, status: "declined" }], success: true },
  { name: "confirmed cancellation does not enter", status: "cancelled", rows: [{ id: invite.id, status: "cancelled" }], success: true },
  { name: "zero-row update does not enter", status: "accepted", rows: [] },
  { name: "missing representation does not enter", status: "accepted", rows: null },
  { name: "mismatched status does not enter", status: "accepted", rows: [{ id: invite.id, status: "cancelled" }] },
  { name: "mismatched room does not enter", status: "accepted", rows: [{ id: "other", status: "accepted" }] },
  { name: "invalid status does not enter", status: "pending", rows: [] },
  { name: "denied transition propagates failure", status: "accepted", error: new DataApiError("Denied", { status: 403, code: "42501" }) },
  { name: "network failure propagates failure", status: "accepted", error: new DataApiError("Offline") },
]) {
  test(scenario.name, async () => {
    const calls = [];
    const errors = [];
    const joined = [];
    let refreshed = 0;
    const api = createWorldApi(async (path, options) => {
      calls.push({ path, options });
      if (scenario.error) throw scenario.error;
      return scenario.rows;
    });
    const answer = (id, status) => respondToInvite(
      api.answer,
      async () => { refreshed += 1; },
      (error) => errors.push(error),
      id,
      status,
    );
    const result = await answerAndJoin(answer, invite.id, scenario.status, invite,
      (...args) => joined.push(args));
    assert.equal(result, Boolean(scenario.success));
    assert.equal(refreshed, scenario.success ? 1 : 0);
    assert.equal(errors.length, scenario.success ? 0 : 1);
    assert.deepEqual(joined, scenario.enters ? [[`p:${invite.id}`, invite]] : []);
    if (scenario.error) assert.equal(errors[0], scenario.error);
    if (scenario.status === "pending") assert.equal(calls.length, 0);
    else assert.equal(calls[0].options.prefer, "return=representation");
  });
}

test("the API rejects a zero-row update with a specific error", async () => {
  const api = createWorldApi(async () => []);
  await assert.rejects(api.answer(invite.id, "accepted"), { code: "INVITE_NOT_UPDATED" });
});

test("the API preserves request failures", async () => {
  const failure = new DataApiError("Offline");
  const api = createWorldApi(async () => { throw failure; });
  await assert.rejects(api.answer(invite.id, "accepted"), (error) => error === failure);
});

test("undefined success and missing invite cannot enter a room", async () => {
  await answerAndJoin(async () => undefined, invite.id, "accepted", invite,
    () => assert.fail("unconfirmed entry"));
  await answerAndJoin(async () => true, invite.id, "accepted", undefined,
    () => assert.fail("missing invite entry"));
});
