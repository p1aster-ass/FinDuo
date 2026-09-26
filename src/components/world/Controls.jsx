import Icon from "../Icon.jsx";
import { EMOTES } from "../../data/avatar.js";
import { pressDirection } from "../../three/keyboard.js";
import { triggerEmote } from "../../three/localPlayer.js";

// Emote buttons (also keys 1–4) and a hint about the controls.
export function EmoteBar() {
  return (
    <div className="emote-bar" role="group" aria-label="Emotes">
      {EMOTES.map((emote) => (
        <button
          key={emote.id}
          type="button"
          className="emote-button"
          onClick={() => triggerEmote(emote.id)}
          title={`${emote.label} (${emote.key})`}
        >
          <kbd>{emote.key}</kbd>
          {emote.label}
        </button>
      ))}
      <p className="controls-hint">
        <kbd>WASD</kbd> to walk · click the floor · <kbd>Enter</kbd> to chat
      </p>
    </div>
  );
}

const PAD = [
  { direction: "up", icon: "back", label: "Walk forward", rotate: 90 },
  { direction: "left", icon: "back", label: "Walk left", rotate: 0 },
  { direction: "right", icon: "back", label: "Walk right", rotate: 180 },
  { direction: "down", icon: "back", label: "Walk back", rotate: -90 },
];

// A hold-to-walk pad for touch screens (hidden with a mouse).
export function TouchPad() {
  return (
    <div className="touch-pad" aria-hidden="true">
      {PAD.map((item) => (
        <button
          key={item.direction}
          type="button"
          tabIndex={-1}
          className={`pad-${item.direction}`}
          aria-label={item.label}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            pressDirection(item.direction, true);
          }}
          onPointerUp={() => pressDirection(item.direction, false)}
          onPointerCancel={() => pressDirection(item.direction, false)}
          onContextMenu={(event) => event.preventDefault()}
        >
          <span style={{ rotate: `${item.rotate}deg` }}>
            <Icon name="back" />
          </span>
        </button>
      ))}
    </div>
  );
}
