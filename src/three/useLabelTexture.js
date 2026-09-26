import { useEffect, useMemo } from "react";
import * as THREE from "three";

const FAMILY = '"Unbounded Variable", "Rubik Variable", sans-serif';

// Paints text rows onto the canvas behind `texture`, shrinking to fit.
function paintLabel(texture, rows, options) {
  const { background, color, border, radius, weight, maxSize } = options;
  const canvas = texture.image;
  const { width, height } = canvas;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, width, height);
  if (background) {
    const inset = border ? 8 : 0;
    ctx.beginPath();
    ctx.roundRect(inset, inset, width - inset * 2, height - inset * 2, radius);
    ctx.fillStyle = background;
    ctx.fill();
    if (border) {
      ctx.lineWidth = 12;
      ctx.strokeStyle = border;
      ctx.stroke();
    }
  }
  const room = width * 0.86;
  let size = Math.min(maxSize, ((height * 0.8) / rows.length) * 0.85);
  ctx.font = `${weight} ${size}px ${FAMILY}`;
  const widest = Math.max(...rows.map((row) => ctx.measureText(row).width));
  if (widest > room) size = (size * room) / widest;
  ctx.font = `${weight} ${size}px ${FAMILY}`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  rows.forEach((row, index) => {
    const y = height / 2 + (index - (rows.length - 1) / 2) * size * 1.15;
    ctx.fillText(row, width / 2, y);
  });
  texture.needsUpdate = true;
}

function createLabelTexture(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

// Text as a texture, in the site's display font (redrawn once the font has
// loaded). Used for signs and screens so no font is fetched from a CDN.
export function useLabelTexture({
  lines,
  width = 512,
  height = 256,
  background = null,
  color = "#1d1a2f",
  border = null,
  radius = 36,
  weight = 800,
  maxSize = 120,
}) {
  const key = Array.isArray(lines) ? lines.join("\n") : String(lines);
  const texture = useMemo(
    () => createLabelTexture(width, height),
    [width, height],
  );

  useEffect(() => {
    let cancelled = false;
    const options = { background, color, border, radius, weight, maxSize };
    const rows = key.split("\n");
    paintLabel(texture, rows, options);
    document.fonts
      ?.load(`${weight} 64px "Unbounded Variable"`)
      .then(() => {
        if (!cancelled) paintLabel(texture, rows, options);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [texture, key, background, color, border, radius, weight, maxSize]);

  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}
