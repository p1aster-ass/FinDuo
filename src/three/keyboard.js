import { EMOTES } from "../data/avatar.js";

// WASD / arrow keys for walking, 1–4 for emotes. Ignored while typing.
const DIRECTIONS = {
  KeyW: "up",
  ArrowUp: "up",
  KeyS: "down",
  ArrowDown: "down",
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
};
const pressed = new Set();

function isTyping(target) {
  if (!target) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

export function attachKeyboard({ onEmote }) {
  function down(event) {
    if (isTyping(event.target) || event.metaKey || event.ctrlKey) return;
    const direction = DIRECTIONS[event.code];
    if (direction) {
      pressed.add(direction);
      if (event.code.startsWith("Arrow")) event.preventDefault();
      return;
    }
    const emote = EMOTES.find((item) => item.key === event.key);
    if (emote && !event.repeat) onEmote?.(emote.id);
  }
  function up(event) {
    const direction = DIRECTIONS[event.code];
    if (direction) pressed.delete(direction);
  }
  function clear() {
    pressed.clear();
  }
  window.addEventListener("keydown", down);
  window.addEventListener("keyup", up);
  window.addEventListener("blur", clear);
  return () => {
    window.removeEventListener("keydown", down);
    window.removeEventListener("keyup", up);
    window.removeEventListener("blur", clear);
    clear();
  };
}

// Held on-screen pad buttons (touch) feed the same input.
export function pressDirection(direction, isDown) {
  if (isDown) pressed.add(direction);
  else pressed.delete(direction);
}

export function inputVector() {
  return {
    x: (pressed.has("right") ? 1 : 0) - (pressed.has("left") ? 1 : 0),
    z: (pressed.has("down") ? 1 : 0) - (pressed.has("up") ? 1 : 0),
  };
}
