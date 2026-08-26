import { useState } from "react";
import { compareSimulationRuns } from "../simulation/compareRuns";
import { useEdenStore } from "../store/edenStore";

function signed(value: number, digits = 0): string {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(digits)}`;
}

export function RunComparisonPanel() {
  const runs = useEdenStore((current) => current.runs);
  const [selectedFirst, setSelectedFirst] = useState("");
  const [selectedSecond, setSelectedSecond] = useState("");

  if (runs.length < 2) {
    return (
      <section className="comparison-panel is-empty" aria-label="Run comparison">
        <span className="eyebrow">RUN COMPARISON</span>
        <strong>Two runs unlock the design diff</strong>
        <p>
          Repair the habitat, rerun with the same seed, and EDEN will compare
          outcomes plus the exact design snapshots.
        </p>
      </section>
    );
  }

  const firstRunId = runs.some((run) => run.id === selectedFirst)
    ? selectedFirst
    : (runs.at(-1)?.id ?? "");
  const secondRunId = runs.some((run) => run.id === selectedSecond)
    ? selectedSecond
    : runs[0].id;
  const first = runs.find((run) => run.id === firstRunId)!;
  const second = runs.find((run) => run.id === secondRunId)!;
  const comparison = compareSimulationRuns(first, second);
  const diff = comparison.designDiff;
  const partialReserveHorizon = first.lastSol !== second.lastSol;
  const firstCause = first.failure?.code ?? "MISSION_SURVIVED";
  const secondCause = second.failure?.code ?? "MISSION_SURVIVED";

  return (
    <section className="comparison-panel" aria-label="Run comparison">
      <div className="comparison-heading">
        <span className="eyebrow">RUN COMPARISON</span>
        <strong>
          {first.status.toUpperCase()} → {second.status.toUpperCase()}
        </strong>
      </div>

      <div className="comparison-selectors">
        <label>
          From
          <select
            value={firstRunId}
            onChange={(event) => setSelectedFirst(event.target.value)}
          >
            {runs.map((run) => (
              <option value={run.id} key={run.id}>
                v{run.designVersion} · {run.status} S{run.lastSol}
              </option>
            ))}
          </select>
        </label>
        <label>
          To
          <select
            value={secondRunId}
            onChange={(event) => setSelectedSecond(event.target.value)}
          >
            {runs.map((run) => (
              <option value={run.id} key={run.id}>
                v{run.designVersion} · {run.status} S{run.lastSol}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="comparison-metrics">
        <div>
          <span>Survival</span>
          <strong>{signed(comparison.delta.survivalSols)} sol</strong>
        </div>
        <div>
          <span>Cost</span>
          <strong>{signed(comparison.delta.costUsd / 1_000_000, 2)}M</strong>
        </div>
        <div>
          <span>Mass</span>
          <strong>{signed(comparison.delta.massKg / 1_000, 1)}t</strong>
        </div>
        <div>
          <span>O₂ margin{partialReserveHorizon ? "*" : ""}</span>
          <strong>{signed(comparison.delta.oxygenReserveSols, 1)} sol</strong>
        </div>
      </div>

      <p className="comparison-reserve-note">
        Cause {firstCause} → {secondCause} · Battery{" "}
        {signed(comparison.delta.minBatteryPercent, 1)} pp · Water{" "}
        {signed(comparison.delta.waterReserveSols, 1)} sol · O₂{" "}
        {signed(comparison.delta.oxygenReserveSols, 1)} sol
        {partialReserveHorizon
          ? ` · *partial horizons (S${first.lastSol} vs S${second.lastSol})`
          : ""}
      </p>

      <div className="design-diff">
        <strong>Design snapshot diff</strong>
        {diff.addedModuleIds.map((id) => (
          <span className="is-added" key={`add-${id}`}>
            + {id}
          </span>
        ))}
        {diff.removedModuleIds.map((id) => (
          <span className="is-removed" key={`remove-${id}`}>
            − {id}
          </span>
        ))}
        {diff.changedModules.map((item) => (
          <span key={`change-${item.id}`}>
            ~ {item.id}: {item.fields.join(", ")}
          </span>
        ))}
        {diff.changedConstraints.map((field) => (
          <span key={`constraint-${field}`}>∆ constraint: {field}</span>
        ))}
        {diff.addedModuleIds.length === 0 &&
        diff.removedModuleIds.length === 0 &&
        diff.changedModules.length === 0 &&
        diff.changedConstraints.length === 0 ? (
          <span>No design mutations between these snapshots.</span>
        ) : null}
      </div>
    </section>
  );
}
