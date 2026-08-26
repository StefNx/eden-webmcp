import { edenStore } from "../store/edenStore";

export type DemoState = "starter" | "failure" | "success";

export function demoStateFromSearch(search: string): DemoState | null {
  const value = new URLSearchParams(search).get("demo");
  return value === "starter" || value === "failure" || value === "success"
    ? value
    : null;
}

export function loadDemoState(mode: DemoState): void {
  edenStore.actions.reset("system");
  if (mode === "starter") return;

  edenStore.actions.run(424_242, "agent");
  if (mode === "failure") return;

  edenStore.actions.addModule(
    "microreactor",
    { x: 80, y: 390 },
    "agent",
    "reactor-demo",
  );
  edenStore.actions.connectModules(
    "reactor-demo",
    "habitat-core",
    "power",
    "agent",
  );
  edenStore.actions.run(424_242, "agent");

  edenStore.actions.updateModule(
    "greenhouse-a",
    { lockedByHuman: true },
    "human",
  );
  edenStore.actions.setConstraints({ maxBudgetUsd: 7_950_000 }, "human");
  edenStore.actions.addModule(
    "storage",
    { x: 300, y: 540 },
    "agent",
    "storage-demo",
  );
  edenStore.actions.connectModules(
    "storage-demo",
    "habitat-core",
    "oxygen",
    "agent",
  );
  edenStore.actions.run(424_242, "agent");
}
