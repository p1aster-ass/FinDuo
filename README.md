# FinDuo

React + Vite matchmaking site built as a small multiplayer 3D world (three.js via React Three Fiber): a cozy attic where you press the Gameboy to enter, an avatar studio, and a lobby you walk around with WASD, with a door per game you play leading to that game's room. Rooms have live chat (messages float above avatars) and you can invite anyone to a private room.

## Development

- `npm install`
- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm test` (all unit tests; `npm run test:auth` and `npm run test:api` run one suite)

On Windows PowerShell installations that block npm.ps1, use `npm.cmd`.

## Theme system

`src/index.css` defines the orange/espresso dark palette and copper/caramel light palette, global typography, resets, and base element behavior. The eight-digit hex values are transparent variants of those palette colors for glass, borders, and glows. Application layouts and component styling live in `src/App.css`.

The theme switch saves `finduo-theme` in local storage. On the first visit, the app uses the system preference. The inline initializer in `index.html` applies the theme before React renders to avoid a theme flash. Motion respects `prefers-reduced-motion`.

## Source structure and branding

The entry point is `src/main.jsx` → `src/app.jsx`, which decides the phase: the attic, the Gameboy screen (sign-in, loading, errors), onboarding, or inside (lobby or a game room). The 3D world lives in `src/three/` (`World` holds one persistent canvas and the camera; `Attic`, `Gameboy`, `Lobby`, and `GameRoom` are the scenes; `toys.jsx` has the cartoon parts and buddies) and loads as its own chunk through `src/components/WorldStage.jsx`. The page UI over it lives in `src/components/world/` (intro, Gameboy screen frame, top bar, lobby dock, room panel, player card, drawers). Every 3D action also has a regular button there, so keyboard and screen-reader users, and devices without WebGL, can use the whole site. `ProfileForm` is shared by onboarding and the profile drawer. Static option lists (games with their signature colors, regions, ranks, comm styles, roles) live in `src/data/options.js`; match scoring lives in `src/lib/match.js`.

`Brand.jsx` renders the FinDuo wordmark and the existing Duo mark from `Icon.jsx` in the entry header and dashboard navbar. `public/favicon.svg` uses the same Duo identity; no raster logo is needed.

`node_modules/`, `dist/`, and `.history/` are local dependency, build, and editor outputs. They are ignored by Git and are not application source.

## Authentication integration

Neon Auth provides email/password signup, sign-in, sign-out, and persistent sessions through `@neondatabase/auth` and its `BetterAuthReactAdapter`. The implementation lives in `src/auth/`; `src/main.jsx` mounts the provider and `AuthApp` passes its state into the existing app. `AuthGate` reuses the existing styles and forms. Social login is not enabled.

Local settings live in `.env` at the project root. It is ignored by Git (see `.gitignore`); copy `.env.example` to create it. Vite loads it automatically, so no dotenv package is needed. Restart Vite after changing env values. The browser needs two public endpoints:

- `VITE_NEON_AUTH_URL`: the branch's Neon Auth base URL (`https://<endpoint>.neonauth.<region>.aws.neon.tech/neondb/auth`).
- `VITE_NEON_DATA_API_URL`: the branch's Data API URL (`https://<endpoint>.apirest.<region>.aws.neon.tech/neondb/rest/v1`).

`neon env pull` can also write the server-side values into `.env.local`. On the frontend host, set both `VITE_*` values before building. Never expose `DATABASE_URL`, database passwords, or admin/API keys through `VITE_*` variables. `.env.example` contains placeholders only.

Components inside the provider can call `useAuth()` from `src/auth/useAuth.js`. It exposes:

```js
const auth = {
  loading, // initial session restoration
  user, // null when signed out; Neon user with displayName mapped from name
  session, // current SDK session, or null
  error, // readable session/configuration error, or an empty string
  configured,
  signIn, // async ({ email, password })
  signUp, // async ({ displayName, email, password, confirmPassword })
  signOut, // async ()
  refreshSession, // retry a failed session check when configured
  updateDisplayName, // async (name): saves the Neon account name
}
```

Signup validates a nonblank display name, email, an 8–128 character password, and matching confirmation. It sends the display name as Neon's `name`; confirmation is never sent. Sign-in and sign-out call the managed SDK. SDK errors and network failures become readable messages; forms disable submission during requests.

The SDK's `useSession()` owns session restoration and updates after auth actions, across tabs, on window focus, and with a 60-second refresh while signed in. Neon manages session cookies; the app does not put passwords or custom tokens in browser storage. A successful signup response alone never grants access: the app waits for a session containing a user. Session-check failures show a retry action. The SDK may use browser storage for session-change notifications, not application-managed credentials.

In Neon Console, email/password and signup must be enabled. Local development needs Allow Localhost (currently enabled). Add the deployed app's exact origin to trusted domains. This foundation matches the current branch configuration: email verification is not required. If verification is enabled later, the form reports that requirement, but a verification-code entry flow is not included. Configure custom SMTP before production email delivery; see the [Neon production checklist](https://neon.com/docs/auth/production-checklist).

Validation: `npm run test:auth`, `npm run test:api`, `npm run lint`, `npm run build`, and `git diff --check`. The focused tests cover validation, SDK error responses, network failures, and sign-out failures. To smoke-test the live service, create a disposable account, reload, sign out, reload again, try an incorrect password, then sign in with the correct one. Remove the disposable user afterward through Neon Console.

This is a presentation gate. Protected data and API access still require authentication enforcement on the backend.

## Data API

`src/api/dataApi.js` calls the Neon Data API (PostgREST) with the signed-in user's Neon Auth JWT (`authClient.getSession()` → `session.token`); `src/api/index.js` wires it to `VITE_NEON_DATA_API_URL`. Because the browser queries tables directly, row-level security on every table is what enforces access. Neon's guidance prefers Functions for new backends; if the team moves there later, only `src/api/` changes.

`src/api/profiles.js` reads and writes the signed-in user's row in the live `public.profiles` table: `display_name` (kept in sync with the Neon Auth name), `username` (required and unique; chosen in the first onboarding step, 3–20 lowercase letters, numbers, or underscores), `region`, `bio`, `games`, `rank`, `comm_styles`, `roles`, and `availability`. A new profile is a plain insert and later edits are updates, so the table needs SELECT, INSERT, and UPDATE grants plus matching row-level security policies for the `authenticated` role; `db/profiles_access.sql` sets them up and shows how to check them. In development, a failed request logs the database's reason in the browser console as `[Data API]`. After adding or changing columns, refresh the Data API schema cache in Neon Console; until then inserts that use the new columns fail with `PGRST204`.

## Playing

- **Move:** WASD or the arrow keys, or click/tap the floor to walk there (a hold-to-walk pad appears on touch screens). Walk into a door to enter that room; walk into the "LOBBY" doorway to leave.
- **Emotes:** keys 1–4 (jump, spin, dance, heart) or the buttons at the bottom.
- **Chat:** press Enter to type, Escape to go back to walking. Messages float above the sender for 6 seconds.
- **Private rooms:** click a player (in 3D or the list) and choose "Invite to a private room"; if they accept, you both move there and only you two can read that chat.
- **Avatar:** designed in the studio after sign-in (color, pattern, eyes, face, headgear, outfit, accent color); change it any time from the top bar's Avatar button.
- **Blocking:** a player's card has Block, which hides their avatar, messages, and invites for you (remembered on this device).

## Multiplayer

Multiplayer runs through the Neon Data API by polling (`src/api/useMultiplayer.js`, `src/api/world.js`): about twice a second the app sends your position when it changes, and about once a second it loads the players and chat in your room; invites refresh every few seconds. Other players' movement is smoothed but roughly a second behind. The tables, security rules, and limits are in `db/multiplayer.sql` (apply after `db/profiles_access.sql` and `db/presence.sql`, then refresh the schema cache): avatars on `profiles.avatar`, live positions in `world_positions`, chat in `chat_messages` (200 characters, 5 per 10 seconds, private-room chat readable only by its two members), and invites in `private_rooms`. Until it's applied, players can still walk around and customize their avatar alone, and chat says it isn't set up. For more players or smoother movement, swap the polling in `useMultiplayer` for a realtime service; the rest of the app doesn't change.

Moderation is minimal: per-player blocking on the device, a message length cap, and a rate limit. Before opening chat to the public, add server-side reporting/blocking and a scheduled cleanup of old chat and stale positions (sample queries at the end of `db/multiplayer.sql`).

## Backend status

Live: Neon Auth (accounts, sessions, and the display name, edited from the Profile page through `updateDisplayName`) and the Data API endpoint. The app contains no mock data. Still needed:

- **Profile access**: the table must allow signed-in players to insert and update their own row (`db/profiles_access.sql`). `avatar_url` exists but the app doesn't collect it yet.
- **Player discovery** (`backend.discovery` in `src/api/backend.js`): Find players shows a "not live yet" panel. Once there is a data source, pass `matches` (`[{ player, match: scoreMatch(profile, player) }]`) and invite/message handlers to `Discover`. A player is `{ id, name, games, region, rank, comms, roles, availability, bio, online, lastSeen }`, with `lastSeen` in minutes. Discovery can read names from `profiles.display_name`, which the app keeps in sync with the Neon Auth name.
- **Messaging** (`backend.messaging`): Messages shows a "not live yet" panel. Once there is a data source, pass `conversations` (`[{ playerId, player, unread, messages }]`) and send/plan-session handlers to `Messages`. A message is `{ id, from: "me" | "them", type: "text" | "invite" | "session", text?, session?: { game, when }, status?, at }`.

Flip a flag in `src/api/backend.js` once its backend is connected.
