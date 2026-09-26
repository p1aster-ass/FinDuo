import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  ContactShadows,
  Float,
  PresentationControls,
  RoundedBoxGeometry,
} from "@react-three/drei";
import * as THREE from "three";

// Toy colors match the CSS theme tokens (src/index.css).
const INK = "#1d1a2f";
const TOY = {
  orange: "#ff6d00",
  grape: "#8b6cff",
  mint: "#2ec4a0",
  sun: "#ffc53d",
  pink: "#ff6fa8",
  cream: "#fff3e3",
};

const GradientContext = createContext(null);
const damp = THREE.MathUtils.damp;

// A cartoon part: three flat light bands, plus an ink outline drawn as a
// slightly larger back-facing copy (the classic "inverted hull" technique).
// `line` is how much bigger the outline copy is (0 = no outline).
function Part({ geo, color, line = 0.08, flat = false, ...props }) {
  const gradient = useContext(GradientContext);
  return (
    <group {...props}>
      <mesh>
        {geo}
        <meshToonMaterial
          color={color}
          gradientMap={gradient}
          flatShading={flat}
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

function InkPart({ geo, ...props }) {
  return (
    <mesh {...props}>
      {geo}
      <meshBasicMaterial color={INK} />
    </mesh>
  );
}

// A round buddy that turns toward the cursor, blinks, squishes on hover, and
// hops (with squash and stretch) when clicked.
function Buddy({ color, position, pointer, animate, blinkOffset, children }) {
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
    root.current.rotation.y = damp(root.current.rotation.y, p.x * 0.55, 5, dt);
    root.current.rotation.x = damp(root.current.rotation.x, -p.y * 0.2, 5, dt);
    pupils.current.position.x = damp(
      pupils.current.position.x,
      p.x * 0.05,
      8,
      dt,
    );
    pupils.current.position.y = damp(
      pupils.current.position.y,
      p.y * 0.04,
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
    root.current.position.y = position[1] + m.y + idle;
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

  function hop(event) {
    event.stopPropagation();
    if (motion.current.y === 0) motion.current.vy = 8.5;
  }

  return (
    <group ref={root} position={position}>
      <group
        ref={body}
        onClick={hop}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "";
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

function Headset() {
  return (
    <group position={[0, 1.02, 0]}>
      <InkPart geo={<torusGeometry args={[0.6, 0.055, 12, 32, Math.PI]} />} />
      {[-0.6, 0.6].map((x) => (
        <Part
          key={x}
          position={[x, 0, 0]}
          rotation={[0, 0, Math.PI / 2]}
          geo={<cylinderGeometry args={[0.17, 0.17, 0.14, 24]} />}
          color={TOY.mint}
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

function Antenna() {
  return (
    <group position={[0.1, 1.55, 0]} rotation={[0, 0, -0.25]}>
      <InkPart
        position={[0, 0.16, 0]}
        geo={<cylinderGeometry args={[0.025, 0.025, 0.34, 8]} />}
      />
      <Part
        position={[0, 0.36, 0]}
        geo={<sphereGeometry args={[0.1, 16, 16]} />}
        color={TOY.sun}
        line={0.22}
      />
    </group>
  );
}

// Toys keep a gentle base spin and whirl faster when clicked.
function Spinner({ base = 0.35, children, ...props }) {
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
      onPointerOver={() => {
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
      }}
    >
      {children}
    </group>
  );
}

function Controller() {
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
        color={TOY.cream}
        line={0.06}
      />
      {[-1, 1].map((side) => (
        <Part
          key={side}
          position={[side * 0.46, -0.24, 0]}
          rotation={[0, 0, side * 0.45]}
          geo={<capsuleGeometry args={[0.16, 0.22, 6, 16]} />}
          color={TOY.cream}
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
      ].map(([x, y, color]) => (
        <Part
          key={color}
          position={[x, y, 0.17]}
          geo={<sphereGeometry args={[0.05, 12, 12]} />}
          color={color}
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

// Extruded shapes sit from z=0 to z=depth; center them so the outline hugs them.
function useCenteredExtrude(makeShape) {
  return useMemo(() => {
    const geometry = new THREE.ExtrudeGeometry(makeShape(), EXTRUDE);
    geometry.center();
    return geometry;
  }, [makeShape]);
}

function Star() {
  const geometry = useCenteredExtrude(starShape);
  return (
    <Part
      geo={<primitive object={geometry} attach="geometry" />}
      color={TOY.pink}
      line={0.1}
    />
  );
}

function Heart() {
  const geometry = useCenteredExtrude(heartShape);
  return (
    <Part
      geo={<primitive object={geometry} attach="geometry" />}
      color={TOY.pink}
      line={0.1}
    />
  );
}

function Die() {
  return (
    <Part
      geo={<icosahedronGeometry args={[0.36, 0]} />}
      color={TOY.sun}
      line={0.09}
      flat
    />
  );
}

function Coin() {
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

const LAYOUTS = {
  auth: {
    camera: [0, 0.3, 5.2],
    buddies: [
      [-0.72, -1.1, 0],
      [0.72, -1.1, 0],
    ],
    toys: {
      controller: [-1.65, 0.75, -0.5],
      die: [1.7, 0.55, -0.3],
      coin: [1.15, 1.45, -0.9],
      star: [-0.95, 1.55, -1],
      heart: [0, 1.05, -0.4],
    },
  },
  hub: {
    camera: [0, 0.25, 5.6],
    buddies: [
      [-0.68, -1.12, 0],
      [0.68, -1.12, 0],
    ],
    toys: {
      controller: [-1.8, 0.6, -0.7],
      die: [1.85, 0.45, -0.4],
      coin: [1.3, 1.35, -1],
      star: [-1.2, 1.45, -1.2],
      heart: [0, 1.05, -0.5],
    },
  },
};

function Scene({ layout, animate }) {
  const pointer = useRef({ x: 0, y: 0 });
  // Buddies watch the cursor anywhere on the page, not just over the canvas.
  useEffect(() => {
    function move(event) {
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -((event.clientY / window.innerHeight) * 2 - 1);
    }
    window.addEventListener("pointermove", move);
    return () => {
      window.removeEventListener("pointermove", move);
      document.body.style.cursor = "";
    };
  }, []);

  const float = {
    enabled: animate,
    speed: 1.6,
    floatIntensity: 1.1,
    rotationIntensity: 0.5,
  };
  const { toys } = layout;

  return (
    <>
      <ambientLight intensity={1.1} />
      <directionalLight position={[3, 5, 4]} intensity={2.4} />
      <directionalLight
        position={[-4, 2, -2]}
        intensity={0.6}
        color={TOY.grape}
      />
      <PresentationControls
        global={false}
        cursor
        snap
        speed={1.4}
        polar={[-0.25, 0.3]}
        azimuth={[-0.7, 0.7]}
      >
        <Buddy
          color={TOY.orange}
          position={layout.buddies[0]}
          pointer={pointer}
          animate={animate}
          blinkOffset={0}
        >
          <Headset />
        </Buddy>
        <Buddy
          color={TOY.grape}
          position={layout.buddies[1]}
          pointer={pointer}
          animate={animate}
          blinkOffset={1.7}
        >
          <Antenna />
        </Buddy>
        <Float {...float} position={toys.controller}>
          <Spinner base={0.2}>
            <Controller />
          </Spinner>
        </Float>
        <Float {...float} speed={2} position={toys.die}>
          <Spinner base={0.6}>
            <Die />
          </Spinner>
        </Float>
        <Float {...float} speed={1.3} position={toys.coin}>
          <Spinner base={1.2}>
            <Coin />
          </Spinner>
        </Float>
        <Float {...float} speed={1.8} position={toys.star}>
          <Spinner base={0.5}>
            <Star />
          </Spinner>
        </Float>
        <Float
          {...float}
          speed={2.4}
          floatIntensity={0.6}
          position={toys.heart}
        >
          <Spinner base={0.8}>
            <group scale={0.7}>
              <Heart />
            </group>
          </Spinner>
        </Float>
      </PresentationControls>
      <ContactShadows
        position={[0, -1.12, 0]}
        scale={7}
        blur={2.6}
        far={2.4}
        opacity={0.35}
        color={INK}
        frames={animate ? Infinity : 1}
      />
    </>
  );
}

// `active` pauses rendering while the stage is off screen; `animate` is false
// for people who prefer reduced motion (the scene then renders still).
export default function DuoScene({
  variant = "auth",
  active = true,
  animate = true,
  fallback = null,
}) {
  const layout = LAYOUTS[variant] ?? LAYOUTS.auth;
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

  let frameloop = "never";
  if (active) frameloop = animate ? "always" : "demand";

  return (
    <Canvas
      className="duo-canvas"
      dpr={[1, 1.75]}
      frameloop={frameloop}
      camera={{ position: layout.camera, fov: 36 }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      fallback={fallback}
    >
      <GradientContext.Provider value={gradient}>
        <Scene layout={layout} animate={animate} />
      </GradientContext.Provider>
    </Canvas>
  );
}
