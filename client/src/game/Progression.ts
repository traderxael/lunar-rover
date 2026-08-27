/** Progression and ranking data stay in the current browser only. */
export type MapId = "tranquility" | "tycho" | "selenite";
export type Grade = "S" | "A" | "B" | "C";

export type MapRecord = {
  completed: boolean;
  attempts: number;
  grade: Grade | null;
  bestEnergy: number;
  bestTime: number | null;
  bestOptional: number;
};

export type LeaderboardEntry = {
  id: string;
  mapId: MapId;
  mapName: string;
  grade: Grade;
  score: number;
  elapsed: number;
  energy: number;
  optionalCollected: number;
  optionalTotal: number;
  createdAt: number;
};

export type CampaignProgress = { version: 3; records: Record<MapId, MapRecord>; leaderboard: LeaderboardEntry[] };
export type CompletionReport = { grade: Grade; newUnlock: MapId | null; isNewBest: boolean; record: MapRecord; score: number; rank: number };

const STORAGE_KEY = "lunar-rover-expedition-progress-v1";
export const MAP_ORDER: MapId[] = ["tranquility", "tycho", "selenite"];
const gradeRank: Record<Grade, number> = { C: 1, B: 2, A: 3, S: 4 };
const gradeBonus: Record<Grade, number> = { S: 900, A: 600, B: 350, C: 100 };
const difficulty: Record<MapId, number> = { tranquility: 1, tycho: 1.25, selenite: 1.5 };

function blankRecord(): MapRecord {
  return { completed: false, attempts: 0, grade: null, bestEnergy: 0, bestTime: null, bestOptional: 0 };
}

export function createProgress(): CampaignProgress {
  return { version: 3, records: { tranquility: blankRecord(), tycho: blankRecord(), selenite: blankRecord() }, leaderboard: [] };
}

function normalizeRecord(record?: Partial<MapRecord>): MapRecord {
  return { ...blankRecord(), ...record, bestOptional: record?.bestOptional ?? 0 };
}

function persist(progress: CampaignProgress) {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); } catch { /* local storage may be unavailable */ }
}

export function getProgress(): CampaignProgress {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return createProgress();
    const parsed = JSON.parse(saved) as Partial<CampaignProgress> & { records?: Partial<Record<MapId, Partial<MapRecord>>> };
    if (!parsed.records?.tranquility || !parsed.records?.tycho || !parsed.records?.selenite) return createProgress();
    const progress: CampaignProgress = {
      version: 3,
      records: {
        tranquility: normalizeRecord(parsed.records.tranquility),
        tycho: normalizeRecord(parsed.records.tycho),
        selenite: normalizeRecord(parsed.records.selenite),
      },
      leaderboard: Array.isArray(parsed.leaderboard) ? parsed.leaderboard.slice(0, 15) : [],
    };
    if (parsed.version !== 3) persist(progress);
    return progress;
  } catch {
    return createProgress();
  }
}

export function isMapUnlocked(mapId: MapId, progress = getProgress()) {
  const index = MAP_ORDER.indexOf(mapId);
  if (index <= 0) return true;
  const preceding = progress.records[MAP_ORDER[index - 1]];
  return preceding.completed && preceding.grade !== null && gradeRank[preceding.grade] >= gradeRank.B;
}

export function gradeMission(elapsed: number, energy: number): Grade {
  if (energy >= 70 && elapsed <= 90) return "S";
  if (energy >= 50 && elapsed <= 120) return "A";
  if (energy >= 30 && elapsed <= 150) return "B";
  return "C";
}

export function calculateScore(mapId: MapId, grade: Grade, elapsed: number, energy: number, optionalCollected: number) {
  const base = 1000 + Math.round(energy) * 10 + optionalCollected * 300 + gradeBonus[grade] - Math.round(elapsed) * 3;
  return Math.max(0, Math.round(base * difficulty[mapId]));
}

function sortLeaderboard(entries: LeaderboardEntry[]) {
  return [...entries].sort((left, right) => right.score - left.score || left.elapsed - right.elapsed || right.energy - left.energy || right.createdAt - left.createdAt);
}

export function getLeaderboard(mapId?: MapId) {
  const entries = getProgress().leaderboard;
  return sortLeaderboard(mapId ? entries.filter((entry) => entry.mapId === mapId) : entries);
}

export function recordMission(mapId: MapId, mapName: string, elapsed: number, energy: number, optionalCollected: number, optionalTotal: number): CompletionReport {
  const progress = getProgress();
  const currentIndex = MAP_ORDER.indexOf(mapId);
  const nextMap = MAP_ORDER[currentIndex + 1] ?? null;
  const wasNextUnlocked = nextMap ? isMapUnlocked(nextMap, progress) : true;
  const grade = gradeMission(elapsed, energy);
  const existing = progress.records[mapId];
  const isNewBest = !existing.grade || gradeRank[grade] > gradeRank[existing.grade] || (grade === existing.grade && (existing.bestTime === null || elapsed < existing.bestTime));
  const record: MapRecord = {
    ...existing,
    completed: true,
    attempts: existing.attempts + 1,
    grade: !existing.grade || gradeRank[grade] >= gradeRank[existing.grade] ? grade : existing.grade,
    bestEnergy: Math.max(existing.bestEnergy, Math.round(energy)),
    bestTime: existing.bestTime === null ? elapsed : Math.min(existing.bestTime, elapsed),
    bestOptional: Math.max(existing.bestOptional, optionalCollected),
  };
  const score = calculateScore(mapId, grade, elapsed, energy, optionalCollected);
  const entry: LeaderboardEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    mapId, mapName, grade, score, elapsed: Math.round(elapsed), energy: Math.round(energy), optionalCollected, optionalTotal, createdAt: Date.now(),
  };
  progress.records[mapId] = record;
  progress.leaderboard = sortLeaderboard([...progress.leaderboard, entry]).slice(0, 15);
  persist(progress);
  const rank = progress.leaderboard.findIndex((candidate) => candidate.id === entry.id) + 1;
  return { grade, newUnlock: nextMap && !wasNextUnlocked && isMapUnlocked(nextMap, progress) ? nextMap : null, isNewBest, record, score, rank };
}

export function recordOptionalProgress(mapId: MapId, completed: number) {
  const progress = getProgress();
  const record = progress.records[mapId];
  const isNewBest = completed > record.bestOptional;
  progress.records[mapId] = { ...record, bestOptional: Math.max(record.bestOptional, completed) };
  persist(progress);
  return isNewBest;
}

export function requirementLabel(mapId: MapId, progress = getProgress()) {
  if (isMapUnlocked(mapId, progress)) return "Sector disponible";
  const index = MAP_ORDER.indexOf(mapId);
  const previous = MAP_ORDER[index - 1];
  const labels: Record<MapId, string> = { tranquility: "Mare Tranquillitatis", tycho: "Fosa de Tycho", selenite: "Cuenca de Selenita" };
  const record = progress.records[previous];
  return record.completed ? `Mejora ${labels[previous]} a grado B` : `Obtén grado B en ${labels[previous]}`;
}

export function resetProgress() {
  try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* no-op in restricted contexts */ }
}
