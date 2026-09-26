import { useEffect, useRef, useState } from "react";
import Icon from "../Icon.jsx";
import { MAX_MESSAGE } from "../../lib/chat.js";

// Room chat. Enter focuses it from anywhere; Escape leaves it (so WASD
// walks again). New messages also float above the sender in 3D.
export default function ChatBox({
  title,
  messages,
  available,
  error,
  onSend,
  meId,
}) {
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(() => window.innerWidth > 760);
  const input = useRef(null);
  const list = useRef(null);

  useEffect(() => {
    function onKey(event) {
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(
        event.target?.tagName,
      );
      if (event.key === "Enter" && !typing && available) {
        event.preventDefault();
        setOpen(true);
        requestAnimationFrame(() => input.current?.focus());
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [available]);

  useEffect(() => {
    if (list.current) list.current.scrollTop = list.current.scrollHeight;
  }, [messages.length, open]);

  function submit(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft("");
  }

  return (
    <section
      className={`chat-box${open ? "" : " is-collapsed"}`}
      aria-label={title}
    >
      <button
        type="button"
        className="chat-box-head"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Icon name="chat" />
        <span>{title}</span>
        <span className="chat-box-hint">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <>
          <ol className="chat-box-list" ref={list} aria-live="polite">
            {available === false && (
              <li className="chat-box-note">
                Chat isn’t set up yet. Your team needs to run
                db/multiplayer.sql.
              </li>
            )}
            {available && messages.length === 0 && (
              <li className="chat-box-note">
                No messages yet. Say hi! It’ll float above your head.
              </li>
            )}
            {messages.map((message) => (
              <li
                key={message.id}
                className={`chat-line${message.userId === meId ? " is-me" : ""}${
                  message.failed ? " is-failed" : ""
                }`}
              >
                <strong>{message.name}</strong> {message.body}
                {message.failed && <em> (not sent)</em>}
              </li>
            ))}
          </ol>
          <form className="chat-box-form" onSubmit={submit}>
            <input
              ref={input}
              value={draft}
              maxLength={MAX_MESSAGE}
              placeholder={
                available ? "Press Enter to chat…" : "Chat unavailable"
              }
              aria-label="Message"
              disabled={!available}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") event.currentTarget.blur();
              }}
            />
            <button
              type="submit"
              className="button button-primary"
              disabled={!available || !draft.trim()}
              aria-label="Send message"
            >
              <Icon name="send" />
            </button>
          </form>
          {error && (
            <p className="chat-box-error" role="alert">
              {error}
            </p>
          )}
        </>
      )}
    </section>
  );
}
