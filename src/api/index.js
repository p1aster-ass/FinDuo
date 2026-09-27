import { neonAuth } from "../auth/client.js";
import { createDataApi } from "./dataApi.js";
import { createPresenceApi } from "./presence.js";
import { createProfileApi } from "./profiles.js";
import { createWorldApi } from "./world.js";
import { getDataApiToken } from "./token.js";
import { createUserGamesApi } from "./userGames.js";

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
  getToken: () => getDataApiToken(neonAuth),
  onError: import.meta.env.DEV ? logError : undefined,
});

export const userGamesApi = createUserGamesApi(request);
export const profileApi = createProfileApi(request, { gameApi: userGamesApi });
export const presenceApi = createPresenceApi(request);
export const worldApi = createWorldApi(request);
