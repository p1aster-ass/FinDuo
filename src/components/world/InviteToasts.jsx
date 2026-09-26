import { AnimatePresence, motion } from "framer-motion";

// Private-room invites: accept or decline ones you get, cancel ones you sent,
// and hear back when someone declines.
export default function InviteToasts({
  invites,
  meId,
  blocked,
  dismissed,
  onAnswer,
  onDismiss,
}) {
  const visible = invites.filter((invite) => {
    if (dismissed.has(invite.id)) return false;
    const incoming = invite.to === meId;
    if (incoming)
      return invite.status === "pending" && !blocked.has(invite.from);
    return invite.status === "pending" || invite.status === "declined";
  });

  return (
    <div className="invite-toasts" aria-live="polite">
      <AnimatePresence>
        {visible.map((invite) => {
          const incoming = invite.to === meId;
          let text;
          let actions;
          if (incoming) {
            text = (
              <>
                <strong>{invite.fromName}</strong> invited you to a private
                room.
              </>
            );
            actions = (
              <>
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => onAnswer(invite.id, "accepted")}
                >
                  Join
                </button>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => onAnswer(invite.id, "declined")}
                >
                  No thanks
                </button>
              </>
            );
          } else if (invite.status === "pending") {
            text = (
              <>
                Waiting for <strong>{invite.toName}</strong> to accept…
              </>
            );
            actions = (
              <button
                type="button"
                className="button button-secondary"
                onClick={() => onAnswer(invite.id, "cancelled")}
              >
                Cancel
              </button>
            );
          } else {
            text = (
              <>
                <strong>{invite.toName}</strong> can’t join right now.
              </>
            );
            actions = (
              <button
                type="button"
                className="button button-secondary"
                onClick={() => onDismiss(invite.id)}
              >
                OK
              </button>
            );
          }
          return (
            <motion.div
              key={invite.id}
              className="invite-toast"
              role={incoming ? "alertdialog" : "status"}
              aria-label="Private room invite"
              initial={{ opacity: 0, y: -20, rotateX: -30 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <p>{text}</p>
              <div className="invite-actions">{actions}</div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
