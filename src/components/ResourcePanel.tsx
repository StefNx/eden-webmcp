import { useMemo } from "react";
import { edenStore, useEdenStore } from "../store/edenStore";
import { ActivityFeed } from "./ActivityFeed";
import { DeveloperPanel } from "./DeveloperPanel";
import { ModelAssumptions } from "./ModelAssumptions";
import { ModuleInspector } from "./ModuleInspector";

function formatMoney(value: number): string {
  return `$${(value / 1_000_000).toFixed(2)}M`;
}

function MetricBar({
  label,
  value,
  max,
  unit,
}: {
  label: string;
  value: number;
  max: number;
  unit: string;
}) {
  const percent = Math.max(0, Math.min(100, (value / Math.max(max, 1)) * 100));
  return (
    <div className="metric-bar">
      <div>
        <span>{label}</span>
        <strong>
          {value.toFixed(1)} {unit}
        </strong>
      </div>
      <div className="metric-bar__track">
        <span style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function ResourcePanel() {
  const design = useEdenStore((current) => current.design);
  const runs = useEdenStore((current) => current.runs);
  const activeRunId = useEdenStore((current) => current.activeRunId);
  const validation = useMemo(() => edenStore.actions.validation(), [design]);
  const activeRun = runs.find((run) => run.id === activeRunId) ?? runs[0];
  const resources = activeRun?.metrics.finalResources;

  return (
    <section className="panel resource-panel">
      <div className="panel-heading">
        <span className="eyebrow">SYSTEM STATE</span>
        <strong>{activeRun ? `Sol ${activeRun.lastSol}` : "Not simulated"}</strong>
      </div>

      <div className="design-totals">
        <div>
          <span>Cost</span>
          <strong
            className={
              validation.totalCostUsd > design.constraints.maxBudgetUsd ? "bad" : ""
            }
          >
            {formatMoney(validation.totalCostUsd)}
          </strong>
          <small>of {formatMoney(design.constraints.maxBudgetUsd)}</small>
        </div>
        <div>
          <span>Mass</span>
          <strong
            className={
              validation.totalMassKg > design.constraints.maxMassKg ? "bad" : ""
            }
          >
            {(validation.totalMassKg / 1_000).toFixed(1)}t
          </strong>
          <small>of {(design.constraints.maxMassKg / 1_000).toFixed(1)}t</small>
        </div>
      </div>

      <ModuleInspector />
      <ActivityFeed />

      {resources ? (
        <section aria-label="Latest resource balances">
          <div className="panel-section-heading">
            <span>LATEST BALANCES</span>
            <small>run snapshot</small>
          </div>
          <div className="resource-bars">
            <MetricBar
              label="Battery"
              value={resources.batteryKwh}
              max={resources.batteryCapacityKwh}
              unit="kWh"
            />
            <MetricBar
              label="Water"
              value={resources.waterKg}
              max={13_700}
              unit="kg"
            />
            <MetricBar
              label="Oxygen"
              value={resources.oxygenKg}
              max={260}
              unit="kg"
            />
            <MetricBar
              label="Food"
              value={resources.foodKg}
              max={2_600}
              unit="kg"
            />
          </div>
        </section>
      ) : (
        <div className="empty-state">
          Run the mission to populate resource telemetry and failure evidence.
        </div>
      )}

      <div className="validation-block">
        <div className="panel-section-heading">
          <span>PREFLIGHT</span>
          <small>{validation.valid ? "topology valid" : "blocked"}</small>
        </div>
        {validation.errors.map((error) => (
          <p className="validation-item is-error" key={error}>
            × {error}
          </p>
        ))}
        {validation.warnings.map((warning) => (
          <p className="validation-item is-warning" key={warning}>
            ! {warning}
          </p>
        ))}
        {validation.errors.length === 0 && validation.warnings.length === 0 ? (
          <p className="validation-item is-good">
            ✓ Ready for deterministic simulation
          </p>
        ) : null}
      </div>

      <ModelAssumptions />
      <DeveloperPanel />
    </section>
  );
}
