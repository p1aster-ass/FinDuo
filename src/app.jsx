import { useEffect, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
// Base styles load first so component stylesheets can build on them.
import "./App.css";
import AuthGate from "./components/AuthGate.jsx";
import Dashboard from "./components/Dashboard.jsx";
import Onboarding from "./components/Onboarding.jsx";
import { profileApi } from "./api/index.js";
import { isProfileComplete } from "./lib/match.js";

// Screens swing in and out in 3D; the stage around them sets the perspective.
const screenMotion = {
  enter: { opacity: 0, rotateX: -14, y: 70, scale: 0.96 },
  center: {
    opacity: 1,
    rotateX: 0,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 180, damping: 24 },
  },
  exit: {
    opacity: 0,
    rotateX: 10,
    y: -50,
    scale: 0.97,
    transition: { duration: 0.22, ease: "easeIn" },
  },
};

function StatusScreen({ children }) {
  return (
    <main id="main-content" className="session-loading" tabIndex={-1}>
      {children}
    </main>
  );
}

// The auth provider owns the session. Resolving a callback never grants access.
function App({ auth }) {
  // The gaming profile loads from public.profiles once the user is signed in.
  // `exists` says whether the user has a row yet; `stored` is false if the
  // table is missing on this branch, and the profile then lives in memory.
  const [record, setRecord] = useState({ userId: null });
  const [attempt, setAttempt] = useState(0);
  const userId = auth?.user?.id ?? null;

  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;
    profileApi.load(userId).then(
      ({ stored, exists, profile }) => {
        if (!cancelled) {
          setRecord({ userId, stored, exists, profile, error: "" });
        }
      },
      (error) => {
        if (!cancelled) setRecord({ userId, error: error.message });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [userId, attempt]);

  const loaded = userId !== null && record.userId === userId;

  async function saveProfile({ displayName, ...changes }) {
    const next = { ...record.profile, ...changes };
    if (record.stored) {
      const name = displayName ?? auth.user.displayName;
      if (record.exists) await profileApi.update(userId, name, next);
      else await profileApi.create(userId, name, next);
    }
    setRecord((current) => ({
      ...current,
      exists: current.stored,
      profile: next,
    }));
  }

  function renderScreen() {
    if (auth?.loading) {
      return [
        "loading",
        <StatusScreen key="loading">
          <p role="status">Getting your player hub ready…</p>
        </StatusScreen>,
      ];
    }
    if (!auth?.user) return ["auth", <AuthGate key="auth" auth={auth} />];
    if (!loaded) {
      return [
        "loading",
        <StatusScreen key="loading">
          <p role="status">Loading your profile…</p>
        </StatusScreen>,
      ];
    }
    if (record.error) {
      return [
        "error",
        <StatusScreen key="error">
          <div className="status-message" role="alert">
            <p>{record.error}</p>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => {
                setRecord({ userId: null });
                setAttempt((count) => count + 1);
              }}
            >
              Try again
            </button>
          </div>
        </StatusScreen>,
      ];
    }
    if (!isProfileComplete(record.profile)) {
      return [
        "onboarding",
        <Onboarding
          key="onboarding"
          user={auth.user}
          initialProfile={record.profile}
          onComplete={saveProfile}
        />,
      ];
    }
    return [
      "hub",
      <Dashboard
        key="hub"
        auth={auth}
        profile={record.profile}
        profileStored={record.stored}
        onProfileChange={saveProfile}
      />,
    ];
  }

  const [screenKey, screen] = renderScreen();

  return (
    <MotionConfig reducedMotion="user">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div className="screen-stage">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={screenKey}
            className="screen"
            variants={screenMotion}
            initial="enter"
            animate="center"
            exit="exit"
          >
            {screen}
          </motion.div>
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
export default App;
