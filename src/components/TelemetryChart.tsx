import type { SimulationRun, TimelinePoint } from "../domain/types";
import { CREW_RATES } from "../simulation/assumptions";

interface SeriesDefinition {
  id: string;
  label: string;
  unit: string;
  value: (point: TimelinePoint) => number;
  threshold?: number;
}

function sampleTimeline(points: TimelinePoint[]): TimelinePoint[] {
  if (points.length <= 180) return points;
  const step = Math.ceil(points.length / 180);
  const sampled = points.filter((_, index) => index % step === 0);
  const last = points.at(-1);
  if (last && sampled.at(-1) !== last) sampled.push(last);
  return sampled;
}

function polyline(
  points: TimelinePoint[],
  duration: number,
  definition: SeriesDefinition,
): { points: string; thresholdY?: number } {
  const sampled = sampleTimeline(points);
  const values = sampled.map(definition.value);
  if (definition.threshold !== undefined) values.push(definition.threshold);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const padding = Math.max(0.5, (rawMax - rawMin) * 0.08);
  const min = rawMin - padding;
  const max = rawMax + padding;
  const yFor = (value: number) => 44 - ((value - min) / (max - min)) * 34;

  return {
    points: sampled
      .map((point) => {
        const x = (point.sol / Math.max(1, duration)) * 100;
        return `${x.toFixed(2)},${yFor(definition.value(point)).toFixed(2)}`;
      })
      .join(" "),
    thresholdY:
      definition.threshold === undefined
        ? undefined
        : yFor(definition.threshold),
  };
}

function formatValue(value: number, unit: string): string {
  const digits = Math.abs(value) >= 100 ? 0 : 1;
  return `${value.toFixed(digits)} ${unit}`;
}

export function TelemetryChart({ run }: { run: SimulationRun }) {
  const duration = run.designSnapshot.constraints.durationSols;
  const crew = run.designSnapshot.constraints.crew;
  const definitions: SeriesDefinition[] = [
    {
      id: "battery",
      label: "Battery reserve",
      unit: "%",
      value: (point) =>
        point.batteryCapacityKwh > 0
          ? (point.batteryKwh / point.batteryCapacityKwh) * 100
          : 0,
    },
    {
      id: "power",
      label: "Power balance",
      unit: "kWh",
      value: (point) => point.powerGeneratedKwh - point.powerDemandKwh,
      threshold: 0,
    },
    {
      id: "water",
      label: "Water reserve",
      unit: "sol",
      value: (point) => point.waterKg / (crew * CREW_RATES.waterKg),
      threshold: run.designSnapshot.constraints.minWaterReserveSols,
    },
    {
      id: "oxygen",
      label: "O₂ reserve",
      unit: "sol",
      value: (point) => point.oxygenKg / (crew * CREW_RATES.oxygenKg),
      threshold: run.designSnapshot.constraints.minOxygenReserveSols,
    },
  ];
  const finalPoint = run.timeline.at(-1);

  return (
    <section className="telemetry-suite" aria-label="Mission resource telemetry">
      <div className="scenario-legend" aria-label="Scenario event legend">
        {run.scenarioMarkers.map((marker) => (
          <span className={`is-${marker.type}`} key={marker.id}>
            {marker.label} · S{marker.startSol}–{marker.endSol}
          </span>
        ))}
        {run.failure ? (
          <span className="is-failure">First failure · S{run.failure.sol}</span>
        ) : null}
      </div>

      <div className="telemetry-grid">
        {definitions.map((definition) => {
          const line = polyline(run.timeline, duration, definition);
          const finalValue = finalPoint ? definition.value(finalPoint) : 0;
          return (
            <figure className="telemetry-figure" key={definition.id}>
              <figcaption>
                <span>{definition.label}</span>
                <strong>{formatValue(finalValue, definition.unit)}</strong>
              </figcaption>
              <svg
                viewBox="0 0 100 50"
                preserveAspectRatio="none"
                role="img"
                aria-label={`${definition.label} across ${run.lastSol} simulated sols`}
              >
                {run.scenarioMarkers.map((marker) => {
                  const x = ((marker.startSol - 1) / duration) * 100;
                  const width =
                    ((marker.endSol - marker.startSol + 1) / duration) * 100;
                  return (
                    <rect
                      className={`scenario-band is-${marker.type}`}
                      key={marker.id}
                      x={x}
                      y="5"
                      width={width}
                      height="41"
                    />
                  );
                })}
                {line.thresholdY !== undefined ? (
                  <line
                    className="telemetry-threshold"
                    x1="0"
                    x2="100"
                    y1={line.thresholdY}
                    y2={line.thresholdY}
                  />
                ) : null}
                {run.failure ? (
                  <line
                    className="telemetry-failure-marker"
                    x1={(run.failure.sol / duration) * 100}
                    x2={(run.failure.sol / duration) * 100}
                    y1="4"
                    y2="47"
                  />
                ) : null}
                <polyline className={`series-${definition.id}`} points={line.points} />
              </svg>
            </figure>
          );
        })}
      </div>
    </section>
  );
}
