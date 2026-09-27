// Explicit branch arguments; connection secrets stay in memory. Never default
// to .neon/.env, which may point at production.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import pg from 'pg';

const [project, branch, mode = 'verify', inspectUsername] = process.argv.slice(2);
assert.match(project ?? '', /^[a-z0-9-]+$/);
assert.match(branch ?? '', /^br-[a-z0-9-]+$/);
function cli(args) {
  const result = spawnSync('cmd.exe', ['/d','/s','/c',`neon.cmd ${args.join(' ')}`], { encoding: 'utf8' });
  assert.equal(result.status, 0, 'Neon CLI failed; check authentication and explicit project/branch');
  return result.stdout.trim();
}
const info = JSON.parse(cli(['branches','list','--project-id',project,'--output','json'])).find((row) => row.id === branch);
assert.ok(info?.parent_id && !info.default && !info.primary && !info.protected && info.name.startsWith('verify-user-games-'), 'Only disposable verification branches accepted');
const connectionString = cli(['connection-string',branch,'--project-id',project,'--role-name','neondb_owner','--database-name','neondb','--ssl','verify-full']);
const client = new pg.Client({ connectionString });
await client.connect();
try {
  const migration = await readFile(new URL('../migrations/2026-09-27_user_games.sql', import.meta.url), 'utf8');
  if (mode === 'apply') {
    const before = (await client.query('select * from public.profiles order by user_id')).rows;
    await client.query(migration);
    assert.deepEqual((await client.query('select * from public.profiles order by user_id')).rows, before, 'Migration must preserve every profile field');
    const games = (await client.query('select * from public.user_games order by user_id,game')).rows;
    for (const profile of before) {
      for (const game of new Set(profile.games)) {
        const row = games.find((g) => g.user_id === profile.user_id && g.game === game);
        assert.ok(row);
        for (const key of ['region','rank','roles']) assert.deepEqual(row[key], profile[key]);
        assert.equal(row.verified, false);
        assert.equal(row.platform, null);
      }
    }
    await client.query(migration);
    assert.deepEqual((await client.query('select * from public.profiles order by user_id')).rows, before);
    assert.deepEqual((await client.query('select * from public.user_games order by user_id,game')).rows, games);
    console.log(`PASS migration preservation and idempotence: ${before.length} profiles, ${games.length} games`);
  } else if (mode === 'http' || mode === 'regression' || mode === 'runtime') {
    const flags = ['--project-id',project,'--branch',branch,'--output','json'];
    const config = JSON.parse(cli(['neon-auth','config','email-password','get',...flags]));
    assert.equal(config.require_email_verification,false);
    assert.equal(config.send_verification_email_on_sign_up,false);
    assert.equal(config.send_verification_email_on_sign_in,false);
    const auth = JSON.parse(cli(['neon-auth','status',...flags]));
    const api = JSON.parse(cli(['data-api','get',...flags,'--database','neondb']));
    const options = { authUrl: auth.base_url, apiUrl: api.url, disposable: true };
    if (mode === 'runtime') {
      const { testUserGamesRuntime } = await import('./user-games-runtime.mjs');
      await testUserGamesRuntime({ ...options, client, inspectUsername });
    } else if (mode === 'http') {
      const { testUserGamesHttp } = await import('./user-games-http.mjs');
      await testUserGamesHttp(options);
    } else {
      const { testSecurity } = await import('./multiplayer-security.mjs');
      await testSecurity(client,{ disposable: true });
      const { testDataApi } = await import('./data-api-security.mjs');
      await testDataApi(options);
    }
  } else {
    const { testUserGames } = await import('./user-games-security.mjs');
    await testUserGames(client, { disposable: true });
  }
} finally { await client.end(); }
