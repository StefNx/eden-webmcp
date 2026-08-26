import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { HabitatModule, ModuleSpec, ResourceKind } from "../domain/types";
import { edenStore } from "../store/edenStore";

export interface ModuleNodeData extends Record<string, unknown> {
  module: HabitatModule;
  spec: ModuleSpec;
}

function resourceClass(resource: ResourceKind): string {
  return `resource-${resource}`;
}

export function ModuleNode({ data, selected }: NodeProps) {
  const { module, spec } = data as ModuleNodeData;

  return (
    <article
      className={`module-node ${selected ? "is-selected" : ""} ${
        module.enabled ? "" : "is-disabled"
      }`}
      aria-label={`${module.label} module`}
    >
      <header className="module-node__header">
        <span className="module-node__icon" aria-hidden="true">
          {spec.icon}
        </span>
        <span>
          <strong>{module.label}</strong>
          <small>{module.id}</small>
        </span>
        <button
          type="button"
          className={`lock-button ${module.lockedByHuman ? "is-locked" : ""}`}
          aria-label={
            module.lockedByHuman ? "Unlock module" : "Lock module against agent edits"
          }
          title={module.lockedByHuman ? "Human lock active" : "Lock against agent edits"}
          onClick={(event) => {
            event.stopPropagation();
            edenStore.actions.updateModule(
              module.id,
              { lockedByHuman: !module.lockedByHuman },
              "human",
            );
          }}
        >
          {module.lockedByHuman ? "●" : "○"}
        </button>
      </header>

      <div className="module-node__meta">
        <span>Level {module.level}</span>
        <span>${(spec.costUsd * module.level / 1_000_000).toFixed(2)}M</span>
      </div>

      <div className="module-node__ports module-node__ports--inputs">
        {spec.inputs.map((resource, index) => (
          <div className={`port ${resourceClass(resource)}`} key={`in-${resource}`}>
            <Handle
              type="target"
              position={Position.Left}
              id={`in:${resource}`}
              style={{ top: 64 + index * 18 }}
            />
            <span>{resource}</span>
          </div>
        ))}
      </div>

      <div className="module-node__ports module-node__ports--outputs">
        {spec.outputs.map((resource, index) => (
          <div className={`port ${resourceClass(resource)}`} key={`out-${resource}`}>
            <span>{resource}</span>
            <Handle
              type="source"
              position={Position.Right}
              id={`out:${resource}`}
              style={{ top: 64 + index * 18 }}
            />
          </div>
        ))}
      </div>
    </article>
  );
}
