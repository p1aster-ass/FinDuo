import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import Avatar from "./Avatar.jsx";
import Label from "./Label.jsx";
import { attachKeyboard, inputVector } from "./keyboard.js";
import { localPlayer, triggerEmote } from "./localPlayer.js";
import { damp } from "./palette.js";
import { avatarFor } from "../data/avatar.js";
import { wrapText } from "../lib/chat.js";

const SPEED = 3.4;

// Turns toward `target` along the shortest way around.
function dampAngle(current, target, lambda, dt) {
  let diff = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * (1 - Math.exp(-lambda * dt));
}

// Moves the local player with WASD/arrows (or toward a clicked spot), keeps
// them inside `clamp`, and calls `onTrigger(id)` on entering a trigger zone
// ({ id, x, z, radius }).
export function PlayerController({ clamp, triggers = [], onTrigger }) {
  const inside = useRef(null);

  useEffect(() => attachKeyboard({ onEmote: triggerEmote }), []);

  useFrame((_, delta) => {
    // Real elapsed time (capped so a stutter can't teleport you): walking
    // speed is the same on slow and fast machines.
    const dt = Math.min(delta, 0.1);
    const p = localPlayer;
    let { x: ix, z: iz } = inputVector();
    if (ix || iz) {
      p.target = null;
    } else if (p.target) {
      const dx = p.target.x - p.x;
      const dz = p.target.z - p.z;
      const distance = Math.hypot(dx, dz);
      if (distance < 0.08) p.target = null;
      else {
        ix = dx / distance;
        iz = dz / distance;
      }
    }
    const length = Math.hypot(ix, iz);
    p.moving = length > 0;
    if (p.moving) {
      ix /= length;
      iz /= length;
      const [x, z] = clamp(p.x + ix * SPEED * dt, p.z + iz * SPEED * dt);
      p.x = x;
      p.z = z;
      p.facing = dampAngle(p.facing, Math.atan2(ix, iz), 12, dt);
    }
    const hit = triggers.find(
      (zone) => Math.hypot(p.x - zone.x, p.z - zone.z) < zone.radius,
    );
    if (hit && inside.current !== hit.id) onTrigger?.(hit.id);
    inside.current = hit?.id ?? null;
  });

  return null;
}

function NameAndBubble({ name, bubble, variant, onSelect }) {
  const lines = bubble ? wrapText(bubble) : null;
  return (
    <>
      <Label
        text={name}
        variant={variant}
        position={[0, 1.3, 0]}
        width={1.1}
        onClick={onSelect}
      />
      {lines && (
        <Label
          lines={lines}
          variant="bubble"
          position={[0, 1.62 + lines.length * 0.13, 0]}
          width={1.9}
        />
      )}
    </>
  );
}

// You: follows localPlayer every frame.
export function LocalAvatar({ avatar, name, bubble, animate }) {
  const group = useRef(null);
  const turn = useRef(null);
  const motion = useMemo(() => ({ current: localPlayer }), []);
  useFrame(() => {
    group.current.position.set(localPlayer.x, 0, localPlayer.z);
    turn.current.rotation.y = localPlayer.facing;
  });
  return (
    <group ref={group}>
      <group ref={turn} scale={0.62}>
        <Avatar avatar={avatar} motion={motion} animate={animate} />
      </group>
      <NameAndBubble name={`${name} · You`} bubble={bubble} variant="accent" />
    </group>
  );
}

// Someone else: glides toward their latest synced position.
export function RemoteAvatar({
  peer,
  bubble,
  selected,
  onSelect,
  animate,
  theme,
  index,
}) {
  const group = useRef(null);
  const turn = useRef(null);
  const motion = useRef({ moving: false, emote: null, emoteAt: 0 });
  const start = useRef([peer.x, peer.z, peer.facing]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 30);
    const g = group.current;
    if (!g.userData.placed) {
      g.position.set(start.current[0], 0, start.current[1]);
      turn.current.rotation.y = start.current[2];
      g.userData.placed = true;
    }
    const distance = Math.hypot(peer.x - g.position.x, peer.z - g.position.z);
    g.position.x = damp(g.position.x, peer.x, 4, dt);
    g.position.z = damp(g.position.z, peer.z, 4, dt);
    const moving = distance > 0.05;
    const heading = moving
      ? Math.atan2(peer.x - g.position.x, peer.z - g.position.z)
      : peer.facing;
    turn.current.rotation.y = dampAngle(
      turn.current.rotation.y,
      heading,
      8,
      dt,
    );
    motion.current.moving = moving;
    motion.current.emote = peer.emote;
    motion.current.emoteAt = peer.emoteAt;
  });

  return (
    <group ref={group}>
      <group ref={turn} scale={0.62}>
        <Avatar
          avatar={peer.avatar ?? avatarFor(peer.id)}
          motion={motion}
          animate={animate}
          blinkOffset={index * 0.7}
          selected={selected}
          onSelect={onSelect}
        />
      </group>
      <NameAndBubble
        name={peer.player.name}
        bubble={bubble}
        variant={selected ? "accent" : theme === "dark" ? "dark" : "light"}
        onSelect={onSelect}
      />
    </group>
  );
}
