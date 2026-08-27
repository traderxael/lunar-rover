/**
 * Progression rules for the expedition. Scores are intentionally local: the game
 * is static and never sends player performance outside the browser.
 */
export type MapId = "tranquility" | "tycho" | "selenite";
export type Grade = "S" | "A" | "B" | "C";

export type MapRecord = {
  completed: boolean;
  attempts: number;
  grade: Grade | null;
  bestEnergy: number;
  bestTime: number | null;
};

export type CampaignProgress = { version: 1; records: Record<MapId, MapRecord> };
export type CompletionReport = { grade: Grade; newUnlock: MapId | null; isNewBest: boolean; record: MapRecord };

const STORAGE_KEY = "lunar-rover-expedition-progress-v1";
export const MAP_ORDER: MapId[] = ["tranquility", "tycho", "selenite"];

const gradeRank: Record<Grade, number> = { C: 1, B: 2, A: 3, S: 4 };

function blankRecord(): MapRecord {
  return { completed: false, attempts: 0, grade: null, bestEnergy: 0, bestTime: null };
}

export function createProgress(): CampaignProgress {
  return { version: 1, records: { tranquility: blankRecord(), tycho: blankRecord(), selenite: blankRecord() } };
}

export function getProgress(): CampaignProgress {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return createProgress();
    const parsed = JSON.parse(saved) as CampaignProgress;
    if (parsed.version !== 1 || !parsed.records?.tranquility || !parsed.records?.tycho || !parsed.records?.selenite) return createProgress();
    return parsed;
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

export function recordMission(mapId: MapId, elapsed: number, energy: number): CompletionReport {
  const progress = getProgress();
  const before = isMapUnlocked(MAP_ORDER[Math.min(MAP_ORDER.indexOf(mapId) + 1, MAP_ORDER.length - 1)], progress);
  const grade = gradeMission(elapsed, energy);
  const existing = progress.records[mapId];
  const isNewBest = !existing.grade || gradeRank[grade] > gradeRank[existing.grade] || (grade === existing.grade && (existing.bestTime === null || elapsed < existing.bestTime));
  const next: MapRecord = {
    completed: true,
    attempts: existing.attempts + 1,
    grade: !existing.grade || gradeRank[grade] >= gradeRank[existing.grade] ? grade : existing.grade,
    bestEnergy: Math.max(existing.bestEnergy, Math.round(energy)),
    bestTime: existing.bestTime === null ? elapsed : Math.min(existing.bestTime, elapsed),
  };
  progress.records[mapId] = next;
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); } catch { /* local progress is optional */ }

  const currentIndex = MAP_ORDER.indexOf(mapId);
  const nextMap = MAP_ORDER[currentIndex + 1] ?? null;
  const newUnlock = nextMap && !before && isMapUnlocked(nextMap, progress) ? nextMap : null;
  return { grade, newUnlock, isNewBest, record: next };
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
