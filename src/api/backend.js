// Features that still need backend work. Neon Auth is live, and the gaming
// profile is stored in public.profiles through the Neon Data API
// (src/api/profiles.js). Flip a flag once its backend exists and the screen
// switches from its "not live yet" state.
export const backend = {
  // List other players' public profiles for the Find players feed.
  discovery: false,
  // Conversations, messages, duo invites, and session plans.
  messaging: false,
};
