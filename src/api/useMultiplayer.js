import { useCallback, useEffect, useRef, useState } from "react";
import { worldApi } from "./index.js";
import { CHAT_HISTORY_SECONDS, WorldUnavailableError } from "./world.js";
import { localPlayer } from "../three/localPlayer.js";
import { respondToInvite } from "../lib/privateInvites.js";

const SYNC_MS = 500;
const INVITES_MS = 2500;
const KEEP_MESSAGES = 60;

function mergeMessages(current, fresh, userId, now) {
  if (!fresh.length) return current;
  // A server copy replaces the matching optimistic ("sending") message.
  const pending = [...current];
  for (const message of fresh) {
    const index = pending.findIndex(
      (item) =>
        item.local && item.userId === userId && item.body === message.body,
    );
    if (index !== -1) pending.splice(index, 1);
  }
  const known = new Set(pending.map((item) => item.id));
  const added = fresh
    .filter((message) => !known.has(message.id))
    .map((message) => ({ seenAt: now, ...message }));
  return [...pending, ...added].slice(-KEEP_MESSAGES);
}

// Live multiplayer by polling the Data API: shares your position (from
// localPlayer), and loads the other players and chat in `room`, per-room
// counts, and private-room invites. `available` is false until
// db/multiplayer.sql is applied. `onInviteAccepted(roomKey)` fires once when
// someone accepts your invite.
export function useMultiplayer({
  userId,
  name,
  room,
  enabled,
  onInviteAccepted,
}) {
  const [state, setState] = useState({
    available: null,
    room: null,
    peers: [],
    messages: [],
    counts: {},
    invites: [],
    error: "",
  });
  const acceptedRef = useRef(onInviteAccepted);
  const localCount = useRef(0);

  useEffect(() => {
    acceptedRef.current = onInviteAccepted;
  }, [onInviteAccepted]);

  // Position, peers, chat, counts.
  useEffect(() => {
    if (!enabled || !userId || !room) return undefined;
    let cancelled = false;
    let busy = false;
    let timer = null;
    const session = {
      afterId: 0,
      joinedAt: Date.now(),
      lastSent: "",
      lastSentAt: 0,
      ticks: 0,
    };

    async function sync() {
      if (busy) return;
      busy = true;
      try {
        const p = localPlayer;
        const spot = {
          room,
          x: p.x,
          z: p.z,
          facing: p.facing,
          emote: p.emote,
          emoteAt: p.emoteAt,
        };
        const key = JSON.stringify(spot);
        const now = Date.now();
        if (key !== session.lastSent || now - session.lastSentAt > 4000) {
          await worldApi.move(userId, spot);
          session.lastSent = key;
          session.lastSentAt = now;
        }
        session.ticks += 1;
        if (session.ticks % 2 === 1) {
          const [peers, fresh, counts] = await Promise.all([
            worldApi.peers(room, userId),
            worldApi.messages(room, {
              afterId: session.afterId,
              fromTime: session.joinedAt - CHAT_HISTORY_SECONDS * 1000,
            }),
            session.ticks % 6 === 1 ? worldApi.roomCounts() : null,
          ]);
          const first = session.afterId === 0;
          if (fresh.length) session.afterId = fresh.at(-1).id;
          if (cancelled) return;
          const seen = Date.now();
          setState((current) => ({
            ...current,
            available: true,
            error: "",
            room,
            peers,
            counts: counts ?? current.counts,
            // Chat from before you arrived doesn't pop up as bubbles.
            messages: mergeMessages(
              current.room === room ? current.messages : [],
              first ? fresh.map((m) => ({ ...m, seenAt: m.at })) : fresh,
              userId,
              seen,
            ),
          }));
        }
      } catch (error) {
        if (cancelled) return;
        if (error instanceof WorldUnavailableError) {
          clearInterval(timer);
          setState((current) => ({ ...current, available: false, room }));
        } else {
          setState((current) => ({ ...current, error: error.message, room }));
        }
      } finally {
        busy = false;
      }
    }

    sync();
    timer = setInterval(sync, SYNC_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [enabled, userId, room]);

  // Invites (and noticing when someone accepts yours).
  useEffect(() => {
    if (!enabled || !userId) return undefined;
    let cancelled = false;
    const joined = new Set();
    async function poll() {
      try {
        const invites = await worldApi.invites();
        if (cancelled) return;
        setState((current) => ({ ...current, invites }));
        for (const invite of invites) {
          if (
            invite.from === userId &&
            invite.status === "accepted" &&
            !joined.has(invite.id)
          ) {
            joined.add(invite.id);
            acceptedRef.current?.(`p:${invite.id}`, invite);
          }
        }
      } catch {
        // Invites are best-effort; the sync loop reports availability.
      }
    }
    poll();
    const timer = setInterval(poll, INVITES_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [enabled, userId]);

  // Leave the world when you go (sign out, close the tab).
  useEffect(() => {
    if (!enabled || !userId) return undefined;
    const leave = () => worldApi.leave(userId);
    window.addEventListener("pagehide", leave);
    return () => {
      window.removeEventListener("pagehide", leave);
      leave();
    };
  }, [enabled, userId]);

  const send = useCallback(
    async (text) => {
      const body = text.trim().slice(0, 200);
      if (!body || !room) return;
      localCount.current += 1;
      const id = `local-${localCount.current}`;
      const now = Date.now();
      setState((current) => ({
        ...current,
        messages: [
          ...(current.room === room ? current.messages : []),
          { id, local: true, userId, name, body, at: now, seenAt: now },
        ].slice(-KEEP_MESSAGES),
        room,
      }));
      try {
        await worldApi.say(room, body);
      } catch (error) {
        setState((current) => ({
          ...current,
          error: error.message,
          messages: current.messages.map((m) =>
            m.id === id ? { ...m, failed: true } : m,
          ),
        }));
      }
    },
    [room, userId, name],
  );

  const refreshInvites = useCallback(async () => {
    try {
      const invites = await worldApi.invites();
      setState((current) => ({ ...current, invites }));
    } catch {
      // Picked up by the next poll.
    }
  }, []);

  const invite = useCallback(
    async (peerId) => {
      try {
        await worldApi.invite(peerId);
        await refreshInvites();
      } catch (error) {
        setState((current) => ({ ...current, error: error.message }));
      }
    },
    [refreshInvites],
  );

  const answer = useCallback(
    (inviteId, status) => respondToInvite(
      worldApi.answer,
      refreshInvites,
      (error) => setState((current) => ({ ...current, error: error.message })),
      inviteId,
      status,
    ),
    [refreshInvites],
  );

  const current = state.room === room;
  return {
    available: state.available,
    peers: current ? state.peers : [],
    messages: current ? state.messages : [],
    counts: state.counts,
    invites: state.invites,
    error: state.error,
    send,
    invite,
    answer,
  };
}
