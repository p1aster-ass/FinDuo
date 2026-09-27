import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

export async function testUserGames(client, { disposable = false } = {}) {
  assert.equal(disposable, true);
  let passed = 0;
  const owner = randomUUID(), other = randomUUID(), newcomer = randomUUID();
  const name = (id) => `game_${id.replaceAll('-','').slice(0,20)}`;
  async function as(id) {
    await client.query('reset role');
    await client.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({ sub: id, role: 'authenticated' })]);
    await client.query('set local role authenticated');
    assert.equal((await client.query('execute game_test_identity')).rows[0].id, id);
  }
  async function check(label, fn) { await fn(); passed++; console.log(`PASS ${label}`); }
  async function denied(sql, values = [], code = '42501') {
    await client.query('savepoint denied');
    let error, result;
    try { result = await client.query(sql, values); } catch (e) { error = e; }
    await client.query('rollback to savepoint denied');
    await client.query('release savepoint denied');
    if (error) assert.equal(error.code, code, error.message);
    else assert.equal(result.rowCount, 0, 'Forbidden write affected rows');
  }
  const games = async (id = owner) => (await client.query('select * from public.user_games where user_id=$1 order by game',[id])).rows;
  const save = (id, entries, extra = {}) => client.query('select public.save_player_profile($1,$2,$3)', [id,JSON.stringify({ username: name(id), display_name: 'Game test', comm_styles: ['mic'], ...extra }),JSON.stringify(entries)]);
  await client.query('begin');
  try {
    await client.query('select auth.user_id()');
    await client.query('prepare game_test_identity as select auth.user_id() as id');
    for (const id of [owner,other,newcomer]) await client.query('insert into neon_auth."user"(id,name,email,"emailVerified") values($1,$2,$3,false)',[id,'Game test',`${id}@example.invalid`]);
    for (const id of [owner,other]) await client.query("insert into public.profiles(user_id,username,display_name,games,rank,region,roles) values($1,$2,'Game test',array['valorant','lol','lol'],'Gold','eu',array['Support'])",[id,name(id)]);
    await check('legacy insert seeds one row per distinct game', async () => {
      const rows = await games(); assert.equal(rows.length,2);
      assert.ok(rows.every((g) => g.rank==='Gold' && g.region==='eu' && !g.verified && g.platform===null));
      assert.deepEqual(rows[0].roles,['Support']);
    });
    await check('RLS and indexes installed', async () => {
      assert.equal((await client.query("select relrowsecurity from pg_class where oid='public.user_games'::regclass")).rows[0].relrowsecurity,true);
      assert.equal((await client.query("select * from pg_policies where tablename='user_games'")).rowCount,4);
      assert.equal((await client.query("select * from pg_indexes where tablename='user_games'")).rowCount,3);
      assert.ok((await client.query("select prosecdef from pg_proc where proname in ('touch_user_game','sync_legacy_profile_games','sync_user_games_membership','save_player_profile')")).rows.every((f) => !f.prosecdef));
    });
    await as(owner);
    await check('authenticated reads another public player games', async () => assert.equal((await games(other)).length,2));
    await check('owner adds a third game independently', async () => {
      await client.query("insert into public.user_games(user_id,game,rank,region,roles,platform) values($1,'cs2','12000','na-east',array['AWPer'],'PC')",[owner]);
      assert.equal((await games()).length,3);
      assert.equal((await games()).find((g)=>g.game==='lol').rank,'Gold');
    });
    await check('membership projects into legacy profiles', async () => {
      const row=(await client.query('select games,rank,region,roles from public.profiles where user_id=$1',[owner])).rows[0];
      assert.ok(row.games.includes('cs2')); assert.equal(row.rank,'Gold'); assert.deepEqual(row.roles,['Support']);
    });
    const first = (await games()).find((g)=>g.game==='cs2');
    await check('owner updates only one game and database timestamp advances', async () => {
      await client.query("update public.user_games set rank='15000' where id=$1",[first.id]);
      const rows=await games(); assert.equal(rows.find((g)=>g.game==='cs2').rank,'15000');
      assert.ok(rows.find((g)=>g.game==='cs2').updated_at > first.updated_at);
      assert.equal(rows.find((g)=>g.game==='lol').rank,'Gold');
    });
    await check('cannot create games for another user', () => denied("insert into public.user_games(user_id,game) values($1,'apex')",[other]));
    await check('cannot update another user game', () => denied("update public.user_games set rank='Iron' where user_id=$1",[other]));
    await check('cannot delete another user game', () => denied('delete from public.user_games where user_id=$1',[other]));
    for (const [column,value] of [['verified',true],['user_id',other],['game','apex'],['id',randomUUID()],['created_at','2000-01-01'],['updated_at','2000-01-01']]) {
      await check(`client cannot update ${column}`, () => denied(`update public.user_games set ${column}=$1 where id=$2`,[value,first.id]));
    }
    await check('client cannot self verify on insert', () => denied("insert into public.user_games(user_id,game,verified) values($1,'apex',true)",[owner]));
    await check('duplicate user/game rejected', () => denied("insert into public.user_games(user_id,game) values($1,'cs2')",[owner],'23505'));
    await check('blank game rejected', () => denied("insert into public.user_games(user_id,game) values($1,' ')",[owner],'23514'));
    await check('RPC cannot impersonate another player', () => denied('select public.save_player_profile($1,$2,$3)',[other,JSON.stringify({ username:name(other),display_name:'stolen' }),'[]']));
    await check('legacy global edits preserve game-specific edits', async () => {
      await client.query("update public.profiles set rank='Silver',region='ap',games=games where user_id=$1",[owner]);
      assert.equal((await games()).find((g)=>g.game==='cs2').rank,'15000');
      assert.equal((await games()).find((g)=>g.game==='lol').region,'eu');
    });
    await check('atomic save edits games and preserves old scalar values', async () => {
      await save(owner,[{game:'lol',rank:'Diamond',region:'eu',roles:['Jungle'],platform:'PC'},{game:'cs2',rank:'18000',region:'na-east',roles:['AWPer']}]);
      assert.deepEqual((await games()).map((g)=>g.game),['cs2','lol']);
      assert.equal((await client.query('select rank from public.profiles where user_id=$1',[owner])).rows[0].rank,'Silver');
    });
    await check('failed game save rolls back profile and prior game edits', async () => {
      const before=await games();
      await denied('select public.save_player_profile($1,$2,$3)',[owner,JSON.stringify({username:name(owner),display_name:'Changed'}),JSON.stringify([{game:'lol',rank:'Bronze'},{game:' '}])],'23514');
      assert.deepEqual(await games(),before);
      assert.equal((await client.query('select display_name from public.profiles where user_id=$1',[owner])).rows[0].display_name,'Game test');
    });
    await check('duplicate games in RPC rejected atomically', () => denied('select public.save_player_profile($1,$2,$3)',[owner,JSON.stringify({username:name(owner),display_name:'Game test'}),'[{"game":"lol"},{"game":"lol"}]'],'22023'));
    await check('invalid game field types in RPC rejected', () => denied('select public.save_player_profile($1,$2,$3)',[owner,'{}','[{"game":"lol","roles":[1]}]'],'22023'));
    await check('owner removes game and legacy membership follows', async () => {
      await client.query("delete from public.user_games where user_id=$1 and game='cs2'",[owner]);
      assert.deepEqual((await client.query('select games from public.profiles where user_id=$1',[owner])).rows[0].games,['lol']);
    });
    await check('empty game selection stays empty', async () => {
      await save(owner,[]); assert.equal((await games()).length,0);
      assert.deepEqual((await client.query('select games from public.profiles where user_id=$1',[owner])).rows[0].games,[]);
    });
    await as(newcomer);
    await check('new onboarding creates profile and independent game rows atomically', async () => {
      await save(newcomer,[{game:'valorant',rank:'Gold',region:'eu'},{game:'lol',rank:'Silver',region:'na-east'}]);
      assert.equal((await games(newcomer)).length,2);
    });
    await client.query('reset role');
    await client.query("update public.user_games set verified=true where user_id=$1 and game='lol'",[newcomer]);
    await as(newcomer);
    await check('unchanged atomic save retains server verification', async () => {
      await save(newcomer,[{game:'valorant',rank:'Gold',region:'eu'},{game:'lol',rank:'Silver',region:'na-east'}]);
      assert.equal((await games(newcomer)).find((g)=>g.game==='lol').verified,true);
    });
    await check('editing verified details clears verification', async () => {
      await client.query("update public.user_games set rank='Bronze' where user_id=$1 and game='lol'",[newcomer]);
      assert.equal((await games(newcomer)).find((g)=>g.game==='lol').verified,false);
    });
    await client.query('reset role');
    await check('migration rerun preserves edits and does not resurrect deletions', async () => {
      const before=(await client.query('select * from public.user_games order by id')).rows;
      const migration=await readFile(new URL('../migrations/2026-09-27_user_games.sql',import.meta.url),'utf8');
      await client.query(migration.replace(/^begin;$/m,'').replace(/^commit;$/m,''));
      assert.deepEqual((await client.query('select * from public.user_games order by id')).rows,before);
    });
    await client.query('set local role anonymous');
    await check('anonymous cannot read', () => denied('select * from public.user_games'));
    await check('anonymous cannot insert', () => denied("insert into public.user_games(user_id,game) values($1,'apex')",[owner]));
    await check('anonymous cannot call save RPC', () => denied('select public.save_player_profile($1,$2,$3)',[owner,'{}','[]']));
    await client.query('reset role');
    await check('profile deletion cascades to games', async () => {
      await client.query('delete from public.profiles where user_id=$1',[newcomer]);
      assert.equal((await games(newcomer)).length,0);
    });
    console.log(`PASS ${passed} user_games SQL checks (fixtures rolled back)`);
  } finally { await client.query('rollback'); }
}
