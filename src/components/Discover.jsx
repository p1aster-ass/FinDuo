import { useState } from "react";
import Icon from "./Icon.jsx";
import PlayerAvatar from "./PlayerAvatar.jsx";
import { RankEmblem } from "./ProfileForm.jsx";
import {
  COMM_BY_ID,
  GAME_BY_ID,
  RANKS,
  REGION_BY_ID,
} from "../data/options.js";
import { formatLastSeen } from "../lib/match.js";

function MatchRing({ score }) {
  return (
    <span className="match-ring" style={{ "--score": score }}>
      <span className="match-ring-value">
        {score}
        <small>%</small>
      </span>
      <span className="match-ring-label">match</span>
    </span>
  );
}

function PlayerCard({ player, match, invited, onInvite, onMessage }) {
  return (
    <article
      className="player-card glass-panel"
      aria-labelledby={`player-${player.id}`}
    >
      <header className="player-card-head">
        <PlayerAvatar name={player.name} online={player.online} size="lg" />
        <div className="player-card-title">
          <h3 id={`player-${player.id}`}>{player.name}</h3>
          <p className="player-status">
            {player.online
              ? "Online now"
              : `Last seen ${formatLastSeen(player.lastSeen)}`}
          </p>
        </div>
        <MatchRing score={match.score} />
      </header>

      <div className="player-meta">
        <span className="meta-chip">
          <RankEmblem level={RANKS.indexOf(player.rank) + 1} />
          {player.rank}
        </span>
        <span className="meta-chip">
          <Icon name="globe" />
          {REGION_BY_ID[player.region].label}
        </span>
      </div>

      <p className="player-bio">{player.bio}</p>

      <ul className="tag-list" aria-label="Games">
        {player.games.map((id) => (
          <li
            key={id}
            className={`tag${match.sharedGames.includes(id) ? " is-shared" : ""}`}
          >
            {GAME_BY_ID[id].name}
          </li>
        ))}
      </ul>

      <ul className="comm-inline" aria-label="Comm style">
        {player.comms.map((id) => (
          <li key={id}>
            <Icon name={COMM_BY_ID[id].icon} />
            {COMM_BY_ID[id].label}
          </li>
        ))}
      </ul>

      {match.reasons.length > 0 && (
        <p className="match-reasons">
          <Icon name="spark" />
          {match.reasons.slice(0, 3).join(" · ")}
        </p>
      )}

      <div className="player-actions">
        <button
          type="button"
          className="button button-primary"
          onClick={() => onInvite(player.id)}
          disabled={invited}
        >
          {invited ? (
            <>
              <Icon name="check" />
              Invite sent
            </>
          ) : (
            <>
              <Icon name="duo" />
              Invite to duo
            </>
          )}
        </button>
        <button
          type="button"
          className="button button-secondary"
          onClick={() => onMessage(player.id)}
        >
          <Icon name="chat" />
          Message
        </button>
      </div>
    </article>
  );
}

export default function Discover({
  profile,
  matches,
  invited,
  onInvite,
  onMessage,
}) {
  const [game, setGame] = useState("mine");
  const [sameRegion, setSameRegion] = useState(false);
  const [nearRank, setNearRank] = useState(false);
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [query, setQuery] = useState("");

  const search = query.trim().toLowerCase();
  const results = matches.filter(({ player, match }) => {
    if (game === "mine" && match.sharedGames.length === 0) return false;
    if (!["mine", "all"].includes(game) && !player.games.includes(game)) {
      return false;
    }
    if (sameRegion && !match.sameRegion) return false;
    if (nearRank && match.rankGap > 1) return false;
    if (onlineOnly && !player.online) return false;
    return !search || player.name.toLowerCase().includes(search);
  });

  const gameFilters = [
    { id: "mine", label: "My games" },
    { id: "all", label: "All games" },
    ...profile.games.map((id) => ({ id, label: GAME_BY_ID[id].name })),
  ];
  const toggles = [
    { label: "Same region", on: sameRegion, set: setSameRegion, icon: "globe" },
    { label: "Near my rank", on: nearRank, set: setNearRank, icon: "trophy" },
    { label: "Online now", on: onlineOnly, set: setOnlineOnly, icon: "spark" },
  ];

  function resetFilters() {
    setGame("all");
    setSameRegion(false);
    setNearRank(false);
    setOnlineOnly(false);
    setQuery("");
  }

  return (
    <>
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">FIND PLAYERS</p>
          <h1>
            Your kind of teammates<span className="brand-period">.</span>
          </h1>
          <p className="page-lede">
            Ranked by how well they fit your games, region, rank, and comm
            style.
          </p>
        </div>
      </div>

      <section className="filter-bar glass-panel" aria-label="Filter players">
        <div className="input-wrap filter-search">
          <Icon name="search" />
          <input
            type="search"
            placeholder="Search by name"
            aria-label="Search players by name"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="filter-row" role="group" aria-label="Game">
          {gameFilters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className="filter-chip"
              aria-pressed={game === filter.id}
              onClick={() => setGame(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="filter-row" role="group" aria-label="More filters">
          {toggles.map((toggle) => (
            <button
              key={toggle.label}
              type="button"
              className="filter-chip"
              aria-pressed={toggle.on}
              onClick={() => toggle.set(!toggle.on)}
            >
              <Icon name={toggle.icon} />
              {toggle.label}
            </button>
          ))}
        </div>
      </section>

      <p className="results-count" role="status">
        {results.length} {results.length === 1 ? "player" : "players"} found
      </p>

      {results.length > 0 ? (
        <div className="player-grid">
          {results.map(({ player, match }) => (
            <PlayerCard
              key={player.id}
              player={player}
              match={match}
              invited={invited.has(player.id)}
              onInvite={onInvite}
              onMessage={onMessage}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state glass-panel">
          <span className="section-icon">
            <Icon name="users" />
          </span>
          <h2>No players match those filters</h2>
          <p>Try widening your search. New players join every day.</p>
          <button
            type="button"
            className="button button-secondary"
            onClick={resetFilters}
          >
            Reset filters
          </button>
        </div>
      )}
    </>
  );
}
