import { useState } from "react";
import Brand from "./Brand.jsx";
import Icon from "./Icon.jsx";
import ThemeToggle from "./ThemeToggle.jsx";

const NAV_ITEMS = [
  { view: "overview", label: "Overview", icon: "grid" },
  { view: "discover", label: "Find players", icon: "users" },
  { view: "messages", label: "Messages", icon: "chat" },
  { view: "profile", label: "Profile", icon: "gamepad" },
];

export default function NavBar({ user, view, unread, onNavigate, onSignOut }) {
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
          {NAV_ITEMS.map((item) => (
            <button
              key={item.view}
              type="button"
              aria-current={view === item.view ? "page" : undefined}
              onClick={() => onNavigate(item.view)}
            >
              <Icon name={item.icon} />
              {item.label}
              {item.view === "messages" && unread > 0 && (
                <span className="nav-count">
                  {unread}
                  <span className="visually-hidden"> unread</span>
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="nav-account">
          <ThemeToggle />
          <button
            type="button"
            className="user-avatar"
            onClick={() => onNavigate("profile")}
            aria-label={`Your profile (${user.displayName || user.email || "Player"})`}
            title="Your profile"
          >
            {(user.displayName || user.email || "P").charAt(0).toUpperCase()}
          </button>
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
