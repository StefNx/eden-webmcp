import { MODULE_CATALOG } from "../domain/catalog";
import { edenStore, useEdenStore } from "../store/edenStore";

export function ModuleInspector() {
  const design = useEdenStore((current) => current.design);
  const selectedModuleId = useEdenStore((current) => current.selectedModuleId);
  const module = design.modules.find(
    (candidate) => candidate.id === selectedModuleId,
  );

  if (!module) {
    return (
      <section className="inspector-card" aria-label="Module inspector">
        <div className="panel-section-heading">
          <span>MODULE INSPECTOR</span>
          <small>nothing selected</small>
        </div>
        <p className="inspector-empty">
          Select a module on the habitat graph to edit its operational state and
          human lock.
        </p>
      </section>
    );
  }

  const spec = MODULE_CATALOG[module.kind];
  const connectionCount = design.connections.filter(
    (connection) =>
      connection.source === module.id || connection.target === module.id,
  ).length;

  return (
    <section className="inspector-card" aria-label={`Inspector for ${module.label}`}>
      <div className="panel-section-heading">
        <span>MODULE INSPECTOR</span>
        <small>{module.id}</small>
      </div>

      <div className="inspector-title">
        <span aria-hidden="true">{spec.icon}</span>
        <div>
          <strong>{spec.title}</strong>
          <small>{spec.primaryResource} primary bus</small>
        </div>
      </div>

      <label className="inspector-field">
        <span>Label</span>
        <input
          key={`${module.id}:${module.label}`}
          defaultValue={module.label}
          maxLength={50}
          onBlur={(event) => {
            const label = event.currentTarget.value.trim();
            if (label && label !== module.label) {
              edenStore.actions.updateModule(module.id, { label }, "human");
            }
          }}
        />
      </label>

      <div className="inspector-grid">
        <label className="inspector-field">
          <span>Level</span>
          <select
            value={module.level}
            onChange={(event) =>
              edenStore.actions.updateModule(
                module.id,
                { level: Number(event.target.value) },
                "human",
              )
            }
          >
            <option value={1}>Level 1</option>
            <option value={2}>Level 2</option>
            <option value={3}>Level 3</option>
          </select>
        </label>
        <div className="inspector-stat">
          <span>Connections</span>
          <strong>{connectionCount}</strong>
        </div>
        <div className="inspector-stat">
          <span>Cost</span>
          <strong>${((spec.costUsd * module.level) / 1_000_000).toFixed(2)}M</strong>
        </div>
        <div className="inspector-stat">
          <span>Mass</span>
          <strong>{((spec.massKg * module.level) / 1_000).toFixed(1)}t</strong>
        </div>
      </div>

      <label className="inspector-toggle">
        <input
          type="checkbox"
          checked={module.enabled}
          onChange={(event) =>
            edenStore.actions.updateModule(
              module.id,
              { enabled: event.target.checked },
              "human",
            )
          }
        />
        <span>Module enabled</span>
      </label>
      <label className="inspector-toggle is-lock">
        <input
          type="checkbox"
          checked={module.lockedByHuman}
          onChange={(event) =>
            edenStore.actions.updateModule(
              module.id,
              { lockedByHuman: event.target.checked },
              "human",
            )
          }
        />
        <span>Human lock {module.lockedByHuman ? "active" : "inactive"}</span>
      </label>

      {module.kind !== "habitat" ? (
        <button
          className="danger-ghost-button"
          type="button"
          onClick={() => {
            edenStore.actions.removeModule(module.id, "human");
            edenStore.actions.setSelectedModule(null);
          }}
        >
          Remove module · undo available
        </button>
      ) : null}
    </section>
  );
}
