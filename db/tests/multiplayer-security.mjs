import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const tables = ['chat_messages', 'private_rooms', 'profiles', 'world_positions'];
const multiplayerTables = tables.filter((name) => name !== 'profiles');

// Read-only verification; also returns a deterministic catalog snapshot for
// comparing the tested child branch with production after installation.
export async function verifySchema(client) {
  const snapshot = {};
  const queries = {
    tables: `select c.relname, c.relrowsecurity, c.relforcerowsecurity,
      pg_get_userbyid(c.relowner) as owner, c.relacl::text
      from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname=any($1) order by c.relname`,
    columns: `select table_name,column_name,data_type,is_nullable,column_default
      from information_schema.columns where table_schema='public'
      and table_name=any($1) order by table_name,ordinal_position`,
    policies: `select tablename,policyname,permissive,roles::text,cmd,qual,with_check
      from pg_policies where schemaname='public' and tablename=any($1)
      order by tablename,policyname`,
    constraints: `select c.relname,p.conname,pg_get_constraintdef(p.oid) as definition
      from pg_constraint p join pg_class c on c.oid=p.conrelid
      join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname=any($1) order by c.relname,p.conname`,
    indexes: `select tablename,indexname,indexdef from pg_indexes
      where schemaname='public' and tablename=any($1) order by tablename,indexname`,
    triggers: `select c.relname,t.tgname,pg_get_triggerdef(t.oid) as definition
      from pg_trigger t join pg_class c on c.oid=t.tgrelid
      join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname=any($1) and not t.tgisinternal
      order by c.relname,t.tgname`,
  };
  for (const [name, sql] of Object.entries(queries)) {
    snapshot[name] = (await client.query(sql, [tables])).rows;
  }
  snapshot.functions = (await client.query(`select p.proname,p.prosecdef,p.proconfig,
    p.proacl::text,pg_get_functiondef(p.oid) as definition
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in
      ('in_private_room','touch_presence','touch_world_position','limit_chat_rate')
    order by p.proname`)).rows;
  snapshot.columnGrants = (await client.query(`select table_name,column_name,grantee,privilege_type
    from information_schema.column_privileges where table_schema='public'
    and table_name=any($1) order by table_name,column_name,grantee,privilege_type`, [tables])).rows;
  assert.deepEqual(snapshot.tables.map((t) => t.relname), tables);
  assert.ok(snapshot.tables.every((t) => t.relrowsecurity && !['authenticated','anonymous'].includes(t.owner)));
  assert.equal(snapshot.functions.length, 4);
  assert.ok(snapshot.functions.every((f) => !f.prosecdef), 'all helpers use caller privileges');
  assert.equal((await client.query("select to_regprocedure('public.finduo_user_id()')::text as wrapper")).rows[0].wrapper, null);
  for (const fn of snapshot.functions.filter((f) => ['touch_presence','in_private_room'].includes(f.proname))) {
    assert.deepEqual(fn.proconfig, ['search_path=pg_catalog']);
    assert.match(fn.definition, /auth.user_id/);
  }
  for (const [name, type] of [['avatar', 'jsonb'], ['last_seen_at', 'timestamp with time zone']]) {
    assert.ok(snapshot.columns.some((c) => c.table_name === 'profiles' && c.column_name === name && c.data_type === type));
  }
  assert.equal(snapshot.policies.length, 12, 'no extra permissive policies');
  assert.ok(snapshot.policies.every((p) => p.roles === '{authenticated}'));
  const policy = (name) => snapshot.policies.find((p) => p.policyname === name);
  assert.match(policy('finduo: answer an invite').qual, /pending/);
  assert.match(policy('finduo: see players in the world').qual, /in_private_room/);
  for (const name of ['finduo: place yourself', 'finduo: move yourself', 'finduo: talk in rooms']) {
    assert.match(policy(name).with_check, /in_private_room/);
    assert.match(policy(name).with_check, /user_id/);
  }
  assert.match(policy('finduo: read room chat').qual, /in_private_room/);
  assert.ok(snapshot.indexes.some((i) => i.indexname === 'profiles_last_seen_at_idx'));
  assert.ok(snapshot.indexes.some((i) => i.indexname === 'profiles_games_idx'));
  for (const name of ['world_positions_touch', 'chat_messages_rate']) {
    assert.ok(snapshot.triggers.some((t) => t.tgname === name));
  }
  const roleRows = (await client.query(`select rolname,rolsuper,rolbypassrls,
    exists(select 1 from pg_roles inherited where inherited.oid<>r.oid
      and pg_has_role(r.oid,inherited.oid,'MEMBER')) as inherited
    from pg_roles r where rolname in ('authenticated','anonymous') order by rolname`)).rows;
  assert.equal(roleRows.length, 2);
  assert.ok(roleRows.every((r) => !r.rolsuper && !r.rolbypassrls && !r.inherited));
  const allowed = {
    world_positions: ['SELECT','INSERT','UPDATE','DELETE'],
    private_rooms: ['SELECT','INSERT'],
    chat_messages: ['SELECT','INSERT'],
  };
  for (const role of ['authenticated','anonymous']) {
    for (const table of multiplayerTables) {
      for (const privilege of ['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) {
        const { rows } = await client.query('select has_table_privilege($1,$2,$3) as allowed', [role,`public.${table}`,privilege]);
        assert.equal(rows[0].allowed, role === 'authenticated' && allowed[table].includes(privilege), `${role} ${table} ${privilege}`);
      }
      const columns = snapshot.columns.filter((c) => c.table_name === table);
      for (const column of columns) {
        const { rows } = await client.query("select has_column_privilege($1,$2,$3,'UPDATE') as allowed", [role,`public.${table}`,column.column_name]);
        const expected = role === 'authenticated' && (table === 'world_positions' || (table === 'private_rooms' && column.column_name === 'status'));
        assert.equal(rows[0].allowed, expected, `${role} UPDATE ${table}.${column.column_name}`);
      }
    }
    for (const fn of ['in_private_room(text)','touch_presence()','touch_world_position()','limit_chat_rate()']) {
      const { rows } = await client.query("select has_function_privilege($1,$2,'EXECUTE') as allowed", [role,`public.${fn}`]);
      assert.equal(rows[0].allowed, role === 'authenticated' && ['in_private_room(text)','touch_presence()'].includes(fn), `${role} EXECUTE ${fn}`);
    }
  }
  return snapshot;
}

// Use ONLY on a disposable branch. All fixtures (including temporary Neon Auth
// identities) live in one rolled-back transaction; no account API is invoked.
// SET LOCAL ROLE + JWT claims exercises the real auth.user_id(), not a mock.
export async function testSecurity(client, { disposable = false } = {}) {
  assert.equal(disposable, true, 'explicit disposable branch acknowledgement required');
  let passed = 0;
  const creator = randomUUID();
  const invitee = randomUUID();
  const outsider = randomUUID();
  const roomIds = Array.from({ length: 5 }, () => randomUUID());
  const [acceptedId, declinedId, cancelledId, pendingId, anotherId] = roomIds;
  const privateKey = `p:${acceptedId}`;
  async function as(user) {
    await client.query('reset role');
    await client.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({ sub: user, role: 'authenticated' })]);
    await client.query('set local role authenticated');
    assert.equal((await client.query('select current_user')).rows[0].current_user, 'authenticated');
    const { rows } = await client.query('execute finduo_test_identity');
    assert.equal(rows[0].id, user);
  }
  async function check(name, fn) {
    await client.query('savepoint case_start');
    try {
      await fn();
      passed += 1;
      console.log(`PASS ${name}`);
    } catch (error) {
      await client.query('rollback to savepoint case_start');
      error.message = `${name}: ${error.message}`;
      throw error;
    } finally {
      await client.query('release savepoint case_start');
    }
  }
  async function denied(sql, params = []) {
    await client.query('savepoint denied_statement');
    let error;
    let result;
    try { result = await client.query(sql, params); }
    catch (caught) { error = caught; }
    await client.query('rollback to savepoint denied_statement');
    await client.query('release savepoint denied_statement');
    if (error) assert.equal(error.code, '42501', error.message);
    else assert.equal(result.rowCount, 0, 'forbidden operation affected rows');
  }
  const answer = (id, status) => client.query('update public.private_rooms set status=$2 where id=$1 returning id,status', [id,status]);
  const upsert = (user, room) => client.query(`insert into public.world_positions(user_id,room,x,z,facing)
    values($1,$2,1,2,3) on conflict(user_id) do update set room=excluded.room,x=excluded.x returning *`, [user,room]);
  await client.query('begin');
  try {
    // Initialize pg_session_jwt before setting claims on this administrative
    // connection. Bind the direct helper while the owner can resolve its schema;
    // EXECUTE below still runs as authenticated and verifies each identity.
    // Real JWT/HTTP coverage is provided separately by data-api-security.mjs.
    await client.query('select auth.user_id()');
    await client.query('prepare finduo_test_identity as select auth.user_id() as id');
    for (const id of [creator,invitee,outsider]) {
      await client.query('insert into neon_auth."user"(id,name,email,"emailVerified") values($1,$2,$3,false)', [id,'Security test',`${id}@example.invalid`]);
      await client.query('insert into public.profiles(user_id,username,display_name) values($1,$2,$3)', [id,`sec_${id.replaceAll('-','').slice(0,24)}`,'Security test']);
    }
    await as(creator);
    await check('direct Neon helper preserves request identity', async () => {
      assert.equal((await client.query('execute finduo_test_identity')).rows[0].id, creator);
    });
    for (const id of roomIds) await client.query('insert into public.private_rooms(id,invitee) values($1,$2)', [id,invitee]);
    await check('creator cannot create an already accepted room', () => denied("insert into public.private_rooms(invitee,status) values($1,'accepted')", [invitee]));
    await check('creator cannot accept', () => denied("update public.private_rooms set status='accepted' where id=$1", [acceptedId]));
    await as(invitee);
    await check('invitee cannot cancel', () => denied("update public.private_rooms set status='cancelled' where id=$1", [acceptedId]));
    await check('invitee pending -> accepted', async () => assert.equal((await answer(acceptedId,'accepted')).rows[0].status,'accepted'));
    await check('invitee pending -> declined', async () => assert.equal((await answer(declinedId,'declined')).rows[0].status,'declined'));
    await check('declined cannot become accepted', () => denied("update public.private_rooms set status='accepted' where id=$1", [declinedId]));
    await as(creator);
    await check('creator pending -> cancelled', async () => assert.equal((await answer(cancelledId,'cancelled')).rows[0].status,'cancelled'));
    await check('accepted cannot be cancelled', () => denied("update public.private_rooms set status='cancelled' where id=$1", [acceptedId]));
    await as(invitee);
    await check('cancelled cannot become accepted', () => denied("update public.private_rooms set status='accepted' where id=$1", [cancelledId]));
    for (const actor of [creator,invitee]) {
      await as(actor);
      for (const [column,value] of [['id',randomUUID()],['created_by',outsider],['invitee',outsider],['created_at','2000-01-01T00:00:00Z']]) {
        await check(`${actor === creator ? 'creator' : 'invitee'} cannot modify ${column}`, () => denied(`update public.private_rooms set ${column}=$2,status=$3 where id=$1`, [pendingId,value,actor === creator ? 'cancelled' : 'accepted']));
      }
    }
    await as(outsider);
    await check('outsider sees no invitations', async () => assert.equal((await client.query('select * from public.private_rooms where id=any($1::uuid[])',[roomIds])).rowCount,0));
    await check('outsider cannot answer invitation', () => denied("update public.private_rooms set status='accepted' where id=$1",[pendingId]));
    await check('outsider cannot insert private position', () => denied('insert into public.world_positions(room) values($1)',[privateKey]));
    await check('nonexistent private room cannot be entered', () => denied('insert into public.world_positions(room) values($1)',[`p:${randomUUID()}`]));
    await check('lobby position insert works', async () => assert.equal((await upsert(outsider,'lobby')).rowCount,1));
    await check('game room position upsert works', async () => assert.equal((await upsert(outsider,'valorant')).rows[0].room,'valorant'));
    await check('outsider cannot update position into private room', () => denied('update public.world_positions set room=$1 where user_id=$2',[privateKey,outsider]));
    await check('outsider cannot upsert into private room', () => denied('insert into public.world_positions(user_id,room) values($1,$2) on conflict(user_id) do update set room=excluded.room',[outsider,privateKey]));
    await as(creator);
    await check('pending room member cannot enter', () => denied('insert into public.world_positions(room) values($1)',[`p:${pendingId}`]));
    await check('accepted creator can insert private position', async () => assert.equal((await upsert(creator,privateKey)).rowCount,1));
    await check('accepted creator can update private position', async () => assert.equal((await upsert(creator,privateKey)).rowCount,1));
    await as(invitee);
    await check('accepted invitee can insert private position', async () => assert.equal((await upsert(invitee,privateKey)).rowCount,1));
    await check('accepted member reads both private positions', async () => assert.equal((await client.query('select * from public.world_positions where room=$1',[privateKey])).rowCount,2));
    await check('member cannot update another position', () => denied('update public.world_positions set x=9 where user_id=$1',[creator]));
    await check('member cannot spoof position identity', () => denied('insert into public.world_positions(user_id,room) values($1,$2) on conflict(user_id) do update set room=excluded.room',[creator,privateKey]));
    await check('member cannot delete another position', () => denied('delete from public.world_positions where user_id=$1',[creator]));
    await check('public game positions remain visible', async () => assert.equal((await client.query('select * from public.world_positions where user_id=$1',[outsider])).rowCount,1));
    await as(outsider);
    await check('outsider cannot read private positions even without room filter', async () => assert.equal((await client.query('select * from public.world_positions where user_id=any($1::uuid[])',[[creator,invitee]])).rowCount,0));
    await as(creator);
    await check('accepted member can send private chat as themselves', async () => assert.equal((await client.query('insert into public.chat_messages(room,body) values($1,$2) returning user_id',[privateKey,'private test'])).rows[0].user_id,creator));
    await check('chat sender spoofing fails', () => denied('insert into public.chat_messages(room,body,user_id) values($1,$2,$3)',[privateKey,'spoof',invitee]));
    await check('pending member cannot send private chat', () => denied('insert into public.chat_messages(room,body) values($1,$2)',[`p:${pendingId}`,'pending']));
    await as(invitee);
    await check('accepted member can read private chat', async () => assert.equal((await client.query('select * from public.chat_messages where room=$1',[privateKey])).rowCount,1));
    await check('accepted invitee can send private chat', async () => assert.equal((await client.query('insert into public.chat_messages(room,body) values($1,$2) returning user_id',[privateKey,'reply'])).rows[0].user_id,invitee));
    await as(outsider);
    await check('outsider cannot read private chat', async () => assert.equal((await client.query('select * from public.chat_messages where room=$1',[privateKey])).rowCount,0));
    await check('outsider cannot send private chat', () => denied('insert into public.chat_messages(room,body) values($1,$2)',[privateKey,'intrusion']));
    for (const room of ['lobby','valorant']) {
      await check(`${room} chat insert/read works`, async () => {
        const { rows } = await client.query('insert into public.chat_messages(room,body) values($1,$2) returning id',[room,'public test']);
        await as(invitee);
        assert.equal((await client.query('select * from public.chat_messages where id=$1',[rows[0].id])).rowCount,1);
        await as(outsider);
      });
    }
    await check('chat UPDATE is not granted', () => denied("update public.chat_messages set body='edited' where user_id=$1",[outsider]));
    await check('chat DELETE is not granted', () => denied('delete from public.chat_messages where user_id=$1',[outsider]));
    await check('private room DELETE is not granted', () => denied('delete from public.private_rooms where id=$1',[anotherId]));
    await as(creator);
    await check('accepted member can return to lobby by upsert', async () => assert.equal((await upsert(creator,'lobby')).rows[0].room,'lobby'));
    await check('owner can delete own position', async () => assert.equal((await client.query('delete from public.world_positions where user_id=$1 returning user_id',[creator])).rowCount,1));
    await check('profile avatar can be saved by its owner', async () => assert.equal((await client.query('update public.profiles set avatar=$2 where user_id=$1 returning avatar',[creator,{ body: '#ffffff' }])).rows[0].avatar.body,'#ffffff'));
    await check('touch_presence stamps only the caller profile', async () => {
      await client.query('select public.touch_presence()');
      const { rows } = await client.query('select user_id,last_seen_at from public.profiles where user_id=any($1::uuid[])',[[creator,invitee]]);
      assert.ok(rows.find((r) => r.user_id === creator).last_seen_at);
      assert.equal(rows.find((r) => r.user_id === invitee).last_seen_at,null);
    });
    await check('presence/profile UPDATE cannot target another user', () => denied('update public.profiles set last_seen_at=now() where user_id=$1',[invitee]));
    await client.query('reset role');
    await client.query('set local role anonymous');
    for (const table of multiplayerTables) {
      await check(`anonymous cannot read ${table}`, () => denied(`select * from public.${table}`));
    }
    await check('anonymous cannot call presence', () => denied('select public.touch_presence()'));
    return { passed, fixturesRolledBack: true };
  } finally {
    await client.query('rollback');
    await client.query('deallocate finduo_test_identity');
  }
}
