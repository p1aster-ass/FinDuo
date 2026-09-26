import { createContext } from "react";
import * as THREE from "three";

export { BUDDY_COLORS, colorFor } from "../lib/world.js";

// Shared constants for the 3D world. Colors match the CSS theme tokens
// (src/index.css).
export const INK = "#1d1a2f";
export const TOY = {
  orange: "#ff6d00",
  grape: "#8b6cff",
  mint: "#2ec4a0",
  sun: "#ffc53d",
  pink: "#ff6fa8",
  cream: "#fff3e3",
  sky: "#4d9dff",
};
export const damp = THREE.MathUtils.damp;

// Cursor position in [-1, 1] across the whole window (see World.jsx).
export const PointerContext = createContext({ current: { x: 0, y: 0 } });
export const GradientContext = createContext(null);

export function setCursor(value) {
  document.body.style.cursor = value;
}
