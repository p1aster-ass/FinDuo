import { useState } from "react";
import Icon from "./Icon.jsx";
import { COMM_STYLES, GAMES, RANKS, REGIONS } from "../data/options.js";
import "./ProfileForm.css";

export function Section({
  id,
  index,
  icon,
  title,
  hint,
  meta,
  done,
  error,
  children,
}) {
  return (
    <section
      id={`ob-${id}`}
      className={`ob-section glass-panel${error ? " has-error" : ""}`}
      aria-labelledby={`ob-${id}-title`}
      tabIndex={-1}
    >
      <header className="ob-section-head">
        <span className={`ob-step${done ? " is-done" : ""}`} aria-hidden="true">
          {done ? (
            <Icon name="check" />
          ) : icon ? (
            <Icon name={icon} />
          ) : (
            String(index).padStart(2, "0")
          )}
        </span>
        <div className="ob-section-copy">
          <h2 id={`ob-${id}-title`}>{title}</h2>
          <p id={`ob-${id}-hint`}>{hint}</p>
        </div>
        {meta && <span className="ob-meta">{meta}</span>}
      </header>
      {children}
      {error && <p className="ob-error">{error}</p>}
    </section>
  );
}

function toggleComm(current, style) {
  return current.includes(style.id)
    ? current.filter((id) => id !== style.id)
    : [...current.filter((id) => id !== style.excludes), style.id];
}

// The four gaming-preference sections, shared by onboarding and profile editing.
export default function ProfileForm({
  initialProfile,
  submitLabel,
  onSubmit,
  onCancel,
  showProgress = false,
  children,
}) {
  const [games, setGames] = useState(initialProfile?.games ?? []);
  const [region, setRegion] = useState(initialProfile?.region ?? "");
  const [rank, setRank] = useState(initialProfile?.rank ?? "");
  const [comms, setComms] = useState(initialProfile?.commStyles ?? []);
  const [showErrors, setShowErrors] = useState(false);

  const steps = [
    { key: "games", label: "Games", done: games.length > 0 },
    { key: "region", label: "Region", done: Boolean(region) },
    { key: "rank", label: "Rank", done: Boolean(rank) },
    { key: "comms", label: "Comms", done: comms.length > 0 },
  ];
  const completed = steps.filter((step) => step.done).length;
  const isComplete = completed === steps.length;
  const missing = steps.filter((step) => !step.done).map((step) => step.label);
  const rankIndex = RANKS.indexOf(rank);
  const errorFor = (key) =>
    showErrors && !steps.find((step) => step.key === key).done;

  function toggleGame(id) {
    setGames((current) =>
      current.includes(id)
        ? current.filter((game) => game !== id)
        : [...current, id],
    );
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!isComplete) {
      setShowErrors(true);
      const firstMissing = document.getElementById(
        `ob-${steps.find((step) => !step.done).key}`,
      );
      firstMissing?.scrollIntoView({ behavior: "smooth", block: "start" });
      firstMissing?.focus({ preventScroll: true });
      return;
    }
    onSubmit({ games, region, rank, commStyles: comms });
  }

  return (
    <form className="ob-form" onSubmit={handleSubmit} noValidate>
      {showProgress && (
        <ol
          className="ob-progress"
          aria-label={`${completed} of 4 sections complete`}
        >
          {steps.map((step) => (
            <li key={step.key} className={step.done ? "is-done" : ""}>
              <a href={`#ob-${step.key}`}>
                <span className="ob-progress-bar" />
                {step.label}
              </a>
            </li>
          ))}
        </ol>
      )}

      {children}

      <Section
        id="games"
        index={1}
        title="Select your games"
        hint="Pick every game you want to find teammates for."
        meta={games.length > 0 ? `${games.length} selected` : null}
        done={games.length > 0}
        error={errorFor("games") && "Pick at least one game."}
      >
        <ul className="game-grid" aria-describedby="ob-games-hint">
          {GAMES.map((game) => {
            const selected = games.includes(game.id);
            return (
              <li key={game.id}>
                <button
                  type="button"
                  className="game-card"
                  aria-pressed={selected}
                  onClick={() => toggleGame(game.id)}
                >
                  <span className="game-art" aria-hidden="true">
                    <span className="game-tag">{game.tag}</span>
                  </span>
                  <span className="game-info">
                    <span className="game-name">{game.name}</span>
                    <span className="game-genre">{game.genre}</span>
                  </span>
                  <span className="game-check" aria-hidden="true">
                    <Icon name="check" />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section
        id="region"
        index={2}
        title="Server region"
        hint="Where you queue most. We match you with players on low-ping servers."
        done={Boolean(region)}
        error={errorFor("region") && "Choose your region."}
      >
        <div
          className="region-grid"
          role="radiogroup"
          aria-labelledby="ob-region-title"
          aria-describedby="ob-region-hint"
        >
          {REGIONS.map((option) => (
            <label key={option.id} className="choice region-option">
              <input
                className="visually-hidden"
                type="radio"
                name="region"
                value={option.id}
                checked={region === option.id}
                onChange={() => setRegion(option.id)}
              />
              <span className="choice-body region-body">
                <span className="region-icon">
                  <Icon name="globe" />
                </span>
                <span className="region-label">{option.label}</span>
                <span className="region-detail">{option.detail}</span>
              </span>
            </label>
          ))}
        </div>
      </Section>

      <Section
        id="rank"
        index={3}
        title="Current rank"
        hint="Your usual skill tier. You can change it later."
        meta={rank ? `Tier ${rankIndex + 1} of ${RANKS.length}` : null}
        done={Boolean(rank)}
        error={errorFor("rank") && "Choose your current rank."}
      >
        <div
          className="rank-grid"
          role="radiogroup"
          aria-labelledby="ob-rank-title"
          aria-describedby="ob-rank-hint"
        >
          {RANKS.map((tier, index) => (
            <label
              key={tier}
              className={`choice rank-option${index < rankIndex ? " is-below" : ""}`}
              style={{ "--tier": (index + 1) / RANKS.length }}
            >
              <input
                className="visually-hidden"
                type="radio"
                name="rank"
                value={tier}
                checked={rank === tier}
                onChange={() => setRank(tier)}
              />
              <span className="choice-body rank-body">
                <RankEmblem level={index + 1} />
                <span className="rank-name">{tier}</span>
              </span>
            </label>
          ))}
        </div>
        <div className="rank-track" aria-hidden="true">
          <span
            style={{
              width: `${rank ? ((rankIndex + 1) / RANKS.length) * 100 : 0}%`,
            }}
          />
        </div>
      </Section>

      <Section
        id="comms"
        index={4}
        title="Preferred comm style"
        hint="How you like to talk (or not) in-game. Pick any that apply."
        done={comms.length > 0}
        error={errorFor("comms") && "Pick at least one comm style."}
      >
        <div className="comm-list" aria-describedby="ob-comms-hint">
          {COMM_STYLES.map((style) => (
            <button
              key={style.id}
              type="button"
              className="comm-pill"
              aria-pressed={comms.includes(style.id)}
              onClick={() => setComms((current) => toggleComm(current, style))}
            >
              <Icon name={style.icon} />
              {style.label}
            </button>
          ))}
        </div>
        <p className="ob-footnote">
          Mic Required and Ping Only can’t be combined, and neither can Chill
          and Highly Competitive.
        </p>
      </Section>

      <div className="ob-submit glass-panel">
        <p className="ob-submit-count">
          <strong>{completed}</strong> of 4 sections complete
        </p>
        <div className="ob-submit-actions">
          {onCancel && (
            <button
              type="button"
              className="button button-secondary"
              onClick={onCancel}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className={`button button-primary ob-cta${isComplete ? " is-ready" : ""}`}
            aria-describedby="ob-status"
          >
            {submitLabel}
            <Icon name="arrow" />
          </button>
        </div>
        <p id="ob-status" className="ob-status" role="status">
          {isComplete
            ? "All set. You’re ready to find your duo."
            : showErrors
              ? `Still needed: ${missing.join(", ")}.`
              : "Finish all four sections to continue."}
        </p>
      </div>
    </form>
  );
}

export function RankEmblem({ level, total = RANKS.length }) {
  return (
    <span
      className="rank-emblem"
      style={{ "--tier": level / total }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 40 44">
        <path d="M20 2 37 11v22L20 42 3 33V11Z" />
      </svg>
      <span>{level}</span>
    </span>
  );
}
