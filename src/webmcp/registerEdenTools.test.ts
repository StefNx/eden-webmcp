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
});
