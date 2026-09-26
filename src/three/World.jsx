import { useEffect, useLayoutEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import Attic from "./Attic.jsx";
import Lobby from "./Lobby.jsx";
import GameRoom from "./GameRoom.jsx";
import Studio from "./Studio.jsx";
import { applyQueuedSpawn, localPlayer } from "./localPlayer.js";
import { ToonProvider } from "./toys.jsx";
import { damp, PointerContext, setCursor } from "./palette.js";
import { followShot, SHOTS } from "./layout.js";

const BACKGROUND = {
  light: {
    attic: "#f3cfa6",
    studio: "#ffe2c2",
    lobby: "#ffe9d2",
    room: "#fff3e3",
  },
  dark: {
    attic: "#171229",
    studio: "#1c1834",
    lobby: "#141126",
    room: "#17142a",
  },
};

// Glides the camera toward `shot` (or, with `follow`, behind the walking
// player), with a little cursor parallax. Jumps straight there when the
// scene changes (`snapKey`) or motion is reduced.
function CameraRig({ shot: fixedShot, follow, snapKey, animate, pointer }) {
  const getState = useThree((state) => state.get);
  const currentShot = () =>
    follow ? followShot(localPlayer.x, localPlayer.z) : fixedShot;
  const shot = fixedShot;
  const look = useRef(new THREE.Vector3(...shot.target));

  function jumpTo(target) {
    const { camera, invalidate } = getState();
    camera.position.set(...target.position);
    look.current.set(...target.target);
    camera.lookAt(look.current);
    invalidate();
  }

  useLayoutEffect(() => {
    applyQueuedSpawn();
    jumpTo(currentShot());
    // Only on scene changes; shot changes within a scene are animated.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapKey]);

  useEffect(() => {
    if (!animate) jumpTo(shot);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animate, shot]);

  useFrame((state, delta) => {
    const shot = currentShot();
    const { camera } = state;
    if (!animate) {
      if (follow) {
        camera.position.set(...shot.position);
        look.current.set(...shot.target);
        camera.lookAt(look.current);
      }
      return;
    }
    const dt = Math.min(delta, 1 / 30);
    const parallax = follow ? 0.1 : (shot.parallax ?? 0.25);
    const [x, y, z] = shot.position;
    const p = pointer.current;
    camera.position.set(
      damp(camera.position.x, x + p.x * parallax, 2.6, dt),
      damp(camera.position.y, y + p.y * parallax * 0.5, 2.6, dt),
      damp(camera.position.z, z, 2.6, dt),
    );
    look.current.set(
      damp(look.current.x, shot.target[0], 3, dt),
      damp(look.current.y, shot.target[1], 3, dt),
      damp(look.current.z, shot.target[2], 3, dt),
    );
    camera.lookAt(look.current);
  });

  return null;
}

// The whole 3D world. `scene` is "attic", "studio", "lobby", or "room";
// `shotName` picks the camera shot within it (the lobby and rooms follow the
// player instead). `sceneKey` changes when moving between rooms. Everything clickable here also has a DOM
// button in the overlays, so the canvas itself is hidden from screen readers.
export default function World({
  scene,
  shotName,
  theme,
  sceneKey,
  animate,
  active,
  attic,
  studio,
  lobby,
  room,
}) {
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    function move(event) {
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -((event.clientY / window.innerHeight) * 2 - 1);
    }
    window.addEventListener("pointermove", move);
    return () => {
      window.removeEventListener("pointermove", move);
      setCursor("");
    };
  }, []);

  const shot = SHOTS[shotName] ?? SHOTS[scene];
  const palette = BACKGROUND[theme === "dark" ? "dark" : "light"];
  // Walking needs every frame, even with reduced motion.
  const walking = scene === "lobby" || scene === "room";
  let frameloop = "never";
  if (active) frameloop = animate || walking ? "always" : "demand";

  return (
    <Canvas
      className="world-canvas"
      dpr={[1, 1.75]}
      frameloop={frameloop}
      camera={{ position: shot.position, fov: 42, near: 0.05, far: 60 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onPointerMissed={() => setCursor("")}
    >
      <color attach="background" args={[palette[scene]]} />
      <fog attach="fog" args={[palette[scene], 12, 26]} />
      <PointerContext.Provider value={pointer}>
        <ToonProvider>
          <CameraRig
            shot={shot}
            follow={walking}
            snapKey={sceneKey ?? scene}
            animate={animate}
            pointer={pointer}
          />
          {scene === "attic" && (
            <Attic theme={theme} animate={animate} {...attic} />
          )}
          {scene === "studio" && (
            <Studio theme={theme} animate={animate} {...studio} />
          )}
          {scene === "lobby" && (
            <Lobby theme={theme} animate={animate} {...lobby} />
          )}
          {scene === "room" && room?.space && (
            <GameRoom theme={theme} animate={animate} {...room} />
          )}
        </ToonProvider>
      </PointerContext.Provider>
    </Canvas>
  );
}
