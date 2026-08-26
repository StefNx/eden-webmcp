import type {
  HabitatModule,
  ModuleKind,
  ModuleSpec,
  Point,
  ResourceConnection,
  ResourceKind,
} from "./types";

export const MODULE_CATALOG: Record<ModuleKind, ModuleSpec> = {
  habitat: {
    kind: "habitat",
    title: "Habitat Core",
    icon: "⌂",
    description: "Crew quarters, command and the central life-support bus.",
    costUsd: 2_000_000,
    massKg: 12_000,
    inputs: ["power", "water", "oxygen", "food", "spares"],
    outputs: ["wastewater", "co2"],
    primaryResource: "power",
    powerDemandKwhPerSol: 36,
    initialInventory: { water: 500, oxygen: 80, food: 300, spares: 20 },
    inventoryCapacity: { water: 700, oxygen: 100, food: 400, spares: 30 },
  },
  solar: {
    kind: "solar",
    title: "Solar Array",
    icon: "☀",
    description: "Primary power generation; highly exposed to dust storms.",
    costUsd: 350_000,
    massKg: 900,
    inputs: [],
    outputs: ["power"],
    primaryResource: "power",
    powerOutputKwhPerSol: 130,
  },
  battery: {
    kind: "battery",
    title: "Battery Bank",
    icon: "▰",
    description: "Stores surplus electricity and bridges low-generation periods.",
    costUsd: 550_000,
    massKg: 2_500,
    inputs: ["power"],
    outputs: ["power"],
    primaryResource: "power",
    batteryCapacityKwh: 900,
    batteryMaxFlowKwhPerSol: 300,
  },
  waterRecycler: {
    kind: "waterRecycler",
    title: "Water Recycler",
    icon: "↻",
    description: "Recovers 98% of processed crew wastewater in this simplified model.",
    costUsd: 750_000,
    massKg: 1_300,
    inputs: ["power", "wastewater"],
    outputs: ["water"],
    primaryResource: "water",
    powerDemandKwhPerSol: 22,
    processCapacityPerSol: 65,
  },
  oxygenGenerator: {
    kind: "oxygenGenerator",
    title: "Oxygen Generator",
    icon: "O₂",
    description: "Electrolyzes water to replenish the oxygen reserve.",
    costUsd: 650_000,
    massKg: 1_000,
    inputs: ["power", "water"],
    outputs: ["oxygen"],
    primaryResource: "oxygen",
    powerDemandKwhPerSol: 16,
    processCapacityPerSol: 13,
  },
  co2Scrubber: {
    kind: "co2Scrubber",
    title: "CO₂ Scrubber",
    icon: "CO₂",
    description: "Removes metabolic carbon dioxide from the habitat atmosphere.",
    costUsd: 450_000,
    massKg: 900,
    inputs: ["power", "co2"],
    outputs: ["oxygen"],
    primaryResource: "co2",
    powerDemandKwhPerSol: 15,
    processCapacityPerSol: 20,
  },
  greenhouse: {
    kind: "greenhouse",
    title: "Greenhouse",
    icon: "♧",
    description: "Produces food and oxygen while consuming water, CO₂ and power.",
    costUsd: 900_000,
    massKg: 3_000,
    inputs: ["power", "water", "co2"],
    outputs: ["food", "oxygen"],
    primaryResource: "food",
    powerDemandKwhPerSol: 30,
    processCapacityPerSol: 4.5,
  },
  storage: {
    kind: "storage",
    title: "Resource Storage",
    icon: "▣",
    description: "Adds emergency inventories for water, oxygen, food and spares.",
    costUsd: 350_000,
    massKg: 6_000,
    inputs: ["water", "oxygen", "food", "spares"],
    outputs: ["water", "oxygen", "food", "spares"],
    primaryResource: "water",
    powerDemandKwhPerSol: 1,
    initialInventory: { water: 13_000, oxygen: 160, food: 2_200, spares: 60 },
    inventoryCapacity: { water: 13_000, oxygen: 160, food: 2_200, spares: 60 },
  },
  microreactor: {
    kind: "microreactor",
    title: "Microreactor",
    icon: "⚛",
    description: "Dust-independent baseload power with a high capital cost.",
    costUsd: 1_200_000,
    massKg: 6_000,
    inputs: [],
    outputs: ["power"],
    primaryResource: "power",
    powerOutputKwhPerSol: 120,
  },
};

export function createModule(
  kind: ModuleKind,
  id: string,
  position: Point,
  actor: HabitatModule["createdBy"] = "human",
): HabitatModule {
  const spec = MODULE_CATALOG[kind];
  return {
    id,
    kind,
    label: spec.title,
    position,
    level: 1,
    enabled: true,
    lockedByHuman: false,
    createdBy: actor,
    updatedBy: actor,
  };
}

export function createConnection(
  source: string,
  target: string,
  resource: ResourceKind,
  actor: ResourceConnection["createdBy"] = "human",
  id = `${source}:${resource}:${target}`,
): ResourceConnection {
  return { id, source, target, resource, createdBy: actor };
}

export function scaledCost(module: HabitatModule): number {
  return MODULE_CATALOG[module.kind].costUsd * module.level;
}

export function scaledMass(module: HabitatModule): number {
  return MODULE_CATALOG[module.kind].massKg * module.level;
}
