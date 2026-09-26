import { useState } from "react";
import { motion } from "framer-motion";
import Icon from "../Icon.jsx";
import { AVATAR_COLORS, AVATAR_PARTS, EMOTES } from "../../data/avatar.js";

const TABS = [
  { id: "colors", label: "Colors" },
  ...AVATAR_PARTS.map((part) => ({ id: part.id, label: part.label })),
];

function Swatches({ label, value, onPick }) {
  return (
    <fieldset className="studio-field">
      <legend>{label}</legend>
      <div className="swatches">
        {AVATAR_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            className="swatch"
            style={{ "--swatch": color }}
            aria-pressed={value === color}
            aria-label={`${label} color ${color}`}
            onClick={() => onPick(color)}
          />
        ))}
      </div>
    </fieldset>
  );
}

// The wardrobe next to the 3D preview (drag the avatar to spin it).
export default function AvatarStudio({
  avatar,
  isNew,
  saving,
  error,
  onChange,
  onRandomize,
  onEmote,
  onSave,
  onCancel,
}) {
  const [tab, setTab] = useState("colors");
  const part = AVATAR_PARTS.find((item) => item.id === tab);

  return (
    <motion.main
      id="main-content"
      tabIndex={-1}
      className="studio-panel"
      aria-labelledby="studio-title"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
    >
      <header className="studio-head">
        <h1 id="studio-title">
          {isNew ? "Make your avatar" : "Edit your avatar"}
        </h1>
        <p>This is you in every room. Drag it to spin it around.</p>
      </header>

      <div className="studio-tabs" role="group" aria-label="Wardrobe">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className="studio-tab"
            aria-pressed={tab === item.id}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="studio-body">
        {tab === "colors" ? (
          <>
            <Swatches
              label="Body"
              value={avatar.body}
              onPick={(color) => onChange({ body: color })}
            />
            <Swatches
              label="Accent"
              value={avatar.accent}
              onPick={(color) => onChange({ accent: color })}
            />
          </>
        ) : (
          <fieldset className="studio-field">
            <legend>{part.label}</legend>
            <div className="studio-options">
              {part.options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className="studio-option"
                  aria-pressed={avatar[part.id] === option.id}
                  onClick={() => onChange({ [part.id]: option.id })}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>
        )}
      </div>

      <div className="studio-emotes" role="group" aria-label="Try an emote">
        {EMOTES.map((emote) => (
          <button
            key={emote.id}
            type="button"
            className="studio-option"
            onClick={() => onEmote(emote.id)}
          >
            {emote.label}
          </button>
        ))}
      </div>

      <footer className="studio-actions">
        <button
          type="button"
          className="button button-secondary"
          onClick={onRandomize}
        >
          <Icon name="spark" />
          Randomize
        </button>
        {!isNew && (
          <button
            type="button"
            className="button button-secondary"
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          className="button button-primary"
          onClick={onSave}
          disabled={saving}
        >
          {saving ? "Saving…" : isNew ? "Looks good" : "Save"}
          <Icon name="arrow" />
        </button>
      </footer>
      {error && (
        <p className="studio-error" role="alert">
          {error}
        </p>
      )}
    </motion.main>
  );
}
