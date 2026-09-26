import { useState } from "react";
import Brand from "./Brand.jsx";
import Icon from "./Icon.jsx";
import ProfileForm from "./ProfileForm.jsx";
import ThemeToggle from "./ThemeToggle.jsx";

// Shares the sign-in screen's shell so the first two steps feel like one flow.
export default function Onboarding({ user, initialProfile, onComplete }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [usernameRejection, setUsernameRejection] = useState(null);

  async function complete(profile) {
    setSaving(true);
    setError("");
    try {
      await onComplete(profile);
      window.scrollTo(0, 0);
    } catch (saveError) {
      setSaving(false);
      if (saveError.field === "username") {
        setUsernameRejection({
          username: profile.username,
          message: saveError.message,
        });
        document.getElementById("ob-username-input")?.focus();
        return;
      }
      setError(saveError.message);
    }
  }

  return (
    <div className="entry-screen onboarding">
      <div className="entry-background" aria-hidden="true">
        <div className="ambient-orbit orbit-one" />
        <div className="ambient-orbit orbit-two" />
      </div>
      <header className="entry-header page-container">
        <Brand />
        <ThemeToggle />
      </header>
      <main id="main-content" className="page-container ob-main" tabIndex={-1}>
        <div className="entry-intro ob-intro">
          <p className="eyebrow">
            <span className="status-dot" /> ONE LAST STEP BEFORE YOU QUEUE
          </p>
          <h1>
            Build your
            <br className="mobile-break" /> <span>gamer profile.</span>
          </h1>
          <p>
            {user?.displayName ? `Welcome in, ${user.displayName}. ` : ""}
            Tell us what you play and how you play it.
          </p>
        </div>
        <ProfileForm
          initialProfile={initialProfile}
          suggestedName={user?.displayName}
          usernameRejection={usernameRejection}
          showProgress
          submitLabel={saving ? "Saving…" : "Complete Profile"}
          submitting={saving}
          error={error}
          onSubmit={complete}
        />
        <p className="entry-caption ob-caption">
          <Icon name="users" /> You can change any of this later from your
          profile.
        </p>
      </main>
      <footer className="entry-footer page-container">
        <span>© {new Date().getFullYear()} FinDuo</span>
        <span>LESS SOLO. MORE DUO.</span>
      </footer>
    </div>
  );
}
