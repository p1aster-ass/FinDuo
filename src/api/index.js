import { authClient } from "../auth/client.js";
import { createDataApi } from "./dataApi.js";
import { createPresenceApi } from "./presence.js";
import { createProfileApi } from "./profiles.js";
import { createWorldApi } from "./world.js";

// The Data API accepts the Neon Auth JWT, which the SDK exposes as the session token.
async function getToken() {
  if (!authClient) return null;
  const { data } = await authClient.getSession();
  return data?.session?.token ?? null;
}

// In development, print the database's own reason for a failed request
// (for example which row-level security policy blocked it).
function logError(error) {
  const { method = "", path = "", message, hint } = error.detail ?? {};
  console.error(
    `[Data API] ${error.status} ${error.code ?? ""} ${method} ${path}: ${message ?? error.message}${hint ? ` (hint: ${hint})` : ""}`,
  );
}

const request = createDataApi({
  baseUrl: import.meta.env.VITE_NEON_DATA_API_URL,
  getToken,
  onError: import.meta.env.DEV ? logError : undefined,
});

export const profileApi = createProfileApi(request);
export const presenceApi = createPresenceApi(request);
export const worldApi = createWorldApi(request);
