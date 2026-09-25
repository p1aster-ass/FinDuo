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

There is currently no backend or authentication provider in this repository. The default app displays the entry gate; submitting a form or selecting Google/Discord explains that sign-in is not available. Credentials are never stored, logged, or used to simulate authentication.

Connect your provider in `src/main.jsx` through a reactive wrapper that renders `<App auth={auth} />`. The adapter has this shape:

```js
const auth = {
  loading, // true while restoring or verifying the provider session
  user, // null when signed out; otherwise { displayName?, email? }
  signIn: async ({ email, password }) => { /* provider sign-in */ },
  signUp: async ({ email, password }) => { /* provider registration */ },
  signInWithProvider: async (provider) => { /* 'discord' or 'google' */ },
  signOut: async () => { /* provider sign-out */ },
}
```

Callbacks must reject on failure. Wrap provider responses that return errors instead of throwing. The wrapper must subscribe to the provider's session changes and update `user`; completing a callback alone never opens the dashboard. Set `loading` during initial session restoration. Provider-specific password rules and account verification stay with the provider.

This is a presentation gate. Protected data and API access still require authentication enforcement on the backend. Player discovery, profiles, and messaging remain visibly marked as coming soon.
