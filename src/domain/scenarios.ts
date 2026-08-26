import { createConnection, createModule } from "./catalog";
import type { HabitatDesign, ScenarioDefinition } from "./types";

export const SCENARIOS: Record<string, ScenarioDefinition> = {
  "ares-gauntlet": {
    id: "ares-gauntlet",
    name: "Ares Gauntlet",
    description:
      "A 500-sol Mars analogue with a prolonged dust storm and a single oxygen-system outage.",
    events: [
      {
        id: "dust-80",
        type: "solarFactor",
        startSol: 80,
        endSol: 124,
        factor: 0.18,
        label: "45-sol regional dust storm",
      },
      {
        id: "oxygen-outage-280",
        type: "moduleOutage",
        startSol: 280,
        endSol: 304,
        moduleKind: "oxygenGenerator",
        count: 1,
        label: "Primary oxygen generator outage",
      },
    ],
  },
};

export function createDefaultDesign(): HabitatDesign {
  const modules = [
    createModule("habitat", "habitat-core", { x: 540, y: 260 }, "system"),
    createModule("solar", "solar-a", { x: 80, y: 80 }, "system"),
    createModule("solar", "solar-b", { x: 80, y: 230 }, "system"),
    createModule("battery", "battery-a", { x: 290, y: 80 }, "system"),
    createModule("waterRecycler", "recycler-a", { x: 290, y: 390 }, "system"),
    createModule("oxygenGenerator", "oxygen-a", { x: 790, y: 80 }, "system"),
    createModule("co2Scrubber", "scrubber-a", { x: 790, y: 240 }, "system"),
    createModule("greenhouse", "greenhouse-a", { x: 790, y: 410 }, "system"),
    createModule("storage", "storage-a", { x: 510, y: 520 }, "system"),
  ];

  const connections = [
    createConnection("solar-a", "habitat-core", "power", "system"),
    createConnection("solar-b", "habitat-core", "power", "system"),
    createConnection("battery-a", "habitat-core", "power", "system"),
    createConnection("habitat-core", "recycler-a", "wastewater", "system"),
    createConnection("recycler-a", "habitat-core", "water", "system"),
    createConnection("oxygen-a", "habitat-core", "oxygen", "system"),
    createConnection("habitat-core", "scrubber-a", "co2", "system"),
    createConnection("greenhouse-a", "habitat-core", "food", "system"),
    createConnection("storage-a", "habitat-core", "water", "system"),
    createConnection("storage-a", "habitat-core", "oxygen", "system"),
    createConnection("storage-a", "habitat-core", "food", "system"),
    createConnection("storage-a", "habitat-core", "spares", "system"),
  ];

  return {
    version: 1,
    modules,
    connections,
    constraints: {
      name: "Keep 12 crew alive for 500 sols",
      crew: 12,
      durationSols: 500,
      maxBudgetUsd: 8_500_000,
      maxMassKg: 45_000,
      minWaterReserveSols: 20,
      minOxygenReserveSols: 10,
      scenarioId: "ares-gauntlet",
    },
  };
}
