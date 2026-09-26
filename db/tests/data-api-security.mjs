import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createDataApi } from '../../src/api/dataApi.js';
import { getDataApiToken } from '../../src/api/token.js';
import { createProfileApi } from '../../src/api/profiles.js';
import { createTestIdentity } from './neon-test-auth.mjs';
import { createWorldApi } from '../../src/api/world.js';
import { answerAndJoin, respondToInvite } from '../../src/lib/privateInvites.js';

// Disposable-branch integration test using real Neon Auth-issued session JWTs.
// The caller must delete the disposable branch afterward, including these newly
// created accounts. No production account is read, reused, modified, or deleted.
export async function testDataApi({ authUrl, apiUrl, disposable = false }) {
  assert.equal(disposable, true);
  assert.equal(new URL(authUrl).protocol, 'https:');
  assert.equal(new URL(apiUrl).protocol, 'https:');
  assert.equal(new URL(authUrl).hostname.split('.')[0], new URL(apiUrl).hostname.split('.')[0]);
  let passed = 0;
  async function check(name, fn) {
    await fn();
    passed += 1;
    console.log(`PASS HTTP ${name}`);
  }
  async function signup() {
    const user = await createTestIdentity(authUrl, { disposable: true });
    const { id, suffix } = user;
    const request = createDataApi({ baseUrl: apiUrl, getToken: () => getDataApiToken(user.auth) });
    const profiles = createProfileApi(request);
    await check('profile creation through SDK JWT', () => profiles.create(id, 'Security HTTP test', {
      username: 'sec_' + suffix.slice(0,20), games: ['valorant'], region: 'EU', rank: 'Gold',
      commStyles: [], roles: [], availability: [], bio: 'HTTP test',
    }));
    await check('profile load through SDK JWT', async () => {
      const loaded = await profiles.load(id);
      assert.equal(loaded.exists, true);
      assert.equal(loaded.avatarStored, true);
      assert.equal(loaded.profile.username, 'sec_' + suffix.slice(0,20));
    });
    await check('profile update through SDK JWT', async () => {
      await profiles.update(id, 'Security HTTP test', { bio: 'updated' });
      assert.equal((await profiles.load(id)).profile.bio, 'updated');
    });
    return { id, request, world: createWorldApi(request) };
  }
  const creator = await signup();
  const invitee = await signup();
  const outsider = await signup();
  await check('SDK JWTs identify three independent accounts', async () => {
    assert.equal(new Set([creator.id, invitee.id, outsider.id]).size, 3);
  });
  const room = await creator.world.invite(invitee.id);
  assert.ok(room);
  const privateKey = `p:${room}`;
  await check('invitee cannot cancel pending invitation', () => assert.rejects(invitee.world.answer(room, 'cancelled'), { code: '42501' }));
  await check('creator cannot accept', () => assert.rejects(creator.world.answer(room, 'accepted'), { code: '42501' }));
  await check('invitee accepts with returned representation', async () => {
    assert.equal(await invitee.world.answer(room, 'accepted'), true);
  });
  const spot = (room) => ({ room, x: 1, z: 2, facing: 0 });
  await creator.world.move(creator.id, spot(privateKey));
  await invitee.world.move(invitee.id, spot(privateKey));
  await check('accepted members read each other', async () => {
    assert.equal((await invitee.world.peers(privateKey, invitee.id)).length, 1);
  });
  await check('outsider sees no private positions', async () => {
    assert.deepEqual(await outsider.world.peers(privateKey, outsider.id), []);
  });
  await check('outsider cannot insert a private position', () => assert.rejects(outsider.world.move(outsider.id, spot(privateKey)), { code: '42501' }));
  await check('public positions remain readable and writable', async () => {
    await outsider.world.move(outsider.id, spot('lobby'));
    assert.ok((await creator.world.peers('lobby', creator.id)).some((peer) => peer.id === outsider.id));
  });
  await check('outsider cannot upsert from public into private', () => assert.rejects(outsider.world.move(outsider.id, spot(privateKey)), { code: '42501' }));
  await check('crafted participant mutation is denied', () => assert.rejects(creator.request(`private_rooms?id=eq.${room}`, {
    method: 'PATCH', body: { invitee: outsider.id, status: 'cancelled' }, prefer: 'return=representation',
  }), { code: '42501' }));
  await creator.world.say(privateKey, 'private HTTP test');
  await check('private chat is readable only by accepted members', async () => {
    const options = { fromTime: Date.now() - 120_000 };
    assert.equal((await invitee.world.messages(privateKey, options)).length, 1);
    assert.deepEqual(await outsider.world.messages(privateKey, options), []);
  });
  await check('outsider cannot send private chat', () => assert.rejects(outsider.world.say(privateKey, 'denied'), { code: '42501' }));
  await check('sender spoofing is denied', () => assert.rejects(creator.request('chat_messages', {
    method: 'POST', body: { room: privateKey, body: 'spoof', user_id: invitee.id }, prefer: 'return=minimal',
  }), { code: '42501' }));
  await check('presence RPC succeeds', async () => {
    await creator.request('rpc/touch_presence', { method: 'POST', body: {} });
    const rows = await creator.request(`profiles?user_id=eq.${creator.id}&select=last_seen_at`);
    assert.ok(rows[0].last_seen_at);
  });
  await check('terminal invitation cannot be cancelled', () => assert.rejects(creator.world.answer(room, 'cancelled'), { code: 'INVITE_NOT_UPDATED' }));
  await check('failed acceptance cannot enter a room', async () => {
    const errors = [];
    const respond = (id, status) => respondToInvite(invitee.world.answer, async () => {}, (e) => errors.push(e), id, status);
    assert.equal(await answerAndJoin(respond, room, 'accepted', { id: room }, () => assert.fail('unexpected room entry')), false);
    assert.equal(errors[0].code, 'INVITE_NOT_UPDATED');
  });
  const declined = await creator.world.invite(invitee.id);
  const cancelled = await creator.world.invite(invitee.id);
  const pending = await creator.world.invite(invitee.id);
  await check('invitee pending -> declined', async () => assert.equal(await invitee.world.answer(declined, 'declined'), true));
  await check('creator pending -> cancelled', async () => assert.equal(await creator.world.answer(cancelled, 'cancelled'), true));
  for (const id of [declined, cancelled]) {
    await check('terminal invitation cannot be accepted', () => assert.rejects(invitee.world.answer(id, 'accepted'), { code: 'INVITE_NOT_UPDATED' }));
  }
  for (const actor of [creator, invitee]) {
    for (const [column, value] of [['id', randomUUID()], ['created_by', outsider.id], ['invitee', outsider.id], ['created_at', '2000-01-01T00:00:00Z']]) {
      await check(`${actor === creator ? 'creator' : 'invitee'} cannot modify ${column}`, () => assert.rejects(actor.request(`private_rooms?id=eq.${pending}`, {
        method: 'PATCH', body: { [column]: value, status: actor === creator ? 'cancelled' : 'accepted' }, prefer: 'return=representation',
      }), { code: '42501' }));
    }
  }
  await check('cannot spoof position user_id', () => assert.rejects(invitee.world.move(creator.id, spot(privateKey)), { code: '42501' }));
  await check('cannot modify another position', async () => assert.deepEqual(await invitee.request(`world_positions?user_id=eq.${creator.id}`, {
    method: 'PATCH', body: { x: 99 }, prefer: 'return=representation',
  }), []));
  await check('accepted member can update own private position', () => creator.world.move(creator.id, { ...spot(privateKey), x: 4 }));
  await check('pending members cannot enter', () => assert.rejects(creator.world.move(creator.id, spot(`p:${pending}`)), { code: '42501' }));
  await check('outsider cannot PATCH into private room', () => assert.rejects(outsider.request(`world_positions?user_id=eq.${outsider.id}`, {
    method: 'PATCH', body: { room: privateKey }, prefer: 'return=representation',
  }), { code: '42501' }));
  await check('private positions are excluded from outsider room counts', async () => assert.equal((await outsider.world.roomCounts())[privateKey], undefined));
  await check('game room read/write works', async () => {
    await outsider.world.move(outsider.id, spot('valorant'));
    assert.ok((await creator.world.peers('valorant', creator.id)).some((peer) => peer.id === outsider.id));
  });
  for (const publicRoom of ['lobby', 'valorant']) {
    await check(`${publicRoom} chat works`, async () => {
      const body = `public ${randomUUID()}`;
      await outsider.world.say(publicRoom, body);
      assert.ok((await creator.world.messages(publicRoom, { fromTime: Date.now() - 120_000 })).some((message) => message.body === body));
    });
  }
  await check('presence RPC did not change another profile', async () => assert.equal((await creator.request(`profiles?user_id=eq.${invitee.id}&select=last_seen_at`))[0].last_seen_at, null));
  await check('cannot spoof another profile presence', async () => assert.deepEqual(await creator.request(`profiles?user_id=eq.${invitee.id}`, {
    method: 'PATCH', body: { last_seen_at: new Date().toISOString() }, prefer: 'return=representation',
  }), []));
  await check('owner can return to lobby and delete own position', async () => {
    await creator.world.move(creator.id, spot('lobby'));
    assert.equal((await creator.request(`world_positions?user_id=eq.${creator.id}`, { method: 'DELETE', prefer: 'return=representation' })).length, 1);
  });
  return { passed, disposableAccounts: 3, profileChecks: 9, realJwt: true };
}
