import { useState } from "react";
import { motion } from "framer-motion";
import Icon from "../Icon.jsx";

// The lobby's doors as a list: walk into a door in 3D, or pick it here.
export default function LobbyDock({ games, labels, notes, onEnterRoom }) {
  const [open, setOpen] = useState(() => window.innerWidth > 760);
  return (
    <motion.aside
      className={`lobby-dock${open ? "" : " is-collapsed"}`}
      aria-labelledby="lobby-title"
      initial={{ opacity: 0, x: -40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
    >
      <div className="lobby-dock-head">
        <div>
          <h1 id="lobby-title">Lobby</h1>
          <p>Walk into a door to join that game’s room.</p>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-expanded={open}
          aria-label={open ? "Hide rooms" : "Show rooms"}
          onClick={() => setOpen(!open)}
        >
          <Icon name="grid" />
        </button>
      </div>
      {open && (
        <>
          <ul className="room-chips">
            {games.map((game) => (
              <li key={game.id}>
                <button
                  type="button"
                  className="room-chip"
                  style={{ "--game-color": game.color }}
                  onClick={() => onEnterRoom(game.id)}
                >
                  <span className="room-chip-tag">{game.tag}</span>
                  <span className="room-chip-copy">
                    <span className="room-chip-name">{game.name}</span>
                    <span className="room-chip-count">
                      {labels[game.id]?.text}
                    </span>
                  </span>
                  <Icon name="arrow" />
                </button>
              </li>
            ))}
          </ul>
          {notes.length > 0 && (
            <div className="dock-notes">
              {notes.map((note) => (
                <p key={note}>{note}</p>
              ))}
            </div>
          )}
        </>
      )}
    </motion.aside>
  );
}
