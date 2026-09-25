import { useRef, useState } from "react";
import NavBar from "./NavBar.jsx";
import Overview from "./Overview.jsx";
import Discover from "./Discover.jsx";
import Messages from "./Messages.jsx";
import Profile from "./Profile.jsx";
import Icon from "./Icon.jsx";
import { backend } from "../api/backend.js";
import "./Hub.css";

// The signed-in player hub. Screens whose backend doesn't exist yet
// (see src/api/backend.js) show a "not live yet" state instead of data.
export default function Dashboard({
  auth,
  profile,
  profileStored,
  onProfileChange,
}) {
  const [view, setView] = useState("overview");
  const [noticeOpen, setNoticeOpen] = useState(!profileStored);
  const mainRef = useRef(null);
  const user = {
    ...auth.user,
    displayName: auth.user.displayName || auth.user.email || "Player",
  };

  function navigate(next) {
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
        <div key={view} className="hub-page">
          {pages[view]}
        </div>
      </main>
    </div>
  );
}
