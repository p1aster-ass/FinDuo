import { useState } from "react";
import { motion } from "framer-motion";
import Icon from "../Icon.jsx";
import { REGION_BY_ID } from "../../data/options.js";
import { avatarFor } from "../../data/avatar.js";

// Where you are and who's here (the same people as in 3D), as a list.
export default function RoomPanel({
  space,
  subtitle,
  people,
  selectedId,
  onSelect,
  onLobby,
}) {
  const [open, setOpen] = useState(() => window.innerWidth > 760);
  return (
    <motion.aside
      className={`room-panel${open ? "" : " is-collapsed"}`}
      aria-labelledby="room-title"
      style={{ "--game-color": space.color }}
      initial={{ opacity: 0, x: -40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
    >
      <div className="room-panel-head">
        <span className="room-chip-tag">{space.tag}</span>
        <div className="room-panel-title">
          <h1 id="room-title">{space.name}</h1>
          <p>{subtitle}</p>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-expanded={open}
          aria-label={open ? "Hide people" : "Show people"}
          onClick={() => setOpen(!open)}
        >
          <Icon name="users" />
        </button>
      </div>
      {open && (
        <>
          {people.length === 0 ? (
            <p className="room-empty">
              Nobody else is here yet. Walk around, or head back to the lobby to
              try another room.
            </p>
          ) : (
            <ul className="room-list">
              {people.map(({ player, match, avatar }) => (
                <li key={player.id}>
                  <button
                    type="button"
                    className="room-person"
                    aria-pressed={player.id === selectedId}
                    onClick={() => onSelect(player.id)}
                  >
                    <span
                      className="room-person-dot"
                      style={{
                        background: (avatar ?? avatarFor(player.id)).body,
                      }}
                      aria-hidden="true"
                    >
                      {player.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="room-person-copy">
                      <span className="room-person-name">{player.name}</span>
                      <span className="room-person-meta">
                        {[player.rank, REGION_BY_ID[player.region]?.label]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    <span className="match-score-chip">{match.score}%</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="button button-secondary room-leave"
            onClick={onLobby}
          >
            <Icon name="back" />
            Back to the lobby
          </button>
        </>
      )}
    </motion.aside>
  );
}
