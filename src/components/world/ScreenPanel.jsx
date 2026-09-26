import { motion } from "framer-motion";
import Icon from "../Icon.jsx";

// Framed like the Gameboy's screen the camera just zoomed into.
export default function ScreenPanel({ onBack, children }) {
  return (
    <motion.main
      id="main-content"
      tabIndex={-1}
      className="screen-panel"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1, transition: { delay: 0.35 } }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      <div className="screen-bezel">
        <div className="screen-bezel-top">
          <span className="screen-power" aria-hidden="true" />
          <span className="screen-brand">FinDuo COLOR</span>
          <button
            type="button"
            className="screen-back"
            onClick={onBack}
            aria-label="Back to the attic"
          >
            <Icon name="back" />
          </button>
        </div>
        <div className="screen-glass">{children}</div>
      </div>
    </motion.main>
  );
}
