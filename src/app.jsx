import { useState } from "react";
// Base styles load first so component stylesheets can build on them.
import "./App.css";
import AuthGate from "./components/AuthGate.jsx";
import Dashboard from "./components/Dashboard.jsx";
import Onboarding from "./components/Onboarding.jsx";

// TEMP: auth is being built separately. While this is true, the app skips
// AuthGate with a mock session and opens straight into onboarding.
// Set it to false to restore the real auth flow.
const isAuthenticated = true;
const MOCK_USER = { displayName: "Player", email: "player@finduo.gg" };

// The auth provider owns the session. Resolving a callback never grants access.
function App({ auth: providedAuth }) {
  // Gaming profile from onboarding; kept in memory until there's a backend.
  const [profile, setProfile] = useState(null);
  const auth = isAuthenticated
    ? // Signing out of the mock session resets onboarding for easy re-testing.
      { user: MOCK_USER, signOut: async () => setProfile(null) }
    : providedAuth;

  function renderScreen() {
    if (auth?.loading) {
      return (
        <main id="main-content" className="session-loading" tabIndex={-1}>
          <p role="status">Getting your player hub ready…</p>
        </main>
      );
    }
    if (!auth?.user) return <AuthGate auth={auth} />;
    if (!profile) {
      return <Onboarding user={auth.user} onComplete={setProfile} />;
    }
    return (
      <Dashboard auth={auth} profile={profile} onProfileChange={setProfile} />
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
