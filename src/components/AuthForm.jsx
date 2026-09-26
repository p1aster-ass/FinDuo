import { useRef, useState } from "react";
import Icon from "./Icon.jsx";
import { authErrorMessage } from "../auth/authActions.js";

function ProviderIcon({ provider }) {
  return provider === "Google" ? (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M21.6 12.2c0-.7-.1-1.5-.2-2.2H12v4h5.4a4.6 4.6 0 0 1-2 3c-1 .7-2.1 1-3.4 1a6 6 0 1 1 0-12c1.5 0 2.8.5 3.9 1.5l2.9-2.8A10 10 0 1 0 12 22c5.8 0 9.6-4.1 9.6-9.8Z" />
    </svg>
  ) : (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M19.8 5.2a18 18 0 0 0-4.4-1.4l-.5 1.1a16 16 0 0 0-5.8 0l-.5-1.1a18 18 0 0 0-4.4 1.4C1.5 9.3.8 13.3 1.2 17.3a18 18 0 0 0 5.4 2.8l1.2-1.9-1.8-.9.4-.4a14 14 0 0 0 11.2 0l.4.4-1.8.9 1.2 1.9a18 18 0 0 0 5.4-2.8c.5-4.7-.9-8.7-3-12.1ZM8.2 14.8c-1.1 0-1.9-1-1.9-2.2s.8-2.2 1.9-2.2 1.9 1 1.9 2.2-.8 2.2-1.9 2.2Zm7.6 0c-1.1 0-1.9-1-1.9-2.2s.8-2.2 1.9-2.2 1.9 1 1.9 2.2-.8 2.2-1.9 2.2Z" />
    </svg>
  );
}

// Sign-in / create-account card. It sits on the Gameboy's screen in the attic.
// The auth adapter owns the session; this form never creates a demo login.
export default function AuthForm({ auth }) {
  const [mode, setMode] = useState("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const busy = useRef(false);
  const isRegister = mode === "signup";

  async function authenticate(event, provider) {
    event?.preventDefault();
    if (busy.current) return;
    const action = provider
      ? auth?.signInWithProvider
      : isRegister
        ? auth?.signUp
        : auth?.signIn;
    if (!action) {
      setNotice(
        "Sign-in is not available yet. Please check back when FinDuo launches.",
      );
      return;
    }
    const form = event?.currentTarget;
    const data = form ? new FormData(form) : null;
    busy.current = true;
    setPending(true);
    setNotice("");
    setError("");
    try {
      const result = await action(
        provider
          ? provider.toLowerCase()
          : {
              email: data.get("email"),
              password: data.get("password"),
              ...(isRegister && {
                displayName: data.get("displayName"),
                confirmPassword: data.get("confirmPassword"),
              }),
            },
      );
      form?.reset();
      setNotice(
        isRegister && !provider && !result?.token
          ? "Account created. If email verification is required, complete it before signing in."
          : "Waiting for your account to finish signing in…",
      );
    } catch (error) {
      setError(authErrorMessage(error));
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  function changeMode(next) {
    setMode(next);
    setNotice("");
    setError("");
    setShowPassword(false);
  }

  return (
    <section className="auth-card glass-panel" aria-labelledby="auth-title">
      <div className="auth-switch" role="group" aria-label="Account access">
        <span
          className={`auth-switch-indicator ${isRegister ? "is-register" : ""}`}
          aria-hidden="true"
        />
        <button
          type="button"
          aria-pressed={!isRegister}
          disabled={pending}
          onClick={() => changeMode("signin")}
        >
          Sign in
        </button>
        <button
          type="button"
          aria-pressed={isRegister}
          disabled={pending}
          onClick={() => changeMode("signup")}
        >
          Create account
        </button>
      </div>
      <div className="auth-heading">
        <span className="section-icon">
          <Icon name={isRegister ? "users" : "spark"} />
        </span>
        <h2 id="auth-title">
          {isRegister ? "Your squad is out there." : "Welcome back, player."}
        </h2>
        <p>
          {isRegister
            ? "Create an account. Make your next game a good one."
            : "Sign in and get ready for your next great game."}
        </p>
      </div>
      <form
        key={mode}
        className="auth-form"
        onSubmit={authenticate}
        aria-busy={pending}
        aria-describedby="auth-notice"
      >
        {isRegister && (
          <div className="form-field">
            <label htmlFor="displayName">Display name</label>
            <div className="input-wrap">
              <Icon name="users" />
              <input
                id="displayName"
                name="displayName"
                type="text"
                autoComplete="nickname"
                placeholder="Your player name"
                required
                disabled={pending}
              />
            </div>
          </div>
        )}
        <div className="form-field">
          <label htmlFor="email">Email address</label>
          <div className="input-wrap">
            <Icon name="mail" />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              disabled={pending}
            />
          </div>
        </div>
        <div className="form-field">
          <label htmlFor="password">Password</label>
          <div className="input-wrap">
            <Icon name="lock" />
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={isRegister ? "new-password" : "current-password"}
              placeholder={
                isRegister ? "Choose your password" : "Enter your password"
              }
              minLength={isRegister ? 8 : undefined}
              maxLength={isRegister ? 128 : undefined}
              required
              disabled={pending}
            />
            <button
              className="password-toggle"
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword(!showPassword)}
            >
              <Icon name={showPassword ? "eyeOff" : "eye"} />
            </button>
          </div>
        </div>
        {isRegister && (
          <div className="form-field">
            <label htmlFor="confirmPassword">Confirm password</label>
            <div className="input-wrap">
              <Icon name="lock" />
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Enter your password again"
                required
                disabled={pending}
              />
            </div>
          </div>
        )}
        <button
          className="button button-primary auth-submit"
          disabled={pending || auth?.configured === false}
          type="submit"
        >
          <span>
            {pending
              ? "Connecting…"
              : isRegister
                ? "Create account"
                : "Sign in"}
          </span>
          <Icon name="arrow" />
        </button>
      </form>
      {auth?.signInWithProvider && (
        <>
          <div className="auth-divider">
            <span>or continue with</span>
          </div>
          <div className="provider-buttons">
            {["Discord", "Google"].map((provider) => (
              <button
                type="button"
                className="button button-secondary"
                key={provider}
                disabled={pending}
                onClick={() => authenticate(null, provider)}
                aria-label={`Continue with ${provider}`}
              >
                <ProviderIcon provider={provider} />
                {provider}
              </button>
            ))}
          </div>
        </>
      )}
      <p
        id="auth-notice"
        className="auth-notice"
        role={error || auth?.error ? "alert" : "status"}
      >
        {error || auth?.error || notice}
      </p>
      {auth?.error && auth.refreshSession && (
        <button
          type="button"
          className="text-button"
          onClick={() => auth.refreshSession()}
        >
          Retry session check
        </button>
      )}
      <p className="auth-bottom">
        {isRegister ? "Already part of the squad?" : "New to FinDuo?"}{" "}
        <button
          type="button"
          className="text-button"
          disabled={pending}
          onClick={() => changeMode(isRegister ? "signin" : "signup")}
        >
          {isRegister ? "Sign in" : "Join the party"}{" "}
          <span aria-hidden="true">↗</span>
        </button>
      </p>
    </section>
  );
}
