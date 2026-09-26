import { createInternalNeonAuth } from "@neondatabase/auth";
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
// 0.5.0-beta exposes getJWTToken on the SDK container; its adapter supplies
// the existing React auth API. This is the same container used by neon-js.
export const neonAuth = validUrl
  ? createInternalNeonAuth(authUrl, {
      adapter: BetterAuthReactAdapter({
        sessionOptions: { refetchOnWindowFocus: true, refetchInterval: 60 },
      }),
    })
  : null;

export const authClient = neonAuth?.adapter ?? null;
