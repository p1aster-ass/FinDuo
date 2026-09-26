import { setCursor, INK, TOY } from "./palette.js";
import { useLabelTexture } from "./useLabelTexture.js";

const VARIANTS = {
  light: { background: "#ffffff", color: INK },
  dark: { background: "#241f3f", color: "#fff3e3" },
  accent: { background: TOY.orange, color: INK },
  live: { background: TOY.mint, color: INK },
  bubble: { background: "#ffffff", color: INK },
};

// A pill-shaped text label (or a multi-line speech bubble) that always faces
// the camera and stays visible through other objects. Drawn in 3D (no DOM).
export default function Label({
  text,
  lines,
  variant = "light",
  position,
  width = 1.5,
  onClick,
}) {
  const colors = VARIANTS[variant] ?? VARIANTS.light;
  const rows = lines ?? [text];
  const height = rows.length > 1 ? rows.length * 88 + 56 : 128;
  const texture = useLabelTexture({
    lines: rows,
    width: 512,
    height,
    background: colors.background,
    color: colors.color,
    border: INK,
    radius: rows.length > 1 ? 44 : 64,
    weight: variant === "bubble" ? 600 : 700,
    maxSize: 58,
  });

  return (
    <sprite
      position={position}
      scale={[width, (width * height) / 512, 1]}
      renderOrder={10}
      onClick={
        onClick &&
        ((event) => {
          event.stopPropagation();
          onClick();
        })
      }
      onPointerOver={onClick && (() => setCursor("pointer"))}
      onPointerOut={onClick && (() => setCursor(""))}
    >
      <spriteMaterial
        map={texture}
        transparent
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </sprite>
  );
}
