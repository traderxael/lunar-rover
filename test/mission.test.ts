import { beforeEach, describe, expect, it, vi } from "vitest";
import { MISSION_MAPS } from "@/game/MissionMap";
import { createMissionState, missionResult, startMission, stepMission, type MissionState } from "@/game/mission";

const map = MISSION_MAPS[0];
const idle = { delta: 1 / 60, x: 0, z: 0, distance: 0, boosted: false, inDeepCrater: false };

const active = (overrides: Partial<MissionState> = {}): MissionState => ({
  ...createMissionState(map),
  status: "active",
  ...overrides,
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
});

describe("createMissionState", () => {
  it("cuenta las muestras obligatorias y las opcionales del sector", () => {
    const state = createMissionState(map);
    expect(state.total).toBe(map.samples.length);
    expect(state.optionalTotal).toBe(map.secondary.positions.length);
    expect(state.status).toBe("briefing");
    expect(state.energy).toBe(100);
  });

  it("marca la tormenta sólo cuando el sector la declara", () => {
    expect(createMissionState(map).storm).toBe(false);
    const stormy = MISSION_MAPS.find((candidate) => candidate.id === "selenite")!;
    expect(createMissionState(stormy).storm).toBe(true);
  });
});

describe("startMission", () => {
  it("pasa de briefing a active", () => {
    expect(startMission(createMissionState(map)).status).toBe("active");
  });
});

describe("stepMission", () => {
  it("consume energía por distancia recorrida", () => {
    const next = stepMission(active(), { ...idle, distance: 10 }, map);
    expect(next.energy).toBeCloseTo(97, 5);
  });

  it("cobra el impulso además de la distancia", () => {
    const coasting = stepMission(active(), { ...idle, distance: 10 }, map);
    const boosting = stepMission(active(), { ...idle, distance: 10, boosted: true }, map);
    expect(boosting.energy).toBeLessThan(coasting.energy);
  });

  it("gasta más en tormenta que en terreno despejado", () => {
    const stormy = MISSION_MAPS.find((candidate) => candidate.id === "selenite")!;
    const withStorm = stepMission(active({ storm: true }), { ...idle, distance: 20 }, stormy);
    const clear = stepMission(active({ storm: false }), { ...idle, distance: 20 }, stormy);
    expect(withStorm.energy).toBeLessThan(clear.energy);
  });

  it("recoge una muestra al entrar en su radio y no la cuenta dos veces", () => {
    const first = map.samples[0];
    const reached = stepMission(active(), { ...idle, x: first.x, z: first.z, distance: 4 }, map);
    expect(reached.collected).toBe(1);

    const again = stepMission(reached, { ...idle, x: first.x, z: first.z, distance: 0 }, map);
    expect(again.collected).toBe(1);
  });

  it("no recoge una muestra que está fuera de radio", () => {
    const far = stepMission(active(), { ...idle, x: 60, z: 60, distance: 4 }, map);
    expect(far.collected).toBe(0);
  });

  it("reúne las muestras opcionales por separado", () => {
    const optional = map.secondary.positions[0];
    const next = stepMission(active(), { ...idle, x: optional.x, z: optional.z, distance: 4 }, map);
    expect(next.optionalCollected).toBe(1);
    expect(next.collected).toBe(0);
  });

  it("termina con éxito al reunir la cuota obligatoria", () => {
    let state = active();
    for (const sample of map.samples) {
      state = stepMission(state, { ...idle, x: sample.x, z: sample.z, distance: 4 }, map);
    }
    expect(state.status).toBe("success");
    expect(state.collected).toBe(state.total);
  });

  it("se agota cuando la energía llega a cero", () => {
    const next = stepMission(active({ energy: 1 }), { ...idle, distance: 40 }, map);
    expect(next.status).toBe("depleted");
    expect(next.energy).toBe(0);
  });

  it("no avanza fuera del estado activo", () => {
    const briefing = createMissionState(map);
    expect(stepMission(briefing, { ...idle, distance: 10 }, map)).toBe(briefing);
  });

  it("expone el resultado con sector, tiempo y energía", () => {
    const next = stepMission(active(), { ...idle, distance: 10 }, map);
    const result = missionResult(next);
    expect(result.sector).toBe("tranquility");
    expect(result.energy).toBeCloseTo(97, 5);
    expect(result.collected).toBe(0);
  });
});