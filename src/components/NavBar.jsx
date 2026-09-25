import { useState } from "react";
import Brand from "./Brand.jsx";
import Icon from "./Icon.jsx";
import ThemeToggle from "./ThemeToggle.jsx";

export default function NavBar({ user, onSignOut }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function signOut() {
    setPending(true);
    setError("");
    try {
      await onSignOut();
    } catch {
      setError("Couldn’t sign out. Please try again.");
    } finally {
      setPending(false);
    }
  }
  return (
    <header className="site-header">
      <div className="navbar page-container">
        <Brand />
        <nav className="main-nav" aria-label="Main navigation">
          <a href="#main-content" aria-current="page">
            <Icon name="grid" />
            Overview
          </a>
          <button
            type="button"
            disabled
            title="Player discovery is coming soon"
          >
            <Icon name="users" />
            Find players<span className="soon-tag">Soon</span>
          </button>
          <button type="button" disabled title="Messaging is coming soon">
            <Icon name="chat" />
            Messages<span className="soon-tag">Soon</span>
          </button>
        </nav>
        <div className="nav-account">
          <ThemeToggle />
          <span
            className="user-avatar"
            aria-label={`Signed in as ${user.displayName || user.email || "Player"}`}
          >
            {(user.displayName || user.email || "P").charAt(0).toUpperCase()}
          </span>
          <button
            className="icon-button"
            type="button"
            onClick={signOut}
            disabled={!onSignOut || pending}
            aria-label={pending ? "Signing out" : "Sign out"}
            title="Sign out"
          >
            <Icon name="logout" />
          </button>
        </div>
      </div>
      {error && (
        <p className="nav-error" role="alert">
          {error}
        </p>
      )}
    </header>
  );
}
