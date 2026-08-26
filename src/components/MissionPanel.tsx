import { MODULE_CATALOG } from "../domain/catalog";
import type { ModuleKind } from "../domain/types";
import { edenStore, useEdenStore } from "../store/edenStore";

const ADD_POSITIONS = [
  { x: 220, y: 140 },
  { x: 420, y: 140 },
  { x: 650, y: 140 },
  { x: 220, y: 420 },
  { x: 650, y: 420 },
];

export function MissionPanel() {
  const constraints = useEdenStore((current) => current.design.constraints);
  const moduleCount = useEdenStore((current) => current.design.modules.length);
  const canUndo = useEdenStore((current) => current.pastDesigns.length > 0);
  const canRedo = useEdenStore((current) => current.futureDesigns.length > 0);

  const addModule = (kind: ModuleKind) => {
    const offset = ADD_POSITIONS[moduleCount % ADD_POSITIONS.length];
    edenStore.actions.addModule(kind, {
      x: offset.x + (moduleCount % 3) * 28,
      y: offset.y + (moduleCount % 4) * 24,
    });
  };

  return (
    <aside className="panel mission-panel">
      <div className="panel-heading">
        <span className="eyebrow">MISSION</span>
        <strong>Ares Gauntlet</strong>
      </div>

      <div className="history-actions" aria-label="Design history controls">
        <button
          type="button"
          disabled={!canUndo}
          onClick={() => edenStore.actions.undo("human")}
        >
          ↶ Undo
        </button>
        <button
          type="button"
          disabled={!canRedo}
          onClick={() => edenStore.actions.redo("human")}
        >
          ↷ Redo
        </button>
      </div>

      <div className="mission-copy">
        <h2>{constraints.name}</h2>
        <p>
          Survive a 45-sol dust storm and one oxygen-system outage while preserving
          emergency reserves.
        </p>
      </div>

      <div className="constraint-grid">
        <label>
          <span>Crew</span>
          <input
            type="number"
            min={1}
            max={40}
            value={constraints.crew}
            onChange={(event) =>
              edenStore.actions.setConstraints({ crew: Number(event.target.value) })
            }
          />
        </label>
        <label>
          <span>Sols</span>
          <input
            type="number"
            min={30}
            max={2000}
            value={constraints.durationSols}
            onChange={(event) =>
              edenStore.actions.setConstraints({
                durationSols: Number(event.target.value),
              })
            }
          />
        </label>
        <label>
          <span>Budget</span>
          <div className="input-with-unit">
            <input
              type="number"
              min={1}
              step={0.1}
              value={constraints.maxBudgetUsd / 1_000_000}
              onChange={(event) =>
                edenStore.actions.setConstraints({
                  maxBudgetUsd: Number(event.target.value) * 1_000_000,
                })
              }
            />
            <small>$M</small>
          </div>
        </label>
        <label>
          <span>Mass</span>
          <div className="input-with-unit">
            <input
              type="number"
              min={5}
              step={1}
              value={constraints.maxMassKg / 1_000}
              onChange={(event) =>
                edenStore.actions.setConstraints({
                  maxMassKg: Number(event.target.value) * 1_000,
                })
              }
            />
            <small>t</small>
          </div>
        </label>
        <label>
          <span>Water reserve</span>
          <div className="input-with-unit">
            <input
              type="number"
              min={0}
              max={180}
              value={constraints.minWaterReserveSols}
              onChange={(event) =>
                edenStore.actions.setConstraints({
                  minWaterReserveSols: Number(event.target.value),
                })
              }
            />
            <small>sol</small>
          </div>
        </label>
        <label>
          <span>O₂ reserve</span>
          <div className="input-with-unit">
            <input
              type="number"
              min={0}
              max={90}
              value={constraints.minOxygenReserveSols}
              onChange={(event) =>
                edenStore.actions.setConstraints({
                  minOxygenReserveSols: Number(event.target.value),
                })
              }
            />
            <small>sol</small>
          </div>
        </label>
      </div>

      <button
        className="demo-constraint-button"
        type="button"
        onClick={() =>
          edenStore.actions.setConstraints({ maxBudgetUsd: 7_950_000 }, "human")
        }
      >
        Demo trade-off · cap budget at $7.95M
      </button>

      <div className="panel-section-heading">
        <span>MODULE CATALOG</span>
        <small>click to place</small>
      </div>
      <div className="module-catalog">
        {(Object.keys(MODULE_CATALOG) as ModuleKind[])
          .filter((kind) => kind !== "habitat")
          .map((kind) => {
            const spec = MODULE_CATALOG[kind];
            return (
              <button key={kind} type="button" onClick={() => addModule(kind)}>
                <span className="catalog-icon">{spec.icon}</span>
                <span>
                  <strong>{spec.title}</strong>
                  <small>
                    ${(spec.costUsd / 1_000_000).toFixed(2)}M ·{" "}
                    {(spec.massKg / 1_000).toFixed(1)}t
                  </small>
                </span>
                <span className="catalog-add">+</span>
              </button>
            );
          })}
      </div>
    </aside>
  );
}
