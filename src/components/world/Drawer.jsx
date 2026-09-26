import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import Icon from "../Icon.jsx";

// A panel that slides over the 3D world (Profile, Messages). Escape or the
// close button dismisses it; focus moves into it when it opens.
export default function Drawer({ title, onClose, children }) {
  const ref = useRef(null);

  useEffect(() => {
    ref.current?.focus();
    function onKey(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <motion.div
        className="drawer-backdrop"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <motion.section
        ref={ref}
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 260, damping: 30 }}
      >
        <button
          type="button"
          className="icon-button drawer-close"
          onClick={onClose}
          aria-label={`Close ${title}`}
        >
          <Icon name="close" />
        </button>
        <div className="drawer-body hub-main">{children}</div>
      </motion.section>
    </>
  );
}
