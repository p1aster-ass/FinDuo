import { useState } from "react";
import { authClient } from "./client.js";
import { createAuthActions } from "./authActions.js";
import { AuthContext } from "./useAuth.js";

const actions = createAuthActions(authClient);

function ConnectedAuthProvider({ children }) {
  const { data, isPending, error, refetch } = authClient.useSession();
  const [restored, setRestored] = useState(false);
  // Only initial restoration replaces the app with a loading screen.
  // Later SDK refreshes must preserve form errors and verification notices.
  if (!isPending && !restored) setRestored(true);

  const session = !error && data?.user ? data.session : null;
  const user = session ? { ...data.user, displayName: data.user.name } : null;
  const value = {
    ...actions,
    user,
    session,
    loading: !restored && isPending,
    configured: true,
    error: error ? "We couldn't check your session. Check your connection and try again." : "",
    refreshSession: refetch,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }) {
  if (authClient) return <ConnectedAuthProvider>{children}</ConnectedAuthProvider>;
  return (
    <AuthContext.Provider value={{
      ...actions,
      user: null,
      session: null,
      loading: false,
      configured: false,
      error: "Sign-in is not configured. Please contact the site owner.",
    }}>
      {children}
    </AuthContext.Provider>
  );
}
