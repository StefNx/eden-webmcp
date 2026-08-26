import type {
  DesignDiff,
  HabitatDesign,
  HabitatModule,
  MissionConstraints,
  RunComparison,
  SimulationRun,
} from "../domain/types";

function changedModuleFields(first: HabitatModule, second: HabitatModule): string[] {
  const fields: string[] = [];
  if (first.kind !== second.kind) fields.push("kind");
  if (first.label !== second.label) fields.push("label");
  if (first.level !== second.level) fields.push("level");
  if (first.enabled !== second.enabled) fields.push("enabled");
  if (first.lockedByHuman !== second.lockedByHuman) fields.push("human lock");
  if (first.position.x !== second.position.x || first.position.y !== second.position.y) {
    fields.push("position");
  }
  return fields;
}

export function diffDesigns(first: HabitatDesign, second: HabitatDesign): DesignDiff {
  const firstModules = new Map(first.modules.map((module) => [module.id, module]));
  const secondModules = new Map(second.modules.map((module) => [module.id, module]));
  const firstConnections = new Set(first.connections.map((connection) => connection.id));
  const secondConnections = new Set(second.connections.map((connection) => connection.id));
  const changedModules: DesignDiff["changedModules"] = [];

  for (const [id, firstModule] of firstModules) {
    const secondModule = secondModules.get(id);
    if (!secondModule) continue;
    const fields = changedModuleFields(firstModule, secondModule);
    if (fields.length > 0) changedModules.push({ id, fields });
  }

  const changedConstraints = (
    Object.keys(first.constraints) as Array<keyof MissionConstraints>
  ).filter((key) => first.constraints[key] !== second.constraints[key]);

  return {
    addedModuleIds: [...secondModules.keys()].filter((id) => !firstModules.has(id)),
    removedModuleIds: [...firstModules.keys()].filter((id) => !secondModules.has(id)),
    changedModules,
    addedConnectionIds: [...secondConnections].filter(
      (id) => !firstConnections.has(id),
    ),
    removedConnectionIds: [...firstConnections].filter(
      (id) => !secondConnections.has(id),
    ),
    changedConstraints,
  };
}

export function compareSimulationRuns(
  first: SimulationRun,
  second: SimulationRun,
): RunComparison {
  return {
    firstRunId: first.id,
    secondRunId: second.id,
    outcomeChanged: first.status !== second.status,
    failureCauseChanged: first.failure?.code !== second.failure?.code,
    delta: {
      survivalSols: second.lastSol - first.lastSol,
      costUsd: second.metrics.totalCostUsd - first.metrics.totalCostUsd,
      massKg: second.metrics.totalMassKg - first.metrics.totalMassKg,
      minBatteryPercent:
        second.metrics.minBatteryPercent - first.metrics.minBatteryPercent,
      waterReserveSols:
        second.metrics.minWaterReserveSols - first.metrics.minWaterReserveSols,
      oxygenReserveSols:
        second.metrics.minOxygenReserveSols - first.metrics.minOxygenReserveSols,
    },
    designDiff: diffDesigns(first.designSnapshot, second.designSnapshot),
  };
}
