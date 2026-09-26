import { motion } from "framer-motion";
import DuoStage from "./DuoStage.jsx";
import Icon from "./Icon.jsx";
import PlayerAvatar from "./PlayerAvatar.jsx";
import Tilt from "./Tilt.jsx";
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
        <h1>
          Hey, {user.displayName}
          <span className="brand-period">!</span>
        </h1>
        <span className="outline-badge">Your player hub</span>
      </div>

      <section className="hero glass-panel" aria-labelledby="hero-title">
        <div className="hero-copy">
          <h2 id="hero-title">
            Two players.
            <br />
            One <span className="title-sticker">team.</span>
          </h2>
          <p className="hero-description">
            Find a duo who plays like you do: same games, same rank, same vibe.
            Then queue up and actually have fun.
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
        <div className="hero-stage">
          <DuoStage variant="hub" />
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
              <Tilt
                as={motion.li}
                max={6}
                key={player.id}
                className="top-match glass-panel"
              >
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
              </Tilt>
            ))}
          </ul>
        </section>
      )}

      <section className="feature-grid" aria-label="Your player hub">
        {features.map((item) => (
          <Tilt
            as={motion.button}
            type="button"
            className="feature-card feature-link glass-panel"
            key={item.title}
            onClick={() => onNavigate(item.view)}
            whileTap={{ scale: 0.97 }}
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
          </Tilt>
        ))}
      </section>
    </>
  );
}
