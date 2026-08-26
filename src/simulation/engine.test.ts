import { describe, expect, it } from "vitest";
import { createConnection, createModule } from "../domain/catalog";
import { createDefaultDesign } from "../domain/scenarios";
import { compareSimulationRuns } from "./compareRuns";
import { runSimulation } from "./engine";

const SEED = 424_242;

function addConnectedMicroreactor() {
  const design = createDefaultDesign();
  design.modules.push(
    createModule("microreactor", "reactor-a", { x: 0, y: 0 }, "agent"),
  );
  design.connections.push(
    createConnection("reactor-a", "habitat-core", "power", "agent"),
  );
  design.version += 1;
  return design;
}

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
    const result = runSimulation(createDefaultDesign(), SEED);

    expect(result.status).toBe("failure");
    expect(result.failure?.code).toBe("POWER_COLLAPSE");
    expect(result.lastSol).toBe(94);
  });

  it("reveals the oxygen-reserve failure after power is repaired", () => {
    const result = runSimulation(addConnectedMicroreactor(), SEED);

    expect(result.status).toBe("failure");
    expect(result.failure?.code).toBe("OXYGEN_RESERVE_BREACH");
    expect(result.lastSol).toBe(300);
  });

  it("survives with dust-independent power and oxygen-generator redundancy", () => {
    const design = addConnectedMicroreactor();
    design.modules.push(
      createModule("oxygenGenerator", "oxygen-b", { x: 0, y: 0 }, "agent"),
    );
    design.connections.push(
      createConnection("oxygen-b", "habitat-core", "oxygen", "agent"),
    );
    design.version += 1;

    const result = runSimulation(design, SEED);

    expect(result.status).toBe("success");
    expect(result.lastSol).toBe(500);
    expect(result.metrics.totalCostUsd).toBe(8_200_000);
    expect(result.metrics.totalMassKg).toBe(35_500);
  });

  it("supports a cheaper reserve-storage resilience strategy", () => {
    const design = addConnectedMicroreactor();
    design.modules.push(
      createModule("storage", "storage-b", { x: 0, y: 0 }, "agent"),
    );
    design.connections.push(
      createConnection("storage-b", "habitat-core", "oxygen", "agent"),
    );
    design.version += 1;

    const result = runSimulation(design, SEED);

    expect(result.status).toBe("success");
    expect(result.lastSol).toBe(500);
    expect(result.metrics.totalCostUsd).toBe(7_900_000);
    expect(result.metrics.totalMassKg).toBe(40_500);
  });

  it("does not let a water-only storage link contribute oxygen inventory", () => {
    const design = addConnectedMicroreactor();
    design.modules.push(
      createModule("storage", "storage-b", { x: 0, y: 0 }, "agent"),
    );
    design.connections.push(
      createConnection("storage-b", "habitat-core", "water", "agent"),
    );
    design.version += 1;

    const result = runSimulation(design, SEED);

    expect(result.status).toBe("failure");
    expect(result.failure?.code).toBe("OXYGEN_RESERVE_BREACH");
    expect(result.lastSol).toBe(300);
    expect(result.metrics.finalResources.waterKg).toBeGreaterThan(0);
  });

  it("captures scenario markers and immutable design snapshots for comparisons", () => {
    const starter = createDefaultDesign();
    const first = runSimulation(starter, SEED);
    const repaired = addConnectedMicroreactor();
    const second = runSimulation(repaired, SEED);
    repaired.modules[0].label = "Mutated after run";

    const comparison = compareSimulationRuns(first, second);

    expect(first.scenarioMarkers).toEqual([
      expect.objectContaining({ startSol: 80, endSol: 124 }),
      expect.objectContaining({ startSol: 280, endSol: 304 }),
    ]);
    expect(second.designSnapshot.modules[0].label).not.toBe("Mutated after run");
    expect(comparison.delta.survivalSols).toBe(206);
    expect(comparison.designDiff.addedModuleIds).toContain("reactor-a");
  });
});
