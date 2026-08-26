import { beforeEach, describe, expect, it } from "vitest";
import { edenStore } from "../store/edenStore";
import {
  BASE_TOOL_NAMES,
  registerEdenTools,
} from "./registerEdenTools";

class FakeModelContext implements ModelContext {
  tools = new Map<string, WebMcpTool>();

  async registerTool(
    tool: WebMcpTool,
    options?: WebMcpRegisterOptions,
  ): Promise<void> {
    if (options?.signal?.aborted) {
      throw new DOMException("Registration aborted", "AbortError");
    }
    if (this.tools.has(tool.name)) {
      throw new DOMException(`Duplicate tool: ${tool.name}`, "InvalidStateError");
    }
    this.tools.set(tool.name, tool);
    options?.signal?.addEventListener(
      "abort",
      () => {
        if (this.tools.get(tool.name) === tool) this.tools.delete(tool.name);
      },
      { once: true },
    );
  }
}

async function flushRegistrations(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

async function executeTool(
  modelContext: FakeModelContext,
  name: string,
  input: Record<string, unknown> = {},
): Promise<unknown> {
  const tool = modelContext.tools.get(name);
  expect(tool, `${name} should be registered`).toBeDefined();
  return tool!.execute(input, { signal: new AbortController().signal });
}

describe("WebMCP adapter", () => {
  beforeEach(() => {
    edenStore.actions.reset("system");
  });

  it("registers base and result-aware tools with observable invocations", async () => {
    const modelContext = new FakeModelContext();
    const cleanup = registerEdenTools(modelContext);
    await flushRegistrations();

    expect([...modelContext.tools.keys()].sort()).toEqual(
      [...BASE_TOOL_NAMES].sort(),
    );

    const runTool = modelContext.tools.get("run_simulation");
    expect(runTool).toBeDefined();
    const execution = { signal: new AbortController().signal };
    await runTool!.execute({ seed: 424_242 }, execution);
    await flushRegistrations();

    expect(modelContext.tools.has("analyze_latest_run")).toBe(true);
    expect(modelContext.tools.has("compare_runs")).toBe(false);
    expect(edenStore.getState().toolInvocations[0]).toMatchObject({
      toolName: "run_simulation",
      status: "success",
      validatedArguments: { seed: 424_242 },
    });

    await runTool!.execute({ seed: 424_242 }, execution);
    await flushRegistrations();
    expect(modelContext.tools.has("compare_runs")).toBe(true);

    cleanup();
    expect(modelContext.tools.size).toBe(0);
  });

  it("executes the complete causal repair loop through registered tools", async () => {
    const modelContext = new FakeModelContext();
    const cleanup = registerEdenTools(modelContext);
    await flushRegistrations();

    const starter = (await executeTool(modelContext, "run_simulation", {
      seed: 424_242,
    })) as {
      ok: boolean;
      run: { status: string; lastSol: number; failure?: { code: string } };
    };
    expect(starter).toMatchObject({
      ok: true,
      run: {
        status: "failure",
        lastSol: 94,
        failure: { code: "POWER_COLLAPSE" },
      },
    });

    await executeTool(modelContext, "add_module", {
      kind: "microreactor",
      id: "reactor-test",
      position: { x: 80, y: 390 },
    });
    await executeTool(modelContext, "connect_modules", {
      sourceId: "reactor-test",
      targetId: "habitat-core",
      resource: "power",
    });
    const powerRepair = (await executeTool(modelContext, "run_simulation", {
      seed: 424_242,
    })) as {
      run: { status: string; lastSol: number; failure?: { code: string } };
    };
    expect(powerRepair.run).toMatchObject({
      status: "failure",
      lastSol: 300,
      failure: { code: "OXYGEN_RESERVE_BREACH" },
    });

    edenStore.actions.updateModule(
      "greenhouse-a",
      { lockedByHuman: true },
      "human",
    );
    edenStore.actions.setConstraints({ maxBudgetUsd: 7_950_000 }, "human");
    const rejectedLockEdit = (await executeTool(modelContext, "update_module", {
      id: "greenhouse-a",
      enabled: false,
    })) as { ok: boolean; error: string };
    expect(rejectedLockEdit.ok).toBe(false);
    expect(rejectedLockEdit.error).toContain("locked by the human");

    await executeTool(modelContext, "add_module", {
      kind: "storage",
      id: "storage-test",
      position: { x: 300, y: 540 },
    });
    await executeTool(modelContext, "connect_modules", {
      sourceId: "storage-test",
      targetId: "habitat-core",
      resource: "oxygen",
    });
    const final = (await executeTool(modelContext, "run_simulation", {
      seed: 424_242,
    })) as {
      run: {
        status: string;
        lastSol: number;
        metrics: { totalCostUsd: number; totalMassKg: number };
      };
    };
    expect(final.run).toMatchObject({
      status: "success",
      lastSol: 500,
      metrics: { totalCostUsd: 7_900_000, totalMassKg: 40_500 },
    });

    await flushRegistrations();
    expect(modelContext.tools.size).toBe(12);
    const runs = edenStore.getState().runs;
    const comparison = (await executeTool(modelContext, "compare_runs", {
      firstRunId: runs.at(-1)!.id,
      secondRunId: runs[0].id,
    })) as {
      first: Record<string, unknown>;
      second: Record<string, unknown>;
      comparison: {
        delta: { survivalSols: number; oxygenReserveSols: number };
        designDiff: { addedModuleIds: string[]; changedConstraints: string[] };
      };
    };

    expect(comparison.first).toMatchObject({
      status: "failure",
      lastSol: 94,
      cause: "POWER_COLLAPSE",
    });
    expect(comparison.first).not.toHaveProperty("timeline");
    expect(comparison.first).not.toHaveProperty("designSnapshot");
    expect(comparison.second).toMatchObject({
      status: "success",
      lastSol: 500,
      cause: "MISSION_SURVIVED",
      costUsd: 7_900_000,
      massKg: 40_500,
    });
    expect(comparison.comparison.delta).toMatchObject({
      survivalSols: 406,
      oxygenReserveSols: -1.73,
    });
    expect(comparison.comparison.designDiff.addedModuleIds).toEqual([
      "reactor-test",
      "storage-test",
    ]);
    expect(comparison.comparison.designDiff.changedConstraints).toContain(
      "maxBudgetUsd",
    );

    cleanup();
    expect(modelContext.tools.size).toBe(0);
  });
});
