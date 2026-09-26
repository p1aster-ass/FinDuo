import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";

// three.js is large, so the 3D world loads as its own chunk.
const World = lazy(() => import("../three/World.jsx"));

function webglSupported() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

// Holds the full-screen 3D world behind the page UI. Scene changes fade
// through a color (entering from the attic fades through the Gameboy's
// screen). Without WebGL, a flat backdrop stands in and the UI still works.
export default function WorldStage({
  scene,
  sceneKey,
  shotName,
  theme,
  hidden,
  ...scenes
}) {
  const reduceMotion = useReducedMotion();
  const supported = useMemo(() => webglSupported(), []);
  const key = sceneKey ?? scene;
  const [shown, setShown] = useState({ scene, key });
  const [fading, setFading] = useState(false);
  const [fadeColor, setFadeColor] = useState("");

  useEffect(() => {
    if (key === shown.key) return undefined;
    const intoScreen = shown.scene === "attic";
    const start = setTimeout(() => {
      setFadeColor(intoScreen ? "var(--screen-mint)" : "");
      setFading(true);
    }, 0);
    const swap = setTimeout(
      () => {
        setShown({ scene, key });
        setFading(false);
      },
      reduceMotion ? 0 : intoScreen ? 650 : 380,
    );
    return () => {
      clearTimeout(start);
      clearTimeout(swap);
    };
  }, [key, scene, shown, reduceMotion]);

  // While leaving the attic, push the camera into the Gameboy's screen.
  let shot = shotName;
  if (shown.key !== key)
    shot = shown.scene === "attic" ? "gameboyEnter" : shown.scene;

  return (
    <div
      className={`world-stage world-${shown.scene}${hidden ? " is-hidden" : ""}`}
      aria-hidden="true"
    >
      {supported ? (
        <Suspense fallback={<div className="world-loading" />}>
          <World
            scene={shown.scene}
            sceneKey={shown.key}
            shotName={shot}
            theme={theme}
            animate={!reduceMotion}
            active={!hidden}
            {...scenes}
          />
        </Suspense>
      ) : (
        <div className="world-fallback" />
      )}
      <div
        className={`world-fade${fading ? " is-on" : ""}`}
        style={fadeColor ? { background: fadeColor } : undefined}
      />
    </div>
  );
}
