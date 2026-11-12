import { describe, expect, it } from "vitest";
import { advanceEconomy, resourceRate } from "@/game/EconomyManager";
import { createInitialTycoonState } from "@/game/TycoonState";

const base = () => createInitialTycoonState();

describe("advanceEconomy", () => {
  it("cierra el ciclo y suma la producción neta de energía", () => {
    const next = advanceEconomy(base());

    expect(next.cycle).toBe(2);
    expect(next.resources.energy).toBeCloseTo(63.2, 5);
  });

  it("no pasa del techo de capacidad", () => {
    const state = { ...base(), resources: { energy: 100, oxygen: 100, water: 100, regolith: 120, data: 160 } };

    expect(advanceEconomy(state).resources.regolith).toBe(120);
  });

  it("reporta déficit de red cuando no hay campo solar", () => {
    const state = { ...base(), buildings: base().buildings.filter((building) => building.kind !== "solar") };

    expect(resourceRate(state).energy).toBeLessThan(0);
  });
});