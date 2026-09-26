import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { PresentationControls, Sparkles } from "@react-three/drei";
import Avatar from "./Avatar.jsx";
import { Part } from "./toys.jsx";
import { TOY } from "./palette.js";

// The avatar studio: your avatar on a turntable. Drag to spin it; it turns
// slowly on its own.
export default function Studio({ theme, avatar, motion, animate }) {
  const turntable = useRef(null);
  const dark = theme === "dark";

  useFrame((_, delta) => {
    if (animate) turntable.current.rotation.y += Math.min(delta, 1 / 30) * 0.35;
  });

  return (
    <group>
      <ambientLight intensity={dark ? 0.9 : 1.25} />
      <directionalLight position={[2, 5, 4]} intensity={1.8} />
      <directionalLight
        position={[-3, 2, -2]}
        intensity={0.7}
        color={TOY.grape}
      />
      <PresentationControls
        global
        cursor
        speed={1.6}
        polar={[-0.15, 0.2]}
        azimuth={[-Infinity, Infinity]}
      >
        <group ref={turntable}>
          <Part
            position={[0, -0.12, 0]}
            geo={<cylinderGeometry args={[1.25, 1.35, 0.24, 48]} />}
            color={avatar?.accent ?? TOY.grape}
            line={0.03}
          />
          <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.95, 1.1, 48]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <Avatar avatar={avatar} motion={motion} animate={animate} />
        </group>
      </PresentationControls>
      {animate && (
        <Sparkles
          count={30}
          scale={[4, 3, 3]}
          position={[0, 1.4, -0.5]}
          size={3}
          speed={0.3}
          color={TOY.sun}
        />
      )}
    </group>
  );
}
