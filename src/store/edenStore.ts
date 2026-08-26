import { useSyncExternalStore } from "react";
import { z } from "zod";
import {
  MODULE_CATALOG,
  createConnection,
  createModule,
} from "../domain/catalog";
import { cloneDesign } from "../domain/design";
import { createDefaultDesign } from "../domain/scenarios";
import type {
  ActivityEntry,
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
  ToolInvocationRecord,
  WebMcpStatus,
} from "../domain/types";
import { runSimulation, validateDesign } from "../simulation/engine";

export interface EdenState {
  design: HabitatDesign;
  runs: SimulationRun[];
  activeRunId: string | null;
  selectedModuleId: string | null;
  mode: EdenMode;
  webMcp: WebMcpStatus;
  activity: ActivityEntry[];
  toolInvocations: ToolInvocationRecord[];
  pastDesigns: HabitatDesign[];
  futureDesigns: HabitatDesign[];
}

const listeners = new Set<() => void>();
const initialDesign = createDefaultDesign();

function makeId(prefix: string): string {
  const uuid =
    globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  return `${prefix}-${uuid.slice(0, 8)}`;
}

function activityEntry(
  actor: Actor,
  action: string,
  message: string,
  designVersion: number,
): ActivityEntry {
  return {
    id: makeId("activity"),
    timestamp: new Date().toISOString(),
    actor,
    action,
    message,
    designVersion,
  };
}

let state: EdenState = {
  design: initialDesign,
  runs: [],
  activeRunId: null,
  selectedModuleId: null,
  mode: "architect",
  webMcp: {
    state: "checking",
    registeredTools: [],
    message: "Checking for WebMCP support…",
  },
  activity: [
    activityEntry(
      "system",
      "MISSION_LOADED",
      "Ares Gauntlet starter design loaded.",
      initialDesign.version,
    ),
  ],
  toolInvocations: [],
  pastDesigns: [],
  futureDesigns: [],
};

function emit(next: EdenState): void {
  state = next;
  for (const listener of listeners) listener();
}

function withActivity(
  current: EdenState,
  entry: ActivityEntry,
): ActivityEntry[] {
  return [entry, ...current.activity].slice(0, 80);
}

function mutateDesign(
  actor: Actor,
  action: string,
  message: string | ((draft: HabitatDesign) => string),
  mutator: (draft: HabitatDesign) => void,
): HabitatDesign {
  const previous = cloneDesign(state.design);
  const draft = cloneDesign(state.design);
  mutator(draft);
  draft.version = state.design.version + 1;
  const activityMessage =
    typeof message === "function" ? message(draft) : message;
  const entry = activityEntry(actor, action, activityMessage, draft.version);
  emit({
    ...state,
    design: draft,
    mode: "architect",
    pastDesigns: [...state.pastDesigns, previous].slice(-50),
    futureDesigns: [],
    activity: withActivity(state, entry),
  });
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
      `Module ${module.id} is locked by the human. Ask for explicit authorization or choose another design.`,
    );
  }
}

const constraintsSchema = z.object({
  name: z.string().min(3).max(120).optional(),
  crew: z.number().int().min(1).max(40).optional(),
  durationSols: z.number().int().min(30).max(2_000).optional(),
  maxBudgetUsd: z.number().min(1_000_000).max(100_000_000).optional(),
  maxMassKg: z.number().min(5_000).max(500_000).optional(),
  minWaterReserveSols: z.number().min(0).max(180).optional(),
  minOxygenReserveSols: z.number().min(0).max(90).optional(),
  scenarioId: z.string().min(1).optional(),
});

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
      if (!MODULE_CATALOG[kind]) {
        throw new Error(`Unsupported module kind: ${kind}`);
      }
      const module = createModule(kind, id, position, actor);
      mutateDesign(
        actor,
        "MODULE_ADDED",
        `Added ${module.label} (${module.id}).`,
        (draft) => {
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
        },
      );
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
      const changedFields = Object.keys(patch).join(", ") || "metadata";
      mutateDesign(
        actor,
        "MODULE_UPDATED",
        `Updated ${id}: ${changedFields}.`,
        (draft) => {
          const module = getModule(id, draft);
          assertAgentMayEdit(module, actor, overrideLocked);
          const nextLevel = patch.level ?? module.level;
          if (!Number.isInteger(nextLevel) || nextLevel < 1 || nextLevel > 3) {
            throw new Error("Module level must be an integer from 1 to 3.");
          }
          const cleanPatch = Object.fromEntries(
            Object.entries(patch).filter(([, value]) => value !== undefined),
          ) as Partial<HabitatModule>;
          Object.assign(module, cleanPatch, {
            level: nextLevel,
            updatedBy: actor,
          });
          updated = { ...module, position: { ...module.position } };
        },
      );
      if (!updated) throw new Error(`Failed to update module ${id}`);
      return updated;
    },

    removeModule(
      id: string,
      actor: Actor = "human",
      overrideLocked = false,
    ): void {
      mutateDesign(actor, "MODULE_REMOVED", `Removed module ${id}.`, (draft) => {
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
      overrideLocked = false,
    ): ResourceConnection {
      const source = getModule(sourceId);
      const target = getModule(targetId);
      assertAgentMayEdit(source, actor, overrideLocked);
      assertAgentMayEdit(target, actor, overrideLocked);
      const sourceSpec = MODULE_CATALOG[source.kind];
      const targetSpec = MODULE_CATALOG[target.kind];
      if (!sourceSpec.outputs.includes(resource)) {
        throw new Error(`${source.label} cannot output ${resource}.`);
      }
      if (!targetSpec.inputs.includes(resource)) {
        throw new Error(`${target.label} cannot accept ${resource}.`);
      }
      const connection = createConnection(sourceId, targetId, resource, actor);
      mutateDesign(
        actor,
        "MODULES_CONNECTED",
        `Connected ${sourceId} → ${targetId} on the ${resource} bus.`,
        (draft) => {
          assertAgentMayEdit(getModule(sourceId, draft), actor, overrideLocked);
          assertAgentMayEdit(getModule(targetId, draft), actor, overrideLocked);
          if (
            draft.connections.some(
              (candidate) => candidate.id === connection.id,
            )
          ) {
            throw new Error(`Connection already exists: ${connection.id}`);
          }
          draft.connections.push(connection);
        },
      );
      return connection;
    },

    removeConnection(
      id: string,
      actor: Actor = "human",
      overrideLocked = false,
    ): void {
      mutateDesign(
        actor,
        "CONNECTION_REMOVED",
        `Removed connection ${id}.`,
        (draft) => {
          const connection = draft.connections.find(
            (candidate) => candidate.id === id,
          );
          if (!connection) throw new Error(`Unknown connection: ${id}`);
          assertAgentMayEdit(
            getModule(connection.source, draft),
            actor,
            overrideLocked,
          );
          assertAgentMayEdit(
            getModule(connection.target, draft),
            actor,
            overrideLocked,
          );
          draft.connections = draft.connections.filter(
            (candidate) => candidate.id !== id,
          );
        },
      );
    },

    setConstraints(
      patch: Partial<MissionConstraints>,
      actor: Actor = "human",
    ): MissionConstraints {
      const parsed = constraintsSchema.parse(patch);
      if (Object.keys(parsed).length === 0) {
        throw new Error("Provide at least one mission constraint to change.");
      }
      let constraints: MissionConstraints | undefined;
      mutateDesign(
        actor,
        "CONSTRAINTS_UPDATED",
        `Updated mission constraints: ${Object.keys(parsed).join(", ")}.`,
        (draft) => {
          Object.assign(draft.constraints, parsed);
          constraints = { ...draft.constraints };
        },
      );
      if (!constraints) {
        throw new Error(`Failed to update constraints as ${actor}`);
      }
      return constraints;
    },

    run(seed = 424_242, actor: Actor = "human"): SimulationRun {
      const result = runSimulation(state.design, seed);
      const requested = activityEntry(
        actor,
        "SIMULATION_REQUESTED",
        `Requested deterministic run with seed ${seed}.`,
        state.design.version,
      );
      const judged = activityEntry(
        "system",
        result.status === "success" ? "MISSION_SURVIVED" : "MISSION_FAILED",
        result.status === "success"
          ? `Design v${result.designVersion} survived ${result.lastSol} sols.`
          : `Design v${result.designVersion} failed at sol ${result.lastSol}: ${result.failure?.code ?? "UNKNOWN"}.`,
        state.design.version,
      );
      emit({
        ...state,
        runs: [result, ...state.runs].slice(0, 12),
        activeRunId: result.id,
        mode: "results",
        activity: [judged, requested, ...state.activity].slice(0, 80),
      });
      return result;
    },

    reset(actor: Actor = "human"): void {
      const design = createDefaultDesign();
      design.version = state.design.version + 1;
      const entry = activityEntry(
        actor,
        "GUIDED_DEMO_RESET",
        "Restored the deterministic Ares Gauntlet starter design and cleared run history.",
        design.version,
      );
      emit({
        ...state,
        design,
        runs: [],
        activeRunId: null,
        selectedModuleId: null,
        mode: "architect",
        pastDesigns: [],
        futureDesigns: [],
        activity: [entry],
      });
    },

    undo(actor: Actor = "human"): boolean {
      const previous = state.pastDesigns.at(-1);
      if (!previous) return false;
      const restored = cloneDesign(previous);
      restored.version = state.design.version + 1;
      const entry = activityEntry(
        actor,
        "UNDO",
        "Restored the previous design state; historical runs were preserved.",
        restored.version,
      );
      emit({
        ...state,
        design: restored,
        selectedModuleId: restored.modules.some(
          (module) => module.id === state.selectedModuleId,
        )
          ? state.selectedModuleId
          : null,
        mode: "architect",
        pastDesigns: state.pastDesigns.slice(0, -1),
        futureDesigns: [cloneDesign(state.design), ...state.futureDesigns].slice(
          0,
          50,
        ),
        activity: withActivity(state, entry),
      });
      return true;
    },

    redo(actor: Actor = "human"): boolean {
      const next = state.futureDesigns[0];
      if (!next) return false;
      const restored = cloneDesign(next);
      restored.version = state.design.version + 1;
      const entry = activityEntry(
        actor,
        "REDO",
        "Reapplied the next design state; historical runs were preserved.",
        restored.version,
      );
      emit({
        ...state,
        design: restored,
        selectedModuleId: restored.modules.some(
          (module) => module.id === state.selectedModuleId,
        )
          ? state.selectedModuleId
          : null,
        mode: "architect",
        pastDesigns: [...state.pastDesigns, cloneDesign(state.design)].slice(
          -50,
        ),
        futureDesigns: state.futureDesigns.slice(1),
        activity: withActivity(state, entry),
      });
      return true;
    },

    setSelectedModule(id: string | null): void {
      emit({ ...state, selectedModuleId: id });
    },

    setActiveRun(id: string): void {
      if (!state.runs.some((run) => run.id === id)) {
        throw new Error(`Unknown run: ${id}`);
      }
      emit({ ...state, activeRunId: id, mode: "results" });
    },

    setMode(mode: EdenMode): void {
      emit({ ...state, mode });
    },

    setWebMcpStatus(webMcp: WebMcpStatus): void {
      emit({ ...state, webMcp });
    },

    beginToolInvocation(
      toolName: string,
      rawArguments: Record<string, unknown>,
    ): string {
      const id = makeId("tool-call");
      const invocation: ToolInvocationRecord = {
        id,
        toolName,
        startedAt: new Date().toISOString(),
        status: "running",
        rawArguments: { ...rawArguments },
        designVersion: state.design.version,
      };
      emit({
        ...state,
        toolInvocations: [invocation, ...state.toolInvocations].slice(0, 20),
      });
      return id;
    },

    setValidatedToolArguments(
      id: string,
      validatedArguments: Record<string, unknown>,
    ): void {
      emit({
        ...state,
        toolInvocations: state.toolInvocations.map((invocation) =>
          invocation.id === id
            ? { ...invocation, validatedArguments: { ...validatedArguments } }
            : invocation,
        ),
      });
    },

    finishToolInvocation(
      id: string,
      status: "success" | "error",
      result: unknown,
    ): void {
      emit({
        ...state,
        toolInvocations: state.toolInvocations.map((invocation) =>
          invocation.id === id
            ? {
                ...invocation,
                status,
                result,
                completedAt: new Date().toISOString(),
                designVersion: state.design.version,
              }
            : invocation,
        ),
      });
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
