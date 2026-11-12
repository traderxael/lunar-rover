import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { recordDiscovery, visibleDiscoveries } from "@/game/DiscoveryManager";
import { createInitialTycoonState } from "@/game/TycoonState";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
});

afterEach(() => {
  vi.useRealTimers();
});

const base = () => createInitialTycoonState();

describe("recordDiscovery", () => {
  it("no duplica una entrada con el mismo id", () => {
    const once = recordDiscovery(base(), { id: "a", kind: "research", title: "X", detail: "Y" });
    const twice = recordDiscovery(once, { id: "a", kind: "research", title: "X", detail: "Y" });

    expect(twice.discoveries).toHaveLength(2);
  });
});

describe("visibleDiscoveries", () => {
  const seeded = () => {
    let state = base();
    state = recordDiscovery(state, { id: "a", kind: "research", title: "Circuito de agua", detail: "Agua regenerada.", reward: "Agua" });
    state = recordDiscovery(state, { id: "b", kind: "sector", title: "Cuenca de Selenita", detail: "Sector habilitado." });
    return state;
  };

  it("combina filtro de tipo y de rareza", () => {
    expect(visibleDiscoveries(seeded(), "sector", "rare").map((entry) => entry.id)).toEqual(["b"]);
  });

  it("devuelve vacío cuando el cruce no tiene coincidencias", () => {
    expect(visibleDiscoveries(seeded(), "milestone", "rare")).toEqual([]);
  });

  it("ordena por ciclo ascendente con desempate por marca temporal", () => {
    const state = recordDiscovery(recordDiscovery(base(), { id: "a", kind: "research", title: "A", detail: "a", cycle: 2, occurredAt: 2 }), {
      id: "b",
      kind: "research",
      title: "B",
      detail: "b",
      cycle: 1,
      occurredAt: 1,
    });

    expect(visibleDiscoveries(state, "all", "all", "cycle-asc").map((entry) => entry.id)).toEqual(["foundation:landing", "b", "a"]);
  });
});