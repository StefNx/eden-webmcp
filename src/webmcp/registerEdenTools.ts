import { z } from "zod";
import { MODULE_CATALOG } from "../domain/catalog";
import { MODULE_KINDS, RESOURCE_KINDS } from "../domain/types";
import type { Point, RunComparison, SimulationRun } from "../domain/types";
import { compareSimulationRuns } from "../simulation/compareRuns";
import { edenStore } from "../store/edenStore";

const pointSchema = z.object({
  x: z.number().min(-2_000).max(4_000),
  y: z.number().min(-2_000).max(4_000),
});

function ok(message: string, data: Record<string, unknown> = {}) {
  return {
    ok: true,
    message,
    designVersion: edenStore.getState().design.version,
    ...data,
  };
}

function fail(error: unknown) {
  return {
    ok: false,
    error: error instanceof Error ? error.message : String(error),
    validationError: error instanceof z.ZodError,
    designVersion: edenStore.getState().design.version,
  };
}

function instrumentTool(tool: WebMcpTool): WebMcpTool {
  return {
    ...tool,
    execute: async (input, options) => {
      const invocationId = edenStore.actions.beginToolInvocation(tool.name, input);
      try {
        options.signal.throwIfAborted();
        const result = await tool.execute(input, options);
        const envelope = result as {
          ok?: boolean;
          validationError?: boolean;
        };
        if (!envelope.validationError) {
          edenStore.actions.setValidatedToolArguments(invocationId, input);
        }
        edenStore.actions.finishToolInvocation(
          invocationId,
          envelope.ok === false ? "error" : "success",
          result,
        );
        return result;
      } catch (error) {
        const result = fail(error);
        edenStore.actions.finishToolInvocation(invocationId, "error", result);
        return result;
      }
    },
  };
}

async function safeExecute<T>(operation: () => T | Promise<T>) {
  try {
    return await operation();
  } catch (error) {
    return fail(error);
  }
}

function summarizeRun(run: SimulationRun) {
  return {
    id: run.id,
    designVersion: run.designVersion,
    status: run.status,
    lastSol: run.lastSol,
    failure: run.failure,
    metrics: run.metrics,
    scenarioMarkers: run.scenarioMarkers,
    notableEvents: run.events.slice(-8),
  };
}

function rounded(value: number): number {
  return Number(value.toFixed(2));
}

function summarizeComparisonRun(run: SimulationRun) {
  return {
    id: run.id,
    designVersion: run.designVersion,
    status: run.status,
    lastSol: run.lastSol,
    cause: run.failure?.code ?? "MISSION_SURVIVED",
    costUsd: run.metrics.totalCostUsd,
    massKg: run.metrics.totalMassKg,
    minBatteryPercent: rounded(run.metrics.minBatteryPercent),
    minWaterReserveSols: rounded(run.metrics.minWaterReserveSols),
    minOxygenReserveSols: rounded(run.metrics.minOxygenReserveSols),
  };
}

function summarizeComparison(comparison: RunComparison): RunComparison {
  return {
    ...comparison,
    delta: {
      ...comparison.delta,
      minBatteryPercent: rounded(comparison.delta.minBatteryPercent),
      waterReserveSols: rounded(comparison.delta.waterReserveSols),
      oxygenReserveSols: rounded(comparison.delta.oxygenReserveSols),
    },
  };
}

const BASE_TOOL_DEFINITIONS: WebMcpTool[] = [
  {
    name: "get_mission_state",
    title: "Get EDEN mission state",
    description:
      "Read the current mission constraints, design version, run summary, budget and validation state. Does not modify the habitat.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    execute: async () => {
      const current = edenStore.getState();
      const validation = edenStore.actions.validation();
      return ok("Current EDEN mission state.", {
        constraints: current.design.constraints,
        moduleCount: current.design.modules.length,
        connectionCount: current.design.connections.length,
        validation,
        activeRun: current.runs.find((run) => run.id === current.activeRunId)
          ? summarizeRun(current.runs.find((run) => run.id === current.activeRunId)!)
          : null,
      });
    },
  },
  {
    name: "list_module_catalog",
    title: "List EDEN module catalog",
    description:
      "List every module type that can be added, including cost, mass, inputs, outputs and simplified simulator behavior.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    execute: async () =>
      ok("Available module catalog.", { modules: Object.values(MODULE_CATALOG) }),
  },
  {
    name: "inspect_design",
    title: "Inspect habitat design",
    description:
      "Read the exact modules, positions, human locks, resource connections and validation warnings in the shared visual design.",
    inputSchema: {
      type: "object",
      properties: {
        moduleIds: {
          type: "array",
          items: { type: "string" },
          maxItems: 30,
          description: "Optional module IDs to inspect. Omit to inspect the full design.",
        },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    execute: async (input) =>
      safeExecute(() => {
        const parsed = z
          .object({ moduleIds: z.array(z.string()).max(30).optional() })
          .parse(input);
        const design = edenStore.getState().design;
        const moduleFilter = parsed.moduleIds ? new Set(parsed.moduleIds) : null;
        const modules = moduleFilter
          ? design.modules.filter((module) => moduleFilter.has(module.id))
          : design.modules;
        return ok("Habitat design inspected.", {
          modules,
          connections: design.connections.filter(
            (connection) =>
              !moduleFilter ||
              moduleFilter.has(connection.source) ||
              moduleFilter.has(connection.target),
          ),
          validation: edenStore.actions.validation(),
        });
      }),
  },
  {
    name: "add_module",
    title: "Add habitat module",
    description:
      "Add one module to the shared EDEN canvas. The module is not operational until it is connected with connect_modules.",
    inputSchema: {
      type: "object",
      properties: {
        kind: { type: "string", enum: MODULE_KINDS },
        id: {
          type: "string",
          minLength: 3,
          maxLength: 60,
          pattern: "^[a-zA-Z0-9_-]+$",
        },
        position: {
          type: "object",
          properties: { x: { type: "number" }, y: { type: "number" } },
          required: ["x", "y"],
          additionalProperties: false,
        },
      },
      required: ["kind", "position"],
      additionalProperties: false,
    },
    execute: async (input) =>
      safeExecute(() => {
        const parsed = z
          .object({
            kind: z.enum(MODULE_KINDS),
            id: z.string().regex(/^[a-zA-Z0-9_-]+$/).min(3).max(60).optional(),
            position: pointSchema,
          })
          .parse(input);
        const module = edenStore.actions.addModule(
          parsed.kind,
          parsed.position as Point,
          "agent",
          parsed.id,
        );
        return ok(`Added ${module.label} as ${module.id}.`, { module });
      }),
  },
  {
    name: "connect_modules",
    title: "Connect habitat modules",
    description:
      "Create one typed resource connection between two existing modules. The source must output the resource and the target must accept it. Human-locked endpoints reject agent changes unless explicitly authorized.",
    inputSchema: {
      type: "object",
      properties: {
        sourceId: { type: "string" },
        targetId: { type: "string" },
        resource: { type: "string", enum: RESOURCE_KINDS },
        overrideLocked: {
          type: "boolean",
          description:
            "Use only after the human explicitly authorizes changing a locked endpoint.",
        },
      },
      required: ["sourceId", "targetId", "resource"],
      additionalProperties: false,
    },
    execute: async (input) =>
      safeExecute(() => {
        const parsed = z
          .object({
            sourceId: z.string().min(1),
            targetId: z.string().min(1),
            resource: z.enum(RESOURCE_KINDS),
            overrideLocked: z.boolean().optional(),
          })
          .parse(input);
        const connection = edenStore.actions.connectModules(
          parsed.sourceId,
          parsed.targetId,
          parsed.resource,
          "agent",
          parsed.overrideLocked ?? false,
        );
        return ok(
          `Connected ${parsed.sourceId} to ${parsed.targetId} for ${parsed.resource}.`,
          {
            connection,
            validation: edenStore.actions.validation(),
          },
        );
      }),
  },
  {
    name: "update_module",
    title: "Update habitat module",
    description:
      "Move, rename, enable, disable or upgrade one existing module. Human-locked modules reject agent changes unless overrideLocked is explicitly true.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        label: { type: "string", minLength: 1, maxLength: 50 },
        position: {
          type: "object",
          properties: { x: { type: "number" }, y: { type: "number" } },
          required: ["x", "y"],
          additionalProperties: false,
        },
        level: { type: "integer", minimum: 1, maximum: 3 },
        enabled: { type: "boolean" },
        overrideLocked: {
          type: "boolean",
          description:
            "Use only after the human explicitly authorizes changing a locked module.",
        },
      },
      required: ["id"],
      additionalProperties: false,
    },
    execute: async (input) =>
      safeExecute(() => {
        const parsed = z
          .object({
            id: z.string().min(1),
            label: z.string().min(1).max(50).optional(),
            position: pointSchema.optional(),
            level: z.number().int().min(1).max(3).optional(),
            enabled: z.boolean().optional(),
            overrideLocked: z.boolean().optional(),
          })
          .parse(input);
        const updated = edenStore.actions.updateModule(
          parsed.id,
          {
            label: parsed.label,
            position: parsed.position,
            level: parsed.level,
            enabled: parsed.enabled,
          },
          "agent",
          parsed.overrideLocked ?? false,
        );
        return ok(`Updated module ${updated.id}.`, { module: updated });
      }),
  },
  {
    name: "remove_module",
    title: "Remove habitat module",
    description:
      "Remove one non-core module and all its connections. Human-locked modules reject removal unless overrideLocked is explicitly true.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        overrideLocked: { type: "boolean" },
      },
      required: ["id"],
      additionalProperties: false,
    },
    execute: async (input) =>
      safeExecute(() => {
        const parsed = z
          .object({ id: z.string().min(1), overrideLocked: z.boolean().optional() })
          .parse(input);
        edenStore.actions.removeModule(
          parsed.id,
          "agent",
          parsed.overrideLocked ?? false,
        );
        return ok(`Removed module ${parsed.id}.`, {
          validation: edenStore.actions.validation(),
        });
      }),
  },
  {
    name: "set_mission_constraints",
    title: "Set mission constraints",
    description:
      "Update selected numerical mission constraints. This changes the problem the design must solve and is immediately visible to the human.",
    inputSchema: {
      type: "object",
      properties: {
        crew: { type: "integer", minimum: 1, maximum: 40 },
        durationSols: { type: "integer", minimum: 30, maximum: 2000 },
        maxBudgetUsd: { type: "number", minimum: 1000000, maximum: 100000000 },
        maxMassKg: { type: "number", minimum: 5000, maximum: 500000 },
        minWaterReserveSols: { type: "number", minimum: 0, maximum: 180 },
        minOxygenReserveSols: { type: "number", minimum: 0, maximum: 90 },
      },
      additionalProperties: false,
    },
    execute: async (input) =>
      safeExecute(() => {
        const parsed = z
          .object({
            crew: z.number().int().min(1).max(40).optional(),
            durationSols: z.number().int().min(30).max(2_000).optional(),
            maxBudgetUsd: z.number().min(1_000_000).max(100_000_000).optional(),
            maxMassKg: z.number().min(5_000).max(500_000).optional(),
            minWaterReserveSols: z.number().min(0).max(180).optional(),
            minOxygenReserveSols: z.number().min(0).max(90).optional(),
          })
          .parse(input);
        const constraints = edenStore.actions.setConstraints(parsed, "agent");
        return ok("Mission constraints updated.", {
          constraints,
          validation: edenStore.actions.validation(),
        });
      }),
  },
  {
    name: "run_simulation",
    title: "Run EDEN simulation",
    description:
      "Run the deterministic mission simulator against the current visible design and store the result in the shared UI. Use the same seed to reproduce a run exactly.",
    inputSchema: {
      type: "object",
      properties: {
        seed: { type: "integer", minimum: 0, maximum: 4294967295 },
      },
      additionalProperties: false,
    },
    execute: async (input) =>
      safeExecute(() => {
        const parsed = z
          .object({ seed: z.number().int().min(0).max(4_294_967_295).optional() })
          .parse(input);
        const run = edenStore.actions.run(parsed.seed ?? 424_242, "agent");
        return ok(`Simulation ${run.status} at sol ${run.lastSol}.`, {
          run: summarizeRun(run),
        });
      }),
  },
  {
    name: "reset_design",
    title: "Reset EDEN design",
    description:
      "Reset the habitat and run history to the seeded starter design. This is destructive and visibly replaces the current canvas.",
    inputSchema: {
      type: "object",
      properties: {
        confirm: { type: "boolean", const: true },
      },
      required: ["confirm"],
      additionalProperties: false,
    },
    execute: async (input) =>
      safeExecute(() => {
        z.object({ confirm: z.literal(true) }).parse(input);
        edenStore.actions.reset("agent");
        return ok("EDEN reset to the starter habitat.");
      }),
  },
];

const BASE_TOOLS = BASE_TOOL_DEFINITIONS.map(instrumentTool);

export const BASE_TOOL_NAMES = BASE_TOOLS.map((tool) => tool.name);

function latestRunTool(run: SimulationRun): WebMcpTool {
  return {
    name: "analyze_latest_run",
    title: "Analyze latest EDEN run",
    description:
      "Read the latest deterministic run, its failure evidence, safety margins and suggested corrective directions. Available only after a simulation has run.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    execute: async () => ok("Latest run analysis.", { run: summarizeRun(run) }),
  };
}

function compareRunsTool(): WebMcpTool {
  return {
    name: "compare_runs",
    title: "Compare EDEN runs",
    description:
      "Compare two stored simulation runs by ID, including design versions, outcomes, cost, mass and minimum reserves.",
    inputSchema: {
      type: "object",
      properties: {
        firstRunId: { type: "string" },
        secondRunId: { type: "string" },
      },
      required: ["firstRunId", "secondRunId"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    execute: async (input) =>
      safeExecute(() => {
        const parsed = z
          .object({ firstRunId: z.string(), secondRunId: z.string() })
          .parse(input);
        const runs = edenStore.getState().runs;
        const first = runs.find((run) => run.id === parsed.firstRunId);
        const second = runs.find((run) => run.id === parsed.secondRunId);
        if (!first || !second) {
          throw new Error("One or both run IDs are unavailable.");
        }
        const comparison = compareSimulationRuns(first, second);
        return ok(
          `Compared design v${first.designVersion} ${first.failure?.code ?? "MISSION_SURVIVED"} to v${second.designVersion} ${second.failure?.code ?? "MISSION_SURVIVED"}.`,
          {
            first: summarizeComparisonRun(first),
            second: summarizeComparisonRun(second),
            comparison: summarizeComparison(comparison),
          },
        );
      }),
  };
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export function registerEdenTools(
  modelContext: ModelContext | undefined = document.modelContext,
): () => void {
  if (typeof modelContext?.registerTool !== "function") {
    edenStore.actions.setWebMcpStatus({
      state: "unavailable",
      registeredTools: [],
      message: "WebMCP is unavailable here. The human UI remains fully functional.",
    });
    return () => undefined;
  }

  const baseController = new AbortController();
  let dynamicController = new AbortController();
  let previousDynamicKey = "";
  const baseNames = BASE_TOOL_NAMES;

  Promise.all(
    BASE_TOOLS.map((tool) =>
      modelContext.registerTool(tool, { signal: baseController.signal }),
    ),
  )
    .then(() => {
      edenStore.actions.setWebMcpStatus({
        state: "available",
        registeredTools: baseNames,
        message: `${baseNames.length} EDEN tools registered for the current page.`,
      });
    })
    .catch((error: unknown) => {
      if (isAbortError(error)) return;
      edenStore.actions.setWebMcpStatus({
        state: "error",
        registeredTools: [],
        message: error instanceof Error ? error.message : String(error),
      });
    });

  const syncDynamicTools = () => {
    const current = edenStore.getState();
    const latest = current.runs[0];
    const dynamicKey = `${latest?.id ?? "none"}:${current.runs.length >= 2}`;
    if (dynamicKey === previousDynamicKey) return;
    previousDynamicKey = dynamicKey;
    dynamicController.abort();
    dynamicController = new AbortController();

    const dynamicTools: WebMcpTool[] = [];
    if (latest) dynamicTools.push(instrumentTool(latestRunTool(latest)));
    if (current.runs.length >= 2) {
      dynamicTools.push(instrumentTool(compareRunsTool()));
    }

    void Promise.all(
      dynamicTools.map((tool) =>
        modelContext.registerTool(tool, { signal: dynamicController.signal }),
      ),
    )
      .then(() => {
        const names = [...baseNames, ...dynamicTools.map((tool) => tool.name)];
        edenStore.actions.setWebMcpStatus({
          state: "available",
          registeredTools: names,
          message: `${names.length} EDEN tools registered; result tools follow the current run state.`,
        });
      })
      .catch((error: unknown) => {
        if (isAbortError(error)) return;
        console.warn("Failed to refresh EDEN dynamic WebMCP tools", error);
      });
  };

  const unsubscribe = edenStore.subscribe(syncDynamicTools);
  syncDynamicTools();

  return () => {
    unsubscribe();
    dynamicController.abort();
    baseController.abort();
  };
}
