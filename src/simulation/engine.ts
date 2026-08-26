import { MODULE_CATALOG, scaledCost, scaledMass } from "../domain/catalog";
import { SCENARIOS } from "../domain/scenarios";
import type {
  DesignValidation,
  FailureAnalysis,
  HabitatDesign,
  HabitatModule,
  ModuleKind,
  ResourceKind,
  ResourceSnapshot,
  ScenarioDefinition,
  SimulationEventLog,
  SimulationMetrics,
  SimulationRun,
  TimelinePoint,
} from "../domain/types";
import { mulberry32 } from "./prng";

const CREW_RATES = {
  waterKg: 3.45,
  wastewaterKg: 3.1,
  oxygenKg: 0.84,
  co2Kg: 1.0,
  foodKg: 0.62,
} as const;

const RECYCLER_RECOVERY = 0.98;
const GREENHOUSE_FOOD_KG = 4.5;
const GREENHOUSE_WATER_KG = 4;
const GREENHOUSE_CO2_KG = 3;
const OXYGEN_WATER_RATIO = 1.125;
const BATTERY_EFFICIENCY = 0.94;
const CO2_CRITICAL_KG_PER_CREW = 3;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 2): number {
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
}

function makeRunId(designVersion: number, seed: number): string {
  return `run-v${designVersion}-s${seed}-${Date.now().toString(36)}`;
}

function activeConnectionModuleIds(design: HabitatDesign): Set<string> {
  const ids = new Set<string>(["habitat-core"]);
  for (const connection of design.connections) {
    ids.add(connection.source);
    ids.add(connection.target);
  }
  return ids;
}

export function validateDesign(design: HabitatDesign): DesignValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const ids = new Set<string>();
  const connectedIds = activeConnectionModuleIds(design);

  for (const module of design.modules) {
    if (ids.has(module.id)) errors.push(`Duplicate module id: ${module.id}`);
    ids.add(module.id);
  }

  const habitatModules = design.modules.filter(
    (module) => module.kind === "habitat" && module.enabled,
  );
  if (habitatModules.length !== 1) {
    errors.push("A design must contain exactly one enabled Habitat Core.");
  }

  for (const connection of design.connections) {
    const source = design.modules.find((module) => module.id === connection.source);
    const target = design.modules.find((module) => module.id === connection.target);
    if (!source || !target) {
      errors.push(`Connection ${connection.id} references a missing module.`);
      continue;
    }
    const sourceSpec = MODULE_CATALOG[source.kind];
    const targetSpec = MODULE_CATALOG[target.kind];
    if (
      !sourceSpec.outputs.includes(connection.resource) ||
      !targetSpec.inputs.includes(connection.resource)
    ) {
      warnings.push(
        `Connection ${connection.id} is non-standard for ${connection.resource}.`,
      );
    }
  }

  const unconnectedModuleIds = design.modules
    .filter((module) => module.enabled && module.kind !== "habitat")
    .filter((module) => !connectedIds.has(module.id))
    .map((module) => module.id);

  if (unconnectedModuleIds.length > 0) {
    warnings.push(
      `${unconnectedModuleIds.length} enabled module(s) are disconnected and ignored by the simulator.`,
    );
  }

  const operational = design.modules.filter(
    (module) => module.enabled && connectedIds.has(module.id),
  );
  for (const requiredKind of [
    "solar",
    "battery",
    "waterRecycler",
    "oxygenGenerator",
    "co2Scrubber",
    "storage",
  ] as ModuleKind[]) {
    if (!operational.some((module) => module.kind === requiredKind)) {
      errors.push(`Missing required connected module: ${MODULE_CATALOG[requiredKind].title}.`);
    }
  }

  const totalCostUsd = design.modules
    .filter((module) => module.enabled)
    .reduce((sum, module) => sum + scaledCost(module), 0);
  const totalMassKg = design.modules
    .filter((module) => module.enabled)
    .reduce((sum, module) => sum + scaledMass(module), 0);

  if (totalCostUsd > design.constraints.maxBudgetUsd) {
    warnings.push(
      `Design exceeds budget by $${Math.round(totalCostUsd - design.constraints.maxBudgetUsd).toLocaleString()}.`,
    );
  }
  if (totalMassKg > design.constraints.maxMassKg) {
    warnings.push(
      `Design exceeds mass limit by ${Math.round(totalMassKg - design.constraints.maxMassKg).toLocaleString()} kg.`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    totalCostUsd,
    totalMassKg,
    unconnectedModuleIds,
  };
}

function moduleLevelTotal(modules: HabitatModule[], kind: ModuleKind): number {
  return modules
    .filter((module) => module.kind === kind)
    .reduce((sum, module) => sum + module.level, 0);
}

function accumulateInventory(
  modules: HabitatModule[],
  field: "initialInventory" | "inventoryCapacity",
  resource: ResourceKind,
): number {
  return modules.reduce((sum, module) => {
    const amount = MODULE_CATALOG[module.kind][field]?.[resource] ?? 0;
    return sum + amount * module.level;
  }, 0);
}

function scenarioAtSol(
  scenario: ScenarioDefinition,
  sol: number,
  modules: HabitatModule[],
  random: () => number,
): { solarFactor: number; disabledIds: Set<string>; labels: string[] } {
  let solarFactor = clamp(0.93 + random() * 0.14, 0.8, 1.1);
  const disabledIds = new Set<string>();
  const labels: string[] = [];

  for (const event of scenario.events) {
    if (sol < event.startSol || sol > event.endSol) continue;
    labels.push(event.label);
    if (event.type === "solarFactor") {
      solarFactor *= event.factor * (0.88 + random() * 0.24);
    } else {
      const candidates = modules
        .filter((module) => module.kind === event.moduleKind)
        .sort((a, b) => a.id.localeCompare(b.id));
      for (const candidate of candidates.slice(0, event.count)) {
        disabledIds.add(candidate.id);
      }
    }
  }

  return { solarFactor: clamp(solarFactor, 0.04, 1.2), disabledIds, labels };
}

function failure(
  code: FailureAnalysis["code"],
  sol: number,
  summary: string,
  evidence: string[],
  suggestedActions: string[],
): FailureAnalysis {
  return { code, sol, summary, evidence, suggestedActions };
}

function emptySnapshot(): ResourceSnapshot {
  return {
    powerGeneratedKwh: 0,
    powerDemandKwh: 0,
    batteryKwh: 0,
    batteryCapacityKwh: 0,
    waterKg: 0,
    oxygenKg: 0,
    co2Kg: 0,
    foodKg: 0,
    sparesKg: 0,
    solarFactor: 1,
  };
}

function makeFailedRun(
  design: HabitatDesign,
  seed: number,
  validation: DesignValidation,
): SimulationRun {
  const initial = emptySnapshot();
  const failed = failure(
    "INVALID_DESIGN",
    0,
    "The habitat cannot be simulated because its topology is invalid.",
    validation.errors,
    ["Connect or add every required life-support module, then rerun the mission."],
  );
  return {
    id: makeRunId(design.version, seed),
    designVersion: design.version,
    seed,
    status: "failure",
    lastSol: 0,
    createdAt: new Date().toISOString(),
    timeline: [{ sol: 0, ...initial }],
    events: [{ sol: 0, severity: "critical", code: failed.code, message: failed.summary }],
    failure: failed,
    metrics: {
      totalCostUsd: validation.totalCostUsd,
      totalMassKg: validation.totalMassKg,
      minBatteryPercent: 0,
      minWaterReserveSols: 0,
      minOxygenReserveSols: 0,
      criticalPowerDeficitSols: 0,
      finalResources: initial,
    },
  };
}

export function runSimulation(
  design: HabitatDesign,
  seed = 424_242,
): SimulationRun {
  const validation = validateDesign(design);
  if (!validation.valid) return makeFailedRun(design, seed, validation);

  const scenario = SCENARIOS[design.constraints.scenarioId];
  if (!scenario) {
    return makeFailedRun(design, seed, {
      ...validation,
      valid: false,
      errors: [`Unknown scenario: ${design.constraints.scenarioId}`],
    });
  }

  const connectedIds = activeConnectionModuleIds(design);
  const connectedModules = design.modules.filter(
    (module) => module.enabled && connectedIds.has(module.id),
  );
  const random = mulberry32(seed);
  const crew = design.constraints.crew;

  const capacities = {
    water: accumulateInventory(connectedModules, "inventoryCapacity", "water"),
    oxygen: accumulateInventory(connectedModules, "inventoryCapacity", "oxygen"),
    food: accumulateInventory(connectedModules, "inventoryCapacity", "food"),
    spares: accumulateInventory(connectedModules, "inventoryCapacity", "spares"),
  };

  let waterKg = accumulateInventory(connectedModules, "initialInventory", "water");
  let oxygenKg = accumulateInventory(connectedModules, "initialInventory", "oxygen");
  let foodKg = accumulateInventory(connectedModules, "initialInventory", "food");
  let sparesKg = accumulateInventory(connectedModules, "initialInventory", "spares");
  let wastewaterKg = crew * CREW_RATES.wastewaterKg;
  let co2Kg = 0;

  const batteryCapacityKwh = connectedModules.reduce(
    (sum, module) =>
      sum + (MODULE_CATALOG[module.kind].batteryCapacityKwh ?? 0) * module.level,
    0,
  );
  const batteryMaxFlowKwh = connectedModules.reduce(
    (sum, module) =>
      sum + (MODULE_CATALOG[module.kind].batteryMaxFlowKwhPerSol ?? 0) * module.level,
    0,
  );
  let batteryKwh = batteryCapacityKwh * 0.65;

  const timeline: TimelinePoint[] = [];
  const events: SimulationEventLog[] = [];
  let lastScenarioLabels = new Set<string>();
  let lowCriticalPowerStreak = 0;
  let criticalPowerDeficitSols = 0;
  let minBatteryPercent = 100;
  let minWaterReserveSols = Number.POSITIVE_INFINITY;
  let minOxygenReserveSols = Number.POSITIVE_INFINITY;
  let finalFailure: FailureAnalysis | undefined;
  let lastSol = 0;
  let finalSnapshot = emptySnapshot();

  for (let sol = 1; sol <= design.constraints.durationSols; sol += 1) {
    lastSol = sol;
    const conditions = scenarioAtSol(scenario, sol, connectedModules, random);
    const activeLabels = new Set(conditions.labels);
    for (const label of activeLabels) {
      if (!lastScenarioLabels.has(label)) {
        events.push({
          sol,
          severity: "warning",
          code: "SCENARIO_EVENT_STARTED",
          message: `${label} started.`,
        });
      }
    }
    for (const label of lastScenarioLabels) {
      if (!activeLabels.has(label)) {
        events.push({
          sol,
          severity: "info",
          code: "SCENARIO_EVENT_ENDED",
          message: `${label} ended.`,
        });
      }
    }
    lastScenarioLabels = activeLabels;

    const activeModules = connectedModules.filter(
      (module) => !conditions.disabledIds.has(module.id),
    );
    const count = (kind: ModuleKind) => moduleLevelTotal(activeModules, kind);

    const solarGeneration =
      count("solar") *
      (MODULE_CATALOG.solar.powerOutputKwhPerSol ?? 0) *
      conditions.solarFactor;
    const reactorGeneration =
      count("microreactor") *
      (MODULE_CATALOG.microreactor.powerOutputKwhPerSol ?? 0);
    const generatedKwh = solarGeneration + reactorGeneration;

    const habitatDemand = count("habitat") * 36;
    const recyclerDemand = count("waterRecycler") * 22;
    const oxygenDemand = count("oxygenGenerator") * 16;
    const scrubberDemand = count("co2Scrubber") * 15;
    const storageDemand = count("storage") * 1;
    const greenhouseDemand = count("greenhouse") * 30;
    const criticalDemand =
      habitatDemand + recyclerDemand + oxygenDemand + scrubberDemand + storageDemand;
    const totalDemand = criticalDemand + greenhouseDemand;

    let availableKwh = generatedKwh;
    if (generatedKwh >= totalDemand) {
      const room = batteryCapacityKwh - batteryKwh;
      const charge = Math.min(
        (generatedKwh - totalDemand) * BATTERY_EFFICIENCY,
        room,
        batteryMaxFlowKwh,
      );
      batteryKwh += charge;
      availableKwh = totalDemand;
    } else {
      const deficit = totalDemand - generatedKwh;
      const discharge = Math.min(
        deficit / BATTERY_EFFICIENCY,
        batteryKwh,
        batteryMaxFlowKwh,
      );
      batteryKwh -= discharge;
      availableKwh += discharge * BATTERY_EFFICIENCY;
    }

    const criticalScale =
      criticalDemand > 0 ? clamp(availableKwh / criticalDemand, 0, 1) : 1;
    const optionalPower = Math.max(0, availableKwh - criticalDemand);
    const greenhouseScale =
      greenhouseDemand > 0 ? clamp(optionalPower / greenhouseDemand, 0, 1) : 1;

    if (criticalScale < 0.7) {
      lowCriticalPowerStreak += 1;
      criticalPowerDeficitSols += 1;
    } else {
      lowCriticalPowerStreak = 0;
    }

    const greenhouseCount = count("greenhouse");
    const greenhouseFood = GREENHOUSE_FOOD_KG * greenhouseCount * greenhouseScale;
    const greenhouseOxygen = 2.5 * greenhouseCount * greenhouseScale;
    const greenhouseWater = GREENHOUSE_WATER_KG * greenhouseCount * greenhouseScale;
    const greenhouseCo2 = GREENHOUSE_CO2_KG * greenhouseCount * greenhouseScale;

    foodKg += greenhouseFood;
    oxygenKg += greenhouseOxygen;
    waterKg -= greenhouseWater;
    co2Kg = Math.max(0, co2Kg - greenhouseCo2);

    const recyclerCapacity =
      count("waterRecycler") *
      (MODULE_CATALOG.waterRecycler.processCapacityPerSol ?? 0) *
      criticalScale;
    const processedWastewater = Math.min(wastewaterKg, recyclerCapacity);
    wastewaterKg -= processedWastewater;
    waterKg += processedWastewater * RECYCLER_RECOVERY;

    const crewOxygenNeed = crew * CREW_RATES.oxygenKg;
    const desiredOxygenProduction = Math.max(
      0,
      capacities.oxygen - oxygenKg + crewOxygenNeed - greenhouseOxygen,
    );
    const oxygenProductionCapacity =
      count("oxygenGenerator") *
      (MODULE_CATALOG.oxygenGenerator.processCapacityPerSol ?? 0) *
      criticalScale;
    const oxygenProduced = Math.min(
      desiredOxygenProduction,
      oxygenProductionCapacity,
    );
    const oxygenWaterUse = oxygenProduced * OXYGEN_WATER_RATIO;
    if (waterKg >= oxygenWaterUse) {
      waterKg -= oxygenWaterUse;
      oxygenKg += oxygenProduced;
    }

    const desiredCo2Removal = Math.max(0, co2Kg + crew * CREW_RATES.co2Kg);
    const co2RemovalCapacity =
      count("co2Scrubber") *
      (MODULE_CATALOG.co2Scrubber.processCapacityPerSol ?? 0) *
      criticalScale;
    co2Kg = Math.max(0, co2Kg - Math.min(desiredCo2Removal, co2RemovalCapacity));

    waterKg -= crew * CREW_RATES.waterKg;
    oxygenKg -= crewOxygenNeed;
    foodKg -= crew * CREW_RATES.foodKg;
    wastewaterKg += crew * CREW_RATES.wastewaterKg;
    co2Kg += crew * CREW_RATES.co2Kg;

    if (sol % 30 === 0) {
      const maintenanceNeed = connectedModules.length * 0.2;
      if (sparesKg >= maintenanceNeed) {
        sparesKg -= maintenanceNeed;
      } else {
        events.push({
          sol,
          severity: "warning",
          code: "SPARES_LOW",
          message: "Scheduled maintenance was only partially supplied.",
        });
        sparesKg = Math.max(0, sparesKg - maintenanceNeed);
      }
    }

    waterKg = Math.min(waterKg, capacities.water);
    oxygenKg = Math.min(oxygenKg, capacities.oxygen);
    foodKg = Math.min(foodKg, capacities.food);
    sparesKg = Math.min(sparesKg, capacities.spares);
    batteryKwh = clamp(batteryKwh, 0, batteryCapacityKwh);

    const waterReserveSols = waterKg / Math.max(1, crew * CREW_RATES.waterKg);
    const oxygenReserveSols = oxygenKg / Math.max(1, crewOxygenNeed);
    const batteryPercent =
      batteryCapacityKwh > 0 ? (batteryKwh / batteryCapacityKwh) * 100 : 0;
    minBatteryPercent = Math.min(minBatteryPercent, batteryPercent);
    minWaterReserveSols = Math.min(minWaterReserveSols, waterReserveSols);
    minOxygenReserveSols = Math.min(minOxygenReserveSols, oxygenReserveSols);

    finalSnapshot = {
      powerGeneratedKwh: round(generatedKwh),
      powerDemandKwh: round(totalDemand),
      batteryKwh: round(batteryKwh),
      batteryCapacityKwh: round(batteryCapacityKwh),
      waterKg: round(waterKg),
      oxygenKg: round(oxygenKg),
      co2Kg: round(co2Kg),
      foodKg: round(foodKg),
      sparesKg: round(sparesKg),
      solarFactor: round(conditions.solarFactor, 3),
    };
    timeline.push({ sol, ...finalSnapshot });

    if (lowCriticalPowerStreak >= 3) {
      finalFailure = failure(
        "POWER_COLLAPSE",
        sol,
        "Critical life-support buses were underpowered for three consecutive sols.",
        [
          `Generation ${round(generatedKwh)} kWh vs. demand ${round(totalDemand)} kWh.`,
          `Battery reserve ${round(batteryPercent)}%.`,
          ...conditions.labels,
        ],
        [
          "Add dust-independent generation such as a microreactor.",
          "Add battery capacity and/or reduce non-critical loads.",
          "Add more solar only if storm generation remains adequate.",
        ],
      );
    } else if (waterKg < 0) {
      finalFailure = failure(
        "WATER_DEPLETED",
        sol,
        "The potable-water inventory was depleted.",
        [`Water balance reached ${round(waterKg)} kg.`],
        ["Add storage or recycling capacity.", "Reduce water-intensive loads."],
      );
    } else if (oxygenKg < 0) {
      finalFailure = failure(
        "OXYGEN_DEPLETED",
        sol,
        "The breathable-oxygen inventory was depleted.",
        [`Oxygen balance reached ${round(oxygenKg)} kg.`],
        ["Add a redundant oxygen generator or more oxygen storage."],
      );
    } else if (
      activeLabels.has("Primary oxygen generator outage") &&
      oxygenReserveSols < design.constraints.minOxygenReserveSols
    ) {
      finalFailure = failure(
        "OXYGEN_RESERVE_BREACH",
        sol,
        "Emergency oxygen reserve fell below the mission requirement during a scripted outage.",
        [
          `Reserve ${round(oxygenReserveSols)} sols; required ${design.constraints.minOxygenReserveSols} sols.`,
          "The scenario disables one oxygen generator.",
        ],
        [
          "Add a second connected oxygen generator.",
          "Add oxygen storage while staying within mass and budget limits.",
        ],
      );
    } else if (foodKg < 0) {
      finalFailure = failure(
        "FOOD_DEPLETED",
        sol,
        "Food stores were depleted before mission completion.",
        [`Food balance reached ${round(foodKg)} kg.`],
        ["Add food storage or greenhouse capacity."],
      );
    } else if (co2Kg > crew * CO2_CRITICAL_KG_PER_CREW) {
      finalFailure = failure(
        "CO2_OVERLOAD",
        sol,
        "Habitat CO₂ exceeded the simplified safety threshold.",
        [`CO₂ reached ${round(co2Kg)} kg.`],
        ["Add or reconnect CO₂ scrubbing capacity."],
      );
    }

    if (finalFailure) {
      events.push({
        sol,
        severity: "critical",
        code: finalFailure.code,
        message: finalFailure.summary,
      });
      break;
    }
  }

  if (!finalFailure && validation.totalCostUsd > design.constraints.maxBudgetUsd) {
    finalFailure = failure(
      "BUDGET_EXCEEDED",
      lastSol,
      "The habitat survived, but the design exceeded the mission budget.",
      [
        `Cost $${Math.round(validation.totalCostUsd).toLocaleString()} vs. $${Math.round(design.constraints.maxBudgetUsd).toLocaleString()} limit.`,
      ],
      ["Replace or downgrade modules while preserving validated safety margins."],
    );
  }
  if (!finalFailure && validation.totalMassKg > design.constraints.maxMassKg) {
    finalFailure = failure(
      "MASS_EXCEEDED",
      lastSol,
      "The habitat survived, but launch mass exceeded the mission limit.",
      [
        `Mass ${Math.round(validation.totalMassKg).toLocaleString()} kg vs. ${Math.round(design.constraints.maxMassKg).toLocaleString()} kg limit.`,
      ],
      ["Remove redundant mass or choose a lighter resilience strategy."],
    );
  }
  if (!finalFailure && minWaterReserveSols < design.constraints.minWaterReserveSols) {
    finalFailure = failure(
      "WATER_RESERVE_BREACH",
      lastSol,
      "The habitat completed the timeline but violated its emergency-water reserve.",
      [
        `Minimum reserve ${round(minWaterReserveSols)} sols; required ${design.constraints.minWaterReserveSols}.`,
      ],
      ["Add water storage or improve recovery capacity."],
    );
  }

  if (!finalFailure) {
    events.push({
      sol: lastSol,
      severity: "success",
      code: "MISSION_SURVIVED",
      message: `Mission completed: all ${design.constraints.durationSols} sols survived.`,
    });
  }

  const metrics: SimulationMetrics = {
    totalCostUsd: validation.totalCostUsd,
    totalMassKg: validation.totalMassKg,
    minBatteryPercent: round(minBatteryPercent),
    minWaterReserveSols: round(minWaterReserveSols),
    minOxygenReserveSols: round(minOxygenReserveSols),
    criticalPowerDeficitSols,
    finalResources: finalSnapshot,
  };

  return {
    id: makeRunId(design.version, seed),
    designVersion: design.version,
    seed,
    status: finalFailure ? "failure" : "success",
    lastSol,
    createdAt: new Date().toISOString(),
    metrics,
    timeline,
    events,
    failure: finalFailure,
  };
}
