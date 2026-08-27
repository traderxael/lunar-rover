/**
 * Estado serializable del tycoon. Las reglas viven en managers; este módulo sólo
 * define datos, valores iniciales y migraciones seguras de la campaña.
 */
export type ResourceKey = "energy" | "oxygen" | "water" | "regolith" | "data";
export type Resources = Record<ResourceKey, number>;
export type SectorId = "tranquility" | "tycho" | "selenite";
export type BuildingKind = "solar" | "habitat" | "laboratory" | "extractor" | "antenna";
export type BuildingStatus = "online" | "paused" | "damaged";
export type CampaignId = "surface-pioneers" | "cooperation-protocol" | "lunar-resource-cycle";
export type CampaignStatus = "locked" | "available" | "active" | "complete";

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

export type CampaignProgress = {
  id: CampaignId;
  status: CampaignStatus;
  completedMilestones: string[];
  rewardsClaimed: string[];
  startedAt?: number;
  startedMetrics?: CampaignMetrics;
  completedAt?: number;
};

export type CampaignMetrics = {
  cyclesClosed: number;
  nominalCycles: number;
  roverReturns: number;
  regolithCollected: number;
  dataGenerated: number;
  dustCyclesWithReserve: number;
};

export type CampaignBonuses = {
  expeditionRewardBonus: number;
  dataRateBonus: number;
  waterRateBonus: number;
  energyReserve: number;
};

export type DiscoveryKind = "foundation" | "infrastructure" | "research" | "expedition" | "milestone" | "reward" | "sector";
export type DiscoveryRarity = "signal" | "notable" | "rare" | "landmark";
export type DiscoveryEntry = { id: string; kind: DiscoveryKind; title: string; detail: string; cycle: number; occurredAt: number; reward?: string; rarity?: DiscoveryRarity };

export type TycoonState = {
  version: 3;
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
  campaigns: Record<CampaignId, CampaignProgress>;
  activeCampaignId: CampaignId | null;
  campaignMetrics: CampaignMetrics;
  campaignBonuses: CampaignBonuses;
  discoveries: DiscoveryEntry[];
};

export const TYCOON_STORAGE_KEY = "lunar-science-base-tycoon-v1";
const LEGACY_STORAGE_KEY = "lunar-rover-expedition-progress-v1";
const campaignIds: CampaignId[] = ["surface-pioneers", "cooperation-protocol", "lunar-resource-cycle"];
const discoveryKinds: DiscoveryKind[] = ["foundation", "infrastructure", "research", "expedition", "milestone", "reward", "sector"];
const discoveryRarities: DiscoveryRarity[] = ["signal", "notable", "rare", "landmark"];

export const resourceTemplate = (): Resources => ({ energy: 0, oxygen: 0, water: 0, regolith: 0, data: 0 });

export function campaignProgressTemplate(): Record<CampaignId, CampaignProgress> {
  return {
    "surface-pioneers": { id: "surface-pioneers", status: "locked", completedMilestones: [], rewardsClaimed: [] },
    "cooperation-protocol": { id: "cooperation-protocol", status: "locked", completedMilestones: [], rewardsClaimed: [] },
    "lunar-resource-cycle": { id: "lunar-resource-cycle", status: "locked", completedMilestones: [], rewardsClaimed: [] },
  };
}

export const campaignMetricsTemplate = (): CampaignMetrics => ({ cyclesClosed: 0, nominalCycles: 0, roverReturns: 0, regolithCollected: 0, dataGenerated: 0, dustCyclesWithReserve: 0 });
export const campaignBonusesTemplate = (): CampaignBonuses => ({ expeditionRewardBonus: 0, dataRateBonus: 0, waterRateBonus: 0, energyReserve: 0 });

export function initialDiscoveries(now = Date.now()): DiscoveryEntry[] {
  return [{ id: "foundation:landing", kind: "foundation", title: "Base de aterrizaje operativa", detail: "Los módulos iniciales quedaron registrados en Mare Tranquillitatis.", cycle: 1, occurredAt: now }];
}

export function createInitialTycoonState(): TycoonState {
  const now = Date.now();
  const legacyBonusData = legacyResearchBonus();
  return {
    version: 3,
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
    startedAt: now,
    lastSavedAt: now,
    legacyBonusData,
    campaigns: campaignProgressTemplate(),
    activeCampaignId: null,
    campaignMetrics: campaignMetricsTemplate(),
    campaignBonuses: campaignBonusesTemplate(),
    discoveries: initialDiscoveries(now),
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

function normalizeCampaigns(campaigns?: Partial<Record<CampaignId, Partial<CampaignProgress>>>) {
  const fallback = campaignProgressTemplate();
  return campaignIds.reduce<Record<CampaignId, CampaignProgress>>((next, id) => {
    const candidate = campaigns?.[id];
    next[id] = {
      ...fallback[id],
      ...candidate,
      id,
      status: candidate?.status === "available" || candidate?.status === "active" || candidate?.status === "complete" ? candidate.status : "locked",
      completedMilestones: Array.isArray(candidate?.completedMilestones) ? candidate.completedMilestones : [],
      rewardsClaimed: Array.isArray(candidate?.rewardsClaimed) ? candidate.rewardsClaimed : [],
    };
    return next;
  }, campaignProgressTemplate());
}

function normalizeCampaignMetrics(metrics?: Partial<CampaignMetrics>): CampaignMetrics {
  const fallback = campaignMetricsTemplate();
  return (Object.keys(fallback) as Array<keyof CampaignMetrics>).reduce<CampaignMetrics>((next, key) => {
    const value = metrics?.[key];
    next[key] = typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : fallback[key];
    return next;
  }, fallback);
}

function normalizeCampaignBonuses(bonuses?: Partial<CampaignBonuses>): CampaignBonuses {
  const fallback = campaignBonusesTemplate();
  return (Object.keys(fallback) as Array<keyof CampaignBonuses>).reduce<CampaignBonuses>((next, key) => {
    const value = bonuses?.[key];
    next[key] = typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : fallback[key];
    return next;
  }, fallback);
}

function normalizeDiscoveries(discoveries?: unknown): DiscoveryEntry[] {
  if (!Array.isArray(discoveries)) return [];
  return discoveries.reduce<DiscoveryEntry[]>((next, candidate) => {
    if (!candidate || typeof candidate !== "object") return next;
    const entry = candidate as Partial<DiscoveryEntry>;
    if (typeof entry.id !== "string" || typeof entry.title !== "string" || typeof entry.detail !== "string" || !discoveryKinds.includes(entry.kind as DiscoveryKind)) return next;
    next.push({ id: entry.id, kind: entry.kind as DiscoveryKind, title: entry.title, detail: entry.detail, cycle: typeof entry.cycle === "number" ? Math.max(1, Math.floor(entry.cycle)) : 1, occurredAt: typeof entry.occurredAt === "number" ? entry.occurredAt : Date.now(), ...(typeof entry.reward === "string" ? { reward: entry.reward } : {}), ...(discoveryRarities.includes(entry.rarity as DiscoveryRarity) ? { rarity: entry.rarity as DiscoveryRarity } : {}) });
    return next;
  }, []).slice(-80);
}

function consolidatedDiscoveries(snapshot: { cycle?: number; buildings?: BaseBuilding[]; research?: string[]; campaigns?: Record<CampaignId, CampaignProgress> }): DiscoveryEntry[] {
  const cycle = Math.max(1, snapshot.cycle ?? 1);
  const occurredAt = Date.now();
  const entries: DiscoveryEntry[] = [{ id: "foundation:archive", kind: "foundation", title: "Registro de base consolidado", detail: "La bitácora visual reunió los avances obtenidos antes de activar este archivo.", cycle, occurredAt }];
  (snapshot.buildings ?? []).forEach((building) => entries.push({ id: `legacy:module:${building.id}`, kind: "infrastructure", title: `Módulo ${building.kind} confirmado`, detail: "Infraestructura existente incorporada al registro de la base.", cycle, occurredAt }));
  (snapshot.research ?? []).forEach((research) => entries.push({ id: `legacy:research:${research}`, kind: "research", title: "Tecnología archivada", detail: `La investigación ${research} quedó consolidada en la bitácora.`, cycle, occurredAt }));
  campaignIds.forEach((id) => { if (snapshot.campaigns?.[id]?.status === "complete") entries.push({ id: `legacy:reward:${id}`, kind: "reward", title: "Programa científico finalizado", detail: "La recompensa permanente del programa fue incorporada al historial.", cycle, occurredAt, reward: "Bonificación de red activa" }); });
  return entries.slice(-80);
}

export function loadTycoonState(): TycoonState {
  try {
    const stored = window.localStorage.getItem(TYCOON_STORAGE_KEY);
    if (!stored) return createInitialTycoonState();
    const parsed = JSON.parse(stored) as Omit<Partial<TycoonState>, "version"> & { version?: number };
    if ((parsed.version !== 1 && parsed.version !== 2 && parsed.version !== 3) || !parsed.resources || !Array.isArray(parsed.buildings)) return createInitialTycoonState();
    const fallback = createInitialTycoonState();
    const buildings = parsed.buildings;
    const research = Array.isArray(parsed.research) ? parsed.research : [];
    const campaigns = normalizeCampaigns(parsed.campaigns);
    const discoveries = normalizeDiscoveries(parsed.discoveries);
    return {
      ...fallback,
      ...parsed,
      version: 3,
      resources: normalizeResources(parsed.resources),
      capacity: { ...fallback.capacity, ...normalizeResources(parsed.capacity) },
      crew: { ...fallback.crew, ...parsed.crew },
      buildings,
      research,
      alerts: Array.isArray(parsed.alerts) ? parsed.alerts : [],
      expeditions: Array.isArray(parsed.expeditions) ? parsed.expeditions : fallback.expeditions,
      campaigns,
      activeCampaignId: campaignIds.includes(parsed.activeCampaignId as CampaignId) ? parsed.activeCampaignId as CampaignId : null,
      campaignMetrics: normalizeCampaignMetrics(parsed.campaignMetrics),
      campaignBonuses: normalizeCampaignBonuses(parsed.campaignBonuses),
      discoveries: discoveries.length ? discoveries : consolidatedDiscoveries({ cycle: parsed.cycle, buildings, research, campaigns }),
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
