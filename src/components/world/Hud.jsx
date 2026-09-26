import { useState } from "react";
import Brand from "../Brand.jsx";
import Icon from "../Icon.jsx";
import ThemeToggle from "../ThemeToggle.jsx";

// Top bar inside FinDuo: back to the lobby, profile, messages, sign out.
export default function Hud({ user, inRoom, onLobby, onOpen, onSignOut }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const name = user.displayName || user.email || "Player";

  async function signOut() {
    setPending(true);
    setError("");
    try {
      await onSignOut();
    } catch {
      setError("Couldn’t sign out. Please try again.");
      setPending(false);
    }
  }

  return (
    <header className="world-topbar hud page-container">
      <button
        type="button"
        className="hud-brand"
        onClick={onLobby}
        aria-label="FinDuo lobby"
      >
        <Brand />
      </button>
      <nav className="hud-nav" aria-label="Main navigation">
        {inRoom && (
          <button type="button" className="hud-button" onClick={onLobby}>
            <Icon name="back" />
            <span className="hud-label">Lobby</span>
          </button>
        )}
        <button
          type="button"
          className="hud-button"
          onClick={() => onOpen("avatar")}
        >
          <Icon name="spark" />
          <span className="hud-label">Avatar</span>
        </button>
        <button
          type="button"
          className="hud-button"
          onClick={() => onOpen("messages")}
        >
          <Icon name="chat" />
          <span className="hud-label">Messages</span>
        </button>
        <button
          type="button"
          className="hud-button"
          onClick={() => onOpen("profile")}
        >
          <span className="hud-avatar" aria-hidden="true">
            {name.charAt(0).toUpperCase()}
          </span>
          <span className="hud-label">Profile</span>
        </button>
        <ThemeToggle />
        <button
          type="button"
          className="icon-button hud-icon"
          onClick={signOut}
          disabled={pending}
          aria-label={pending ? "Signing out" : "Sign out"}
          title="Sign out"
        >
          <Icon name="logout" />
        </button>
      </nav>
      {error && (
        <p className="hud-error" role="alert">
          {error}
        </p>
      )}
    </header>
  );
}
