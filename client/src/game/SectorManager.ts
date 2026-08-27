import type { SectorId, TycoonState } from "./TycoonState";

export type SectorDefinition = { id: SectorId; index: string; name: string; subtitle: string; hazard: string; requirement: (state: TycoonState) => boolean; requirementText: string };

export const BASE_SECTORS: SectorDefinition[] = [
  { id: "tranquility", index: "01", name: "Mare Tranquillitatis", subtitle: "Planicie de calibración", hazard: "Red estable · sin penalización ambiental.", requirement: () => true, requirementText: "Sector de fundación" },
  { id: "tycho", index: "02", name: "Fosa de Tycho", subtitle: "Geología de borde profundo", hazard: "Los bordes de cráter desgastan módulos cada seis ciclos.", requirement: (state) => state.research.includes("joint-laboratory") && state.buildings.some((building) => building.kind === "laboratory"), requirementText: "Requiere Laboratorio conjunto y un laboratorio" },
  { id: "selenite", index: "03", name: "Cuenca de Selenita", subtitle: "Frente de polvo activo", hazard: "El polvo resta energía de red cada cuatro ciclos.", requirement: (state) => state.research.includes("water-loop") && state.buildings.filter((building) => building.kind === "solar").length >= 2, requirementText: "Requiere Circuito de agua y dos campos solares" },
];

export function getSector(id: SectorId) { return BASE_SECTORS.find((sector) => sector.id === id)!; }
export function canAccessSector(state: TycoonState, id: SectorId) { return getSector(id).requirement(state); }

export function changeSector(state: TycoonState, id: SectorId) {
  if (!canAccessSector(state, id)) return { state, ok: false as const, reason: getSector(id).requirementText };
  if (state.sector === id) return { state, ok: true as const, reason: `${getSector(id).name} ya es el sector activo.` };
  return { state: { ...state, sector: id }, ok: true as const, reason: `Traslado operativo autorizado: ${getSector(id).name}.` };
}
