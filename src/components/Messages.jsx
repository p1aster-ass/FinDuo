import { useEffect, useRef, useState } from "react";
import Icon from "./Icon.jsx";
import PlayerAvatar from "./PlayerAvatar.jsx";
import { GAME_BY_ID, REGION_BY_ID } from "../data/options.js";
import NotLiveYet from "./NotLiveYet.jsx";
import { gameProfilesFor } from "../lib/gameProfiles.js";

const timeFormat = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});
const dayFormat = new Intl.DateTimeFormat(undefined, { weekday: "short" });
const sessionFormat = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function formatStamp(iso) {
  const date = new Date(iso);
  return date.toDateString() === new Date().toDateString()
    ? timeFormat.format(date)
    : dayFormat.format(date);
}

function toDateInput(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function preview(message) {
  const prefix = message.from === "me" ? "You: " : "";
  if (message.type === "invite") return `${prefix}Duo invite`;
  if (message.type === "session") {
    return `${prefix}Session · ${GAME_BY_ID[message.session.game].name}`;
  }
  return `${prefix}${message.text}`;
}

function MessageItem({ message }) {
  const mine = message.from === "me";
  const accepted = message.status === "accepted";
  let body;
  if (message.type === "invite") {
    body = (
      <div className="chat-card">
        <span className="chat-card-icon">
          <Icon name="duo" />
        </span>
        <div>
          <p className="chat-card-title">Duo invite</p>
          <p className="chat-card-detail">
            {accepted ? "Accepted. You’re a duo!" : "Waiting for a reply…"}
          </p>
        </div>
        <span className={`chat-status${accepted ? " is-accepted" : ""}`}>
          {accepted ? "Accepted" : "Pending"}
        </span>
      </div>
    );
  } else if (message.type === "session") {
    body = (
      <div className="chat-card">
        <span className="chat-card-icon">
          <Icon name="calendar" />
        </span>
        <div>
          <p className="chat-card-title">
            {GAME_BY_ID[message.session.game].name} session
          </p>
          <p className="chat-card-detail">
            {sessionFormat.format(new Date(message.session.when))}
          </p>
        </div>
        <span className={`chat-status${accepted ? " is-accepted" : ""}`}>
          {accepted ? "Locked in" : "Pending"}
        </span>
      </div>
    );
  } else {
    body = <p className="chat-bubble">{message.text}</p>;
  }
  return (
    <li className={`chat-message${mine ? " is-mine" : ""}`}>
      {body}
      <time className="chat-time" dateTime={message.at}>
        {formatStamp(message.at)}
      </time>
    </li>
  );
}

function SessionPlanner({ games, onCancel, onSubmit }) {
  const today = toDateInput(new Date());
  const [game, setGame] = useState(games[0]);
  const [day, setDay] = useState(today);
  const [time, setTime] = useState("20:00");

  function submit(event) {
    event.preventDefault();
    onSubmit({ game, when: new Date(`${day}T${time}`).toISOString() });
  }

  return (
    <form className="session-planner" onSubmit={submit}>
      <p className="session-planner-title">
        <Icon name="calendar" /> Plan a session
      </p>
      <div className="session-fields">
        <label>
          Game
          <select
            value={game}
            onChange={(event) => setGame(event.target.value)}
          >
            {games.map((id) => (
              <option key={id} value={id}>
                {GAME_BY_ID[id].name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Day
          <input
            type="date"
            min={today}
            required
            value={day}
            onChange={(event) => setDay(event.target.value)}
          />
        </label>
        <label>
          Time
          <input
            type="time"
            required
            value={time}
            onChange={(event) => setTime(event.target.value)}
          />
        </label>
      </div>
      <div className="session-actions">
        <button
          type="button"
          className="button button-secondary"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button type="submit" className="button button-primary">
          Send invite
          <Icon name="arrow" />
        </button>
      </div>
    </form>
  );
}

function Thread({
  conversation,
  typing,
  profile,
  onBack,
  onSend,
  onPlanSession,
}) {
  const { player } = conversation;
  const [draft, setDraft] = useState("");
  const [planning, setPlanning] = useState(false);
  const listRef = useRef(null);
  const myGames = gameProfilesFor(profile).map((entry) => entry.game);
  const playerGames = gameProfilesFor(player).map((entry) => entry.game);
  const sharedGames = playerGames.filter((id) => myGames.includes(id));

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [conversation.messages.length, typing, planning]);

  function send(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onSend(player.id, text);
    setDraft("");
  }

  return (
    <section className="chat-thread" aria-labelledby="chat-thread-title">
      <header className="chat-thread-head">
        <button
          type="button"
          className="icon-button chat-back"
          onClick={onBack}
          aria-label="Back to conversations"
        >
          <Icon name="back" />
        </button>
        <PlayerAvatar name={player.name} online={player.online} />
        <div className="chat-thread-title">
          <h2 id="chat-thread-title">{player.name}</h2>
          <p>
            {Array.isArray(player.gameProfiles)
              ? playerGames.map((id) => GAME_BY_ID[id]?.name ?? id).join(" · ")
              : [player.rank, REGION_BY_ID[player.region]?.label ?? player.region].filter(Boolean).join(" · ")}
            {player.online ? " · Online" : ""}
          </p>
        </div>
        <button
          type="button"
          className="button button-secondary chat-plan"
          aria-expanded={planning}
          onClick={() => setPlanning(!planning)}
        >
          <Icon name="calendar" />
          <span>Plan session</span>
        </button>
      </header>

      <ol
        className="chat-messages"
        ref={listRef}
        aria-label={`Conversation with ${player.name}`}
      >
        {conversation.messages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}
        {typing && (
          <li className="chat-message">
            <p className="chat-bubble chat-typing">
              <span />
              <span />
              <span />
              <span className="visually-hidden">{player.name} is typing</span>
            </p>
          </li>
        )}
      </ol>

      {planning && (
        <SessionPlanner
          games={sharedGames.length ? sharedGames : playerGames}
          onCancel={() => setPlanning(false)}
          onSubmit={(session) => {
            onPlanSession(player.id, session);
            setPlanning(false);
          }}
        />
      )}

      <form className="chat-composer" onSubmit={send}>
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={`Message ${player.name}`}
          aria-label={`Message ${player.name}`}
          autoComplete="off"
        />
        <button
          type="submit"
          className="button button-primary"
          disabled={!draft.trim()}
          aria-label="Send message"
        >
          <Icon name="send" />
        </button>
      </form>
    </section>
  );
}

// Each conversation is { playerId, player, unread, messages }; the list stays
// empty until the messaging backend exists.
export default function Messages({
  profile,
  available,
  conversations = [],
  typing = {},
  activeId,
  onSelect,
  onBack,
  onSend,
  onPlanSession,
  onFindPlayers,
}) {
  const active = conversations.find((chat) => chat.playerId === activeId);
  const heading = (
    <div className="dashboard-heading">
      <div>
        <h1>
          From matched to queued<span className="brand-period">.</span>
        </h1>
        <p className="page-lede">
          Chat with your matches and lock in your next session.
        </p>
      </div>
    </div>
  );

  if (!available) {
    return (
      <>
        {heading}
        <NotLiveYet icon="chat" title="Messaging is on its way">
          <p>
            Soon you’ll be able to chat with your matches, send duo invites, and
            plan sessions together, all from here.
          </p>
        </NotLiveYet>
      </>
    );
  }

  return (
    <>
      {heading}

      <div className={`chat-layout glass-panel${active ? " has-active" : ""}`}>
        <nav className="chat-list" aria-label="Conversations">
          {conversations.length === 0 ? (
            <p className="chat-list-empty">No conversations yet.</p>
          ) : (
            <ul>
              {conversations.map((chat) => {
                const { player } = chat;
                const last = chat.messages.at(-1);
                return (
                  <li key={chat.playerId}>
                    <button
                      type="button"
                      className="chat-list-item"
                      aria-current={
                        chat.playerId === activeId ? "true" : undefined
                      }
                      onClick={() => onSelect(chat.playerId)}
                    >
                      <PlayerAvatar name={player.name} online={player.online} />
                      <span className="chat-list-copy">
                        <span className="chat-list-name">
                          {player.name}
                          <time dateTime={last.at}>{formatStamp(last.at)}</time>
                        </span>
                        <span className="chat-list-preview">
                          {typing[chat.playerId] ? "typing…" : preview(last)}
                        </span>
                      </span>
                      {chat.unread > 0 && (
                        <span className="nav-count">
                          {chat.unread}
                          <span className="visually-hidden"> unread</span>
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <button
            type="button"
            className="button button-secondary chat-find"
            onClick={onFindPlayers}
          >
            <Icon name="users" />
            Find more players
          </button>
        </nav>

        {active ? (
          <Thread
            key={active.playerId}
            conversation={active}
            typing={Boolean(typing[active.playerId])}
            profile={profile}
            onBack={onBack}
            onSend={onSend}
            onPlanSession={onPlanSession}
          />
        ) : (
          <div className="chat-empty">
            <span className="section-icon">
              <Icon name="chat" />
            </span>
            <h2>Pick a conversation</h2>
            <p>Or find someone new and say hi.</p>
          </div>
        )}
      </div>
    </>
  );
}
