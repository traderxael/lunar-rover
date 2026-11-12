import { beforeEach, describe, expect, it, vi } from "vitest";
import { MISSION_MAPS } from "@/game/MissionMap";
import type { MissionResult } from "@/game/mission";
import { applyMissionResult, missionReward } from "@/game/missionReward";
import { createInitialTycoonState } from "@/game/TycoonState";

const map = MISSION_MAPS[0];

const result = (overrides: Partial<MissionResult> = {}): MissionResult => ({
  sector: "tranquility",
  elapsed: 90,
  energy: 60,
  collected: 5,
  total: 5,
  optionalCollected: 0,
  optionalTotal: 3,
  ...overrides,
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  vi.useRealTimers();
});

describe("missionReward", () => {
  it("paga regolito por muestra y datos por muestra y grado", () => {
    const reward = missionReward(result());
    expect(reward.grade).toBe("A");
    expect(reward.regolith).toBe(10);
    expect(reward.data).toBe(5 + 4);
  });

  it("premia las muestras opcionales por separado", () => {
    const reward = missionReward(result({ optionalCollected: 2 }));
    expect(reward.regolith).toBe(12);
    expect(reward.data).toBe(5 + 4 + 4);
  });

  it("da más datos con mejor grado", () => {
    const fast = missionReward(result({ elapsed: 60, energy: 90 }));
    const slow = missionReward(result({ elapsed: 200, energy: 20 }));
    expect(fast.grade).toBe("S");
    expect(slow.grade).toBe("C");
    expect(fast.data).toBeGreaterThan(slow.data);
  });
});

describe("applyMissionResult", () => {
  it("suma los recursos a la base y marca la expedición como completa", () => {
    const state = createInitialTycoonState();
    const before = state.resources.regolith;

    const outcome = applyMissionResult(state, result(), map, { success: true, missionId: "m1" });

    expect(outcome.reward?.regolith).toBe(10);
    expect(outcome.state.resources.regolith).toBe(before + 10);
    expect(outcome.state.expeditions[0].state).toBe("complete");
  });

  it("registra el retorno en la bitácora con su recompensa", () => {
    const state = createInitialTycoonState();
    const outcome = applyMissionResult(state, result(), map, { success: true, missionId: "m1" });
    const entry = outcome.state.discoveries.find((item) => item.id === "mission:m1");

    expect(entry).toBeDefined();
    expect(entry?.reward).toContain("+10 regolito");
  });

  it("no duplica la bitácora si se aplica dos veces", () => {
    const state = createInitialTycoonState();
    const first = applyMissionResult(state, result(), map, { success: true, missionId: "m1" });
    const second = applyMissionResult(first.state, result(), map, { success: true, missionId: "m1" });

    expect(second.state.discoveries.filter((item) => item.id === "mission:m1")).toHaveLength(1);
    // El estado base se devuelve intacto: la guarda de idempotencia evita el doble pago.
    expect(second.discovered).toBe(false);
  });

  it("no paga recursos por una misión fallida", () => {
    const state = createInitialTycoonState();
    const before = state.resources.regolith;

    const outcome = applyMissionResult(state, result({ collected: 1 }), map, { success: false, missionId: "m2" });

    expect(outcome.reward).toBeNull();
    expect(outcome.state.resources.regolith).toBe(before);
  });

  it("deja constancia de la misión fallida en la bitácora", () => {
    const state = createInitialTycoonState();
    const outcome = applyMissionResult(state, result({ collected: 1 }), map, { success: false, missionId: "m2" });
    expect(outcome.state.discoveries.some((item) => item.id === "mission:m2")).toBe(true);
  });
});