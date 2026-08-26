import { describe, expect, it } from "vitest";
import { edenStore } from "../store/edenStore";
import { demoStateFromSearch, loadDemoState } from "./loadDemoState";

describe("repeatable demo states", () => {
  it("parses only supported screenshot states", () => {
    expect(demoStateFromSearch("?demo=success")).toBe("success");
    expect(demoStateFromSearch("?demo=unknown")).toBeNull();
  });

  it("builds the full success state through shared actions and the real engine", () => {
    loadDemoState("success");
    const current = edenStore.getState();
    const greenhouse = current.design.modules.find(
      (module) => module.id === "greenhouse-a",
    );

    expect(current.runs).toHaveLength(3);
    expect(current.runs[0]).toMatchObject({
      status: "success",
      lastSol: 500,
      metrics: { totalCostUsd: 7_900_000, totalMassKg: 40_500 },
    });
    expect(current.design.constraints.maxBudgetUsd).toBe(7_950_000);
    expect(greenhouse?.lockedByHuman).toBe(true);
    expect(new Set(current.activity.map((entry) => entry.actor))).toEqual(
      new Set(["human", "agent", "system"]),
    );
  });
});
