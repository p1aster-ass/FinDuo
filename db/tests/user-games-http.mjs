import assert from 'node:assert/strict';
import { createTestIdentity } from './neon-test-auth.mjs';
import { createDataApi } from '../../src/api/dataApi.js';
import { createProfileApi } from '../../src/api/profiles.js';
import { createUserGamesApi } from '../../src/api/userGames.js';
import { createWorldApi } from '../../src/api/world.js';
import { createPresenceApi } from '../../src/api/presence.js';

export async function testUserGamesHttp({ authUrl, apiUrl, disposable = false }) {
  assert.equal(disposable, true);
  let passed = 0;
  const accounts = [];
  for (let i=0;i<2;i++) {
    const identity = await createTestIdentity(authUrl, { disposable });
    const request = createDataApi({ baseUrl: apiUrl, getToken: async () => identity.token });
    const games = createUserGamesApi(request);
    accounts.push({ ...identity, request, games, profile: createProfileApi(request,{ gameApi: games }), world:createWorldApi(request) });
  }
  const [a,b] = accounts;
  const draft = { username: `games_${a.suffix.slice(0,12)}`, commStyles:['mic'], gameProfiles:[
    {game:'valorant',rank:'Gold',region:'eu',roles:['Support'],platform:'PC'},
    {game:'cs2',rank:'12000',region:'na-east',roles:['AWPer'],platform:'PC'},
  ] };
  async function check(label, fn) { await fn(); passed++; console.log(`PASS HTTP ${label}`); }
  await check('atomic onboarding', async () => {
    await a.profile.create(a.id,'Game HTTP test',draft);
    assert.equal((await a.games.load(a.id)).length,2);
  });
  await b.profile.create(b.id,'Other HTTP test',{...draft,username:`games_${b.suffix.slice(0,12)}`});
  await check('profile loads independent game details', async () => {
    const loaded=await a.profile.load(a.id);
    assert.equal(loaded.gameProfilesStored,true);
    assert.equal(loaded.profile.gameProfiles.find((g)=>g.game==='cs2').rank,'12000');
  });
  await check('another authenticated player reads public games', async () => assert.equal((await b.games.load(a.id)).length,2));
  let added;
  await check('add game', async () => {
    added=await a.games.add(a.id,{game:'lol',rank:'Silver',region:'eu',roles:['Jungle'],platform:'PC'});
    assert.equal(added.verified,false);
  });
  await check('edit one game preserves others', async () => {
    await a.games.update(a.id,added.id,{rank:'Diamond',region:'ap',roles:['Mid'],platform:'PC'});
    const rows=await a.games.load(a.id);
    assert.equal(rows.find((g)=>g.game==='lol').rank,'Diamond');
    assert.equal(rows.find((g)=>g.game==='cs2').rank,'12000');
  });
  await check('forged owner on create denied', () => assert.rejects(b.games.add(a.id,{game:'apex'}),{status:403}));
  await check('cross-owner edit denied', () => assert.rejects(b.games.update(a.id,added.id,{rank:'Iron'}),{code:'NO_ROWS_UPDATED'}));
  await check('cross-owner removal denied', () => assert.rejects(b.games.remove(a.id,added.id),{code:'NO_ROWS_UPDATED'}));
  await check('raw verification insert denied', () => assert.rejects(a.request('user_games',{method:'POST',body:{user_id:a.id,game:'apex',verified:true}}),{status:403}));
  for (const patch of [{verified:true},{user_id:b.id},{game:'apex'},{updated_at:'2000-01-01'}]) {
    await check(`raw protected update denied (${Object.keys(patch)[0]})`, () => assert.rejects(a.request(`user_games?id=eq.${added.id}`,{method:'PATCH',body:patch}),{status:403}));
  }
  await check('forged RPC owner denied', () => assert.rejects(b.profile.update(a.id,'Stolen',draft),{status:403}));
  await check('failed atomic save keeps profile and games', async () => {
    const before=await a.games.load(a.id);
    await assert.rejects(a.profile.update(a.id,'Changed',{...draft,gameProfiles:[draft.gameProfiles[0],{game:' '}]}));
    assert.deepEqual(await a.games.load(a.id),before);
    const row=await a.request(`profiles?user_id=eq.${a.id}&select=display_name`);
    assert.equal(row[0].display_name,'Game HTTP test');
  });
  await check('multiplayer embedded profile uses game-room rank', async () => {
    await a.world.move(a.id,{room:'cs2',x:0,z:0,facing:0});
    const peers=await b.world.peers('cs2',b.id);
    const peer=peers.find((p)=>p.id===a.id);
    assert.equal(peer.player.rank,'12000');
    assert.equal(peer.player.region,'na-east');
  });
  await check('presence embedded game profiles load', async () => {
    const presence=createPresenceApi(a.request);
    await presence.touch();
    const result=await createPresenceApi(b.request).players({games:['lol'],excludeUserId:b.id});
    assert.equal(result.players.find((p)=>p.id===a.id).gameProfiles.find((g)=>g.game==='lol').rank,'Diamond');
  });
  await check('remove game and legacy membership together', async () => {
    await a.games.remove(a.id,added.id);
    const row=await a.request(`profiles?user_id=eq.${a.id}&select=games`);
    assert.ok(!row[0].games.includes('lol'));
  });
  await check('legacy profile API still loads and edits without destroying game data', async () => {
    const legacy=createProfileApi(a.request);
    await legacy.update(a.id,'Game HTTP test',{rank:'Silver',region:'eu'});
    assert.equal((await legacy.load(a.id)).profile.rank,'Silver');
    assert.equal((await a.games.load(a.id)).find((g)=>g.game==='cs2').rank,'12000');
  });
  await check('empty selection remains empty after reload', async () => {
    await a.profile.update(a.id,'Game HTTP test',{...draft,gameProfiles:[]});
    assert.deepEqual((await a.profile.load(a.id)).profile.games,[]);
  });
  await check('unauthenticated HTTP rejected', async () => {
    const response=await fetch(`${apiUrl}/user_games?select=id`);
    assert.ok([400,401,403].includes(response.status));
  });
  console.log(`PASS ${passed} user_games HTTP checks (accounts remain only on expiring test branch)`);
}
