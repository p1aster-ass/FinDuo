import { initials } from "../lib/match.js";

const VARIANTS = ["solid", "outline", "soft"];

// Picks a stable avatar style from the name so players are easy to tell apart.
function variantFor(name = "") {
  const sum = [...name].reduce((total, char) => total + char.charCodeAt(0), 0);
  return VARIANTS[sum % VARIANTS.length];
}

export default function PlayerAvatar({ name, online, size = "md", variant }) {
  return (
    <span
      className={`player-avatar avatar-${size} avatar-${variant ?? variantFor(name)}`}
      aria-hidden="true"
    >
      {initials(name)}
      {online !== undefined && (
        <span className={`presence-dot${online ? " is-online" : ""}`} />
      )}
    </span>
  );
}
