export const RESOURCE_KINDS = [
  "power",
  "water",
  "wastewater",
  "oxygen",
  "co2",
  "food",
  "spares",
] as const;

export type ResourceKind = (typeof RESOURCE_KINDS)[number];

export const MODULE_KINDS = [
  "habitat",
  "solar",
  "battery",
  "waterRecycler",
  "oxygenGenerator",
  "co2Scrubber",
  "greenhouse",
  "storage",
  "microreactor",
] as const;

export type ModuleKind = (typeof MODULE_KINDS)[number];
export type Actor = "human" | "agent" | "system";
export type EdenMode = "architect" | "results";

export interface Point {
  x: number;
  y: number;
}

export interface HabitatModule {
  id: string;
  kind: ModuleKind;
  label: string;
  position: Point;
  level: number;
  enabled: boolean;
  lockedByHuman: boolean;
  createdBy: Actor;
  updatedBy: Actor;
}

export interface ResourceConnection {
  id: string;
  source: string;
  target: string;
  resource: ResourceKind;
  createdBy: Actor;
}

export interface MissionConstraints {
  name: string;
  crew: number;
  durationSols: number;
  maxBudgetUsd: number;
  maxMassKg: number;
  minWaterReserveSols: number;
  minOxygenReserveSols: number;
  scenarioId: string;
}

export interface HabitatDesign {
  version: number;
  modules: HabitatModule[];
  connections: ResourceConnection[];
  constraints: MissionConstraints;
}

export interface ModuleSpec {
  kind: ModuleKind;
  title: string;
  icon: string;
  description: string;
  costUsd: number;
  massKg: number;
  inputs: ResourceKind[];
  outputs: ResourceKind[];
  primaryResource: ResourceKind;
  powerDemandKwhPerSol?: number;
  powerOutputKwhPerSol?: number;
  batteryCapacityKwh?: number;
  batteryMaxFlowKwhPerSol?: number;
  processCapacityPerSol?: number;
  initialInventory?: Partial<Record<ResourceKind, number>>;
  inventoryCapacity?: Partial<Record<ResourceKind, number>>;
}

export type ScenarioEvent =
  | {
      id: string;
      type: "solarFactor";
      startSol: number;
      endSol: number;
      factor: number;
      label: string;
    }
  | {
      id: string;
      type: "moduleOutage";
      startSol: number;
      endSol: number;
      moduleKind: ModuleKind;
      count: number;
      label: string;
    };

export interface ScenarioDefinition {
  id: string;
  name: string;
  description: string;
  events: ScenarioEvent[];
}

export interface ResourceSnapshot {
  powerGeneratedKwh: number;
  powerDemandKwh: number;
  batteryKwh: number;
  batteryCapacityKwh: number;
  waterKg: number;
  oxygenKg: number;
  co2Kg: number;
  foodKg: number;
  sparesKg: number;
  solarFactor: number;
}

export interface TimelinePoint extends ResourceSnapshot {
  sol: number;
}

export interface SimulationEventLog {
  sol: number;
  severity: "info" | "warning" | "critical" | "success";
  code: string;
  message: string;
}

export interface ScenarioMarker {
  id: string;
  label: string;
  type: ScenarioEvent["type"];
  startSol: number;
  endSol: number;
}

export interface FailureAnalysis {
  code:
    | "INVALID_DESIGN"
    | "POWER_COLLAPSE"
    | "WATER_DEPLETED"
    | "OXYGEN_DEPLETED"
    | "OXYGEN_RESERVE_BREACH"
    | "CO2_OVERLOAD"
    | "FOOD_DEPLETED"
    | "BUDGET_EXCEEDED"
    | "MASS_EXCEEDED"
    | "WATER_RESERVE_BREACH"
    | "UNKNOWN";
  sol: number;
  summary: string;
  evidence: string[];
  suggestedActions: string[];
}

export interface SimulationMetrics {
  totalCostUsd: number;
  totalMassKg: number;
  minBatteryPercent: number;
  minWaterReserveSols: number;
  minOxygenReserveSols: number;
  criticalPowerDeficitSols: number;
  finalResources: ResourceSnapshot;
}

export interface SimulationRun {
  id: string;
  designVersion: number;
  designSnapshot: HabitatDesign;
  seed: number;
  status: "success" | "failure";
  lastSol: number;
  createdAt: string;
  metrics: SimulationMetrics;
  timeline: TimelinePoint[];
  events: SimulationEventLog[];
  scenarioMarkers: ScenarioMarker[];
  failure?: FailureAnalysis;
}

export interface DesignDiff {
  addedModuleIds: string[];
  removedModuleIds: string[];
  changedModules: Array<{ id: string; fields: string[] }>;
  addedConnectionIds: string[];
  removedConnectionIds: string[];
  changedConstraints: string[];
}

export interface RunComparison {
  firstRunId: string;
  secondRunId: string;
  outcomeChanged: boolean;
  failureCauseChanged: boolean;
  delta: {
    survivalSols: number;
    costUsd: number;
    massKg: number;
    minBatteryPercent: number;
    waterReserveSols: number;
    oxygenReserveSols: number;
  };
  designDiff: DesignDiff;
}

export interface ActivityEntry {
  id: string;
  timestamp: string;
  actor: Actor;
  action: string;
  message: string;
  designVersion: number;
}

export interface ToolInvocationRecord {
  id: string;
  toolName: string;
  startedAt: string;
  completedAt?: string;
  status: "running" | "success" | "error";
  rawArguments: Record<string, unknown>;
  validatedArguments?: Record<string, unknown>;
  result?: unknown;
  designVersion: number;
}

export interface DesignValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  totalCostUsd: number;
  totalMassKg: number;
  unconnectedModuleIds: string[];
}

export interface WebMcpStatus {
  state: "checking" | "available" | "unavailable" | "error";
  registeredTools: string[];
  message: string;
}
