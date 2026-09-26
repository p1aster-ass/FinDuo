import { useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import Icon from "./Icon.jsx";
import Tilt from "./Tilt.jsx";
import { COMM_STYLES, GAMES, RANKS, REGIONS } from "../data/options.js";
import {
  normalizeUsername,
  suggestUsername,
  USERNAME_MAX,
  usernameError,
} from "../lib/username.js";
import "./ProfileForm.css";

// Motion: sections and their cards fade up in a spring stagger, controls
// spring on hover/tap, and checkmarks pop in. MotionConfig below turns the
// movement off for people who prefer reduced motion.
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};
const cardPress = {
  whileHover: { scale: 1.03, y: -2 },
  whileTap: { scale: 0.97 },
};
const tilePress = { whileHover: { scale: 1.05 }, whileTap: { scale: 0.95 } };
const popIn = {
  initial: { scale: 0, opacity: 0, rotate: -45 },
  animate: { scale: 1, opacity: 1, rotate: 0 },
  exit: { scale: 0, opacity: 0 },
  transition: { type: "spring", stiffness: 500, damping: 26 },
};

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
    <motion.section
      variants={fadeUp}
      id={`ob-${id}`}
      className={`ob-section glass-panel${error ? " has-error" : ""}`}
      aria-labelledby={`ob-${id}-title`}
      tabIndex={-1}
    >
      <header className="ob-section-head">
        <span className={`ob-step${done ? " is-done" : ""}`} aria-hidden="true">
          <AnimatePresence mode="wait" initial={false}>
            {done ? (
              <motion.span key="done" className="ob-step-mark" {...popIn}>
                <Icon name="check" />
              </motion.span>
            ) : (
              <motion.span
                key="todo"
                className="ob-step-mark"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {icon ? <Icon name={icon} /> : String(index).padStart(2, "0")}
              </motion.span>
            )}
          </AnimatePresence>
        </span>
        <div className="ob-section-copy">
          <h2 id={`ob-${id}-title`}>{title}</h2>
          <p id={`ob-${id}-hint`}>{hint}</p>
        </div>
        {meta && <span className="ob-meta">{meta}</span>}
      </header>
      {children}
      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            className="ob-error"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

function toggleComm(current, style) {
  return current.includes(style.id)
    ? current.filter((id) => id !== style.id)
    : [...current.filter((id) => id !== style.excludes), style.id];
}

// Username plus the four gaming-preference sections, shared by onboarding and
// profile editing. `usernameRejection` ({ username, message }) shows a
// server-side problem, like a taken username, until that name is changed.
export default function ProfileForm({
  initialProfile,
  suggestedName = "",
  usernameRejection = null,
  submitLabel,
  onSubmit,
  onCancel,
  submitting = false,
  error = "",
  showProgress = false,
  children,
}) {
  const [username, setUsername] = useState(
    () => initialProfile?.username || suggestUsername(suggestedName),
  );
  const [games, setGames] = useState(initialProfile?.games ?? []);
  const [region, setRegion] = useState(initialProfile?.region ?? "");
  const [rank, setRank] = useState(initialProfile?.rank ?? "");
  const [comms, setComms] = useState(initialProfile?.commStyles ?? []);
  const [showErrors, setShowErrors] = useState(false);

  const usernameProblem = usernameError(username);
  const rejected =
    usernameRejection?.username === normalizeUsername(username)
      ? usernameRejection.message
      : "";
  const usernameMessage = rejected || (showErrors && usernameProblem) || "";
  const steps = [
    {
      key: "username",
      label: "Username",
      done: !usernameProblem && !rejected,
    },
    { key: "games", label: "Games", done: games.length > 0 },
    { key: "region", label: "Region", done: Boolean(region) },
    { key: "rank", label: "Rank", done: Boolean(rank) },
    { key: "comms", label: "Comms", done: comms.length > 0 },
  ];
  const completed = steps.filter((step) => step.done).length;
  const isComplete = completed === steps.length;
  const missing = steps.filter((step) => !step.done).map((step) => step.label);
  const rankIndex = RANKS.indexOf(rank);
  let statusText = `Finish all ${steps.length} sections to continue.`;
  if (error) statusText = error;
  else if (isComplete) statusText = "All set. You’re ready to find your duo.";
  else if (showErrors) statusText = `Still needed: ${missing.join(", ")}.`;
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
    if (submitting) return;
    if (!isComplete) {
      setShowErrors(true);
      const firstMissing = document.getElementById(
        `ob-${steps.find((step) => !step.done).key}`,
      );
      firstMissing?.scrollIntoView({ behavior: "smooth", block: "start" });
      firstMissing?.focus({ preventScroll: true });
      return;
    }
    onSubmit({
      username: normalizeUsername(username),
      games,
      region,
      rank,
      commStyles: comms,
    });
  }

  return (
    <MotionConfig reducedMotion="user">
      <motion.form
        className="ob-form"
        onSubmit={handleSubmit}
        noValidate
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        {showProgress && (
          <motion.ol
            variants={fadeUp}
            className="ob-progress"
            aria-label={`${completed} of ${steps.length} sections complete`}
          >
            {steps.map((step) => (
              <li key={step.key} className={step.done ? "is-done" : ""}>
                <a href={`#ob-${step.key}`}>
                  <span className="ob-progress-bar" />
                  {step.label}
                </a>
              </li>
            ))}
          </motion.ol>
        )}

        {children}

        <Section
          id="username"
          index={1}
          title="Choose your username"
          hint="Your unique handle. 3–20 letters, numbers, or underscores."
          done={!usernameProblem && !rejected}
          error={usernameMessage}
        >
          <div className="form-field username-field">
            <label htmlFor="ob-username-input" className="visually-hidden">
              Username
            </label>
            <div className="input-wrap">
              <span className="username-at" aria-hidden="true">
                @
              </span>
              <input
                id="ob-username-input"
                value={username}
                maxLength={USERNAME_MAX}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                aria-describedby="ob-username-hint"
                aria-invalid={Boolean(usernameMessage)}
                onChange={(event) =>
                  setUsername(event.target.value.toLowerCase())
                }
              />
            </div>
          </div>
        </Section>

        <Section
          id="games"
          index={2}
          title="Select your games"
          hint="Pick every game you want to find teammates for."
          meta={games.length > 0 ? `${games.length} selected` : null}
          done={games.length > 0}
          error={errorFor("games") && "Pick at least one game."}
        >
          <motion.ul
            variants={stagger}
            className="game-grid"
            aria-describedby="ob-games-hint"
          >
            {GAMES.map((game) => {
              const selected = games.includes(game.id);
              return (
                <motion.li key={game.id} variants={fadeUp}>
                  <Tilt
                    as={motion.button}
                    max={12}
                    {...cardPress}
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
                      <AnimatePresence initial={false}>
                        {selected && (
                          <motion.span className="game-check-mark" {...popIn}>
                            <Icon name="check" />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </span>
                  </Tilt>
                </motion.li>
              );
            })}
          </motion.ul>
        </Section>

        <Section
          id="region"
          index={3}
          title="Server region"
          hint="Where you queue most. We match you with players on low-ping servers."
          done={Boolean(region)}
          error={errorFor("region") && "Choose your region."}
        >
          <motion.div
            variants={stagger}
            className="region-grid"
            role="radiogroup"
            aria-labelledby="ob-region-title"
            aria-describedby="ob-region-hint"
          >
            {REGIONS.map((option) => (
              <motion.label
                key={option.id}
                variants={fadeUp}
                className="choice region-option"
              >
                <input
                  className="visually-hidden"
                  type="radio"
                  name="region"
                  value={option.id}
                  checked={region === option.id}
                  onChange={() => setRegion(option.id)}
                />
                <Tilt
                  as={motion.span}
                  {...cardPress}
                  className="choice-body region-body"
                >
                  <span className="region-icon">
                    <Icon name="globe" />
                  </span>
                  <span className="region-label">{option.label}</span>
                  <span className="region-detail">{option.detail}</span>
                </Tilt>
              </motion.label>
            ))}
          </motion.div>
        </Section>

        <Section
          id="rank"
          index={4}
          title="Current rank"
          hint="Your usual skill tier. You can change it later."
          meta={rank ? `Tier ${rankIndex + 1} of ${RANKS.length}` : null}
          done={Boolean(rank)}
          error={errorFor("rank") && "Choose your current rank."}
        >
          <motion.div
            variants={stagger}
            className="rank-grid"
            role="radiogroup"
            aria-labelledby="ob-rank-title"
            aria-describedby="ob-rank-hint"
          >
            {RANKS.map((tier, index) => (
              <motion.label
                key={tier}
                variants={fadeUp}
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
                <Tilt
                  as={motion.span}
                  max={14}
                  {...tilePress}
                  className="choice-body rank-body"
                >
                  <RankEmblem level={index + 1} />
                  <span className="rank-name">{tier}</span>
                </Tilt>
              </motion.label>
            ))}
          </motion.div>
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
          index={5}
          title="Preferred comm style"
          hint="How you like to talk (or not) in-game. Pick any that apply."
          done={comms.length > 0}
          error={errorFor("comms") && "Pick at least one comm style."}
        >
          <motion.div
            variants={stagger}
            className="comm-list"
            aria-describedby="ob-comms-hint"
          >
            {COMM_STYLES.map((style) => (
              <motion.button
                key={style.id}
                variants={fadeUp}
                {...cardPress}
                type="button"
                className="comm-pill"
                aria-pressed={comms.includes(style.id)}
                onClick={() =>
                  setComms((current) => toggleComm(current, style))
                }
              >
                <Icon name={style.icon} />
                {style.label}
              </motion.button>
            ))}
          </motion.div>
          <p className="ob-footnote">
            Mic Required and Ping Only can’t be combined, and neither can Chill
            and Highly Competitive.
          </p>
        </Section>

        <motion.div variants={fadeUp} className="ob-submit glass-panel">
          <p className="ob-submit-count">
            <strong>{completed}</strong> of {steps.length} sections complete
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
            <motion.button
              type="submit"
              className={`button button-primary ob-cta${isComplete ? " is-ready" : ""}`}
              aria-describedby="ob-status"
              disabled={submitting}
              whileHover={submitting ? undefined : { scale: 1.02 }}
              whileTap={submitting ? undefined : { scale: 0.98 }}
            >
              {submitLabel}
              <Icon name="arrow" />
            </motion.button>
          </div>
          <p
            id="ob-status"
            className={`ob-status${error ? " is-error" : ""}`}
            role={error ? "alert" : "status"}
          >
            {statusText}
          </p>
        </motion.div>
      </motion.form>
    </MotionConfig>
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
