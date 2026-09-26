import { useState } from "react";
import { motion } from "framer-motion";
import Icon from "../Icon.jsx";
import { RankEmblem } from "../ProfileForm.jsx";
import {
  COMM_BY_ID,
  GAME_BY_ID,
  RANKS,
  REGION_BY_ID,
} from "../../data/options.js";

// The player you clicked: who they are, how well you match, and a private
// room invite.
export default function PlayerCard({
  player,
  match,
  inviteStatus,
  canInvite,
  onInvite,
  blocked,
  onToggleBlock,
  onClose,
}) {
  const [copied, setCopied] = useState(false);
  const rankLevel = RANKS.indexOf(player.rank) + 1;

  async function copyHandle() {
    try {
      await navigator.clipboard.writeText(`@${player.username}`);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  let inviteLabel = "Invite to a private room";
  if (inviteStatus === "pending") inviteLabel = "Invite sent…";
  if (inviteStatus === "declined") inviteLabel = "They can’t right now";

  return (
    <motion.article
      className="player-card-3d glass-panel"
      aria-labelledby="player-card-name"
      initial={{ opacity: 0, x: 40, rotateY: -12 }}
      animate={{ opacity: 1, x: 0, rotateY: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
    >
      <button
        type="button"
        className="icon-button card-close"
        onClick={onClose}
        aria-label="Close player card"
      >
        <Icon name="close" />
      </button>
      <header className="player-card-head">
        <div className="player-card-title">
          <h2 id="player-card-name">{player.name}</h2>
          <p className="player-status">
            {player.username && `@${player.username} · `}
            In this room
          </p>
        </div>
        <span className="match-ring" style={{ "--score": match.score }}>
          <span className="match-ring-value">
            {match.score}
            <small>%</small>
          </span>
          <span className="match-ring-label">match</span>
        </span>
      </header>

      <div className="player-meta">
        {rankLevel > 0 && (
          <span className="meta-chip">
            <RankEmblem level={rankLevel} />
            {player.rank}
          </span>
        )}
        {player.region && (
          <span className="meta-chip">
            <Icon name="globe" />
            {REGION_BY_ID[player.region]?.label ?? player.region}
          </span>
        )}
      </div>

      {player.bio && <p className="player-bio">{player.bio}</p>}

      {player.games.length > 0 && (
        <ul className="tag-list" aria-label="Games">
          {player.games
            .filter((id) => GAME_BY_ID[id])
            .map((id) => (
              <li
                key={id}
                className={`tag${match.sharedGames.includes(id) ? " is-shared" : ""}`}
              >
                {GAME_BY_ID[id].name}
              </li>
            ))}
        </ul>
      )}

      {player.comms.length > 0 && (
        <ul className="comm-inline" aria-label="Comm style">
          {player.comms
            .filter((id) => COMM_BY_ID[id])
            .map((id) => (
              <li key={id}>
                <Icon name={COMM_BY_ID[id].icon} />
                {COMM_BY_ID[id].label}
              </li>
            ))}
        </ul>
      )}

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
          onClick={onInvite}
          disabled={!canInvite || inviteStatus === "pending" || blocked}
        >
          <Icon name="duo" />
          {inviteLabel}
        </button>
        <button
          type="button"
          className="button button-secondary"
          onClick={copyHandle}
          disabled={!player.username}
        >
          <Icon name={copied ? "check" : "users"} />
          {copied ? "Copied!" : `Copy @${player.username || "username"}`}
        </button>
      </div>
      <button
        type="button"
        className="text-button card-block"
        onClick={onToggleBlock}
      >
        {blocked ? "Unblock" : "Block"} {player.name}
      </button>
    </motion.article>
  );
}
