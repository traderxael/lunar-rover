import { describe, expect, it } from "vitest";
import { constructBuilding, repairBuilding } from "@/game/BuildingManager";
import { createInitialTycoonState } from "@/game/TycoonState";

const base = () => createInitialTycoonState();

describe("constructBuilding", () => {
  it("descuenta el regolito y agrega el módulo", () => {
    const result = constructBuilding(base(), "solar", "n-03");

    expect(result.ok).toBe(true);
    expect(result.state.resources.regolith).toBe(32);
    expect(result.state.buildings).toHaveLength(3);
  });

  it("rechaza un nodo ocupado", () => {
    expect(constructBuilding(base(), "solar", "n-01").ok).toBe(false);
  });

  it("rechaza cuando falta regolito", () => {
    const state = { ...base(), resources: { ...base().resources, regolith: 4 } };
    const result = constructBuilding(state, "solar", "n-03");

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("Recursos insuficientes.");
  });
});

describe("repairBuilding", () => {
  it("restaura la integridad y cobra regolito", () => {
    const state = {
      ...base(),
      resources: { ...base().resources, regolith: 50 },
      buildings: base().buildings.map((building) => ({ ...building, integrity: 55, status: "damaged" as const })),
    };

    const result = repairBuilding(state, state.buildings[0].id);

    expect(result.ok).toBe(true);
    expect(result.state.resources.regolith).toBe(47);
    expect(result.state.buildings[0].integrity).toBe(100);
  });

  it("rechaza la reparación sin regolito suficiente", () => {
    const state = {
      ...base(),
      resources: { ...base().resources, regolith: 1 },
      buildings: base().buildings.map((building) => ({ ...building, integrity: 55, status: "damaged" as const })),
    };

    expect(repairBuilding(state, state.buildings[0].id).ok).toBe(false);
  });
});