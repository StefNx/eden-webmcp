import { useEffect, useState } from "react";
import type { SimulationRun } from "../domain/types";
import { edenStore, useEdenStore } from "../store/edenStore";
import { RunComparisonPanel } from "./RunComparisonPanel";
import { TelemetryChart } from "./TelemetryChart";

function useAnimatedSol(run: SimulationRun | undefined): number | string {
  const [displayedSol, setDisplayedSol] = useState<number | string>("—");

  useEffect(() => {
    if (!run) {
      setDisplayedSol("—");
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplayedSol(run.lastSol);
      return;
    }

    let frame = 0;
    const startedAt = performance.now();
    const durationMs = Math.min(1_100, Math.max(550, run.lastSol * 2));
    const update = (now: number) => {
      // Some embedded browsers expose a requestAnimationFrame timestamp whose
      // time origin briefly differs from performance.now(). Never let that
      // mismatch render a physically impossible negative mission sol.
      const progress = Math.min(
        1,
        Math.max(0, (now - startedAt) / durationMs),
      );
      const eased = 1 - (1 - progress) ** 3;
      setDisplayedSol(Math.round(run.lastSol * eased));
      if (progress < 1) frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [run?.id, run?.lastSol]);

  return displayedSol;
}

export function SimulationPanel() {
  const design = useEdenStore((current) => current.design);
  const runs = useEdenStore((current) => current.runs);
  const activeRunId = useEdenStore((current) => current.activeRunId);
  const run = runs.find((candidate) => candidate.id === activeRunId) ?? runs[0];
  const animatedSol = useAnimatedSol(run);

  return (
    <section className="simulation-panel" aria-label="Deterministic simulation lab">
      <div className="simulation-actions">
        <span className="eyebrow">DETERMINISTIC ENGINE</span>
        <div className="seed-readout">
          <span>Seed</span>
          <code>424242</code>
        </div>
        <button
          className="run-button"
          type="button"
          onClick={() => edenStore.actions.run(424_242, "human")}
        >
          <span aria-hidden="true">▶</span>
          RUN {design.constraints.durationSols} SOLS
        </button>
        <button
          className="secondary-button"
          type="button"
          onClick={() => edenStore.actions.reset("human")}
          title="Restore the starter graph and clear run history"
        >
          Guided-demo reset
        </button>
        <p>
          Same design + scenario + seed produces the same telemetry and causal
          outcome.
        </p>
      </div>

      <div className={`run-result ${run ? `is-${run.status}` : ""}`}>
        <div className="run-result__headline">
          <div aria-live="polite">
            <span className="eyebrow">ACTIVE RUN</span>
            <strong>
              {run
                ? run.status === "success"
                  ? "MISSION SURVIVED"
                  : "MISSION FAILED"
                : "AWAITING RUN"}
            </strong>
          </div>
          {runs.length > 0 ? (
            <label className="active-run-picker">
              History
              <select
                value={run?.id}
                onChange={(event) =>
                  edenStore.actions.setActiveRun(event.target.value)
                }
              >
                {runs.map((item) => (
                  <option value={item.id} key={item.id}>
                    v{item.designVersion} · {item.status} · S{item.lastSol}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <div className="sol-counter">SOL {animatedSol}</div>
        </div>

        {run ? (
          <>
            <TelemetryChart run={run} />
            <div className="run-result__details">
              {run.failure ? (
                <article className="failure-card">
                  <span>{run.failure.code}</span>
                  <strong>{run.failure.summary}</strong>
                  <ul>
                    {run.failure.evidence.slice(0, 4).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <p>{run.failure.suggestedActions[0]}</p>
                </article>
              ) : (
                <article className="success-card">
                  <span aria-hidden="true">✓</span>
                  <div>
                    <strong>All mission gates passed</strong>
                    <small>
                      Min water {run.metrics.minWaterReserveSols.toFixed(1)} sols ·
                      min O₂ {run.metrics.minOxygenReserveSols.toFixed(1)} sols ·
                      ${(run.metrics.totalCostUsd / 1_000_000).toFixed(2)}M ·
                      {(run.metrics.totalMassKg / 1_000).toFixed(1)}t
                    </small>
                  </div>
                </article>
              )}
              <div className="event-log" aria-label="Simulation event log">
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
            </div>
          </>
        ) : (
          <p className="simulation-hint">
            The starter design is intentionally fragile. Run it, inspect the causal
            evidence, then let an agent repair the same visible graph through
            WebMCP.
          </p>
        )}
      </div>

      <RunComparisonPanel />
    </section>
  );
}
