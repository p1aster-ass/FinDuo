import { DataApiError, isMissingTable } from "./dataApi.js";

// App field -> column in the live public.profiles table (user_id uuid,
// display_name, username, avatar_url, region, bio, games, rank, comm_styles,
// roles, availability, created_at, updated_at).
const COLUMNS = {
  username: "username",
  region: "region",
  bio: "bio",
  games: "games",
  rank: "rank",
  commStyles: "comm_styles",
  roles: "roles",
  availability: "availability",
};
const SELECT = Object.values(COLUMNS).join(",");
const LISTS = new Set(["games", "commStyles", "roles", "availability"]);

function fromRow(row) {
  const profile = {};
  for (const [field, column] of Object.entries(COLUMNS)) {
    profile[field] = row[column] ?? (LISTS.has(field) ? [] : "");
  }
  return profile;
}

function toRow(displayName, profile) {
  const row = { display_name: displayName };
  for (const [field, column] of Object.entries(COLUMNS)) {
    const value = profile[field];
    if (value === undefined) continue;
    // Empty strings become NULL so optional checks (like rank) accept them.
    row[column] = value === "" && field !== "bio" ? null : value;
  }
  return row;
}

const byUser = (userId) => `user_id=eq.${encodeURIComponent(userId)}`;

// A unique-constraint violation on username means another player has it.
function explain(error) {
  if (
    error instanceof DataApiError &&
    error.code === "23505" &&
    /username/i.test(error.detail?.message ?? "")
  ) {
    return new DataApiError("That username is taken. Try another one.", {
      status: 409,
      code: error.code,
      field: "username",
    });
  }
  return error;
}

// `stored` is false when the profiles table doesn't exist on this branch;
// `exists` says whether the signed-in user already has a row.
export function createProfileApi(request) {
  return {
    async load(userId) {
      try {
        const rows = await request(
          `profiles?${byUser(userId)}&select=${SELECT}`,
        );
        return rows?.[0]
          ? { stored: true, exists: true, profile: fromRow(rows[0]) }
          : { stored: true, exists: false, profile: null };
      } catch (error) {
        if (isMissingTable(error)) {
          return { stored: false, exists: false, profile: null };
        }
        throw error;
      }
    },
    // A plain insert needs only INSERT permission: no read-back, no upsert.
    // Optional fields get empty values in case their columns are NOT NULL.
    // display_name mirrors the Neon Auth name so other players can see it.
    async create(userId, displayName, profile) {
      await request("profiles", {
        method: "POST",
        body: {
          user_id: userId,
          ...toRow(displayName, {
            bio: "",
            roles: [],
            availability: [],
            ...profile,
          }),
        },
        prefer: "return=minimal",
      }).catch((error) => {
        throw explain(error);
      });
    },
    // Reads back the row so an update that row-level security silently
    // filtered out (0 rows changed) is reported instead of looking saved.
    async update(userId, displayName, profile) {
      const rows = await request(`profiles?${byUser(userId)}&select=user_id`, {
        method: "PATCH",
        body: toRow(displayName, profile),
        prefer: "return=representation",
      }).catch((error) => {
        throw explain(error);
      });
      if (!rows?.length) {
        throw new DataApiError(
          "The database didn’t allow this change. Please contact the site owner.",
          { status: 403, code: "NO_ROWS_UPDATED" },
        );
      }
    },
  };
}
