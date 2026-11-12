import type { MissionMap } from "./MissionMap";
import type { MapId } from "./Progression";

/**
 * Reglas de la misi贸n de superficie. Todo es puro: recibe un estado y una
 * entrada de conducci贸n y devuelve un estado nuevo. No conoce Three.js, ni
 * React, ni el DOM, as铆 que se puede probar sin navegador.
 */

export type MissionStatus = "briefing" | "active" | "success" | "depleted";

export type MissionSample = {
  id: string;
  x: number;
  z: number;
  collected: boolean;
  optional: boolean;
};

export type MissionState = {
  status: MissionStatus;
  sector: MapId;
  energy: number;
  maxEnergy: number;
  elapsed: number;
  collected: number;
  total: number;
  optionalCollected: number;
  optionalTotal: number;
  samples: MissionSample[];
  hazard: boolean;
  storm: boolean;
  distanceToTarget: number;
};

export type MissionInput = {
  delta: number;
  x: number;
  z: number;
  distance: number;
  boosted: boolean;
  inDeepCrater: boolean;
};

export const ENERGY_PER_METER = 0.3;
export const BOOST_COST = 4.5;
export const STORM_DRAIN_PER_METER = 0.28;
export const CRATER_DRAIN_PER_SECOND = 6;
export const COLLECTION_RADIUS = 2.6;

const START_ENERGY = 100;

export function createMissionState(map: MissionMap, energy = START_ENERGY): MissionState {
  const samples: MissionSample[] = [
    ...map.samples.map((position, index) => ({ id: `sample-${index}`, x: position.x, z: position.z, collected: false, optional: false })),
    ...map.secondary.positions.map((position, index) => ({ id: `optional-${index}`, x: position.x, z: position.z, collected: false, optional: true })),
  ];

  const required = samples.filter((sample) => !sample.optional).length;
  const optional = samples.length - required;

  return {
    status: "briefing",
    sector: map.id,
    energy,
    maxEnergy: energy,
    elapsed: 0,
    collected: 0,
    total: required,
    optionalCollected: 0,
    optionalTotal: optional,
    samples,
    hazard: false,
    storm: map.storm.active,
    distanceToTarget: distanceToNearest(map, map.start.x, map.start.z, samples),
  };
}

function distanceToNearest(map: MissionMap, x: number, z: number, samples: MissionSample[]) {
  const remaining = samples.filter((sample) => !sample.collected);
  if (!remaining.length) return 0;
  return remaining.reduce((best, sample) => Math.min(best, Math.hypot(sample.x - x, sample.z - z)), Number.POSITIVE_INFINITY);
}

export function startMission(state: MissionState): MissionState {
  if (state.status !== "briefing") return state;
  return { ...state, status: "active" };
}

/**
 * Avanza la misi贸n un fotograma. El consumo por metro y el coste del impulso
 * son el n煤cleo de la decisi贸n de ruta: el jugador elige entre ir r谩pido y
 * llegar con reserva.
 */
export function stepMission(state: MissionState, input: MissionInput, map: MissionMap): MissionState {
  if (state.status !== "active") return state;

  const delta = Math.max(0, Math.min(input.delta, 0.05));
  const distance = Math.max(0, input.distance);

  let drain = distance * ENERGY_PER_METER;
  if (input.boosted) drain += BOOST_COST * delta * 6;
  if (input.inDeepCrater) drain += CRATER_DRAIN_PER_SECOND * delta;
  if (state.storm && distance > 0) drain += distance * STORM_DRAIN_PER_METER;

  const energy = Math.max(0, state.energy - drain);

  const samples = state.samples.map((sample) => {
    if (sample.collected) return sample;
    const withinReach = Math.hypot(sample.x - input.x, sample.z - input.z) <= COLLECTION_RADIUS;
    return withinReach ? { ...sample, collected: true } : sample;
  });

  const collected = samples.filter((sample) => sample.collected && !sample.optional).length;
  const optionalCollected = samples.filter((sample) => sample.collected && sample.optional).length;

  const status: MissionStatus = collected >= state.total ? "success" : energy <= 0 ? "depleted" : "active";

  return {
    ...state,
    status,
    energy,
    elapsed: state.elapsed + delta,
    samples,
    collected,
    optionalCollected,
    hazard: input.inDeepCrater,
    distanceToTarget: distanceToNearest(map, input.x, input.z, samples),
  };
}

export type MissionResult = {
  sector: MapId;
  elapsed: number;
  energy: number;
  collected: number;
  total: number;
  optionalCollected: number;
  optionalTotal: number;
};

export function missionResult(state: MissionState): MissionResult {
  return {
    sector: state.sector,
    elapsed: state.elapsed,
    energy: state.energy,
    collected: state.collected,
    total: state.total,
    optionalCollected: state.optionalCollected,
    optionalTotal: state.optionalTotal,
  };
}
export type Obstacle = { x: number; z: number; radius: number };

/**
 * Colisi髇 circular en el plano. Empuja al rover fuera de la roca en lugar de
 * detenerlo en seco: la inercia lunar se siente mejor si el impacto desv韆 y
 * frena un poco, no si clava el veh韈ulo.
 */
export function resolveObstacles(x: number, z: number, radius: number, obstacles: Obstacle[]) {
  let nextX = x;
  let nextZ = z;
  let hit = false;

  for (const obstacle of obstacles) {
    const dx = nextX - obstacle.x;
    const dz = nextZ - obstacle.z;
    const minDistance = radius + obstacle.radius;
    const distance = Math.hypot(dx, dz);

    if (distance >= minDistance) continue;

    const nx = distance === 0 ? 1 : dx / distance;
    const nz = distance === 0 ? 0 : dz / distance;
    nextX = obstacle.x + nx * minDistance;
    nextZ = obstacle.z + nz * minDistance;
    hit = true;
  }

  return { x: nextX, z: nextZ, hit };
}
