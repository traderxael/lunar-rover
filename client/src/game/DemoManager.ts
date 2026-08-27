/**
 * Dirección visual: bitácora de base científica lunar; el modo demo muestra una
 * base madura en Selenita con economía, investigación y rover en operación.
 */
import { advanceEconomy } from "./EconomyManager";
import { advanceExpeditions, startExpedition } from "./ExpeditionManager";
import { createInitialTycoonState, type TycoonState } from "./TycoonState";

export function createDemoTycoonState(): TycoonState {
  const initial = createInitialTycoonState();
  return {
    ...initial,
    sector: "selenite",
    cycle: 16,
    resources: { energy: 86, oxygen: 78, water: 76, regolith: 66, data: 52 },
    buildings: [
      initial.buildings[0],
      initial.buildings[1],
      { id: "demo-solar-2", kind: "solar", nodeId: "n-03", level: 1, integrity: 100, status: "online" },
      { id: "demo-laboratory", kind: "laboratory", nodeId: "n-04", level: 1, integrity: 100, status: "online" },
      { id: "demo-extractor", kind: "extractor", nodeId: "n-05", level: 1, integrity: 100, status: "online" },
      { id: "demo-antenna", kind: "antenna", nodeId: "n-06", level: 1, integrity: 100, status: "online" },
    ],
    research: ["orbital-telemetry", "rover-autonomy", "joint-laboratory", "water-loop"],
    alerts: [{ id: "demo-selenite", tone: "amber", label: "Viento de polvo previsto", detail: "La red conserva reserva energética para la próxima perturbación de Selenita." }],
    expeditions: [{ ...initial.expeditions[0], state: "active", secondsRemaining: 2 }],
  };
}

export function advanceDemoStep(state: TycoonState): TycoonState {
  const rover = state.expeditions[0];
  if (rover.state !== "active") {
    return startExpedition(state, rover.id).state;
  }
  return advanceExpeditions(advanceEconomy(state)).state;
}
