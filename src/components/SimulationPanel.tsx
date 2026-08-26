import type { TimelinePoint } from "../domain/types";
import { edenStore, useEdenStore } from "../store/edenStore";

function sparkline(
  points: TimelinePoint[],
  accessor: (point: TimelinePoint) => number,
): string {
  if (points.length < 2) return "";
  const sampled = points.filter(
    (_, index) => index % Math.max(1, Math.floor(points.length / 80)) === 0,
  );
  const values = sampled.map(accessor);
  const min = Math.min(...values);
  const max = Math.max(...values);
  return sampled
    .map((point, index) => {
      const x = (index / Math.max(1, sampled.length - 1)) * 100;
      const normalized = (accessor(point) - min) / Math.max(0.0001, max - min);
      const y = 34 - normalized * 30;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

export function SimulationPanel() {
  const runs = useEdenStore((current) => current.runs);
  const activeRunId = useEdenStore((current) => current.activeRunId);
  const run = runs.find((candidate) => candidate.id === activeRunId) ?? runs[0];

  return (
    <section className="simulation-panel">
      <div className="simulation-actions">
        <button
          className="run-button"
          type="button"
          onClick={() => edenStore.actions.run()}
        >
          <span>▶</span>
          RUN 500 SOLS
        </button>
        <button
          className="secondary-button"
          type="button"
          onClick={() => edenStore.actions.reset()}
        >
          Reset starter design
        </button>
      </div>

      <div className={`run-result ${run ? `is-${run.status}` : ""}`}>
        <div className="run-result__headline">
          <div>
            <span className="eyebrow">LATEST RUN</span>
            <strong>
              {run
                ? run.status === "success"
                  ? "MISSION SURVIVED"
                  : "MISSION FAILED"
                : "AWAITING RUN"}
            </strong>
          </div>
          <div className="sol-counter">SOL {run?.lastSol ?? "—"}</div>
        </div>

        {run ? (
          <>
            <svg
              className="telemetry-chart"
              viewBox="0 0 100 36"
              preserveAspectRatio="none"
              aria-label="Battery telemetry"
            >
              <polyline points={sparkline(run.timeline, (point) => point.batteryKwh)} />
            </svg>
            {run.failure ? (
              <div className="failure-card">
                <span>{run.failure.code}</span>
                <strong>{run.failure.summary}</strong>
                <ul>
                  {run.failure.evidence.slice(0, 3).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="success-card">
                <span>✓</span>
                <div>
                  <strong>All mission gates passed</strong>
                  <small>
                    Min water reserve {run.metrics.minWaterReserveSols.toFixed(1)} sols ·
                    min O₂ reserve {run.metrics.minOxygenReserveSols.toFixed(1)} sols
                  </small>
                </div>
              </div>
            )}
            <div className="event-log">
              {run.events
                .slice(-5)
                .reverse()
                .map((event) => (
                  <div
                    key={`${event.sol}-${event.code}`}
                    className={`event is-${event.severity}`}
                  >
                    <span>S{event.sol}</span>
                    <p>{event.message}</p>
                  </div>
                ))}
            </div>
          </>
        ) : (
          <p className="simulation-hint">
            The seeded design is intentionally fragile. Run it, inspect the causal
            failure, then let an agent repair it through WebMCP.
          </p>
        )}
      </div>
    </section>
  );
}
