# Multiplayer security verification

For the additive per-game profile migration, tests, API, and rollout notes,
see [USER_GAMES.md](../USER_GAMES.md). Its verification runner also reruns
the multiplayer suites below against the migrated disposable branch.

Install `db/migrations/2026-09-26_multiplayer_baseline.sql` on a disposable
child of production, then refresh that branch's Neon Data API schema cache.
The migration requires the existing Neon Auth, profiles, and gaming columns.
It is transactional and rejects unexpected policies or client role inheritance.

The integration modules export:

- `verifySchema(pgClient)` from `multiplayer-security.mjs`: read-only catalog,
  RLS, function, index, trigger, and effective privilege checks. Returns a
  deterministic snapshot for comparing temporary and production installations.
- `testSecurity(pgClient, { disposable: true })`: SQL behavioral tests with
  fixtures in one rolled-back transaction. Only run on a disposable branch.
- `testDataApi({ authUrl, apiUrl, disposable: true })` from
  `data-api-security.mjs`: real Neon Auth signups/signins and JWT-authenticated
  HTTP tests through the application's profile, world, and invite APIs.

Use the disposable branch's owner connection for the SQL tests. Keep connection
credentials in memory or environment variables; never print or commit them.
Use matching Auth and Data API endpoints for the HTTP tests. Confirm that email
verification and signup/signin emails are disabled on the disposable branch.
Delete the entire disposable branch afterward, including its test accounts.

The HTTP fixture obtains tokens through the installed SDK's `getJWTToken()`.
It verifies the JWKS signature, issuer, account identity, role, and expiry;
credentials and tokens stay in memory. Only claim names and safe verification
results are logged. The SDK cache bypass header is confined to test identities.

In `@neondatabase/auth` 0.5.0-beta, `createInternalNeonAuth()` exports the
container with `getJWTToken()`; `createAuthClient()` returns only its adapter.
The app retains that adapter for React authentication and uses the container
for Data API tokens. No dependency upgrade is required.

RLS and defaults call `auth.user_id()` directly. The invoker functions
`in_private_room` and `touch_presence` use SQL-standard bodies to bind that
reference at installation time. No identity wrapper, auth schema grants, or
managed schema ownership changes are needed. Raw `SET ROLE` SQL tests are
supplementary; the HTTP tests prove the actual JWT request path.

Run `npm test`, `npm run lint`, `npm run build`, and `git diff --check` before
production installation. The unit suite also checks that the migration stays
synchronized with the canonical SQL files and that failed invite responses
cannot enter a private room.

## Verified installation: 2026-09-26

- Fresh production child: direct `auth.user_id()` INSERT/SELECT probe passed
  through the Data API using a signature-verified SDK JWT.
- Baseline: 57 SQL behavioral checks and 49 real HTTP checks passed, including
  nine profile create/load/update checks across three independent accounts.
- Reapplying the exact migration preserved profile and multiplayer data and
  produced the same catalog. Managed auth ownership and ACLs were unchanged.
- Project: 62 unit tests, lint, build, and diff check passed. The build retains
  the existing large-chunk warning.
- Production: the verified baseline was installed, its Data API schema cache
  refreshed, and its catalog matched the tested branch. Existing profile data
  and managed auth permissions were preserved.
- Production smoke: authenticated read-only SQL passed; all four table endpoints
  rejected requests without credentials (HTTP 400, missing bearer token).
  Real signed-in HTTP behavioral coverage ran on the temporary branch.
- The temporary branch and all of its disposable accounts were deleted.

The frontend changes require a later deployment. This work does not deploy the
frontend or merge the security branch into main.
