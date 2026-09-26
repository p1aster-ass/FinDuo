import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Float, RoundedBoxGeometry } from "@react-three/drei";
import * as THREE from "three";
import { Glow, Heart, Part, Spinner } from "./toys.jsx";
import { damp, setCursor, TOY } from "./palette.js";
import { clampLobby, doorPlacements, doorZones } from "./layout.js";
import { localPlayer, walkTo } from "./localPlayer.js";
import { LocalAvatar, PlayerController, RemoteAvatar } from "./Players.jsx";
import Label from "./Label.jsx";
import { useLabelTexture } from "./useLabelTexture.js";

const THEMES = {
  light: {
    floorA: "#fff3e3",
    floorB: "#ffe2c2",
    wall: "#ffd9b8",
    ambient: 1.2,
  },
  dark: { floorA: "#241f3f", floorB: "#1c1834", wall: "#2e2750", ambient: 0.7 },
};

function makeChecker(a, b) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = a;
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = b;
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillRect(128, 128, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(9, 9);
  return texture;
}

// A door opens when hovered or when you walk up to it; walking in (or
// clicking it) enters the room.
function Door({
  game,
  label,
  live,
  zone,
  placement,
  onEnter,
  animate,
  themeName,
}) {
  const hinge = useRef(null);
  const open = useRef(0);
  const [hovered, setHovered] = useState(false);
  const sign = useLabelTexture({
    lines: [game.tag],
    width: 512,
    height: 220,
    background: "#ffffff",
    color: "#1d1a2f",
    border: "#1d1a2f",
    radius: 40,
  });

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 30);
    const near =
      Math.hypot(localPlayer.x - zone.x, localPlayer.z - zone.z) < 2.2;
    open.current = damp(
      open.current,
      hovered || near ? 1 : 0,
      animate ? 6 : 50,
      dt,
    );
    hinge.current.rotation.y = -open.current * 1.05;
  });

  return (
    <group position={placement.position} rotation={[0, placement.rotationY, 0]}>
      <group
        onClick={(event) => {
          event.stopPropagation();
          onEnter(game.id);
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHovered(true);
          setCursor("pointer");
        }}
        onPointerOut={() => {
          setHovered(false);
          setCursor("");
        }}
      >
        <Glow
          position={[0, 1.1, -0.04]}
          geo={<planeGeometry args={[1.12, 2.15]} />}
          color={game.color}
        />
        {[-0.66, 0.66].map((x) => (
          <Part
            key={x}
            position={[x, 1.15, 0]}
            geo={<boxGeometry args={[0.2, 2.3, 0.3]} />}
            color={TOY.cream}
            line={0.04}
          />
        ))}
        <Part
          position={[0, 2.38, 0]}
          geo={<boxGeometry args={[1.52, 0.22, 0.3]} />}
          color={TOY.cream}
          line={0.04}
        />
        <group ref={hinge} position={[-0.56, 0, 0.02]}>
          <Part
            position={[0.56, 1.1, 0]}
            geo={
              <RoundedBoxGeometry
                args={[1.1, 2.18, 0.1]}
                radius={0.04}
                smoothness={2}
              />
            }
            color={game.color}
            line={0.02}
          />
          <Part
            position={[0.95, 1.05, 0.08]}
            geo={<sphereGeometry args={[0.06, 12, 12]} />}
            color={TOY.sun}
            line={0.2}
          />
        </group>
      </group>
      <mesh position={[0, 2.95, 0.05]}>
        <planeGeometry args={[1.3, 0.56]} />
        <meshBasicMaterial map={sign} transparent toneMapped={false} />
      </mesh>
      <Label
        text={label}
        variant={live ? "live" : themeName === "dark" ? "dark" : "light"}
        position={[0, 3.3, 0.05]}
        width={1.35}
      />
    </group>
  );
}

export default function Lobby({
  theme: themeName,
  games,
  doorLabels,
  onEnterRoom,
  me,
  peers,
  bubbles,
  selectedId,
  onSelectPlayer,
  animate,
}) {
  const theme = THEMES[themeName === "dark" ? "dark" : "light"];
  const checker = useMemo(
    () => makeChecker(theme.floorA, theme.floorB),
    [theme.floorA, theme.floorB],
  );
  const ids = games.map((game) => game.id);
  const placements = doorPlacements(games.length);
  const zones = doorZones(ids);

  return (
    <group>
      <ambientLight intensity={theme.ambient} />
      <directionalLight position={[3, 6, 5]} intensity={1.6} />
      <pointLight
        position={[0, 3.5, 0]}
        intensity={1.4}
        distance={12}
        color="#ffcf8a"
      />

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 1.2]}
        onClick={(event) => {
          event.stopPropagation();
          walkTo(event.point.x, event.point.z);
        }}
      >
        <circleGeometry args={[7.5, 64]} />
        <meshToonMaterial map={checker} />
      </mesh>
      <mesh position={[0, 2.5, 1.2]}>
        <cylinderGeometry args={[7.5, 7.5, 5, 64, 1, true]} />
        <meshToonMaterial color={theme.wall} side={THREE.BackSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 1.2]}>
        <ringGeometry args={[1.1, 1.45, 48]} />
        <meshBasicMaterial color={TOY.orange} />
      </mesh>

      {games.map((game, index) => (
        <Door
          key={game.id}
          game={game}
          label={doorLabels[game.id]?.text ?? ""}
          live={doorLabels[game.id]?.live ?? false}
          zone={zones[index]}
          placement={placements[index]}
          onEnter={onEnterRoom}
          animate={animate}
          themeName={themeName}
        />
      ))}

      <PlayerController
        clamp={clampLobby}
        triggers={zones}
        onTrigger={onEnterRoom}
      />
      <LocalAvatar
        avatar={me.avatar}
        name={me.name}
        bubble={bubbles[me.id]}
        animate={animate}
      />
      {peers.map((peer, index) => (
        <RemoteAvatar
          key={peer.id}
          peer={peer}
          index={index}
          bubble={bubbles[peer.id]}
          selected={peer.id === selectedId}
          onSelect={() => onSelectPlayer(peer.id)}
          animate={animate}
          theme={themeName}
        />
      ))}

      <Float
        enabled={animate}
        speed={2}
        floatIntensity={0.8}
        position={[0, 3.35, -3.6]}
      >
        <Spinner base={0.7}>
          <Heart />
        </Spinner>
      </Float>
    </group>
  );
}
