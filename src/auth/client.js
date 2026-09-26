import { createAuthClient } from "@neondatabase/auth";
import { BetterAuthReactAdapter } from "@neondatabase/auth/react/adapters";

const authUrl = import.meta.env.VITE_NEON_AUTH_URL;
const validUrl = (() => {
  try {
    const url = new URL(authUrl);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
})();

// This public URL is the only Neon environment value exposed to the browser.
export const authClient = validUrl
  ? createAuthClient(authUrl, {
      adapter: BetterAuthReactAdapter({
        sessionOptions: { refetchOnWindowFocus: true, refetchInterval: 60 },
      }),
    })
  : null;
