import { useEffect, useMemo, useRef, useState } from "react";
import NavBar from "./NavBar.jsx";
import Overview from "./Overview.jsx";
import Discover from "./Discover.jsx";
import Messages from "./Messages.jsx";
import Profile from "./Profile.jsx";
import {
  AUTO_REPLIES,
  INITIAL_CONVERSATIONS,
  PLAYERS,
} from "../data/mockPlayers.js";
import { scoreMatch } from "../lib/match.js";
import "./Hub.css";

const REPLY_DELAY = 2400;

let messageCount = 0;
function newId() {
  messageCount += 1;
  return `m${Date.now()}-${messageCount}`;
}

// The signed-in player hub. Conversations are mocked in memory until the
// messaging backend exists; replies are simulated so the flow can be tested.
export default function Dashboard({ auth, profile, onProfileChange }) {
  const [view, setView] = useState("overview");
  const [conversations, setConversations] = useState(INITIAL_CONVERSATIONS);
  const [activeChat, setActiveChat] = useState(null);
  const [typing, setTyping] = useState({});
  const mainRef = useRef(null);
  const timers = useRef([]);
  const viewingChat = useRef(null);
  const replyCount = useRef(0);

  const displayName = profile.displayName || auth.user.displayName || "Player";
  const user = { ...auth.user, displayName };

  useEffect(() => {
    viewingChat.current = view === "messages" ? activeChat : null;
  }, [view, activeChat]);
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const matches = useMemo(
    () =>
      PLAYERS.map((player) => ({ player, match: scoreMatch(profile, player) }))
        .sort((a, b) => b.match.score - a.match.score),
    [profile],
  );
  const unread = conversations.reduce((total, chat) => total + chat.unread, 0);
  const invited = new Set(
    conversations
      .filter((chat) =>
        chat.messages.some((m) => m.type === "invite" && m.from === "me"),
      )
      .map((chat) => chat.playerId),
  );

  function navigate(next) {
    setView(next);
    window.scrollTo(0, 0);
    mainRef.current?.focus({ preventScroll: true });
  }

  function appendMessage(playerId, message) {
    const entry = { id: newId(), at: new Date().toISOString(), ...message };
    setConversations((current) => {
      const existing = current.find((chat) => chat.playerId === playerId);
      const unreadBump =
        message.from === "them" && viewingChat.current !== playerId ? 1 : 0;
      const updated = existing
        ? {
            ...existing,
            unread: existing.unread + unreadBump,
            messages: [...existing.messages, entry],
          }
        : { playerId, unread: unreadBump, messages: [entry] };
      return [updated, ...current.filter((chat) => chat !== existing)];
    });
    return entry.id;
  }

  function setMessageStatus(playerId, messageId, status) {
    setConversations((current) =>
      current.map((chat) =>
        chat.playerId === playerId
          ? {
              ...chat,
              messages: chat.messages.map((m) =>
                m.id === messageId ? { ...m, status } : m,
              ),
            }
          : chat,
      ),
    );
  }

  function simulateReply(playerId, respond) {
    const startTyping = setTimeout(
      () => setTyping((current) => ({ ...current, [playerId]: true })),
      REPLY_DELAY / 3,
    );
    const reply = setTimeout(() => {
      setTyping((current) => ({ ...current, [playerId]: false }));
      respond();
    }, REPLY_DELAY);
    timers.current.push(startTyping, reply);
  }

  function sendMessage(playerId, text) {
    appendMessage(playerId, { from: "me", type: "text", text });
    const reply = AUTO_REPLIES[replyCount.current % AUTO_REPLIES.length];
    replyCount.current += 1;
    simulateReply(playerId, () =>
      appendMessage(playerId, { from: "them", type: "text", text: reply }),
    );
  }

  function planSession(playerId, session) {
    const id = appendMessage(playerId, {
      from: "me",
      type: "session",
      status: "pending",
      session,
    });
    simulateReply(playerId, () => {
      setMessageStatus(playerId, id, "accepted");
      appendMessage(playerId, {
        from: "them",
        type: "text",
        text: "Locked in. See you then!",
      });
    });
  }

  function sendInvite(playerId) {
    const id = appendMessage(playerId, {
      from: "me",
      type: "invite",
      status: "pending",
    });
    simulateReply(playerId, () => {
      setMessageStatus(playerId, id, "accepted");
      appendMessage(playerId, {
        from: "them",
        type: "text",
        text: "Duo invite accepted! When are you usually on?",
      });
    });
  }

  function openChat(playerId) {
    setActiveChat(playerId);
    setConversations((current) =>
      current.map((chat) =>
        chat.playerId === playerId ? { ...chat, unread: 0 } : chat,
      ),
    );
    if (view !== "messages") navigate("messages");
  }

  const pages = {
    overview: (
      <Overview
        user={user}
        profile={profile}
        matches={matches}
        unread={unread}
        chatCount={conversations.length}
        onNavigate={navigate}
        onMessage={openChat}
      />
    ),
    discover: (
      <Discover
        profile={profile}
        matches={matches}
        invited={invited}
        onInvite={sendInvite}
        onMessage={openChat}
      />
    ),
    messages: (
      <Messages
        profile={profile}
        conversations={conversations}
        activeId={activeChat}
        typing={typing}
        onSelect={openChat}
        onBack={() => setActiveChat(null)}
        onSend={sendMessage}
        onPlanSession={planSession}
        onFindPlayers={() => navigate("discover")}
      />
    ),
    profile: (
      <Profile user={user} profile={profile} onSave={onProfileChange} />
    ),
  };

  return (
    <div className="dashboard">
      <NavBar
        user={user}
        view={view}
        unread={unread}
        onNavigate={navigate}
        onSignOut={auth.signOut}
      />
      <main
        id="main-content"
        ref={mainRef}
        className={`page-container dashboard-main hub-main hub-${view}`}
        tabIndex={-1}
      >
        <div key={view} className="hub-page">
          {pages[view]}
        </div>
      </main>
    </div>
  );
}
