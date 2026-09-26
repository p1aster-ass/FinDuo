import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

// three.js is large, so the scene loads only when the stage first scrolls
// into view, and stops rendering whenever it's off screen.
const DuoScene = lazy(() => import("../three/DuoScene.jsx"));

// Flat CSS buddies: shown while the 3D scene loads, or instead of it when the
// device can't run WebGL.
function FlatBuddies() {
  return (
    <div className="flat-buddies" aria-hidden="true">
      <span className="flat-buddy flat-buddy-orange">
        <span className="flat-eyes" />
      </span>
      <span className="flat-buddy flat-buddy-grape">
        <span className="flat-eyes" />
      </span>
    </div>
  );
}

export default function DuoStage({ variant = "auth", className = "" }) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  const [visible, setVisible] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
        if (entry.isIntersecting) setSeen(true);
      },
      { rootMargin: "120px" },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`duo-stage duo-stage-${variant} ${className}`}
      role="img"
      aria-label="Two FinDuo buddies surrounded by floating game toys. Drag to spin the scene, or click a buddy to make it hop."
    >
      {seen ? (
        <Suspense fallback={<FlatBuddies />}>
          <DuoScene
            variant={variant}
            active={visible}
            animate={!reduceMotion}
            fallback={<FlatBuddies />}
          />
        </Suspense>
      ) : (
        <FlatBuddies />
      )}
    </div>
  );
}
