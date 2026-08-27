/**
 * Progression rules are stored only in the current browser, never transmitted.
 */
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

export type CampaignProgress = { version: 2; records: Record<MapId, MapRecord> };
export type CompletionReport = { grade: Grade; newUnlock: MapId | null; isNewBest: boolean; record: MapRecord };

const STORAGE_KEY = "lunar-rover-expedition-progress-v1";
export const MAP_ORDER: MapId[] = ["tranquility", "tycho", "selenite"];
const gradeRank: Record<Grade, number> = { C: 1, B: 2, A: 3, S: 4 };

function blankRecord(): MapRecord {
  return { completed: false, attempts: 0, grade: null, bestEnergy: 0, bestTime: null, bestOptional: 0 };
}

export function createProgress(): CampaignProgress {
  return { version: 2, records: { tranquility: blankRecord(), tycho: blankRecord(), selenite: blankRecord() } };
}

export function getProgress(): CampaignProgress {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return createProgress();
    const parsed = JSON.parse(saved) as CampaignProgress | { version: 1; records?: Record<MapId, Omit<MapRecord, "bestOptional">> };
    if (!parsed.records?.tranquility || !parsed.records?.tycho || !parsed.records?.selenite) return createProgress();
    if (parsed.version === 1) {
      const migrated: CampaignProgress = { version: 2, records: {
        tranquility: { ...parsed.records.tranquility, bestOptional: 0 },
        tycho: { ...parsed.records.tycho, bestOptional: 0 },
        selenite: { ...parsed.records.selenite, bestOptional: 0 },
      } };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
    if (parsed.version !== 2) return createProgress();
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
  };
  progress.records[mapId] = record;
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); } catch { /* local progress is optional */ }
  return { grade, newUnlock: nextMap && !wasNextUnlocked && isMapUnlocked(nextMap, progress) ? nextMap : null, isNewBest, record };
}

export function recordOptionalProgress(mapId: MapId, completed: number) {
  const progress = getProgress();
  const record = progress.records[mapId];
  const isNewBest = completed > record.bestOptional;
  progress.records[mapId] = { ...record, bestOptional: Math.max(record.bestOptional, completed) };
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); } catch { /* local progress is optional */ }
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
