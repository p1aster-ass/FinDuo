import { motion } from "framer-motion";
import Brand from "../Brand.jsx";
import Icon from "../Icon.jsx";
import ThemeToggle from "../ThemeToggle.jsx";

// First screen: the attic. The Gameboy (or this button) is the way in.
export default function AtticIntro({ onStart }) {
  return (
    <div className="attic-intro">
      <header className="world-topbar page-container">
        <Brand />
        <ThemeToggle />
      </header>
      <main id="main-content" className="attic-copy" tabIndex={-1}>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 22 }}
        >
          Find your <span className="title-sticker">duo.</span>
        </motion.h1>
        <p>Game rooms full of players who like what you like.</p>
        <motion.button
          type="button"
          className="button button-primary start-button"
          onClick={onStart}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
        >
          <Icon name="gamepad" />
          Press START
        </motion.button>
        <p className="attic-hint">or click the Gameboy on the table</p>
      </main>
    </div>
  );
}
