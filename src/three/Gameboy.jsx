import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBoxGeometry } from "@react-three/drei";
import { InkPart, Part } from "./toys.jsx";
import { damp, INK, setCursor, TOY } from "./palette.js";
import { GAMEBOY } from "./layout.js";
import { useLabelTexture } from "./useLabelTexture.js";

const SCREEN = "#a8f0d8";

// The attic's Gameboy. Hover lifts and wiggles it; pressing it enters FinDuo.
export default function Gameboy({ onPress, animate, zoomed }) {
  const group = useRef(null);
  const screen = useRef(null);
  const lift = useRef(0);
  const [hovered, setHovered] = useState(false);
  const label = useLabelTexture({
    lines: zoomed ? [" "] : ["PRESS", "START"],
    width: 512,
    height: 416,
    background: SCREEN,
    color: INK,
    radius: 18,
    maxSize: 110,
  });

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30);
    const t = state.clock.elapsedTime;
    lift.current = damp(lift.current, hovered && !zoomed ? 0.07 : 0, 8, dt);
    group.current.position.y = GAMEBOY.position[1] + lift.current;
    group.current.rotation.z =
      hovered && !zoomed && animate ? Math.sin(t * 14) * 0.035 : 0;
    const pulse = animate ? 0.86 + Math.sin(t * 4) * 0.14 : 1;
    screen.current.material.color.setScalar(zoomed ? 1 : pulse);
  });

  return (
    <group
      ref={group}
      position={GAMEBOY.position}
      rotation={GAMEBOY.rotation}
      scale={GAMEBOY.scale}
      onClick={(event) => {
        event.stopPropagation();
        onPress?.();
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
      <Part
        geo={
          <RoundedBoxGeometry
            args={[1.05, 1.62, 0.28]}
            radius={0.12}
            smoothness={4}
          />
        }
        color={TOY.cream}
        line={0.035}
      />
      <Part
        position={[0, 0.37, 0.13]}
        geo={
          <RoundedBoxGeometry
            args={[0.86, 0.7, 0.05]}
            radius={0.06}
            smoothness={3}
          />
        }
        color="#3b3563"
        line={0}
      />
      <mesh ref={screen} position={GAMEBOY.screenCenter}>
        <planeGeometry args={[0.66, 0.535]} />
        <meshBasicMaterial map={label} toneMapped={false} />
      </mesh>
      <mesh position={[-0.33, 0.66, 0.158]}>
        <circleGeometry args={[0.025, 16]} />
        <meshBasicMaterial color={TOY.pink} toneMapped={false} />
      </mesh>
      <InkPart
        position={[-0.24, -0.22, 0.16]}
        geo={<boxGeometry args={[0.24, 0.075, 0.05]} />}
      />
      <InkPart
        position={[-0.24, -0.22, 0.16]}
        geo={<boxGeometry args={[0.075, 0.24, 0.05]} />}
      />
      {[
        [0.34, -0.14],
        [0.18, -0.24],
      ].map(([x, y]) => (
        <Part
          key={x}
          position={[x, y, 0.15]}
          rotation={[Math.PI / 2, 0, 0]}
          geo={<cylinderGeometry args={[0.075, 0.075, 0.05, 24]} />}
          color={TOY.pink}
          line={0.12}
        />
      ))}
      {[-0.1, 0.1].map((x) => (
        <InkPart
          key={x}
          position={[x, -0.5, 0.145]}
          rotation={[0, 0, 0.5]}
          geo={<capsuleGeometry args={[0.025, 0.08, 4, 8]} />}
        />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <InkPart
          key={i}
          position={[0.28 + i * 0.05, -0.62 + i * 0.02, 0.145]}
          rotation={[0, 0, 0.5]}
          geo={<boxGeometry args={[0.02, 0.16, 0.01]} />}
        />
      ))}
    </group>
  );
}
