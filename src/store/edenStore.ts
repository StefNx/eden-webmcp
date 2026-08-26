import { useSyncExternalStore } from "react";
import { z } from "zod";
import {
  MODULE_CATALOG,
  createConnection,
  createModule,
} from "../domain/catalog";
import { createDefaultDesign } from "../domain/scenarios";
import type {
  Actor,
  EdenMode,
  HabitatDesign,
  HabitatModule,
  MissionConstraints,
  ModuleKind,
  Point,
  ResourceConnection,
  ResourceKind,
  SimulationRun,
  WebMcpStatus,
} from "../domain/types";
import { runSimulation, validateDesign } from "../simulation/engine";

interface EdenState {
  design: HabitatDesign;
  runs: SimulationRun[];
  activeRunId: string | null;
  selectedModuleId: string | null;
  mode: EdenMode;
  webMcp: WebMcpStatus;
}

const listeners = new Set<() => void>();
let state: EdenState = {
  design: createDefaultDesign(),
  runs: [],
  activeRunId: null,
  selectedModuleId: null,
  mode: "architect",
  webMcp: {
    state: "checking",
    registeredTools: [],
    message: "Checking for WebMCP support…",
  },
};

function emit(next: EdenState): void {
  state = next;
  for (const listener of listeners) listener();
}

function makeId(prefix: string): string {
  const uuid = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  return `${prefix}-${uuid.slice(0, 8)}`;
}

function mutateDesign(mutator: (draft: HabitatDesign) => void): HabitatDesign {
  const draft: HabitatDesign = {
    ...state.design,
    modules: state.design.modules.map((module) => ({
      ...module,
      position: { ...module.position },
    })),
    connections: state.design.connections.map((connection) => ({ ...connection })),
    constraints: { ...state.design.constraints },
  };
  mutator(draft);
  draft.version += 1;
  emit({ ...state, design: draft, mode: "architect" });
  return draft;
}

function getModule(id: string, design = state.design): HabitatModule {
  const module = design.modules.find((candidate) => candidate.id === id);
  if (!module) throw new Error(`Unknown module: ${id}`);
  return module;
}

function assertAgentMayEdit(
  module: HabitatModule,
  actor: Actor,
  overrideLocked = false,
): void {
  if (actor === "agent" && module.lockedByHuman && !overrideLocked) {
    throw new Error(
      `Module ${module.id} is locked by the human. Ask for an explicit override or choose another design.`,
    );
  }
}

export const edenStore = {
  getState: (): EdenState => state,
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  actions: {
    addModule(
      kind: ModuleKind,
      position: Point,
      actor: Actor = "human",
      id = makeId(kind),
    ): HabitatModule {
      if (!MODULE_CATALOG[kind]) throw new Error(`Unsupported module kind: ${kind}`);
      const module = createModule(kind, id, position, actor);
      mutateDesign((draft) => {
        if (draft.modules.some((candidate) => candidate.id === id)) {
          throw new Error(`Module id already exists: ${id}`);
        }
        if (
          kind === "habitat" &&
          draft.modules.some((candidate) => candidate.kind === "habitat")
        ) {
          throw new Error("EDEN supports exactly one Habitat Core in the MVP.");
        }
        draft.modules.push(module);
      });
      return module;
    },

    updateModule(
      id: string,
      patch: Partial<
        Pick<
          HabitatModule,
          "label" | "position" | "level" | "enabled" | "lockedByHuman"
        >
      >,
      actor: Actor = "human",
      overrideLocked = false,
    ): HabitatModule {
      let updated: HabitatModule | undefined;
      mutateDesign((draft) => {
        const module = getModule(id, draft);
        assertAgentMayEdit(module, actor, overrideLocked);
        const nextLevel = patch.level ?? module.level;
        if (!Number.isInteger(nextLevel) || nextLevel < 1 || nextLevel > 3) {
          throw new Error("Module level must be an integer from 1 to 3.");
        }
        const cleanPatch = Object.fromEntries(
          Object.entries(patch).filter(([, value]) => value !== undefined),
        ) as Partial<HabitatModule>;
        Object.assign(module, cleanPatch, { level: nextLevel, updatedBy: actor });
        updated = { ...module, position: { ...module.position } };
      });
      if (!updated) throw new Error(`Failed to update module ${id}`);
      return updated;
    },

    removeModule(
      id: string,
      actor: Actor = "human",
      overrideLocked = false,
    ): void {
      mutateDesign((draft) => {
        const module = getModule(id, draft);
        assertAgentMayEdit(module, actor, overrideLocked);
        if (module.kind === "habitat") {
          throw new Error("The Habitat Core cannot be removed.");
        }
        draft.modules = draft.modules.filter((candidate) => candidate.id !== id);
        draft.connections = draft.connections.filter(
          (connection) => connection.source !== id && connection.target !== id,
        );
      });
    },

    connectModules(
      sourceId: string,
      targetId: string,
      resource: ResourceKind,
      actor: Actor = "human",
    ): ResourceConnection {
      const source = getModule(sourceId);
      const target = getModule(targetId);
      const sourceSpec = MODULE_CATALOG[source.kind];
      const targetSpec = MODULE_CATALOG[target.kind];
      if (!sourceSpec.outputs.includes(resource)) {
        throw new Error(`${source.label} cannot output ${resource}.`);
      }
      if (!targetSpec.inputs.includes(resource)) {
        throw new Error(`${target.label} cannot accept ${resource}.`);
      }
      const connection = createConnection(sourceId, targetId, resource, actor);
      mutateDesign((draft) => {
        if (draft.connections.some((candidate) => candidate.id === connection.id)) {
          throw new Error(`Connection already exists: ${connection.id}`);
        }
        draft.connections.push(connection);
      });
      return connection;
    },

    removeConnection(id: string): void {
      mutateDesign((draft) => {
        draft.connections = draft.connections.filter(
          (connection) => connection.id !== id,
        );
      });
    },

    setConstraints(
      patch: Partial<MissionConstraints>,
      actor: Actor = "human",
    ): MissionConstraints {
      const schema = z.object({
        name: z.string().min(3).max(120).optional(),
        crew: z.number().int().min(1).max(40).optional(),
        durationSols: z.number().int().min(30).max(2_000).optional(),
        maxBudgetUsd: z.number().min(1_000_000).max(100_000_000).optional(),
        maxMassKg: z.number().min(5_000).max(500_000).optional(),
        minWaterReserveSols: z.number().min(0).max(180).optional(),
        minOxygenReserveSols: z.number().min(0).max(90).optional(),
        scenarioId: z.string().min(1).optional(),
      });
      const parsed = schema.parse(patch);
      let constraints: MissionConstraints | undefined;
      mutateDesign((draft) => {
        Object.assign(draft.constraints, parsed);
        constraints = { ...draft.constraints };
      });
      if (!constraints) throw new Error(`Failed to update constraints as ${actor}`);
      return constraints;
    },

    run(seed = 424_242): SimulationRun {
      const result = runSimulation(state.design, seed);
      emit({
        ...state,
        runs: [result, ...state.runs].slice(0, 12),
        activeRunId: result.id,
        mode: "results",
      });
      return result;
    },

    reset(): void {
      emit({
        ...state,
        design: createDefaultDesign(),
        runs: [],
        activeRunId: null,
        selectedModuleId: null,
        mode: "architect",
      });
    },

    setSelectedModule(id: string | null): void {
      emit({ ...state, selectedModuleId: id });
    },

    setMode(mode: EdenMode): void {
      emit({ ...state, mode });
    },

    setWebMcpStatus(webMcp: WebMcpStatus): void {
      emit({ ...state, webMcp });
    },

    validation() {
      return validateDesign(state.design);
    },
  },
};

export function useEdenStore<T>(selector: (current: EdenState) => T): T {
  return useSyncExternalStore(
    edenStore.subscribe,
    () => selector(edenStore.getState()),
    () => selector(edenStore.getState()),
  );
}
