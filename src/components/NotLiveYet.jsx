import Icon from "./Icon.jsx";

// Shown in place of a screen whose backend doesn't exist yet.
export default function NotLiveYet({ icon, title, children, action }) {
  return (
    <section
      className="empty-state not-live glass-panel"
      aria-labelledby="not-live-title"
    >
      <span className="section-icon">
        <Icon name={icon} />
      </span>
      <span className="soon-tag">Not live yet</span>
      <h2 id="not-live-title">{title}</h2>
      <div className="not-live-body">{children}</div>
      {action}
    </section>
  );
}
