import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import NavBar from "./NavBar.jsx";
import Overview from "./Overview.jsx";
import Discover from "./Discover.jsx";
import Messages from "./Messages.jsx";
import Profile from "./Profile.jsx";
import Icon from "./Icon.jsx";
import { backend } from "../api/backend.js";
import "./Hub.css";

// Pages swing sideways in 3D, in the direction of the nav order.
const PAGE_ORDER = ["overview", "discover", "messages", "profile"];
const pageMotion = {
  enter: (direction) => ({
    opacity: 0,
    rotateY: direction * -16,
    x: direction * 70,
  }),
  center: {
    opacity: 1,
    rotateY: 0,
    x: 0,
    transition: { type: "spring", stiffness: 220, damping: 26 },
  },
  exit: (direction) => ({
    opacity: 0,
    rotateY: direction * 16,
    x: direction * -70,
    transition: { duration: 0.18, ease: "easeIn" },
  }),
};

// The signed-in player hub. Screens whose backend doesn't exist yet
// (see src/api/backend.js) show a "not live yet" state instead of data.
export default function Dashboard({
  auth,
  profile,
  profileStored,
  onProfileChange,
}) {
  const [view, setView] = useState("overview");
  const [direction, setDirection] = useState(1);
  const [noticeOpen, setNoticeOpen] = useState(!profileStored);
  const mainRef = useRef(null);
  const user = {
    ...auth.user,
    displayName: auth.user.displayName || auth.user.email || "Player",
  };

  function navigate(next) {
    if (next === view) return;
    setDirection(PAGE_ORDER.indexOf(next) >= PAGE_ORDER.indexOf(view) ? 1 : -1);
    setView(next);
    window.scrollTo(0, 0);
    mainRef.current?.focus({ preventScroll: true });
  }

  const pages = {
    overview: <Overview user={user} profile={profile} onNavigate={navigate} />,
    discover: <Discover profile={profile} available={backend.discovery} />,
    messages: (
      <Messages
        profile={profile}
        available={backend.messaging}
        onFindPlayers={() => navigate("discover")}
      />
    ),
    profile: (
      <Profile
        user={user}
        profile={profile}
        onSave={onProfileChange}
        onUpdateDisplayName={auth.updateDisplayName}
      />
    ),
  };

  return (
    <div className="dashboard">
      <NavBar
        user={user}
        view={view}
        onNavigate={navigate}
        onSignOut={auth.signOut}
      />
      <main
        id="main-content"
        ref={mainRef}
        className={`page-container dashboard-main hub-main hub-${view}`}
        tabIndex={-1}
      >
        {noticeOpen && (
          <div className="hub-notice" role="note">
            <Icon name="spark" />
            <p>
              Your gaming profile isn’t saved to your account on this server, so
              you’ll set it up again after you sign out or reload.
            </p>
            <button
              type="button"
              className="icon-button"
              onClick={() => setNoticeOpen(false)}
              aria-label="Dismiss notice"
            >
              <Icon name="close" />
            </button>
          </div>
        )}
        <div className="hub-stage">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={view}
              className="hub-page"
              custom={direction}
              variants={pageMotion}
              initial="enter"
              animate="center"
              exit="exit"
            >
              {pages[view]}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
