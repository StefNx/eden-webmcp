export const CREW_RATES = {
  waterKg: 3.45,
  wastewaterKg: 3.1,
  oxygenKg: 0.84,
  co2Kg: 1,
  foodKg: 0.62,
} as const;

export const SIMULATION_COEFFICIENTS = {
  recyclerRecovery: 0.98,
  greenhouseFoodKgPerSol: 4.5,
  greenhouseOxygenKgPerSol: 2.5,
  greenhouseWaterKgPerSol: 4,
  greenhouseCo2KgPerSol: 3,
  oxygenWaterRatio: 1.125,
  batteryEfficiency: 0.94,
  co2CriticalKgPerCrew: 3,
  criticalPowerScale: 0.7,
  criticalPowerStreakSols: 3,
  initialBatteryFraction: 0.65,
} as const;

export const MODEL_ASSUMPTIONS = [
  {
    title: "Discrete time",
    detail: "Resources update once per sol; EDEN does not model continuous flows.",
  },
  {
    title: "Primary-resource bus",
    detail:
      "A process module operates when its primary resource has a path to the Habitat Core. Secondary inputs are aggregate system balances, not separate pipe physics.",
  },
  {
    title: "Storage routing",
    detail:
      "A storage inventory contributes only for resources explicitly connected to the Habitat Core through that resource bus.",
  },
  {
    title: "Seeded disruptions",
    detail:
      "Scenario windows are fixed and seeded jitter changes solar output reproducibly.",
  },
  {
    title: "Educational coefficients",
    detail:
      "Rates are public pedagogical values, not mission-planning or certification data.",
  },
] as const;
