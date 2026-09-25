# FinDuo

React + Vite matchmaking UI with a themed authentication entry screen and a gated dashboard shell.

## Development

- `npm install`
- `npm run dev`
- `npm run build`
- `npm run lint`

On Windows PowerShell installations that block npm.ps1, use `npm.cmd`.

## Theme system

`src/index.css` defines the orange/espresso dark palette and copper/caramel light palette, global typography, resets, and base element behavior. The eight-digit hex values are transparent variants of those palette colors for glass, borders, and glows. Application layouts and component styling live in `src/App.css`.

The theme switch saves `finduo-theme` in local storage. On the first visit, the app uses the system preference. The inline initializer in `index.html` applies the theme before React renders to avoid a theme flash. Motion respects `prefers-reduced-motion`.

## Source structure and branding

The entry point is `src/main.jsx` → `src/app.jsx` → `src/components/`. Each component has one implementation: `AuthGate`, `Brand`, `Dashboard`, `Icon`, `NavBar`, and `ThemeToggle`.

`Brand.jsx` renders the FinDuo wordmark and the existing Duo mark from `Icon.jsx` in the entry header and dashboard navbar. `public/favicon.svg` uses the same Duo identity; no raster logo is needed.

`node_modules/`, `dist/`, and `.history/` are local dependency, build, and editor outputs. They are ignored by Git and are not application source.

## Authentication integration

Neon Auth provides email/password signup, sign-in, sign-out, and persistent sessions through `@neondatabase/auth` and its `BetterAuthReactAdapter`. The implementation lives in `src/auth/`; `src/main.jsx` mounts the provider and `AuthApp` passes its state into the existing app. `AuthGate` reuses the existing styles and forms. Social login is not enabled.

After linking the workspace, run `neon env pull`. Keep `VITE_NEON_AUTH_URL=${NEON_AUTH_BASE_URL}` in the ignored `.env.local`; Vite expands this public endpoint from the Neon-managed value. Restart Vite after changing env values. On the frontend host, set `VITE_NEON_AUTH_URL` to the branch's Auth Base URL before building. Never expose `DATABASE_URL`, database passwords, or admin/API keys through `VITE_*` variables. `.env.example` contains placeholders only.

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
}
```

Signup validates a nonblank display name, email, an 8–128 character password, and matching confirmation. It sends the display name as Neon's `name`; confirmation is never sent. Sign-in and sign-out call the managed SDK. SDK errors and network failures become readable messages; forms disable submission during requests.

The SDK's `useSession()` owns session restoration and updates after auth actions, across tabs, on window focus, and with a 60-second refresh while signed in. Neon manages session cookies; the app does not put passwords or custom tokens in browser storage. A successful signup response alone never grants access: the app waits for a session containing a user. Session-check failures show a retry action. The SDK may use browser storage for session-change notifications, not application-managed credentials.

In Neon Console, email/password and signup must be enabled. Local development needs Allow Localhost (currently enabled). Add the deployed app's exact origin to trusted domains. This foundation matches the current branch configuration: email verification is not required. If verification is enabled later, the form reports that requirement, but a verification-code entry flow is not included. Configure custom SMTP before production email delivery; see the [Neon production checklist](https://neon.com/docs/auth/production-checklist).

Validation: `npm run test:auth`, `npm run lint`, `npm run build`, and `git diff --check`. The focused tests cover validation, SDK error responses, network failures, and sign-out failures. To smoke-test the live service, create a disposable account, reload, sign out, reload again, try an incorrect password, then sign in with the correct one. Remove the disposable user afterward through Neon Console.

This is a presentation gate. Protected data and API access still require authentication enforcement on the backend. Player discovery, profiles, and messaging remain visibly marked as coming soon.
