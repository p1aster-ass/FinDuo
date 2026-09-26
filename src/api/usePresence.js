import { useEffect, useState } from "react";
import { presenceApi } from "./index.js";

const POLL_MS = 30_000;

// While `enabled`, checks the signed-in player in every 30 seconds and loads
// the other players who share their games. `presence` is false until
// db/presence.sql is applied; rooms then show everyone who plays the game.
export function usePresence({ userId, games, enabled }) {
  const [state, setState] = useState({
    status: "loading",
    presence: true,
    players: [],
    error: "",
  });
  const gamesKey = games.join(",");

  useEffect(() => {
    if (!enabled || !userId) return undefined;
    const list = gamesKey ? gamesKey.split(",") : [];
    let cancelled = false;
    let canTouch = true;

    async function tick() {
      try {
        if (canTouch) canTouch = await presenceApi.touch();
        const result = await presenceApi.players({
          games: list,
          excludeUserId: userId,
        });
        if (!cancelled) setState({ status: "ready", ...result, error: "" });
      } catch (error) {
        if (!cancelled) {
          setState((current) => ({
            ...current,
            status: "error",
            error: error.message,
          }));
        }
      }
    }

    tick();
    const timer = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [enabled, userId, gamesKey]);

  return state;
}
