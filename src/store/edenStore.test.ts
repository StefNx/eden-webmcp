import { beforeEach, describe, expect, it } from "vitest";
import { edenStore } from "./edenStore";

describe("shared EDEN store", () => {
  beforeEach(() => {
    edenStore.actions.reset("system");
  });

  it("fails closed when an agent edits a human-locked module", () => {
    edenStore.actions.updateModule(
      "greenhouse-a",
      { lockedByHuman: true },
      "human",
    );

    expect(() =>
      edenStore.actions.updateModule(
        "greenhouse-a",
        { enabled: false },
        "agent",
      ),
    ).toThrow(/locked by the human/i);
    expect(() =>
      edenStore.actions.removeModule("greenhouse-a", "agent"),
    ).toThrow(/locked by the human/i);

    const updated = edenStore.actions.updateModule(
      "greenhouse-a",
      { label: "Authorized greenhouse" },
      "agent",
      true,
    );
    expect(updated.label).toBe("Authorized greenhouse");
  });

  it("preserves historical runs while undoing and redoing design changes", () => {
    const run = edenStore.actions.run(424_242, "human");
    const originalCount = edenStore.getState().design.modules.length;
    edenStore.actions.addModule(
      "microreactor",
      { x: 100, y: 100 },
      "human",
      "reactor-history-test",
    );

    expect(edenStore.actions.undo()).toBe(true);
    expect(edenStore.getState().design.modules).toHaveLength(originalCount);
    expect(edenStore.getState().runs.map((item) => item.id)).toContain(run.id);

    expect(edenStore.actions.redo()).toBe(true);
    expect(
      edenStore.getState().design.modules.some(
        (module) => module.id === "reactor-history-test",
      ),
    ).toBe(true);
    expect(edenStore.getState().runs.map((item) => item.id)).toContain(run.id);
  });

  it("records agent intent separately from the simulator verdict", () => {
    edenStore.actions.run(424_242, "agent");
    const activity = edenStore.getState().activity;

    expect(activity[0]).toMatchObject({
      actor: "system",
      action: "MISSION_FAILED",
    });
    expect(activity[1]).toMatchObject({
      actor: "agent",
      action: "SIMULATION_REQUESTED",
    });
  });
});
