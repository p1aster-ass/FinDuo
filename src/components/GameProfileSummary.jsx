import { GAME_BY_ID, GAME_PROFILE_OPTIONS, REGION_BY_ID } from "../data/options.js";

// This renderer accepts rows, never a profile with ambiguous global fields.
export default function GameProfileSummary({ entries }) {
  return (
    <ul className="profile-games" aria-label="Game profiles">
      {entries.map((entry) => {
        const config = GAME_PROFILE_OPTIONS[entry.game];
        const region = config?.regions?.find((option) => option.id === entry.region);
        return (
          <li key={entry.game} data-game={entry.game}>
            <span className="profile-game-tag">{GAME_BY_ID[entry.game]?.tag ?? entry.game}</span>
            <span>
              <span className="profile-game-name">{GAME_BY_ID[entry.game]?.name ?? entry.game}</span>
              <span className="profile-game-genre">
                {config?.rankLabel ?? "Rank"}: {entry.rank || "Not set"}
              </span>
              <span className="profile-game-genre">
                Region: {region?.detail ?? region?.label ?? REGION_BY_ID[entry.region]?.detail ?? entry.region ?? "Not set"}
              </span>
              <span className="profile-game-genre">Roles: {entry.roles?.filter(Boolean).join(", ") || "Not set"}</span>
              <span className="profile-game-genre">Platform: {entry.platform || "Not set"}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
