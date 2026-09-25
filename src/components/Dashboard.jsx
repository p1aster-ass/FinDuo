import NavBar from "./NavBar.jsx";
import Icon from "./Icon.jsx";

export default function Dashboard({ auth }) {
  return (
    <div className="dashboard">
      <NavBar user={auth.user} onSignOut={auth.signOut} />
      <main
        id="main-content"
        className="page-container dashboard-main"
        tabIndex={-1}
      >
        <div className="dashboard-heading">
          <div>
            <p className="eyebrow">YOUR NEXT CHAPTER</p>
            <h1>
              Hey, {auth.user.displayName || "player"}
              <span className="brand-period">.</span>
            </h1>
          </div>
          <span className="outline-badge">Your player hub</span>
        </div>
        <section className="hero glass-panel" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">FIND YOUR PEOPLE. PLAY YOUR GAME.</p>
            <h2 id="hero-title">
              Great games start
              <br />
              with the right duo.
            </h2>
            <p className="hero-description">
              Find your duo or round out your squad. Connect with players who
              share your pace, your goals, and your love for the game.
            </p>
            <div className="hero-actions">
              <button
                className="button button-primary"
                type="button"
                disabled
                aria-describedby="hero-availability"
              >
                Find players
                <Icon name="arrow" />
              </button>
              <button
                className="button button-secondary"
                type="button"
                disabled
                aria-describedby="hero-availability"
              >
                Create profile
              </button>
            </div>
            <p id="hero-availability" className="hero-note">
              Player discovery and profiles are coming soon.
            </p>
          </div>
          <div className="duo-art" aria-hidden="true">
            <div className="duo-art-orbit" />
            <span className="duo-tile tile-back">
              <Icon name="users" />
            </span>
            <span className="duo-tile tile-front">
              <Icon name="duo" />
            </span>
            <span className="duo-art-label">BETTER TOGETHER</span>
          </div>
        </section>
        <section className="feature-grid" aria-label="Coming to FinDuo">
          {[
            {
              icon: "users",
              title: "Your kind of teammates",
              text: "Find players who fit your playstyle and make every session count.",
            },
            {
              icon: "grid",
              title: "More than a username",
              text: "Share your main games, favorite roles, and what you bring to the squad.",
            },
            {
              icon: "chat",
              title: "From matched to queued",
              text: "Plan your next session and keep the conversation going.",
            },
          ].map((item) => (
            <article className="feature-card glass-panel" key={item.title}>
              <div className="feature-top">
                <span className="section-icon">
                  <Icon name={item.icon} />
                </span>
                <span className="soon-tag">Coming soon</span>
              </div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
