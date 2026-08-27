/**
 * Estado serializable del tycoon. Las reglas viven en managers; este módulo sólo
 * define datos, valores iniciales y la migración segura desde la campaña rover.
 */
export type ResourceKey = "energy" | "oxygen" | "water" | "regolith" | "data";
export type Resources = Record<ResourceKey, number>;
export type SectorId = "tranquility" | "tycho" | "selenite";
export type BuildingKind = "solar" | "habitat" | "laboratory" | "extractor" | "antenna";
export type BuildingStatus = "online" | "paused" | "damaged";

export type BaseBuilding = {
  id: string;
  kind: BuildingKind;
  nodeId: string;
  level: number;
  integrity: number;
  status: BuildingStatus;
};

export type BaseAlert = { id: string; tone: "amber" | "cyan" | "danger"; label: string; detail: string };

export type ExpeditionRecord = {
  id: string;
  sector: SectorId;
  state: "ready" | "active" | "complete";
  secondsRemaining: number;
  reward: Partial<Resources>;
  completedAt?: number;
};

export type TycoonState = {
  version: 1;
  sector: SectorId;
  cycle: number;
  resources: Resources;
  capacity: Resources;
  crew: { engineers: number; scientists: number; explorers: number };
  buildings: BaseBuilding[];
  research: string[];
  alerts: BaseAlert[];
  expeditions: ExpeditionRecord[];
  startedAt: number;
  lastSavedAt: number;
  legacyBonusData: number;
};

export const TYCOON_STORAGE_KEY = "lunar-science-base-tycoon-v1";
const LEGACY_STORAGE_KEY = "lunar-rover-expedition-progress-v1";

export const resourceTemplate = (): Resources => ({ energy: 0, oxygen: 0, water: 0, regolith: 0, data: 0 });

export function createInitialTycoonState(): TycoonState {
  const legacyBonusData = legacyResearchBonus();
  return {
    version: 1,
    sector: "tranquility",
    cycle: 1,
    resources: { energy: 58, oxygen: 62, water: 70, regolith: 42, data: 6 + legacyBonusData },
    capacity: { energy: 100, oxygen: 100, water: 100, regolith: 120, data: 160 },
    crew: { engineers: 1, scientists: 1, explorers: 1 },
    buildings: [
      { id: "solar-landing", kind: "solar", nodeId: "n-01", level: 1, integrity: 100, status: "online" },
      { id: "habitat-landing", kind: "habitat", nodeId: "n-02", level: 1, integrity: 100, status: "online" },
    ],
    research: [],
    alerts: [],
    expeditions: [{ id: "survey-tranquility", sector: "tranquility", state: "ready", secondsRemaining: 0, reward: { regolith: 9, data: 7 } }],
    startedAt: Date.now(),
    lastSavedAt: Date.now(),
    legacyBonusData,
  };
}

function legacyResearchBonus() {
  try {
    const stored = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!stored) return 0;
    const legacy = JSON.parse(stored) as { records?: Record<string, { completed?: boolean; bestOptional?: number }>; leaderboard?: unknown[] };
    const completions = Object.values(legacy.records ?? {}).filter((record) => record.completed).length;
    const optional = Object.values(legacy.records ?? {}).reduce((sum, record) => sum + (record.bestOptional ?? 0), 0);
    return Math.min(24, completions * 5 + optional + Math.min(6, legacy.leaderboard?.length ?? 0));
  } catch {
    return 0;
  }
}

function normalizeResources(resources?: Partial<Resources>): Resources {
  return { ...resourceTemplate(), ...resources };
}

export function loadTycoonState(): TycoonState {
  try {
    const stored = window.localStorage.getItem(TYCOON_STORAGE_KEY);
    if (!stored) return createInitialTycoonState();
    const parsed = JSON.parse(stored) as Partial<TycoonState>;
    if (parsed.version !== 1 || !parsed.resources || !Array.isArray(parsed.buildings)) return createInitialTycoonState();
    const fallback = createInitialTycoonState();
    return {
      ...fallback,
      ...parsed,
      version: 1,
      resources: normalizeResources(parsed.resources),
      capacity: { ...fallback.capacity, ...normalizeResources(parsed.capacity) },
      crew: { ...fallback.crew, ...parsed.crew },
      buildings: parsed.buildings,
      research: Array.isArray(parsed.research) ? parsed.research : [],
      alerts: Array.isArray(parsed.alerts) ? parsed.alerts : [],
      expeditions: Array.isArray(parsed.expeditions) ? parsed.expeditions : fallback.expeditions,
    };
  } catch {
    return createInitialTycoonState();
  }
}

export function saveTycoonState(state: TycoonState) {
  const next = { ...state, lastSavedAt: Date.now() };
  try { window.localStorage.setItem(TYCOON_STORAGE_KEY, JSON.stringify(next)); } catch { /* almacenamiento local no disponible */ }
  return next;
}

export function resetTycoonState() {
  try { window.localStorage.removeItem(TYCOON_STORAGE_KEY); } catch { /* no-op */ }
  return createInitialTycoonState();
}
