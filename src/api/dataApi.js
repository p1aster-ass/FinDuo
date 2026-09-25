export class DataApiError extends Error {
  constructor(
    message,
    { status = 0, code = null, detail = null, field = null } = {},
  ) {
    super(message);
    this.status = status;
    this.code = code;
    // The form field the error belongs to (for example "username"), if any.
    this.field = field;
    // Server-side message/hint/details: for logs only, never shown in the UI.
    this.detail = detail;
  }
}

// PostgREST reports a table that doesn't exist (or isn't exposed) as PGRST205.
export function isMissingTable(error) {
  return (
    error instanceof DataApiError && ["PGRST205", "42P01"].includes(error.code)
  );
}

export function validDataApiUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}

function messageFor(status) {
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) {
    return "The database didn’t allow this change. Please contact the site owner.";
  }
  return "Something went wrong with your player data. Please try again.";
}

// Calls the Neon Data API (PostgREST) as the signed-in user. Row-level security
// on each table decides what that user may read and write. `onError` receives
// every failure with its server detail (for development logging).
export function createDataApi({
  baseUrl,
  getToken,
  fetchImpl = globalThis.fetch,
  onError,
}) {
  const root = validDataApiUrl(baseUrl) ? baseUrl.replace(/\/+$/, "") : null;

  async function send(path, { method = "GET", body, prefer } = {}) {
    if (!root) throw new DataApiError("Player data isn’t configured yet.");
    let token;
    try {
      token = await getToken();
    } catch {
      throw new DataApiError(
        "We couldn’t check your session. Check your connection and try again.",
      );
    }
    if (!token) throw new DataApiError(messageFor(401), { status: 401 });
    let response;
    try {
      response = await fetchImpl(`${root}/${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          ...(body !== undefined && { "Content-Type": "application/json" }),
          ...(prefer && { Prefer: prefer }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new DataApiError(
        "Unable to connect. Check your internet connection and try again.",
      );
    }
    if (!response.ok) {
      const server = await response.json().catch(() => ({}));
      throw new DataApiError(messageFor(response.status), {
        status: response.status,
        code: server?.code ?? null,
        detail: {
          method,
          path: path.split("?")[0],
          message: server?.message ?? null,
          hint: server?.hint ?? null,
          details: server?.details ?? null,
        },
      });
    }
    if (response.status === 204) return null;
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  return async function request(path, options) {
    try {
      return await send(path, options);
    } catch (error) {
      onError?.(error);
      throw error;
    }
  };
}
