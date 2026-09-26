import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";

const SPRING = { stiffness: 240, damping: 18, mass: 0.6 };

// Renders `as` (a motion component) so it leans toward the mouse in 3D with a
// glare that follows the cursor. Mouse only; still for reduced motion.
export default function Tilt({
  as: Component = motion.div,
  max = 10,
  className = "",
  style,
  children,
  onPointerMove,
  onPointerLeave,
  ...props
}) {
  const reduceMotion = useReducedMotion();
  const rotateX = useSpring(0, SPRING);
  const rotateY = useSpring(0, SPRING);
  const glareX = useMotionValue(50);
  const glareY = useMotionValue(50);
  const glareOpacity = useSpring(0, SPRING);
  const glare = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255, 255, 255, 0.5), transparent 55%)`;

  function handleMove(event) {
    onPointerMove?.(event);
    if (reduceMotion || event.pointerType !== "mouse") return;
    const box = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width;
    const y = (event.clientY - box.top) / box.height;
    rotateY.set((x - 0.5) * 2 * max);
    rotateX.set(-(y - 0.5) * 2 * max);
    glareX.set(x * 100);
    glareY.set(y * 100);
    glareOpacity.set(1);
  }

  function handleLeave(event) {
    onPointerLeave?.(event);
    rotateX.set(0);
    rotateY.set(0);
    glareOpacity.set(0);
  }

  return (
    <Component
      {...props}
      className={`tilt ${className}`}
      style={{ ...style, rotateX, rotateY, transformPerspective: 900 }}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
    >
      {children}
      <motion.span
        className="tilt-glare"
        aria-hidden="true"
        style={{ background: glare, opacity: glareOpacity }}
      />
    </Component>
  );
}
