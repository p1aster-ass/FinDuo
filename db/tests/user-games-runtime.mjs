import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { createTestIdentity } from './neon-test-auth.mjs';
import { createDataApi } from '../../src/api/dataApi.js';
import { createProfileApi } from '../../src/api/profiles.js';
import { createUserGamesApi } from '../../src/api/userGames.js';
import { createGameDrafts, editGameDraft, toggleGameDraft, gameDraftPayload } from '../../src/lib/gameProfiles.js';

// Real SDK sign-in, actual application API/form helpers, persisted SQL rows,
// and actual profile/editor renderers. This is NOT interactive browser testing.
export async function testUserGamesRuntime({ authUrl, apiUrl, disposable, client, inspectUsername }) {
  assert.equal(disposable, true);
  const identity = await createTestIdentity(authUrl, { disposable });
  const api = () => {
    const request = createDataApi({ baseUrl: apiUrl, getToken: async () => identity.token });
    return createProfileApi(request, { gameApi: createUserGamesApi(request) });
  };
  const entries = [
    { game: 'valorant', rank: 'Diamond', region: 'eu', roles: ['Controller'], platform: 'PC' },
    { game: 'lol', rank: 'Gold', region: 'euw', roles: ['Jungle'], platform: 'PC' },
    { game: 'cs2', rank: '15000', region: 'na-east', roles: ['Entry fragger'], platform: 'PC' },
    { game: 'fortnite', rank: 'Elite', region: 'oce', roles: ['Builder'], platform: 'Xbox' },
    { game: 'rocketleague', rank: 'Champion', region: 'na-west', roles: ['Defender'], platform: 'PlayStation' },
  ];
  const profile = { username: `runtime_${identity.suffix.slice(0,12)}`, commStyles: ['mic'], gameProfiles: entries };
  const sort = (rows) => [...rows].sort((a,b) => a.game.localeCompare(b.game));
  let passed = 0;
  const check = async (name, fn) => { await fn(); passed++; console.log(`PASS runtime ${name}`); };
  const sqlRows = async () => (await client.query('select game,rank,region,roles,platform from public.user_games where user_id=$1 order by game', [identity.id])).rows;
  await check('authenticated atomic save persists five distinct games in SQL', async () => {
    await api().create(identity.id, 'Runtime profile test', profile);
    assert.deepEqual(await sqlRows(), sort(entries));
  });
  await check('fresh API load and editor drafts preserve every saved field', async () => {
    const loaded = await api().load(identity.id);
    assert.deepEqual(sort(gameDraftPayload(createGameDrafts(loaded.profile))), sort(entries));
    assert.equal(loaded.profile.rank, undefined);
  });
  const server = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  try {
    const { default: Profile } = await server.ssrLoadModule('/src/components/Profile.jsx');
    const { default: ProfileForm } = await server.ssrLoadModule('/src/components/ProfileForm.jsx');
    await check('actual profile display renders all five SQL values after a fresh load', async () => {
      const loaded = await api().load(identity.id);
      const html = renderToStaticMarkup(createElement(Profile, { user: {displayName:'Runtime profile test'}, profile: loaded.profile }));
      for (const row of entries) {
        const card = html.match(new RegExp(`<li[^>]*data-game="${row.game}"[\\s\\S]*?</li>`))?.[0];
        assert.ok(card?.includes(row.rank), row.game);
        assert.ok(card.includes(row.roles[0]));
        assert.ok(card.includes(row.platform));
        for (const other of entries.filter((entry) => entry.game !== row.game)) assert.ok(!card.includes(other.rank));
      }
    });
    await check('reopened actual editor uses separate controlled values', async () => {
      const loaded = await api().load(identity.id);
      const html = renderToStaticMarkup(createElement(ProfileForm, { initialProfile: loaded.profile, submitLabel:'Save', onSubmit:()=>{} }));
      for (const row of entries) {
        const card = html.match(new RegExp(`<fieldset[^>]*id="game-profile-${row.game}"[\\s\\S]*?</fieldset>`))?.[0];
        assert.ok(card?.includes(`value="${row.rank}"`));
        assert.ok(card.includes(`value="${row.region}"`));
        assert.ok(card.includes(`value="${row.roles[0]}"`));
      }
    });
    if (inspectUsername) await check('requested demo user SQL, authenticated API, profile and editor agree', async () => {
      const users = (await client.query('select user_id,display_name from public.profiles where username=$1',[inspectUsername])).rows;
      assert.equal(users.length,1);
      const user=users[0];
      const expected=(await client.query('select game,rank,region,roles,platform from public.user_games where user_id=$1 order by game',[user.user_id])).rows;
      assert.ok(new Set(expected.map((entry)=>entry.rank)).size >= 5,'Demo must contain at least five different ranks');
      const loaded=await api().load(user.user_id);
      assert.deepEqual(sort(gameDraftPayload(createGameDrafts(loaded.profile))),expected);
      const display=renderToStaticMarkup(createElement(Profile,{user:{displayName:user.display_name},profile:loaded.profile}));
      const editor=renderToStaticMarkup(createElement(ProfileForm,{initialProfile:loaded.profile,submitLabel:'Save',onSubmit:()=>{}}));
      for (const row of expected) {
        const card=display.match(new RegExp(`<li[^>]*data-game="${row.game}"[\\s\\S]*?</li>`))?.[0];
        const fields=editor.match(new RegExp(`<fieldset[^>]*id="game-profile-${row.game}"[\\s\\S]*?</fieldset>`))?.[0];
        for (const value of [row.rank,row.roles.join(','),row.platform]) {
          assert.ok(card?.includes(value),`${row.game} display ${value}`);
          assert.ok(fields?.includes(`value="${value}"`),`${row.game} editor ${value}`);
        }
        assert.ok(fields.includes(`value="${row.region}"`));
      }
      assert.doesNotMatch(display,/Ascendant/);
      console.log(`Verified @${inspectUsername}: ${expected.map((row)=>`${row.game}=${row.rank}`).join(', ')}`);
    });
  } finally { await server.close(); }
  let changed;
  await check('editing Valorant rank, region, roles and platform leaves four SQL rows unchanged', async () => {
    const loaded = await api().load(identity.id);
    const drafts = editGameDraft(createGameDrafts(loaded.profile), 'valorant', {rank:'Radiant',region:'ap',roles:['Sentinel'],platform:'PlayStation'});
    changed = gameDraftPayload(drafts);
    await api().update(identity.id, 'Runtime profile test', {...loaded.profile, gameProfiles:changed});
    assert.deepEqual(await sqlRows(), sort(changed));
    assert.deepEqual((await sqlRows()).filter((row)=>row.game!=='valorant'), sort(entries.filter((row)=>row.game!=='valorant')));
  });
  await check('adding a blank draft and removing it leaves independent values intact', async () => {
    const loaded = await api().load(identity.id);
    const drafts = createGameDrafts(loaded.profile);
    const added = toggleGameDraft(drafts, 'apex');
    assert.deepEqual(added.at(-1), {game:'apex',rank:'',region:'',roles:[],platform:''});
    assert.deepEqual(toggleGameDraft(added,'apex'),drafts);
    await api().update(identity.id, 'Runtime profile test', {...loaded.profile, gameProfiles:gameDraftPayload(toggleGameDraft(drafts,'fortnite'))});
    assert.deepEqual(await sqlRows(),sort(changed.filter((row)=>row.game!=='fortnite')));
  });
  await check('legacy scalar changes cannot reset migrated values', async () => {
    const before = await sqlRows();
    const request = createDataApi({baseUrl:apiUrl,getToken:async()=>identity.token});
    await createProfileApi(request).update(identity.id,'Runtime profile test',{rank:'Ascendant',region:'eu',roles:['Entry fragger','Support']});
    assert.deepEqual(await sqlRows(),before);
    const loaded = await api().load(identity.id);
    assert.equal(loaded.profile.rank,undefined);
  });
  await api().update(identity.id,'Runtime profile test',profile);
  console.log(`PASS ${passed} real runtime checks; fixture ${profile.username} remains on the expiring branch`);
}
