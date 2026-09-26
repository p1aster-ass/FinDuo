import { useMemo } from "react";
import { Float, RoundedBoxGeometry, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import Gameboy from "./Gameboy.jsx";
import {
  Antenna,
  Buddy,
  Controller,
  Crate,
  Glow,
  Headset,
  Part,
  Spinner,
  Star,
} from "./toys.jsx";
import { TOY } from "./palette.js";
import { useLabelTexture } from "./useLabelTexture.js";

const WALL_TOP = 1.6;
const RIDGE = 4.3;
const HALF_WIDTH = 4.2;
const BACK = -4.6;
const FRONT = 3;

const THEMES = {
  light: {
    floor: "#d99a64",
    plankLine: "#b8763f",
    wall: "#f7dfc4",
    roof: "#eac39c",
    beam: "#b8763f",
    windowGlass: "#9fd8ff",
    windowLight: "#fff1c9",
    ambient: 1.15,
    sun: 1.6,
    lamp: 0.9,
  },
  dark: {
    floor: "#6b4535",
    plankLine: "#4a2e24",
    wall: "#3a3160",
    roof: "#2e2750",
    beam: "#5a3b2e",
    windowGlass: "#1d2a5c",
    windowLight: "#bcd4ff",
    ambient: 0.55,
    sun: 0.7,
    lamp: 2.2,
  },
};

function makePlanks(base, line) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = line;
  ctx.lineWidth = 6;
  for (let x = 0; x <= 512; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
    const seam = ((x / 64) % 3) * 150 + 60;
    ctx.beginPath();
    ctx.moveTo(x, seam);
    ctx.lineTo(x + 64, seam);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  return texture;
}

function backWallShape() {
  const shape = new THREE.Shape();
  shape.moveTo(-HALF_WIDTH, 0);
  shape.lineTo(HALF_WIDTH, 0);
  shape.lineTo(HALF_WIDTH, WALL_TOP);
  shape.lineTo(0, RIDGE);
  shape.lineTo(-HALF_WIDTH, WALL_TOP);
  shape.closePath();
  const hole = new THREE.Path();
  hole.absarc(0, 2.45, 0.72, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  return shape;
}

const ROOF_SPAN = Math.hypot(HALF_WIDTH, RIDGE - WALL_TOP);
const ROOF_TILT = Math.atan2(RIDGE - WALL_TOP, HALF_WIDTH);
const DEPTH = FRONT - BACK;

function Roof({ side, color, beam }) {
  const x = (side * HALF_WIDTH) / 2;
  const y = (WALL_TOP + RIDGE) / 2;
  return (
    <group
      position={[x, y, (FRONT + BACK) / 2]}
      rotation={[0, 0, -side * ROOF_TILT]}
    >
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOF_SPAN, DEPTH]} />
        <meshToonMaterial color={color} side={THREE.DoubleSide} />
      </mesh>
      {[-3.6, -1.8, 0, 1.8].map((z) => (
        <Part
          key={z}
          position={[0, -0.09, z]}
          geo={<boxGeometry args={[ROOF_SPAN, 0.16, 0.18]} />}
          color={beam}
          line={0.03}
        />
      ))}
    </group>
  );
}

function RoundWindow({ theme, isDark }) {
  return (
    <group position={[0, 2.45, BACK + 0.02]}>
      <mesh position={[0, 0, -0.05]}>
        <circleGeometry args={[0.74, 40]} />
        <meshBasicMaterial color={theme.windowGlass} toneMapped={false} />
      </mesh>
      <Glow
        position={isDark ? [0.25, 0.22, -0.04] : [-0.2, 0.2, -0.04]}
        geo={<circleGeometry args={[isDark ? 0.17 : 0.22, 32]} />}
        color={isDark ? "#fff3e3" : TOY.sun}
      />
      <Part
        geo={<torusGeometry args={[0.74, 0.08, 12, 48]} />}
        color={theme.beam}
        line={0.04}
      />
      <Part
        geo={<boxGeometry args={[0.07, 1.45, 0.06]} />}
        color={theme.beam}
        line={0}
      />
      <Part
        geo={<boxGeometry args={[1.45, 0.07, 0.06]} />}
        color={theme.beam}
        line={0}
      />
    </group>
  );
}

// A sagging string of colored bulbs across the room.
function StringLights() {
  const bulbs = useMemo(() => {
    const colors = [TOY.sun, TOY.pink, TOY.mint, TOY.orange, TOY.grape];
    return Array.from({ length: 17 }, (_, i) => {
      const t = i / 16;
      const x = -3.3 + t * 6.6;
      const sag = Math.sin(t * Math.PI) * 0.55;
      return {
        position: [x, 3.05 - sag, -1.2],
        color: colors[i % colors.length],
      };
    });
  }, []);
  return (
    <group>
      {bulbs.map((bulb) => (
        <Glow
          key={bulb.position[0]}
          position={bulb.position}
          geo={<sphereGeometry args={[0.06, 12, 12]} />}
          color={bulb.color}
        />
      ))}
    </group>
  );
}

function Poster({ lines, background, color, ...props }) {
  const texture = useLabelTexture({
    lines,
    width: 384,
    height: 512,
    background,
    color,
    border: "#1d1a2f",
    radius: 28,
  });
  return (
    <mesh {...props}>
      <planeGeometry args={[0.75, 1]} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} />
    </mesh>
  );
}

function Table({ color }) {
  return (
    <group position={[0, 0, 0.55]}>
      <Part
        position={[0, 0.45, 0]}
        geo={
          <RoundedBoxGeometry
            args={[1.7, 0.12, 1]}
            radius={0.04}
            smoothness={2}
          />
        }
        color={color}
        line={0.03}
      />
      {[
        [-0.7, -0.38],
        [0.7, -0.38],
        [-0.7, 0.38],
        [0.7, 0.38],
      ].map(([x, z]) => (
        <Part
          key={`${x}${z}`}
          position={[x, 0.2, z]}
          geo={<cylinderGeometry args={[0.05, 0.05, 0.4, 10]} />}
          color={color}
          line={0.1}
        />
      ))}
    </group>
  );
}

export default function Attic({
  theme: themeName,
  animate,
  zoomed,
  onPressGameboy,
}) {
  const isDark = themeName === "dark";
  const theme = THEMES[isDark ? "dark" : "light"];
  const planks = useMemo(
    () => makePlanks(theme.floor, theme.plankLine),
    [theme.floor, theme.plankLine],
  );
  const wall = useMemo(() => backWallShape(), []);

  return (
    <group>
      <ambientLight intensity={theme.ambient} />
      <directionalLight
        position={[0, 3, BACK - 2]}
        intensity={theme.sun}
        color={theme.windowLight}
      />
      <directionalLight position={[2, 5, 5]} intensity={isDark ? 0.5 : 1.2} />
      <pointLight
        position={[0, 2.6, -0.6]}
        intensity={theme.lamp}
        distance={9}
        color="#ffcf8a"
      />

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, (FRONT + BACK) / 2]}
      >
        <planeGeometry args={[HALF_WIDTH * 2, DEPTH]} />
        <meshToonMaterial map={planks} />
      </mesh>
      <mesh position={[0, 0, BACK]}>
        <shapeGeometry args={[wall]} />
        <meshToonMaterial color={theme.wall} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * HALF_WIDTH, WALL_TOP / 2, (FRONT + BACK) / 2]}
          rotation={[0, -side * (Math.PI / 2), 0]}
        >
          <planeGeometry args={[DEPTH, WALL_TOP]} />
          <meshToonMaterial color={theme.wall} />
        </mesh>
      ))}
      <Roof side={-1} color={theme.roof} beam={theme.beam} />
      <Roof side={1} color={theme.roof} beam={theme.beam} />
      <Part
        position={[0, RIDGE - 0.08, (FRONT + BACK) / 2]}
        geo={<boxGeometry args={[0.2, 0.2, DEPTH]} />}
        color={theme.beam}
        line={0.02}
      />
      <RoundWindow theme={theme} isDark={isDark} />
      <StringLights />

      <Poster
        lines={["GG"]}
        background={TOY.pink}
        color="#1d1a2f"
        position={[-2.4, 1.05, BACK + 0.03]}
        rotation={[0, 0, 0.06]}
      />
      <Poster
        lines={["1UP"]}
        background={TOY.mint}
        color="#1d1a2f"
        position={[2.45, 1.1, BACK + 0.03]}
        rotation={[0, 0, -0.05]}
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0.5]}>
        <circleGeometry args={[1.9, 48]} />
        <meshToonMaterial color={TOY.orange} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.016, 0.5]}>
        <ringGeometry args={[1.35, 1.55, 48]} />
        <meshBasicMaterial color={TOY.sun} />
      </mesh>

      <Table color={theme.beam} />
      <Gameboy onPress={onPressGameboy} animate={animate} zoomed={zoomed} />

      <Crate position={[-3.2, 0.3, -3.3]} rotation={[0, 0.2, 0]} />
      <Crate
        position={[-3.3, 0.3, -2.4]}
        size={[0.7, 0.6, 0.7]}
        rotation={[0, -0.3, 0]}
      />
      <Crate
        position={[-3.2, 0.85, -3.2]}
        size={[0.6, 0.5, 0.5]}
        rotation={[0, 0.5, 0]}
        color="#e3b07c"
      />
      <Part
        position={[3, 0.32, -1.2]}
        scale={[1.1, 0.6, 1]}
        geo={<sphereGeometry args={[0.75, 24, 16]} />}
        color={TOY.grape}
        line={0.05}
      />
      <Buddy
        color={TOY.orange}
        position={[2.75, 0.25, -0.95]}
        facing={-0.7}
        scale={0.6}
        animate={animate}
        lookStrength={0.6}
      >
        <Headset />
      </Buddy>
      <Buddy
        color={TOY.grape}
        position={[-2.35, 0, -1.7]}
        facing={0.6}
        scale={0.62}
        animate={animate}
        blinkOffset={1.7}
        lookStrength={0.6}
      >
        <Antenna />
      </Buddy>
      <group
        position={[-1.35, 0.1, 1.7]}
        rotation={[-Math.PI / 2, 0, 0.5]}
        scale={0.6}
      >
        <Controller />
      </group>
      <Float
        enabled={animate}
        speed={1.5}
        floatIntensity={0.8}
        position={[1.7, 2.3, -2.6]}
      >
        <Spinner base={0.5}>
          <group scale={0.8}>
            <Star />
          </group>
        </Spinner>
      </Float>
      {animate && (
        <Sparkles
          count={40}
          scale={[6, 3, 6]}
          position={[0, 2, -1]}
          size={2.2}
          speed={0.25}
          opacity={0.6}
          color={theme.windowLight}
        />
      )}
    </group>
  );
}
