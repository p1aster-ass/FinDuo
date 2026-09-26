import Icon from "./Icon.jsx";
import PlayerAvatar from "./PlayerAvatar.jsx";
import { backend } from "../api/backend.js";
import { REGION_BY_ID } from "../data/options.js";
import { profileStrength } from "../lib/match.js";

// `matches` ([{ player, match }]) and the message counts stay empty until the
// discovery and messaging backends exist.
export default function Overview({
  user,
  profile,
  matches = [],
  unread = 0,
  chatCount = 0,
  onNavigate,
  onMessage,
}) {
  const strongMatches = matches.filter(({ match }) => match.score >= 60);
  const strength = profileStrength(profile);
  const region = REGION_BY_ID[profile.region]?.label;
  let messageStat = "Not live yet";
  if (backend.messaging) {
    messageStat = unread > 0 ? `${unread} unread` : `${chatCount} chats`;
  }

  const features = [
    {
      view: "discover",
      icon: "users",
      title: "Your kind of teammates",
      text: "Find players who fit your playstyle and make every session count.",
      stat: backend.discovery
        ? `${strongMatches.length} strong matches`
        : "Not live yet",
    },
    {
      view: "profile",
      icon: "grid",
      title: "More than a username",
      text: "Share your main games, favorite roles, and what you bring to the squad.",
      stat: `Profile ${strength.percent}% complete`,
    },
    {
      view: "messages",
      icon: "chat",
      title: "From matched to queued",
      text: "Plan your next session and keep the conversation going.",
      stat: messageStat,
    },
  ];

  return (
    <>
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">YOUR NEXT CHAPTER</p>
          <h1>
            Hey, {user.displayName}
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
              onClick={() => onNavigate("discover")}
            >
              Find players
              <Icon name="arrow" />
            </button>
            <button
              className="button button-secondary"
              type="button"
              onClick={() => onNavigate("profile")}
            >
              View profile
            </button>
          </div>
          <p className="hero-note">
            {backend.discovery
              ? `${strongMatches.length} players in the pool are a strong fit for you${region ? ` · ${region}` : ""}.`
              : "Player discovery is almost here. Your profile is ready for it."}
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

      {matches.length > 0 && (
        <section className="top-matches" aria-labelledby="top-matches-title">
          <div className="hub-section-head">
            <h2 id="top-matches-title">Top matches for you</h2>
            <button
              type="button"
              className="text-button"
              onClick={() => onNavigate("discover")}
            >
              See all players
            </button>
          </div>
          <ul className="top-match-list">
            {matches.slice(0, 3).map(({ player, match }) => (
              <li key={player.id} className="top-match glass-panel">
                <PlayerAvatar name={player.name} online={player.online} />
                <div className="top-match-copy">
                  <p className="top-match-name">{player.name}</p>
                  <p className="top-match-meta">
                    {player.rank} · {REGION_BY_ID[player.region].label}
                  </p>
                </div>
                <span className="match-score-chip">{match.score}%</span>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => onMessage(player.id)}
                  aria-label={`Message ${player.name}`}
                  title={`Message ${player.name}`}
                >
                  <Icon name="chat" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="feature-grid" aria-label="Your player hub">
        {features.map((item) => (
          <button
            type="button"
            className="feature-card feature-link glass-panel"
            key={item.title}
            onClick={() => onNavigate(item.view)}
          >
            <span className="feature-top">
              <span className="section-icon">
                <Icon name={item.icon} />
              </span>
              <span className="soon-tag">{item.stat}</span>
            </span>
            <span className="feature-title">{item.title}</span>
            <span className="feature-text">{item.text}</span>
            <span className="feature-open">
              Open
              <Icon name="arrow" />
            </span>
          </button>
        ))}
      </section>
    </>
  );
}
