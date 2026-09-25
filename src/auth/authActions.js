export class AuthActionError extends Error {}

const messages = {
  // Neon normalizes HTTP errors to snake_case; SDK result errors may use Better Auth codes.
  invalid_credentials: "Email or password is incorrect.",
  user_not_found: "Email or password is incorrect.",
  user_already_exists: "An account with this email already exists. Please sign in.",
  email_exists: "An account with this email already exists. Please sign in.",
  email_not_confirmed: "Verify your email before signing in.",
  email_address_invalid: "Enter a valid email address.",
  weak_password: "Choose a stronger password with at least 8 characters.",
  INVALID_EMAIL_OR_PASSWORD: "Email or password is incorrect.",
  INVALID_PASSWORD: "Email or password is incorrect.",
  USER_NOT_FOUND: "Email or password is incorrect.",
  USER_ALREADY_EXISTS: "An account with this email already exists. Please sign in.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "An account with this email already exists. Please sign in.",
  INVALID_EMAIL: "Enter a valid email address.",
  PASSWORD_TOO_SHORT: "Use a password with at least 8 characters.",
  PASSWORD_TOO_LONG: "Use a password with no more than 128 characters.",
  EMAIL_NOT_VERIFIED: "Verify your email before signing in.",
  SIGNUP_DISABLED: "Account creation is currently unavailable.",
};

export function authErrorMessage(error) {
  if (error instanceof AuthActionError) return error.message;
  if (messages[error?.code]) return messages[error.code];
  // The current Neon SDK maps this specific duplicate-email response to 422 validation_failed.
  if (error?.code === "validation_failed" && error.message === "User already exists. Use another email.") {
    return messages.user_already_exists;
  }
  if (error?.status === 429) return "Too many attempts. Please wait a moment and try again.";
  if (error instanceof TypeError || error?.status === 0) {
    return "Unable to connect. Check your internet connection and try again.";
  }
  return "We couldn't complete your request. Please try again.";
}

export function validateCredentials({ email, password, displayName, confirmPassword }, signup = false) {
  const normalizedEmail = typeof email === "string" ? email.trim() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new AuthActionError("Enter a valid email address.");
  }
  if (typeof password !== "string" || !password) {
    throw new AuthActionError("Enter your password.");
  }
  if (!signup) return { email: normalizedEmail, password };
  const name = typeof displayName === "string" ? displayName.trim() : "";
  if (!name) throw new AuthActionError("Enter a display name.");
  if (password.length < 8) throw new AuthActionError(messages.PASSWORD_TOO_SHORT);
  if (password.length > 128) throw new AuthActionError(messages.PASSWORD_TOO_LONG);
  if (password !== confirmPassword) throw new AuthActionError("Passwords do not match.");
  return { email: normalizedEmail, password, name };
}

export function createAuthActions(client) {
  async function request(action) {
    if (!client) throw new AuthActionError("Sign-in is not configured. Please contact the site owner.");
    try {
      const result = await action();
      if (result.error) throw result.error;
      return result.data;
    } catch (error) {
      throw new AuthActionError(authErrorMessage(error));
    }
  }

  return {
    signIn: (credentials) => request(() => client.signIn.email(validateCredentials(credentials))),
    signUp: (credentials) => request(() => client.signUp.email(validateCredentials(credentials, true))),
    signOut: () => request(() => client.signOut()),
  };
}
