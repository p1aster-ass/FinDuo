import { useEffect, useState } from "react";
// Base styles load first so component stylesheets can build on them.
import "./App.css";
import AuthGate from "./components/AuthGate.jsx";
import Dashboard from "./components/Dashboard.jsx";
import Onboarding from "./components/Onboarding.jsx";
import { profileApi } from "./api/index.js";
import { isProfileComplete } from "./lib/match.js";

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
      return (
        <StatusScreen>
          <p role="status">Getting your player hub ready…</p>
        </StatusScreen>
      );
    }
    if (!auth?.user) return <AuthGate auth={auth} />;
    if (!loaded) {
      return (
        <StatusScreen>
          <p role="status">Loading your profile…</p>
        </StatusScreen>
      );
    }
    if (record.error) {
      return (
        <StatusScreen>
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
        </StatusScreen>
      );
    }
    if (!isProfileComplete(record.profile)) {
      return (
        <Onboarding
          user={auth.user}
          initialProfile={record.profile}
          onComplete={saveProfile}
        />
      );
    }
    return (
      <Dashboard
        auth={auth}
        profile={record.profile}
        profileStored={record.stored}
        onProfileChange={saveProfile}
      />
    );
  }

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      {renderScreen()}
    </>
  );
}
export default App;
