import { useMemo } from "react";
import { RoundedBoxGeometry } from "@react-three/drei";
import * as THREE from "three";
import { Glow, Part } from "./toys.jsx";
import { INK, TOY } from "./palette.js";
import { clampRoom, ROOM_EXIT } from "./layout.js";
import { walkTo } from "./localPlayer.js";
import { LocalAvatar, PlayerController, RemoteAvatar } from "./Players.jsx";
import { useLabelTexture } from "./useLabelTexture.js";

function tint(color, base, amount) {
  return `#${new THREE.Color(base).lerp(new THREE.Color(color), amount).getHexString()}`;
}

function NeonSign({ text, color }) {
  const texture = useLabelTexture({
    lines: [text],
    width: 1024,
    height: 256,
    background: INK,
    color,
    border: color,
    radius: 60,
  });
  return (
    <mesh position={[0, 3.05, -3.95]}>
      <planeGeometry args={[4.4, 1.1]} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} />
    </mesh>
  );
}

function Couch({ color }) {
  return (
    <group position={[-4.4, 0, -2.4]} rotation={[0, 0.7, 0]}>
      <Part
        position={[0, 0.35, 0]}
        geo={
          <RoundedBoxGeometry
            args={[2.4, 0.5, 1]}
            radius={0.18}
            smoothness={3}
          />
        }
        color={color}
        line={0.03}
      />
      <Part
        position={[0, 0.85, -0.38]}
        geo={
          <RoundedBoxGeometry
            args={[2.4, 0.8, 0.3]}
            radius={0.14}
            smoothness={3}
          />
        }
        color={color}
        line={0.03}
      />
      {[-1.2, 1.2].map((x) => (
        <Part
          key={x}
          position={[x, 0.6, 0]}
          geo={
            <RoundedBoxGeometry
              args={[0.3, 0.7, 1]}
              radius={0.12}
              smoothness={3}
            />
          }
          color={color}
          line={0.04}
        />
      ))}
    </group>
  );
}

function Desk({ tag, color }) {
  const screen = useLabelTexture({
    lines: [tag],
    width: 512,
    height: 300,
    background: color,
    color: INK,
    radius: 20,
  });
  return (
    <group position={[4.5, 0, -2.3]} rotation={[0, -0.8, 0]}>
      <Part
        position={[0, 0.72, 0]}
        geo={<boxGeometry args={[1.8, 0.1, 0.8]} />}
        color={TOY.cream}
        line={0.03}
      />
      {[-0.8, 0.8].map((x) => (
        <Part
          key={x}
          position={[x, 0.36, 0]}
          geo={<boxGeometry args={[0.08, 0.72, 0.7]} />}
          color={TOY.cream}
          line={0.06}
        />
      ))}
      <Part
        position={[0, 1.25, -0.2]}
        geo={
          <RoundedBoxGeometry
            args={[1.3, 0.8, 0.08]}
            radius={0.04}
            smoothness={2}
          />
        }
        color={INK}
        line={0}
      />
      <mesh position={[0, 1.25, -0.15]}>
        <planeGeometry args={[1.18, 0.68]} />
        <meshBasicMaterial map={screen} toneMapped={false} />
      </mesh>
    </group>
  );
}

// The doorway back to the lobby, on the left wall.
function ExitDoor() {
  const sign = useLabelTexture({
    lines: ["LOBBY"],
    width: 512,
    height: 160,
    background: "#ffffff",
    color: INK,
    border: INK,
    radius: 40,
  });
  return (
    <group position={[-6.45, 0, ROOM_EXIT.z]} rotation={[0, Math.PI / 2, 0]}>
      <Glow
        position={[0, 1.1, 0.01]}
        geo={<planeGeometry args={[1.2, 2.2]} />}
        color="#fff3e3"
      />
      {[-0.7, 0.7].map((x) => (
        <Part
          key={x}
          position={[x, 1.15, 0.1]}
          geo={<boxGeometry args={[0.2, 2.3, 0.3]} />}
          color={TOY.cream}
          line={0.04}
        />
      ))}
      <mesh position={[0, 2.7, 0.12]}>
        <planeGeometry args={[1.3, 0.4]} />
        <meshBasicMaterial map={sign} transparent toneMapped={false} />
      </mesh>
    </group>
  );
}

// A game room (or a private room). You walk around with WASD; walking into
// the "LOBBY" doorway on the left leaves.
export default function GameRoom({
  theme: themeName,
  space,
  me,
  peers,
  bubbles,
  selectedId,
  onSelectPlayer,
  onExit,
  animate,
}) {
  const dark = themeName === "dark";
  const base = dark ? "#1c1834" : "#fff3e3";
  const floor = useMemo(
    () => tint(space.color, base, dark ? 0.35 : 0.3),
    [space.color, base, dark],
  );
  const wall = useMemo(
    () => tint(space.color, base, dark ? 0.2 : 0.16),
    [space.color, base, dark],
  );

  return (
    <group>
      <ambientLight intensity={dark ? 0.75 : 1.2} />
      <directionalLight position={[3, 7, 5]} intensity={1.5} />
      <pointLight
        position={[0, 3, 0]}
        intensity={dark ? 2 : 1}
        distance={12}
        color={space.color}
      />

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={(event) => {
          event.stopPropagation();
          walkTo(event.point.x, event.point.z);
        }}
      >
        <planeGeometry args={[13, 9]} />
        <meshToonMaterial color={floor} />
      </mesh>
      <mesh position={[0, 2.5, -4]}>
        <planeGeometry args={[13, 5]} />
        <meshToonMaterial color={wall} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * 6.5, 2.5, 0.5]}
          rotation={[0, -side * (Math.PI / 2), 0]}
        >
          <planeGeometry args={[9, 5]} />
          <meshToonMaterial color={wall} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -0.4]}>
        <circleGeometry args={[2.6, 48]} />
        <meshToonMaterial color={tint(space.color, base, 0.55)} />
      </mesh>
      <NeonSign text={space.name} color={space.color} />
      <Glow
        position={[0, 0.03, -3.9]}
        geo={<boxGeometry args={[13, 0.06, 0.1]} />}
        color={space.color}
      />
      <Couch color={tint(space.color, INK, 0.75)} />
      <Desk tag={space.tag} color={space.color} />
      <ExitDoor />

      <PlayerController
        clamp={clampRoom}
        triggers={[ROOM_EXIT]}
        onTrigger={onExit}
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
    </group>
  );
}
