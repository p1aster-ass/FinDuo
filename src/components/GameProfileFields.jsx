import { DEFAULT_GAME_PROFILE_OPTIONS, GAME_BY_ID, GAME_PROFILE_OPTIONS } from "../data/options.js";
import { gameRankError } from "../lib/gameProfiles.js";

// Each card is controlled by exactly one game draft. Preserve saved values
// outside the suggestions (including legacy ranks) until the player edits them.
export default function GameProfileFields({
  draft,
  onChange,
  onRemove,
  showErrors,
  disabled,
}) {
  const { game, rank, region, roles, platform } = draft;
  const name = GAME_BY_ID[game]?.name ?? game;
  const options = GAME_PROFILE_OPTIONS[game] ?? DEFAULT_GAME_PROFILE_OPTIONS;
  const id = `game-profile-${game}`;
  const rankError = gameRankError(draft);
  const invalid = showErrors && (rankError || !region.trim());
  return (
    <fieldset
      id={id}
      className="game-profile-card"
      disabled={disabled}
      tabIndex={-1}
    >
      <legend>{name}</legend>
      <div className="game-profile-fields">
        <div className="form-field">
          <label htmlFor={`${id}-rank`}>{options.rankLabel ?? "Rank"}</label>
          <div className="input-wrap">
            {options.ranks ? (
              <select
                id={`${id}-rank`}
                name={`${game}.rank`}
                value={rank}
                aria-invalid={showErrors && Boolean(rankError)}
                onChange={(event) => onChange({ rank: event.target.value })}
              >
                <option value="">Choose rank</option>
                {rank && !options.ranks.includes(rank) && (
                  <option value={rank}>{rank} (saved)</option>
                )}
                {options.ranks.map((tier) => (
                  <option key={tier} value={tier}>
                    {tier}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={`${id}-rank`}
                name={`${game}.rank`}
                value={rank}
                inputMode={options.rankType === "rating" ? "numeric" : undefined}
                maxLength={80}
                placeholder={
                  options.rankPlaceholder ?? "Rank, rating, or Unranked"
                }
                aria-invalid={showErrors && Boolean(rankError)}
                onChange={(event) => onChange({ rank: event.target.value })}
              />
            )}
          </div>
        </div>
        <div className="form-field">
          <label htmlFor={`${id}-region`}>Region</label>
          <div className="input-wrap">
            <input
              id={`${id}-region`}
              name={`${game}.region`}
              value={region}
              maxLength={64}
              list={`${id}-regions`}
              placeholder={game === "lol" ? "euw" : "eu"}
              aria-invalid={showErrors && !region.trim()}
              onChange={(event) => onChange({ region: event.target.value })}
            />
            <datalist id={`${id}-regions`}>
              {(options.regions ?? []).map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </datalist>
          </div>
        </div>
        <div className="form-field">
          <label htmlFor={`${id}-roles`}>Roles (comma separated)</label>
          <div className="input-wrap">
            <input
              id={`${id}-roles`}
              name={`${game}.roles`}
              value={roles.join(",")}
              placeholder={
                options.rolesPlaceholder ?? "Your roles in this game"
              }
              onChange={(event) =>
                onChange({ roles: event.target.value.split(",") })
              }
            />
          </div>
        </div>
        <div className="form-field">
          <label htmlFor={`${id}-platform`}>Platform (optional)</label>
          <div className="input-wrap">
            <input
              id={`${id}-platform`}
              name={`${game}.platform`}
              value={platform}
              maxLength={64}
              placeholder="PC, PlayStation, Xbox…"
              onChange={(event) => onChange({ platform: event.target.value })}
            />
          </div>
        </div>
      </div>
      {invalid && (
        <p className="ob-error" role="alert">
          {rankError || `Choose a region for ${name}.`}
        </p>
      )}
      <button
        type="button"
        className="button button-secondary"
        onClick={onRemove}
        aria-label={`Remove ${name}`}
      >
        Remove game
      </button>
    </fieldset>
  );
}
