import { useContext, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Heart, InkPart, Part } from "./toys.jsx";
import { damp, GradientContext, INK, setCursor, TOY } from "./palette.js";
import { DEFAULT_AVATAR } from "../data/avatar.js";

// Pattern textures are shared between avatars with the same look.
const patternCache = new Map();

function patternTexture(pattern, color) {
  const key = `${pattern}${color}`;
  if (patternCache.has(key)) return patternCache.get(key);
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 256, 256);
  const mark = new THREE.Color(color).offsetHSL(0, 0, -0.14).getStyle();
  ctx.fillStyle = mark;
  if (pattern === "spots") {
    for (let i = 0; i < 14; i += 1) {
      const x = (i * 71) % 256;
      const y = (i * 113) % 256;
      ctx.beginPath();
      ctx.arc(x, y, 14 + (i % 3) * 5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (pattern === "stripes") {
    for (let y = 0; y < 256; y += 48) ctx.fillRect(0, y, 256, 20);
  } else if (pattern === "stars") {
    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    ctx.font = "34px sans-serif";
    for (let i = 0; i < 12; i += 1) {
      ctx.fillText("★", (i * 83) % 240, 30 + ((i * 57) % 226));
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 1);
  patternCache.set(key, texture);
  return texture;
}

function Body({ color, pattern }) {
  const gradient = useContext(GradientContext);
  const map = pattern === "none" ? null : patternTexture(pattern, color);
  return (
    <group position={[0, 0.78, 0]}>
      <mesh>
        <capsuleGeometry args={[0.55, 0.45, 8, 24]} />
        <meshToonMaterial
          color={map ? "#ffffff" : color}
          map={map}
          gradientMap={gradient}
        />
      </mesh>
      <mesh scale={1.07}>
        <capsuleGeometry args={[0.55, 0.45, 8, 24]} />
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

function Eyes({ style, body, eyesRef }) {
  if (style === "happy") {
    return (
      <group ref={eyesRef} position={[0, 0.98, 0.5]}>
        {[-0.2, 0.2].map((x) => (
          <InkPart
            key={x}
            position={[x, -0.03, 0.02]}
            geo={<torusGeometry args={[0.1, 0.028, 8, 20, Math.PI]} />}
          />
        ))}
      </group>
    );
  }
  return (
    <group ref={eyesRef} position={[0, 0.98, 0.47]}>
      {[-0.2, 0.2].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <Part
            geo={<sphereGeometry args={[0.14, 24, 24]} />}
            color="#ffffff"
            line={0.18}
          />
          <InkPart
            position={[0, style === "sleepy" ? -0.04 : 0, 0.1]}
            geo={
              <sphereGeometry
                args={[style === "sparkle" ? 0.085 : 0.07, 16, 16]}
              />
            }
          />
          {style === "sparkle" && (
            <mesh position={[0.03, 0.035, 0.18]}>
              <sphereGeometry args={[0.026, 10, 10]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          )}
          {style === "sleepy" && (
            <mesh position={[0, 0.005, 0.005]} rotation={[-0.35, 0, 0]}>
              <sphereGeometry
                args={[0.15, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]}
              />
              <meshToonMaterial color={body} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

function Face({ style }) {
  if (style === "glasses") {
    return (
      <group position={[0, 0.98, 0.6]}>
        {[-0.2, 0.2].map((x) => (
          <InkPart
            key={x}
            position={[x, 0, 0]}
            geo={<torusGeometry args={[0.16, 0.025, 8, 24]} />}
          />
        ))}
        <InkPart geo={<boxGeometry args={[0.1, 0.03, 0.03]} />} />
      </group>
    );
  }
  if (style === "shades") {
    return (
      <group position={[0, 0.99, 0.6]}>
        {[-0.2, 0.2].map((x) => (
          <mesh key={x} position={[x, 0, 0]}>
            <boxGeometry args={[0.3, 0.17, 0.05]} />
            <meshBasicMaterial color="#14111f" />
          </mesh>
        ))}
        <InkPart geo={<boxGeometry args={[0.12, 0.035, 0.04]} />} />
        <mesh position={[-0.26, 0.04, 0.03]}>
          <boxGeometry args={[0.06, 0.03, 0.01]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      </group>
    );
  }
  if (style === "mustache") {
    return (
      <group position={[0, 0.84, 0.57]}>
        {[-1, 1].map((side) => (
          <InkPart
            key={side}
            position={[side * 0.08, 0, 0]}
            rotation={[0, 0, side * 1.2]}
            geo={<capsuleGeometry args={[0.035, 0.12, 4, 8]} />}
          />
        ))}
      </group>
    );
  }
  return null;
}

function Head({ style, accent, body }) {
  if (style === "headset") {
    return (
      <group position={[0, 1.02, 0]}>
        <InkPart geo={<torusGeometry args={[0.6, 0.055, 12, 32, Math.PI]} />} />
        {[-0.6, 0.6].map((x) => (
          <Part
            key={x}
            position={[x, 0, 0]}
            rotation={[0, 0, Math.PI / 2]}
            geo={<cylinderGeometry args={[0.17, 0.17, 0.14, 24]} />}
            color={accent}
            line={0.14}
          />
        ))}
        <InkPart
          position={[-0.45, -0.3, 0.3]}
          rotation={[0.9, 0, -0.6]}
          geo={<cylinderGeometry args={[0.025, 0.025, 0.42, 8]} />}
        />
      </group>
    );
  }
  if (style === "cap") {
    return (
      <group position={[0, 1.36, 0.05]} rotation={[-0.15, 0, 0]}>
        <Part
          geo={
            <sphereGeometry
              args={[0.5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]}
            />
          }
          color={accent}
          line={0.06}
        />
        <Part
          position={[0, 0.02, 0.45]}
          scale={[1, 0.12, 0.8]}
          geo={<cylinderGeometry args={[0.36, 0.36, 0.3, 24]} />}
          color={accent}
          line={0.1}
        />
      </group>
    );
  }
  if (style === "antenna") {
    return (
      <group position={[0.1, 1.55, 0]} rotation={[0, 0, -0.25]}>
        <InkPart
          position={[0, 0.16, 0]}
          geo={<cylinderGeometry args={[0.025, 0.025, 0.34, 8]} />}
        />
        <Part
          position={[0, 0.36, 0]}
          geo={<sphereGeometry args={[0.1, 16, 16]} />}
          color={accent}
          line={0.22}
        />
      </group>
    );
  }
  if (style === "crown") {
    return (
      <group position={[0, 1.5, 0]}>
        <Part
          geo={<cylinderGeometry args={[0.36, 0.36, 0.16, 24, 1, true]} />}
          color={TOY.sun}
          line={0.06}
        />
        {[0, 1, 2, 3, 4].map((i) => {
          const angle = (i / 5) * Math.PI * 2;
          return (
            <Part
              key={i}
              position={[Math.sin(angle) * 0.34, 0.16, Math.cos(angle) * 0.34]}
              geo={<coneGeometry args={[0.07, 0.18, 8]} />}
              color={TOY.sun}
              line={0.12}
            />
          );
        })}
        <Part
          position={[0, 0, 0.37]}
          geo={<sphereGeometry args={[0.05, 12, 12]} />}
          color={accent}
          line={0.2}
        />
      </group>
    );
  }
  if (style === "beanie") {
    return (
      <group position={[0, 1.22, 0]}>
        <Part
          geo={
            <sphereGeometry
              args={[0.58, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]}
            />
          }
          color={accent}
          line={0.05}
        />
        <Part
          rotation={[Math.PI / 2, 0, 0]}
          geo={<torusGeometry args={[0.56, 0.07, 10, 32]} />}
          color={accent}
          line={0.08}
        />
        <Part
          position={[0, 0.6, 0]}
          geo={<sphereGeometry args={[0.12, 16, 16]} />}
          color="#ffffff"
          line={0.15}
        />
      </group>
    );
  }
  if (style === "bunny") {
    return (
      <group position={[0, 1.55, 0]}>
        {[-1, 1].map((side) => (
          <group
            key={side}
            position={[side * 0.2, 0.25, 0]}
            rotation={[0, 0, -side * 0.18]}
          >
            <Part
              geo={<capsuleGeometry args={[0.1, 0.42, 6, 12]} />}
              color={body}
              line={0.12}
            />
            <mesh position={[0, 0, 0.07]} scale={[0.55, 0.8, 0.4]}>
              <capsuleGeometry args={[0.1, 0.42, 6, 12]} />
              <meshBasicMaterial color={accent} />
            </mesh>
          </group>
        ))}
      </group>
    );
  }
  return null;
}

function Outfit({ style, accent, capeRef }) {
  if (style === "scarf") {
    return (
      <group position={[0, 0.5, 0]}>
        <Part
          rotation={[Math.PI / 2, 0, 0]}
          geo={<torusGeometry args={[0.52, 0.09, 10, 32]} />}
          color={accent}
          line={0.06}
        />
        <Part
          position={[0.28, -0.22, 0.42]}
          rotation={[0.2, 0, 0.15]}
          geo={<boxGeometry args={[0.16, 0.36, 0.08]} />}
          color={accent}
          line={0.08}
        />
      </group>
    );
  }
  if (style === "jersey") {
    return (
      <group position={[0, 0.36, 0]}>
        <Part
          geo={<cylinderGeometry args={[0.575, 0.6, 0.46, 32, 1, true]} />}
          color={accent}
          line={0.03}
        />
        <mesh position={[0, 0.08, 0]} rotation={[0, 0, 0]}>
          <cylinderGeometry args={[0.582, 0.59, 0.07, 32, 1, true]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      </group>
    );
  }
  if (style === "cape") {
    return (
      <group ref={capeRef} position={[0, 1.15, 0]}>
        <mesh position={[0, -0.45, 0]} rotation={[0, Math.PI, 0]}>
          <cylinderGeometry
            args={[
              0.6,
              0.72,
              0.9,
              24,
              1,
              true,
              -Math.PI * 0.42,
              Math.PI * 0.84,
            ]}
          />
          <meshToonMaterial color={accent} side={THREE.DoubleSide} />
        </mesh>
      </group>
    );
  }
  return null;
}

const EMOTE_SECONDS = { jump: 0.8, spin: 0.7, dance: 1.6, heart: 1.5 };

// A player's customizable avatar. `motion` (a ref) is read every frame:
// { moving, emote, emoteAt } — set by the local controller or by the
// interpolator for other players.
export default function Avatar({
  avatar = DEFAULT_AVATAR,
  motion,
  animate = true,
  blinkOffset = 0,
  onSelect,
  selected = false,
}) {
  const look = avatar ?? DEFAULT_AVATAR;
  const body = useRef(null);
  const tilt = useRef(null);
  const eyes = useRef(null);
  const feet = useRef([]);
  const cape = useRef(null);
  const heart = useRef(null);
  const state = useRef({
    y: 0,
    vy: 0,
    squish: 0,
    emote: null,
    started: 0,
    seenAt: 0,
  });
  const [hovered, setHovered] = useState(false);
  const feetX = useMemo(() => [-0.24, 0.24], []);

  useFrame((clock, delta) => {
    const dt = Math.min(delta, 1 / 30);
    const t = clock.clock.elapsedTime;
    const s = state.current;
    const m = motion?.current ?? {};

    if (animate && m.emoteAt && m.emoteAt !== s.seenAt) {
      s.seenAt = m.emoteAt;
      s.emote = m.emote;
      s.started = t;
      if (m.emote === "jump" && s.y === 0) s.vy = 8.5;
    }
    const elapsed = t - s.started;
    if (s.emote && elapsed > (EMOTE_SECONDS[s.emote] ?? 1)) s.emote = null;

    if (s.vy !== 0 || s.y > 0) {
      s.vy -= 28 * dt;
      s.y += s.vy * dt;
      if (s.y <= 0) {
        s.y = 0;
        s.vy = 0;
        s.squish = 1;
      }
    }
    s.squish = damp(s.squish, 0, 9, dt);

    const walking = animate && m.moving;
    const bob = walking ? Math.abs(Math.sin(t * 14)) * 0.07 : 0;
    const idle =
      animate && !walking ? Math.sin(t * 2.2 + blinkOffset) * 0.03 : 0;
    const dance =
      s.emote === "dance" ? Math.abs(Math.sin(elapsed * 12)) * 0.12 : 0;
    body.current.position.y = s.y + bob + idle + dance;

    tilt.current.rotation.x = damp(
      tilt.current.rotation.x,
      walking ? 0.1 : 0,
      8,
      dt,
    );
    tilt.current.rotation.z =
      s.emote === "dance"
        ? Math.sin(elapsed * 12) * 0.25
        : damp(tilt.current.rotation.z, 0, 8, dt);
    tilt.current.rotation.y =
      s.emote === "spin" ? (elapsed / EMOTE_SECONDS.spin) * Math.PI * 2 : 0;

    const stretch =
      1 +
      THREE.MathUtils.clamp(s.vy * 0.025, -0.12, 0.18) -
      s.squish * 0.2 +
      (hovered ? 0.05 : 0);
    const wide = 1 / Math.sqrt(stretch);
    tilt.current.scale.set(wide, stretch, wide);

    feet.current.forEach((foot, index) => {
      if (!foot) return;
      const swing = walking ? Math.sin(t * 14 + index * Math.PI) * 0.14 : 0;
      foot.position.z = 0.12 + swing;
    });
    if (cape.current) {
      cape.current.rotation.x = damp(
        cape.current.rotation.x,
        walking ? -0.35 : -0.08,
        5,
        dt,
      );
    }
    if (heart.current) {
      const showing = s.emote === "heart";
      heart.current.visible = showing;
      if (showing) {
        const p = elapsed / EMOTE_SECONDS.heart;
        heart.current.position.y = 1.9 + p * 0.9;
        heart.current.scale.setScalar(
          0.5 + Math.sin(Math.min(p, 1) * Math.PI) * 0.4,
        );
      }
    }
    if (eyes.current) {
      const cycle = (t + blinkOffset) % 3.8;
      eyes.current.scale.y = animate && cycle < 0.12 ? 0.12 : 1;
    }
  });

  return (
    <group>
      {selected && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.72, 0.86, 40]} />
          <meshBasicMaterial color={TOY.orange} toneMapped={false} />
        </mesh>
      )}
      <group
        ref={body}
        onClick={
          onSelect &&
          ((event) => {
            event.stopPropagation();
            onSelect();
          })
        }
        onPointerOver={
          onSelect &&
          ((event) => {
            event.stopPropagation();
            setHovered(true);
            setCursor("pointer");
          })
        }
        onPointerOut={
          onSelect &&
          (() => {
            setHovered(false);
            setCursor("");
          })
        }
      >
        <group ref={tilt}>
          <Outfit style={look.outfit} accent={look.accent} capeRef={cape} />
          <Body color={look.body} pattern={look.pattern} />
          <Eyes style={look.eyes} body={look.body} eyesRef={eyes} />
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
          <Face style={look.face} />
          <Head style={look.head} accent={look.accent} body={look.body} />
        </group>
        {feetX.map((x, index) => (
          <group
            key={x}
            ref={(node) => {
              feet.current[index] = node;
            }}
            position={[x, 0.04, 0.12]}
          >
            <Part
              scale={[1, 0.55, 1.2]}
              geo={<sphereGeometry args={[0.17, 16, 16]} />}
              color={look.body}
              line={0.15}
            />
          </group>
        ))}
        <group ref={heart} visible={false} position={[0, 1.9, 0]}>
          <Heart />
        </group>
      </group>
    </group>
  );
}
