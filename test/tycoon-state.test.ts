import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installMemoryStorage } from "./helpers/storage";
import {
  TYCOON_STORAGE_KEY,
  createInitialTycoonState,
  loadTycoonState,
  saveTycoonState,
} from "@/game/TycoonState";

const v1Snapshot = {
  version: 1,
  sector: "tycho",
  cycle: 5,
  resources: { energy: 40, oxygen: 50, water: 60, regolith: 70, data: 8 },
  capacity: { energy: 100, oxygen: 100, water: 100, regolith: 120, data: 160 },
  crew: { engineers: 2, scientists: 1, explorers: 1 },
  buildings: [{ id: "solar-1", kind: "solar", nodeId: "n-01", level: 1, integrity: 100, status: "online" }],
  research: ["water-loop"],
  alerts: [],
  expeditions: [],
  startedAt: 1,
  lastSavedAt: 1,
  legacyBonusData: 0,
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
});

afterEach(() => {
  installMemoryStorage().restore();
  vi.useRealTimers();
});

describe("loadTycoonState", () => {
  it("migra un guardado v1 a v3 sin perder recursos ni edificios", () => {
    const storage = installMemoryStorage();
    storage.store.set(TYCOON_STORAGE_KEY, JSON.stringify(v1Snapshot));

    const state = loadTycoonState();

    expect(state.version).toBe(3);
    expect(state.sector).toBe("tycho");
    expect(state.resources.regolith).toBe(70);
    expect(state.buildings).toHaveLength(1);
    expect(state.research).toContain("water-loop");
    expect(state.campaigns["surface-pioneers"]).toBeDefined();
    expect(state.discoveries.length).toBeGreaterThan(0);
  });

  it("reconstruye la bitácora desde edificios e investigación cuando falta", () => {
    const storage = installMemoryStorage();
    storage.store.set(TYCOON_STORAGE_KEY, JSON.stringify({ ...v1Snapshot, version: 2 }));

    const state = loadTycoonState();

    expect(state.discoveries.some((entry) => entry.id === "legacy:module:solar-1")).toBe(true);
    expect(state.discoveries.some((entry) => entry.id === "legacy:research:water-loop")).toBe(true);
  });

  it("devuelve el estado inicial ante un JSON corrupto", () => {
    const storage = installMemoryStorage();
    storage.store.set(TYCOON_STORAGE_KEY, "{ esto no es json");

    expect(loadTycoonState()).toEqual(createInitialTycoonState());
  });

  it("conserva un guardado v3 con sus descubrimientos", () => {
    const storage = installMemoryStorage();
    const initial = createInitialTycoonState();
    storage.store.set(TYCOON_STORAGE_KEY, JSON.stringify(saveTycoonState(initial)));

    expect(loadTycoonState()).toEqual(initial);
  });
});

describe("saveTycoonState", () => {
  it("no lanza cuando localStorage no está disponible", () => {
    installMemoryStorage().restore();

    expect(() => saveTycoonState(createInitialTycoonState())).not.toThrow();
  });
});