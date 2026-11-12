import type { BaseBuilding, BuildingKind, ResourceKey, Resources, TycoonState } from "./TycoonState";

export type BuildingDefinition = {
  kind: BuildingKind;
  name: string;
  shortName: string;
  description: string;
  cost: Partial<Resources>;
  limit: number;
  requiresResearch?: string;
  image: string;
  accent: "amber" | "cyan";
};

export const BUILDINGS: BuildingDefinition[] = [
  { kind: "solar", name: "Campo solar", shortName: "Solar", description: "Genera energía estable durante el ciclo lunar.", cost: { regolith: 10 }, limit: 4, image: "/media/module-solar.svg", accent: "amber" },
  { kind: "habitat", name: "Hábitat presurizado", shortName: "Hábitat", description: "Amplía soporte vital y capacidad de tripulación.", cost: { regolith: 14, energy: 8 }, limit: 3, image: "/media/module-habitat.svg", accent: "cyan" },
  { kind: "laboratory", name: "Laboratorio geológico", shortName: "Laboratorio", description: "Convierte muestras y tiempo de ciencia en datos de investigación.", cost: { regolith: 18, energy: 12 }, limit: 3, image: "/media/module-laboratory.svg", accent: "cyan" },
  { kind: "extractor", name: "Extractora de regolito", shortName: "Extractora", description: "Procesa regolito local a costa de energía de red.", cost: { regolith: 10, energy: 9 }, limit: 3, image: "/media/module-extractor.svg", accent: "amber" },
  { kind: "antenna", name: "Antena de largo alcance", shortName: "Antena", description: "Mejora comunicaciones y abre proyectos de cooperación.", cost: { regolith: 8, energy: 6 }, limit: 2, image: "/media/module-antenna.svg", accent: "cyan" },
];

export function getBuildingDefinition(kind: BuildingKind) {
  return BUILDINGS.find((building) => building.kind === kind)!;
}

export function buildingCount(state: TycoonState, kind: BuildingKind) {
  return state.buildings.filter((building) => building.kind === kind).length;
}

export function canAfford(resources: Resources, cost: Partial<Resources>) {
  return (Object.entries(cost) as Array<[ResourceKey, number]>).every(([key, value]) => resources[key] >= value);
}

export function canBuild(state: TycoonState, kind: BuildingKind, nodeId: string) {
  const definition = getBuildingDefinition(kind);
  if (state.buildings.some((building) => building.nodeId === nodeId)) return { ok: false, reason: "Nodo de construcción ocupado." };
  if (buildingCount(state, kind) >= definition.limit) return { ok: false, reason: `Límite operativo: ${definition.limit} módulos.` };
  if (definition.requiresResearch && !state.research.includes(definition.requiresResearch)) return { ok: false, reason: "Requiere investigación previa." };
  if (!canAfford(state.resources, definition.cost)) return { ok: false, reason: "Recursos insuficientes." };
  return { ok: true as const, reason: "" };
}

export function constructBuilding(state: TycoonState, kind: BuildingKind, nodeId: string) {
  const validation = canBuild(state, kind, nodeId);
  if (!validation.ok) return { state, ok: false as const, reason: validation.reason };
  const definition = getBuildingDefinition(kind);
  const resources = { ...state.resources };
  (Object.entries(definition.cost) as Array<[ResourceKey, number]>).forEach(([key, value]) => { resources[key] -= value; });
  const building: BaseBuilding = { id: `${kind}-${Date.now().toString(36)}`, kind, nodeId, level: 1, integrity: 100, status: "online" };
  return { state: { ...state, resources, buildings: [...state.buildings, building] }, ok: true as const, reason: `${definition.name} instalado.` };
}

export function repairBuilding(state: TycoonState, buildingId: string) {
  const building = state.buildings.find((candidate) => candidate.id === buildingId);
  if (!building) return { state, ok: false as const, reason: "Módulo no encontrado." };
  const cost = Math.max(2, Math.ceil((100 - building.integrity) / 15));
  if (state.resources.regolith < cost) return { state, ok: false as const, reason: "Falta regolito para la reparación." };
  const buildings: BaseBuilding[] = state.buildings.map((candidate) => candidate.id === buildingId ? { ...candidate, integrity: 100, status: "online" as const } : candidate);
  return { state: { ...state, resources: { ...state.resources, regolith: state.resources.regolith - cost }, buildings }, ok: true as const, reason: "Módulo restaurado." };
}
