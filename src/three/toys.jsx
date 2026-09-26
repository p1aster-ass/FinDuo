import { useContext, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBoxGeometry } from "@react-three/drei";
import * as THREE from "three";
import {
  damp,
  GradientContext,
  INK,
  PointerContext,
  setCursor,
  TOY,
} from "./palette.js";

// Shared 3D toolkit: cartoon materials, the buddy character, and toy props.
export function ToonProvider({ children }) {
  const gradient = useMemo(() => {
    const texture = new THREE.DataTexture(
      new Uint8Array([120, 190, 255]),
      3,
      1,
      THREE.RedFormat,
    );
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.needsUpdate = true;
    return texture;
  }, []);
  return (
    <GradientContext.Provider value={gradient}>
      {children}
    </GradientContext.Provider>
  );
}

// A cartoon part: three flat light bands, plus an ink outline drawn as a
// slightly larger back-facing copy (the "inverted hull" technique).
// `line` is how much bigger the outline copy is (0 = no outline).
export function Part({
  geo,
  color,
  line = 0.08,
  flat = false,
  emissive,
  ...props
}) {
  const gradient = useContext(GradientContext);
  return (
    <group {...props}>
      <mesh>
        {geo}
        <meshToonMaterial
          color={color}
          gradientMap={gradient}
          flatShading={flat}
          emissive={emissive ?? "#000000"}
        />
      </mesh>
      {line > 0 && (
        <mesh scale={1 + line}>
          {geo}
          <meshBasicMaterial color={INK} side={THREE.BackSide} />
        </mesh>
      )}
    </group>
  );
}

export function InkPart({ geo, ...props }) {
  return (
    <mesh {...props}>
      {geo}
      <meshBasicMaterial color={INK} />
    </mesh>
  );
}

// Glowing bits (string lights, screens) ignore lighting.
export function Glow({ geo, color, ...props }) {
  return (
    <mesh {...props}>
      {geo}
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}

// A round buddy that turns toward the cursor, blinks, squishes on hover, and
// hops (with squash and stretch) when clicked. `onSelect` makes the click
// also select it; `selected` draws a ring on the floor.
export function Buddy({
  color,
  position = [0, 0, 0],
  facing = 0,
  scale = 1,
  animate = true,
  blinkOffset = 0,
  lookStrength = 1,
  onSelect,
  selected = false,
  children,
}) {
  const pointer = useContext(PointerContext);
  const root = useRef(null);
  const body = useRef(null);
  const pupils = useRef(null);
  const eyes = useRef(null);
  const motion = useRef({ y: 0, vy: 0, squish: 0 });
  const [hovered, setHovered] = useState(false);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30);
    const m = motion.current;
    const p = pointer.current;
    root.current.rotation.y = damp(
      root.current.rotation.y,
      facing + p.x * 0.55 * lookStrength,
      5,
      dt,
    );
    root.current.rotation.x = damp(
      root.current.rotation.x,
      -p.y * 0.2 * lookStrength,
      5,
      dt,
    );
    pupils.current.position.x = damp(
      pupils.current.position.x,
      p.x * 0.05 * lookStrength,
      8,
      dt,
    );
    pupils.current.position.y = damp(
      pupils.current.position.y,
      p.y * 0.04 * lookStrength,
      8,
      dt,
    );
    if (m.vy !== 0 || m.y > 0) {
      m.vy -= 28 * dt;
      m.y += m.vy * dt;
      if (m.y <= 0) {
        m.y = 0;
        m.vy = 0;
        m.squish = 1;
      }
    }
    m.squish = damp(m.squish, 0, 9, dt);
    const idle = animate
      ? Math.sin(state.clock.elapsedTime * 2.2 + blinkOffset) * 0.035
      : 0;
    root.current.position.y = position[1] + (m.y + idle) * scale;
    const stretch =
      1 +
      THREE.MathUtils.clamp(m.vy * 0.025, -0.12, 0.18) -
      m.squish * 0.2 +
      (hovered ? 0.05 : 0);
    const wide = 1 / Math.sqrt(stretch);
    body.current.scale.set(wide, stretch, wide);
    const cycle = (state.clock.elapsedTime + blinkOffset) % 3.8;
    eyes.current.scale.y = animate && cycle < 0.12 ? 0.12 : 1;
  });

  function click(event) {
    event.stopPropagation();
    if (animate && motion.current.y === 0) motion.current.vy = 8.5;
    onSelect?.();
  }

  return (
    <group ref={root} position={position} scale={scale}>
      {selected && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.72, 0.86, 40]} />
          <meshBasicMaterial color={TOY.orange} toneMapped={false} />
        </mesh>
      )}
      <group
        ref={body}
        onClick={click}
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
          position={[0, 0.78, 0]}
          geo={<capsuleGeometry args={[0.55, 0.45, 8, 24]} />}
          color={color}
          line={0.07}
        />
        <group ref={eyes} position={[0, 0.98, 0.47]}>
          {[-0.2, 0.2].map((x) => (
            <Part
              key={x}
              position={[x, 0, 0]}
              geo={<sphereGeometry args={[0.14, 24, 24]} />}
              color="#ffffff"
              line={0.18}
            />
          ))}
          <group ref={pupils} position={[0, 0, 0.1]}>
            {[-0.2, 0.2].map((x) => (
              <InkPart
                key={x}
                position={[x, 0, 0]}
                geo={<sphereGeometry args={[0.07, 16, 16]} />}
              />
            ))}
          </group>
        </group>
        {[-0.34, 0.34].map((x) => (
          <mesh key={x} position={[x, 0.76, 0.44]} scale={[1, 0.6, 0.4]}>
            <sphereGeometry args={[0.09, 16, 16]} />
            <meshBasicMaterial color={TOY.pink} />
          </mesh>
        ))}
        <InkPart
          position={[0, 0.78, 0.55]}
          rotation={[0, 0, Math.PI]}
          geo={<torusGeometry args={[0.08, 0.022, 8, 20, Math.PI]} />}
        />
        {[-0.24, 0.24].map((x) => (
          <Part
            key={x}
            position={[x, 0.04, 0.12]}
            scale={[1, 0.55, 1.2]}
            geo={<sphereGeometry args={[0.17, 16, 16]} />}
            color={color}
            line={0.15}
          />
        ))}
        {children}
      </group>
    </group>
  );
}

export function Headset({ color = TOY.mint }) {
  return (
    <group position={[0, 1.02, 0]}>
      <InkPart geo={<torusGeometry args={[0.6, 0.055, 12, 32, Math.PI]} />} />
      {[-0.6, 0.6].map((x) => (
        <Part
          key={x}
          position={[x, 0, 0]}
          rotation={[0, 0, Math.PI / 2]}
          geo={<cylinderGeometry args={[0.17, 0.17, 0.14, 24]} />}
          color={color}
          line={0.14}
        />
      ))}
      <InkPart
        position={[-0.45, -0.3, 0.3]}
        rotation={[0.9, 0, -0.6]}
        geo={<cylinderGeometry args={[0.025, 0.025, 0.42, 8]} />}
      />
      <InkPart
        position={[-0.28, -0.42, 0.45]}
        geo={<sphereGeometry args={[0.06, 12, 12]} />}
      />
    </group>
  );
}

export function Antenna({ color = TOY.sun }) {
  return (
    <group position={[0.1, 1.55, 0]} rotation={[0, 0, -0.25]}>
      <InkPart
        position={[0, 0.16, 0]}
        geo={<cylinderGeometry args={[0.025, 0.025, 0.34, 8]} />}
      />
      <Part
        position={[0, 0.36, 0]}
        geo={<sphereGeometry args={[0.1, 16, 16]} />}
        color={color}
        line={0.22}
      />
    </group>
  );
}

export function Cap({ color = TOY.orange }) {
  return (
    <group position={[0, 1.36, 0.05]} rotation={[-0.15, 0, 0]}>
      <Part
        geo={
          <sphereGeometry
            args={[0.5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]}
          />
        }
        color={color}
        line={0.06}
      />
      <Part
        position={[0, 0.02, 0.45]}
        scale={[1, 0.12, 0.8]}
        geo={<cylinderGeometry args={[0.36, 0.36, 0.3, 24]} />}
        color={color}
        line={0.1}
      />
    </group>
  );
}

// Toys keep a gentle base spin and whirl faster when clicked.
export function Spinner({ base = 0.35, children, ...props }) {
  const ref = useRef(null);
  const boost = useRef(0);
  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 30);
    boost.current = damp(boost.current, 0, 1.6, dt);
    ref.current.rotation.y += (base + boost.current) * dt;
  });
  return (
    <group
      ref={ref}
      {...props}
      onClick={(event) => {
        event.stopPropagation();
        boost.current += 14;
      }}
      onPointerOver={() => setCursor("pointer")}
      onPointerOut={() => setCursor("")}
    >
      {children}
    </group>
  );
}

export function Controller({ color = TOY.cream }) {
  return (
    <group rotation={[0.25, 0, -0.2]}>
      <Part
        geo={
          <RoundedBoxGeometry
            args={[1.2, 0.5, 0.32]}
            radius={0.15}
            smoothness={4}
          />
        }
        color={color}
        line={0.06}
      />
      {[-1, 1].map((side) => (
        <Part
          key={side}
          position={[side * 0.46, -0.24, 0]}
          rotation={[0, 0, side * 0.45]}
          geo={<capsuleGeometry args={[0.16, 0.22, 6, 16]} />}
          color={color}
          line={0.1}
        />
      ))}
      <InkPart
        position={[-0.3, 0.02, 0.17]}
        geo={<boxGeometry args={[0.22, 0.07, 0.04]} />}
      />
      <InkPart
        position={[-0.3, 0.02, 0.17]}
        geo={<boxGeometry args={[0.07, 0.22, 0.04]} />}
      />
      {[
        [0.3, 0.1, TOY.mint],
        [0.4, 0, TOY.pink],
        [0.2, 0, TOY.sun],
        [0.3, -0.1, TOY.grape],
      ].map(([x, y, dot]) => (
        <Part
          key={dot}
          position={[x, y, 0.17]}
          geo={<sphereGeometry args={[0.05, 12, 12]} />}
          color={dot}
          line={0.25}
        />
      ))}
    </group>
  );
}

function starShape(points = 5, outer = 0.34, inner = 0.15) {
  const shape = new THREE.Shape();
  for (let i = 0; i < points * 2; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (i / (points * 2)) * Math.PI * 2 + Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

function heartShape() {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.28);
  shape.bezierCurveTo(-0.05, -0.2, -0.36, -0.02, -0.33, 0.14);
  shape.bezierCurveTo(-0.3, 0.3, -0.08, 0.34, 0, 0.18);
  shape.bezierCurveTo(0.08, 0.34, 0.3, 0.3, 0.33, 0.14);
  shape.bezierCurveTo(0.36, -0.02, 0.05, -0.2, 0, -0.28);
  return shape;
}

const EXTRUDE = {
  depth: 0.1,
  bevelEnabled: true,
  bevelThickness: 0.04,
  bevelSize: 0.03,
  bevelSegments: 3,
};

// Extruded shapes sit from z=0 to z=depth; center them so outlines hug them.
function useCenteredExtrude(makeShape) {
  return useMemo(() => {
    const geometry = new THREE.ExtrudeGeometry(makeShape(), EXTRUDE);
    geometry.center();
    return geometry;
  }, [makeShape]);
}

export function Star({ color = TOY.pink }) {
  const geometry = useCenteredExtrude(starShape);
  return (
    <Part
      geo={<primitive object={geometry} attach="geometry" />}
      color={color}
      line={0.1}
    />
  );
}

export function Heart({ color = TOY.pink }) {
  const geometry = useCenteredExtrude(heartShape);
  return (
    <Part
      geo={<primitive object={geometry} attach="geometry" />}
      color={color}
      line={0.1}
    />
  );
}

export function Die({ color = TOY.sun }) {
  return (
    <Part
      geo={<icosahedronGeometry args={[0.36, 0]} />}
      color={color}
      line={0.09}
      flat
    />
  );
}

export function Coin() {
  const star = useCenteredExtrude(starShape);
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      <Part
        geo={<cylinderGeometry args={[0.32, 0.32, 0.09, 32]} />}
        color={TOY.sun}
        line={0.09}
      />
      <group
        position={[0, 0.06, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={0.5}
      >
        <Part
          geo={<primitive object={star} attach="geometry" />}
          color={TOY.orange}
          line={0}
        />
      </group>
    </group>
  );
}

// A simple rounded crate/box prop.
export function Crate({ size = [0.8, 0.6, 0.6], color = "#d9a066", ...props }) {
  return (
    <group {...props}>
      <Part
        geo={<RoundedBoxGeometry args={size} radius={0.05} smoothness={2} />}
        color={color}
        line={0.03}
      />
      <mesh
        position={[0, size[1] / 2 + 0.001, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[size[0] * 0.25, size[2] * 1.001]} />
        <meshBasicMaterial color="#b98555" />
      </mesh>
    </group>
  );
}
