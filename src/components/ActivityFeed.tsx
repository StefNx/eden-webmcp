import { useEdenStore } from "../store/edenStore";

function formatTime(timestamp: string): string {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(timestamp));
}

export function ActivityFeed() {
  const activity = useEdenStore((current) => current.activity);

  return (
    <section className="activity-section" aria-label="Human and agent activity">
      <div className="panel-section-heading">
        <span>SHARED ACTIVITY</span>
        <small>{activity.length} events</small>
      </div>
      <div className="activity-feed" aria-live="polite">
        {activity.slice(0, 10).map((entry) => (
          <article className={`activity-entry is-${entry.actor}`} key={entry.id}>
            <div>
              <span className="actor-badge">{entry.actor}</span>
              <time dateTime={entry.timestamp}>{formatTime(entry.timestamp)}</time>
              <small>v{entry.designVersion}</small>
            </div>
            <strong>{entry.action.replaceAll("_", " ")}</strong>
            <p>{entry.message}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
