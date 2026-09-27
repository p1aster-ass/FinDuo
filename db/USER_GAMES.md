# Game-specific player profiles

The app previously used `profiles.games` with one shared rank, region, and set
of roles. Migration `migrations/2026-09-27_user_games.sql` adds per-game records
without removing profile columns, replacing authentication, or changing the
multiplayer security model. Riot integration and LFG remain out of scope.

## Schema and migration

`public.user_games` has UUID `id`, UUID `user_id` referencing
`profiles(user_id) ON DELETE CASCADE`, text `game`, nullable text `region`,
`rank`, and `platform`, non-null `text[] roles`, non-null boolean `verified`
defaulting to false, and database-managed creation/update timestamps.

There is one record per `(user_id, game)`. The unique index supports user
lookups and the foreign key; `(game, region, rank)` supports game-specific
queries. Rank/region/platform are bounded strings rather than a shared rank
enum. No platform or external verification is inferred from legacy data.

The transactional backfill expands each distinct legacy game, copying its
profile's rank, region, roles, and timestamps. All existing profile fields
remain unchanged. Conflicts leave existing game records untouched. Invalid
legacy identifiers abort migration rather than silently dropping data.

Authenticated users read game records only when the associated profile is
visible under profile RLS. INSERT/UPDATE/DELETE enforce JWT ownership using
the existing `auth.user_id()`. Column grants prevent clients from changing
IDs, ownership, game identity, verification, or timestamps. Editing gaming
details clears verification; an unchanged save preserves it. All added
functions are security invokers with a fixed search path, not RLS bypasses.

## Compatibility

- `profiles.games` remains the membership projection used by existing room
  and presence filters. Game CRUD updates it in the same transaction.
- Legacy profile inserts seed game records. Changing legacy membership adds
  and removes games, but changing global rank/region/roles does **not** replace
  existing per-game preferences. New legacy memberships inherit legacy defaults.
- Existing global rank/region/roles remain stored as legacy values. Migrated
  application profile state removes these scalars entirely. Only scoped room
  adapters project a selected game's values for existing scalar card props.
  Old clients may display stale scalar preferences; those columns cannot
  represent multiple independent games.
- On branches without `user_games`, reads/forms use the existing profile
  path. Auth/network failures do not trigger that fallback. Once per-game
  data is requested, failed saves never fall back to partial legacy writes.
- An explicit empty game array means no games, including after reload or a
  migration rerun. It is never replaced with old membership.
- Per-game rank strings may be ratings or `Unranked`. Valorant and League
  use separate rank options; CS2 validates a non-negative integer Premier
  rating (or `Unranked`) and normalizes `15,000` to `15000` on form submission.
  Other games accept their own rank/rating text. Saved values outside the
  suggestions remain visible until explicitly edited.

## Frontend API

`src/api/index.js` exports `userGamesApi`:

```js
await userGamesApi.load(userId);
const game = await userGamesApi.add(userId, {
  game: 'cs2', rank: '12000', region: 'eu', roles: ['AWPer'], platform: 'PC',
});
await userGamesApi.update(userId, game.id, { rank: '15000' });
await userGamesApi.remove(userId, game.id);
```

Update/delete require a returned row so an RLS-filtered write cannot look
successful. Owner checks remain in the database even for handcrafted requests.

The app's `profileApi` loads `profile.gameProfiles` and derives membership;
it removes global gaming scalars from migrated profile state. New onboarding
and profile editing call the invoker RPC
`save_player_profile(p_user_id, p_profile, p_games)` for one atomic profile and
game-selection save. `p_games` is the complete desired selection, not a patch;
omitted memberships are removed. Independent game API edits patch only the
specified fields. Full profile saves use last-writer-wins semantics, as before.
The RPC payload's profile object contains no gaming scalars or membership.
After a save, `app.jsx` reloads persisted rows before reporting success.

The form retains the existing styling and shows a separate card for every
selected game, with its own controlled rank, region, roles, and platform.
Membership and edits stay local until the atomic profile save. New games
start blank, and removing a game removes only that draft. Form membership is
derived from the loaded game rows instead of the old `profiles.games` list.
Presence and world reads embed game records; room cards use the room's game.

### Local frontend testing

The normal local environment still points at production, where this migration
has not been installed. It therefore uses the explicitly labeled legacy form.
For per-game frontend testing, use the ignored `.env.user-games.local`, which
contains matching Auth and Data API URLs for a fresh temporary production
child with the existing migration applied. No temporary URLs or credentials
are committed, and `.env` / `.env.local` are not modified.

```text
npm run dev:user-games
```

Open `http://localhost:5180/` and sign in to that branch. A server started with
the ordinary `npm run dev` command still uses the normal environment. The
temporary configuration's comment records its expiry; after expiry create a
new temporary branch and update only that ignored file.

Frontend regression tests cover independent draft edits, loaded game rows,
blank additions, local removal, separate save values, game-specific options,
and actual rendered profile, player-card, and editor components through Vite
SSR. The five-game display test checks each card's own rank and excludes all
four other ranks. Interactive verification still requires a connected browser
or a manual localhost check.

The live runtime check uses real SDK authentication, actual application API
and form helpers, SQL read-back, fresh API instances, and the actual profile
and editor renderers. Optionally pass a username to inspect an existing demo
profile read-only through the authenticated API as well:

```text
node db/tests/run-user-games.mjs flat-sound-02093915 br-long-dream-b1b74lzz runtime ido
```

## Confirmed screenshot root cause and runtime trace

The configured UI branch is `br-long-dream-b1b74lzz`, not the older branch in
the initial verification report. Before correction, querying `@ido` returned
five rows (CS2, Fortnite, R6, Rocket League, Valorant), each storing
`Ascendant`, `eu`, `[Entry fragger, Support]`, and null platform. These were
the migration's initial copies of the global legacy fields. The game list
faithfully rendered those duplicated database values; it was not flattening
distinct rows. Initial migration defaults cannot infer a user's actual ranks.

The complete relevant legacy-field entry map is:

| Boundary / file | Legacy usage and current rule |
| --- | --- |
| `db/migrations/2026-09-27_user_games.sql` | Initial backfill copies legacy details into rows, with conflicts ignored. The old-client trigger seeds only newly added memberships; global edits cannot overwrite existing rows. Migration rerun preservation is SQL-tested. |
| `src/api/index.js` | Wires `createUserGamesApi` into the real `profileApi`; no alternate test-only profile loader. |
| `src/api/profiles.js` | Reads profile metadata and `user_games` separately. Existing rows, including an explicit empty list, are authoritative. `normalizeGameProfile` removes scalar rank/region/roles/platform. Only a missing game table allows the old-profile path; failed reads and saves surface errors. |
| `src/lib/gameProfiles.js` | The only legacy-to-game fallback is `gameProfilesFor` when `gameProfiles` is absent. Existing rows are never merged with globals. Drafts copy roles arrays, additions start blank, updates target one game. An explicitly requested missing game no longer borrows the first game's values. |
| `src/app.jsx` | API result enters `record.profile`; the actual profile drawer mounts `Profile`. Onboarding detects the migrated schema even for a new user. Saves normalize drafts, call the atomic API, then reload database values. |
| `src/components/Profile.jsx` | The actual editor mounts `ProfileForm`. Global roles editing, header rank/region, and the global roles summary are restricted to legacy profiles. Migrated membership and details come directly from rows. |
| `src/components/ProfileForm.jsx` and `GameProfileFields.jsx` | Migrated forms hold independent draft objects and immutable roles arrays. Legacy shared controls appear only without `gameProfiles`. Each selected game has its own rank, region, roles, platform, and remove action. |
| `src/components/GameProfileSummary.jsx` | Shared profile/player-card renderer accepts only game rows, never the global profile. Displays labeled rank/rating, region, roles, platform. |
| `src/data/options.js` | Centralized separate Valorant/League ladders and CS2 rating model. Unconfigured games use explicit free-text configuration rather than a Valorant ladder. Old `RANKS` remains for legacy UI only. |
| `src/api/presence.js`, `src/api/world.js` | Embed `user_games`. Scalar adapters for room summaries select the exact requested game; embedded-read fallback is limited to a missing table/relationship. Lobby/private-room cards show independent rows. No multiplayer permissions or transport changes were needed for this fix. |
| `src/components/world/PlayerCard.jsx`, `RoomPanel.jsx` | Full player cards render independent game rows. Room summaries use the room-specific projection; custom regions remain visible. |
| `src/lib/match.js` | Shared membership derives from rows. Rank/region comparison selects the same game for both players and uses its ladder, including League Emerald. Unknown ratings are not ordered using Valorant tiers. |
| `src/components/Messages.jsx` | Dormant messaging header no longer assumes a global rank/region for migrated players; game membership comes from rows. Messaging itself remains disabled. |

No migration rewrite or repeated backfill is needed to repair the existing
rows. User edits through the atomic RPC allow them to diverge. Future ordinary
frontend additions are blank; the legacy compatibility trigger is retained
for old clients only. Explicitly empty migrated selections stay empty.

## Local visual-inspection fixture

Sign in with the existing account whose username is **ido** (normal account
credentials). Only its copy on the temporary branch was updated. The original
profile/game rows are backed up in ignored `db/ido-user-games-before.local`.
The update used `save_player_profile` inside an authenticated-role SQL
transaction; this was not a browser sign-in as the user. Independent live HTTP
save verification uses a disposable account and a genuine SDK JWT.

| Game | Rank / rating | Region | Roles | Platform |
| --- | --- | --- | --- | --- |
| Valorant | Diamond | Europe (`eu`) | Controller | PC |
| League of Legends | Gold | EUW (`euw`) | Jungle | PC |
| Counter-Strike 2 | 15000 | North America East (`na-east`) | Entry fragger | PC |
| Fortnite | Elite | Oceania (`oce`) | Builder | Xbox |
| Rainbow Six Siege | Copper | Asia-Pacific (`ap`) | Anchor | PlayStation |
| Rocket League | Champion | North America West (`na-west`) | Defender | PC |

Inspect both **Your profile** and **Edit profile** after refreshing localhost.
Change only Valorant, save, refresh, and reopen the editor: League and CS2
should retain their own values. The database's old scalar `Ascendant` remains
intentionally untouched so it also tests that migrated screens ignore it.

## Verification and rollout

Create a normal disposable child of the hardened production branch and set
an expiry. The verification runner requires explicit project/branch IDs and
rejects default, primary, protected, or non-verification branches. It does not
read local database credentials or change `.env`/`.neon`. Credentials stay in
memory. On Windows use `neon.cmd` and `npm.cmd` if PowerShell blocks scripts.

```text
node db/tests/run-user-games.mjs PROJECT_ID BRANCH_ID apply
neon data-api refresh-schema --project-id PROJECT_ID --branch BRANCH_ID --database neondb
node db/tests/run-user-games.mjs PROJECT_ID BRANCH_ID verify
node db/tests/run-user-games.mjs PROJECT_ID BRANCH_ID http
node db/tests/run-user-games.mjs PROJECT_ID BRANCH_ID regression
npm test
npm run lint
npm run build
git diff --check
```

`apply` compares all profile fields before/after, checks every backfilled row,
then verifies idempotence. `verify` exercises SQL constraints, RLS, privileges,
atomic saves, compatibility, verification, deletion, and migration reruns.
SQL fixtures roll back. `http` uses signature-verified SDK JWTs for two
disposable accounts. `regression` reruns the hardened multiplayer SQL/HTTP
suites. HTTP accounts remain only on the expiring disposable branch. The
runner checks that signup/signin verification emails are disabled before
creating test accounts.

After verification, review/apply the same SQL to the intended target and
refresh its Data API schema cache before deploying the frontend. This task
does not install the migration on production or merge to main. Retain the
legacy columns until a later compatibility review authorizes their removal.
For an app rollback, redeploy the earlier frontend and retain both schemas;
do not drop the new table, which may contain unique player data.

## Initial verification 2026-09-27 (older temporary branch)

- Project: `flat-sound-02093915`.
- Parent: `br-lingering-voice-b1ha3udo` (`production`).
- Temporary branch: `br-super-moon-b11gk4rl` (`verify-user-games-20260927`).
- Expiry: 2026-09-28 18:00 UTC.
- Initial migration preserved both existing profiles and copied all eight
  distinct game memberships; the second application changed neither table.
- 34 SQL checks and 21 real authenticated HTTP checks passed.
- The existing multiplayer SQL and authenticated HTTP regression suites also
  passed against the migrated branch.
- All 75 unit tests, lint, build, and `git diff --check` passed. The build
  retains the existing large-chunk warning.
- Interactive browser verification was unavailable because no browser was
  connected to the automation tool. Form behavior has not been browser-tested.
- Git branch: `feat/game-specific-profiles`. Production and local connection
  settings were left unchanged.

## Current verification after the runtime fix

- Active temporary branch: `br-long-dream-b1b74lzz`
  (`verify-user-games-ui-20260927`), project `flat-sound-02093915`.
- Branch expiry confirmed through Neon CLI: **2026-09-30 18:00 UTC**.
- Localhost is served with `user-games` mode on `http://localhost:5180/`.
  Fetching Vite's transformed `/src/api/index.js` verified its injected mode,
  Auth URL, and Data API URL both use endpoint `ep-jolly-block-b1lldebr`.
  This verifies the code served to the browser, not an inspected browser session.
- All **90 unit/render tests**, `npm run lint`, `npm run build`, and
  `git diff --check` passed. The build retains the existing large-chunk warning;
  Git reports its configured LF-to-CRLF normalization warnings.
- All **34 SQL checks** passed, including preserving edited values on migration
  rerun. SQL fixtures rolled back.
- All **8 authenticated runtime checks** passed, including five distinct ranks,
  actual SQL persistence, fresh loads, actual profile/editor SSR rendering,
  independent edits, additions/removal, and legacy scalar isolation.
- The eighth check loaded **@ido** through a genuine authenticated Data API
  request and compared its six game rows with SQL, profile display, and editor
  values. All agreed. Other users' rows and @ido's legacy scalars were unchanged
  by the demo-data update.
- **Interactive browser testing was not performed**: the automation inventory
  has no browsers, and the in-app browser was unavailable. Sign-in, click/save,
  refresh, layout, and focus behavior in an actual browser remain for manual
  inspection. Authenticated HTTP and SSR checks are not a substitute for that
  visual interaction check.
- Production was unchanged. No merge, commit, or deployment was performed.
  Existing uncommitted work remains intact; temporary branch and localhost are
  left available for review.
