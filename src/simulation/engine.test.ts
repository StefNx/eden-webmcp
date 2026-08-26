import { describe, expect, it } from "vitest";
import { createConnection, createModule } from "../domain/catalog";
import { createDefaultDesign } from "../domain/scenarios";
import { runSimulation } from "./engine";

describe("EDEN deterministic simulator", () => {
  it("produces the same causal outcome for the same design and seed", () => {
    const design = createDefaultDesign();
    const first = runSimulation(design, 42);
    const second = runSimulation(design, 42);

    expect(first.status).toBe(second.status);
    expect(first.lastSol).toBe(second.lastSol);
    expect(first.failure?.code).toBe(second.failure?.code);
    expect(first.metrics.finalResources).toEqual(second.metrics.finalResources);
  });

  it("makes the seeded starter habitat fail during the dust storm", () => {
    const result = runSimulation(createDefaultDesign(), 424_242);

    expect(result.status).toBe("failure");
    expect(result.failure?.code).toBe("POWER_COLLAPSE");
    expect(result.lastSol).toBeGreaterThanOrEqual(80);
    expect(result.lastSol).toBeLessThanOrEqual(124);
  });

  it("allows a budget-compliant resilient design to survive", () => {
    const design = createDefaultDesign();
    design.modules.push(
      createModule("microreactor", "reactor-a", { x: 0, y: 0 }, "agent"),
      createModule("oxygenGenerator", "oxygen-b", { x: 0, y: 0 }, "agent"),
    );
    design.connections.push(
      createConnection("reactor-a", "habitat-core", "power", "agent"),
      createConnection("oxygen-b", "habitat-core", "oxygen", "agent"),
    );
    design.version += 1;

    const result = runSimulation(design, 424_242);

    expect(result.status).toBe("success");
    expect(result.lastSol).toBe(500);
    expect(result.metrics.totalCostUsd).toBeLessThanOrEqual(
      design.constraints.maxBudgetUsd,
    );
  });
});
