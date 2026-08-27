/**
 * Dirección visual: bitácora de base científica lunar; el modo demo muestra una
 * base madura en Selenita con economía, investigación y rover en operación.
 */
import { advanceEconomy } from "./EconomyManager";
import { advanceExpeditions, startExpedition } from "./ExpeditionManager";
import { createInitialTycoonState, type TycoonState } from "./TycoonState";
import { evaluateCampaignProgress } from "./CampaignManager";
import { recordDiscoveries } from "./DiscoveryManager";

export function createDemoTycoonState(): TycoonState {
  const initial = createInitialTycoonState();
  const now = Date.now();
  const state: TycoonState = {
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
    capacity: { ...initial.capacity, energy: 108 },
    campaignBonuses: { ...initial.campaignBonuses, dataRateBonus: 1 },
    campaigns: { ...initial.campaigns, "cooperation-protocol": { id: "cooperation-protocol", status: "complete", completedMilestones: ["telemetry", "nominal", "operation"], rewardsClaimed: ["completion"], completedAt: now - 420000 }, "lunar-resource-cycle": { id: "lunar-resource-cycle", status: "active", completedMilestones: [], rewardsClaimed: [], startedAt: now - 180000, startedMetrics: { cyclesClosed: 1, nominalCycles: 1, roverReturns: 0, regolithCollected: 0, dataGenerated: 0, dustCyclesWithReserve: 0 } } },
    activeCampaignId: "lunar-resource-cycle",
    campaignMetrics: { cyclesClosed: 2, nominalCycles: 2, roverReturns: 0, regolithCollected: 8, dataGenerated: 8, dustCyclesWithReserve: 0 },
  };
  return recordDiscoveries({ ...state, discoveries: [] }, [
    { id: "demo:foundation", kind: "foundation", title: "Base de Selenita operativa", detail: "La campaña de demostración reunió infraestructura científica y soporte vital en el tercer sector.", cycle: 12, occurredAt: now - 720000 },
    { id: "demo:module:solar", kind: "infrastructure", title: "Campo solar duplicado", detail: "La segunda plataforma solar estabilizó la red para investigación y tormentas de polvo.", cycle: 13, occurredAt: now - 660000 },
    { id: "demo:module:lab", kind: "infrastructure", title: "Laboratorio de campo instalado", detail: "El módulo abrió una ruta de análisis local para las muestras del rover.", cycle: 14, occurredAt: now - 600000 },
    { id: "demo:research:rover", kind: "research", title: "Autonomía de rover confirmada", detail: "Las rutas de prospección ya obtienen mayor carga de regolito y datos.", cycle: 14, occurredAt: now - 540000 },
    { id: "demo:sector:selenite", kind: "sector", title: "Cuenca de Selenita habilitada", detail: "El asentamiento alcanzó el umbral de energía e investigación para operar bajo polvo lunar.", cycle: 15, occurredAt: now - 480000 },
    { id: "demo:milestone:cooperation", kind: "milestone", title: "Ventana de operación validada", detail: "Seis ciclos de cooperación consolidaron los protocolos de red de la base.", cycle: 16, occurredAt: now - 450000 },
    { id: "demo:reward:cooperation", kind: "reward", title: "Protocolo de cooperación completado", detail: "La red recibió una mejora permanente de telemetría y reserva energética.", cycle: 16, occurredAt: now - 420000, reward: "+1 dato/ciclo de red y +8 kWh de reserva de capacidad." },
    { id: "demo:expedition:prior", kind: "expedition", title: "Carga de prospección recibida", detail: "El rover transfirió una muestra de regolito y lecturas científicas al laboratorio.", cycle: 17, occurredAt: now - 240000, reward: "9 kg de regolito · 7 u de datos" },
  ]);
}

export function advanceDemoStep(state: TycoonState): TycoonState {
  const rover = state.expeditions[0];
  if (rover.state !== "active") {
    return startExpedition(state, rover.id).state;
  }
  const expedition = advanceExpeditions(advanceEconomy(state));
  const campaign = evaluateCampaignProgress(state, expedition.state, Boolean(expedition.completed));
  const discoveries = [];
  if (expedition.completed) discoveries.push({ id: `demo:expedition:${campaign.state.cycle}`, kind: "expedition" as const, title: "Carga de prospección recibida", detail: "El rover autónomo transfirió recursos científicos a la base.", reward: "Regolito y datos de campo" });
  if (campaign.milestone) discoveries.push({ id: `demo:milestone:${campaign.milestone}`, kind: "milestone" as const, title: "Hito de sostenibilidad confirmado", detail: "El programa de recursos lunares validó una nueva etapa operativa." });
  if (campaign.completed) discoveries.push({ id: `demo:reward:${campaign.completed}`, kind: "reward" as const, title: "Ciclo de recursos lunares completado", detail: "La base incorporó una mejora permanente contra la perturbación de Selenita.", reward: "+0,6 L de agua/ciclo y escudo energético ante polvo." });
  return recordDiscoveries(campaign.state, discoveries);
}
