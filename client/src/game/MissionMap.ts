import { Vector3 } from "@babylonjs/core/Maths/math.vector";

export type Crater = { x: number; z: number; radius: number; depth: number; deep?: boolean };
export type StormConfig = { active: boolean; strength: "calma" | "moderada" | "severa"; particles: number; windSpeed: number; energyDrain: number };

export type MissionMap = {
  id: "tranquility" | "tycho" | "selenite";
  index: string;
  name: string;
  subtitle: string;
  briefing: string;
  objectiveCopy: string;
  terrainColor: string;
  skyColor: string;
  ambientColor: string;
  terrainTexture: "regolith" | "deepCraterRegolith";
  start: Vector3;
  samples: Vector3[];
  craters: Crater[];
  rocks: Array<[number, number, number]>;
  beacon: Vector3;
  storm: StormConfig;
};

const commonRocks: Array<[number, number, number]> = [
  [-39, 11, 1.9], [-34, 28, 1.2], [-17, -17, 2.5], [-4, 31, 1.45], [8, 19, 2.1], [14, -26, 1.7], [28, 6, 2.4], [45, 30, 1.5], [49, -7, 2.1], [4, -44, 2.7], [-43, -34, 2.2],
];

export const MISSION_MAPS: MissionMap[] = [
  {
    id: "tranquility", index: "01", name: "Mare Tranquillitatis", subtitle: "Ruta de calibración", briefing: "Una planicie amplia para calibrar propulsión, inercia y lectura de muestras.", objectiveCopy: "Recupera las cinco muestras y conserva la energía de retorno.", terrainColor: "#9A9690", skyColor: "#050912", ambientColor: "#2C3547", terrainTexture: "regolith",
    start: new Vector3(-47, 0, 36), samples: [new Vector3(-27, 0, 20), new Vector3(-6, 0, 4), new Vector3(17, 0, -10), new Vector3(33, 0, 22), new Vector3(45, 0, -27)],
    craters: [{ x: -24, z: -9, radius: 8, depth: 1.9 }, { x: 17, z: 21, radius: 6, depth: 1.2 }, { x: 29, z: -27, radius: 11, depth: 2.35 }, { x: -31, z: 31, radius: 7, depth: 1.35 }, { x: 4, z: -36, radius: 6, depth: 1.1 }],
    rocks: commonRocks, beacon: new Vector3(54, 0, 47), storm: { active: false, strength: "calma", particles: 0, windSpeed: 0, energyDrain: 0 },
  },
  {
    id: "tycho", index: "02", name: "Fosa de Tycho", subtitle: "Cráteres de borde profundo", briefing: "La ruta de Tycho bordea cavidades profundas. Evita sus anillos de riesgo para no perder tracción ni energía.", objectiveCopy: "Rodea los cráteres profundos: sus perímetros ámbar indican descenso y pérdida de tracción.", terrainColor: "#827D76", skyColor: "#080A11", ambientColor: "#332C30", terrainTexture: "deepCraterRegolith",
    start: new Vector3(-48, 0, 34), samples: [new Vector3(-34, 0, 8), new Vector3(-11, 0, 28), new Vector3(6, 0, 7), new Vector3(32, 0, 25), new Vector3(48, 0, -21)],
    craters: [{ x: -31, z: 18, radius: 11, depth: 5.8, deep: true }, { x: 20, z: -7, radius: 14, depth: 6.4, deep: true }, { x: 21, z: 34, radius: 9, depth: 4.3, deep: true }, { x: -37, z: -28, radius: 7, depth: 2.1 }, { x: 46, z: 2, radius: 6, depth: 1.7 }],
    rocks: [[-44, 16, 2.1], [-32, -12, 2.6], [-14, 18, 1.65], [-4, -20, 1.9], [8, 28, 2.3], [17, 13, 1.3], [36, 11, 2.6], [44, 33, 1.7], [50, -11, 2.4]], beacon: new Vector3(56, 0, 43), storm: { active: false, strength: "calma", particles: 0, windSpeed: 0, energyDrain: 0 },
  },
  {
    id: "selenite", index: "03", name: "Cuenca de Selenita", subtitle: "Frente de polvo activo", briefing: "Un frente de polvo se mueve de oeste a este. La visibilidad cae por oleadas y la ruta abierta exige energía extra.", objectiveCopy: "Cruza con prudencia: las tormentas dispersan polvo y aumentan el consumo al avanzar.", terrainColor: "#746B60", skyColor: "#14100F", ambientColor: "#3B3029", terrainTexture: "regolith",
    start: new Vector3(-50, 0, 32), samples: [new Vector3(-35, 0, -2), new Vector3(-10, 0, 20), new Vector3(7, 0, -19), new Vector3(31, 0, 10), new Vector3(48, 0, -30)],
    craters: [{ x: -24, z: -22, radius: 7, depth: 2.1 }, { x: -10, z: 3, radius: 9, depth: 3.2, deep: true }, { x: 15, z: 24, radius: 7, depth: 2.4 }, { x: 25, z: -16, radius: 10, depth: 4.1, deep: true }, { x: 46, z: 28, radius: 6, depth: 1.5 }],
    rocks: [[-42, 9, 1.6], [-31, 25, 2.4], [-21, -10, 1.4], [-4, 28, 2.1], [6, -4, 1.2], [17, 10, 2.7], [36, -7, 2], [47, 18, 1.5], [52, -18, 2.5]], beacon: new Vector3(55, 0, 44), storm: { active: true, strength: "severa", particles: 66, windSpeed: 10.5, energyDrain: 0.28 },
  },
];

export function getMissionMap() {
  const selected = new URLSearchParams(window.location.search).get("map");
  return MISSION_MAPS.find((map) => map.id === selected) ?? MISSION_MAPS[0];
}
