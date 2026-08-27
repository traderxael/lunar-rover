import type { Resources, TycoonState } from "./TycoonState";

export type ResearchDefinition = {
  id: string;
  era: "Pioneros" | "Robótica" | "Cooperación" | "Sostenibilidad";
  title: string;
  description: string;
  cost: number;
  prerequisites: string[];
  effect: string;
  historicalNote: string;
  sourceUrl: string;
};

export const RESEARCH_NODES: ResearchDefinition[] = [
  { id: "orbital-telemetry", era: "Pioneros", title: "Telemetría orbital", description: "Protocolo robusto para lecturas de largo alcance.", cost: 16, prerequisites: [], effect: "+1 dato/ciclo por antena.", historicalNote: "Inspirado en las primeras redes de seguimiento y comunicación espacial.", sourceUrl: "https://www.nasa.gov/apollo-soyuz-test-project/" },
  { id: "rover-autonomy", era: "Robótica", title: "Autonomía de rover", description: "Planificación de rutas y recuperación semiautónoma de recursos.", cost: 28, prerequisites: ["orbital-telemetry"], effect: "Expediciones con +25% de reglito y datos.", historicalNote: "Inspirado en exploración robótica lunar de programas Luna, Chang’e y Chandrayaan.", sourceUrl: "https://www.cnsa.gov.cn/english/n6465652/n6465653/c6810557/content.html" },
  { id: "joint-laboratory", era: "Cooperación", title: "Laboratorio conjunto", description: "Estándares interoperables para equipos de investigación.", cost: 24, prerequisites: ["orbital-telemetry"], effect: "Laboratorios producen +1 dato/ciclo.", historicalNote: "Inspirado en la cooperación internacional de Apollo-Soyuz y la ISS.", sourceUrl: "https://www.nasa.gov/international-space-station/" },
  { id: "water-loop", era: "Sostenibilidad", title: "Circuito de agua", description: "Recuperación de agua del hábitat mediante un circuito cerrado.", cost: 34, prerequisites: ["joint-laboratory"], effect: "+0,8 agua/ciclo por hábitat.", historicalNote: "Inspirado en sistemas de soporte vital desarrollados para la vida prolongada en órbita.", sourceUrl: "https://www.nasa.gov/international-space-station/" },
];

export function availableResearch(state: TycoonState) {
  return RESEARCH_NODES.filter((node) => !state.research.includes(node.id) && node.prerequisites.every((prerequisite) => state.research.includes(prerequisite)));
}

export function canResearch(state: TycoonState, id: string) {
  const node = RESEARCH_NODES.find((candidate) => candidate.id === id);
  if (!node) return { ok: false as const, reason: "Proyecto no encontrado." };
  if (state.research.includes(id)) return { ok: false as const, reason: "Proyecto finalizado." };
  if (!node.prerequisites.every((prerequisite) => state.research.includes(prerequisite))) return { ok: false as const, reason: "Faltan proyectos previos." };
  if (state.resources.data < node.cost) return { ok: false as const, reason: "Faltan datos científicos." };
  return { ok: true as const, reason: "" };
}

export function completeResearch(state: TycoonState, id: string) {
  const validation = canResearch(state, id);
  if (!validation.ok) return { state, ok: false as const, reason: validation.reason };
  const node = RESEARCH_NODES.find((candidate) => candidate.id === id)!;
  const resources: Resources = { ...state.resources, data: state.resources.data - node.cost };
  return { state: { ...state, resources, research: [...state.research, id] }, ok: true as const, reason: `${node.title} completada.` };
}
