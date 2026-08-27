/**
 * Dirección visual: programas científicos medibles, sobrios y legibles dentro
 * de la bitácora lunar; las reglas son puras y ajenas a React/Babylon.
 */
import { buildingCount } from "./BuildingManager";
import type { CampaignId, CampaignMetrics, CampaignProgress, ResourceKey, TycoonState } from "./TycoonState";

type MilestoneDefinition = {
  id: string;
  title: string;
  detail: string;
  target: number;
  label: string;
  current: (state: TycoonState, metrics: CampaignMetrics, baseline: CampaignMetrics) => number;
};

export type CampaignDefinition = {
  id: CampaignId;
  code: string;
  era: string;
  title: string;
  description: string;
  requirementText: string;
  reward: string;
  eligible: (state: TycoonState) => boolean;
  milestones: MilestoneDefinition[];
};

const metricSinceStart = (key: keyof CampaignMetrics) => (_state: TycoonState, metrics: CampaignMetrics, baseline: CampaignMetrics) => Math.max(0, metrics[key] - baseline[key]);

export const CAMPAIGNS: CampaignDefinition[] = [
  {
    id: "surface-pioneers",
    code: "PRG-01",
    era: "Robótica de superficie",
    title: "Pioneros de superficie",
    description: "Un programa de retorno robótico para cartografiar y analizar el regolito local.",
    requirementText: "Requiere Autonomía de rover.",
    reward: "+25% adicional a la carga del rover y +20 kg de capacidad de regolito.",
    eligible: (state) => state.research.includes("rover-autonomy"),
    milestones: [
      { id: "returns", title: "Doble retorno", detail: "Recibe dos cargas del rover tras activar el programa.", target: 2, label: "retornos", current: metricSinceStart("roverReturns") },
      { id: "regolith", title: "Núcleo de regolito", detail: "Acopia 22 kg de regolito científico del programa.", target: 22, label: "kg", current: metricSinceStart("regolithCollected") },
      { id: "data", title: "Análisis de campo", detail: "Integra 18 unidades de datos de superficie.", target: 18, label: "datos", current: metricSinceStart("dataGenerated") },
    ],
  },
  {
    id: "cooperation-protocol",
    code: "PRG-02",
    era: "Operación conjunta",
    title: "Protocolo de cooperación",
    description: "Un estándar operativo para enlazar laboratorio, comunicaciones y soporte de la base.",
    requirementText: "Requiere Laboratorio conjunto, un laboratorio y una antena.",
    reward: "+1 dato/ciclo de red y +8 kWh de reserva de capacidad.",
    eligible: (state) => state.research.includes("joint-laboratory") && buildingCount(state, "laboratory") >= 1 && buildingCount(state, "antenna") >= 1,
    milestones: [
      { id: "telemetry", title: "Enlace calibrado", detail: "Genera 10 datos desde el inicio del protocolo.", target: 10, label: "datos", current: metricSinceStart("dataGenerated") },
      { id: "nominal", title: "Turnos nominales", detail: "Completa cuatro ciclos sin alertas críticas.", target: 4, label: "ciclos", current: metricSinceStart("nominalCycles") },
      { id: "operation", title: "Ventana de operación", detail: "Mantén el protocolo activo durante seis ciclos operativos.", target: 6, label: "ciclos", current: metricSinceStart("cyclesClosed") },
    ],
  },
  {
    id: "lunar-resource-cycle",
    code: "PRG-03",
    era: "Sostenibilidad lunar",
    title: "Ciclo de recursos lunares",
    description: "Valida recuperación de agua y reserva de energía bajo la perturbación de Selenita.",
    requirementText: "Requiere Circuito de agua, dos solares y estar en Selenita.",
    reward: "+0,6 L de agua/ciclo y escudo de 4 kWh ante polvo de Selenita.",
    eligible: (state) => state.research.includes("water-loop") && buildingCount(state, "solar") >= 2 && state.sector === "selenite",
    milestones: [
      { id: "water", title: "Reserva hídrica", detail: "Alcanza 75 L de agua recuperada en la red.", target: 75, label: "L", current: (state) => Math.round(state.resources.water) },
      { id: "dust", title: "Dos ciclos de polvo", detail: "Mantén al menos 24 kWh tras dos perturbaciones de Selenita.", target: 2, label: "ciclos", current: metricSinceStart("dustCyclesWithReserve") },
      { id: "validation", title: "Validación de campo", detail: "Recibe una carga de rover mientras el programa está activo.", target: 1, label: "retorno", current: metricSinceStart("roverReturns") },
    ],
  },
];

export const getCampaign = (id: CampaignId) => CAMPAIGNS.find((campaign) => campaign.id === id)!;

export function campaignProgressFor(state: TycoonState, id: CampaignId) {
  const campaign = getCampaign(id);
  const progress = state.campaigns[id];
  const baseline = progress.startedMetrics ?? state.campaignMetrics;
  return campaign.milestones.map((milestone) => ({
    ...milestone,
    value: Math.min(milestone.target, Math.max(0, milestone.current(state, state.campaignMetrics, baseline))),
    complete: progress.completedMilestones.includes(milestone.id),
  }));
}

function refreshAvailability(state: TycoonState): TycoonState {
  const campaigns = { ...state.campaigns };
  CAMPAIGNS.forEach((campaign) => {
    const entry = campaigns[campaign.id];
    if (entry.status === "active" || entry.status === "complete") return;
    campaigns[campaign.id] = { ...entry, status: campaign.eligible(state) ? "available" : "locked" };
  });
  return { ...state, campaigns };
}

export function canStartCampaign(state: TycoonState, id: CampaignId) {
  const prepared = refreshAvailability(state);
  const campaign = getCampaign(id);
  if (prepared.activeCampaignId) return { state: prepared, ok: false as const, reason: "Finaliza el programa científico activo antes de iniciar otro." };
  if (prepared.campaigns[id].status === "complete") return { state: prepared, ok: false as const, reason: "Programa científico finalizado." };
  if (!campaign.eligible(prepared)) return { state: prepared, ok: false as const, reason: campaign.requirementText };
  return { state: prepared, ok: true as const, reason: "" };
}

export function startCampaign(state: TycoonState, id: CampaignId) {
  const validation = canStartCampaign(state, id);
  if (!validation.ok) return validation;
  const campaign = getCampaign(id);
  const current = validation.state.campaigns[id];
  const campaigns = { ...validation.state.campaigns, [id]: { ...current, status: "active" as const, startedAt: Date.now(), startedMetrics: { ...validation.state.campaignMetrics } } };
  return { state: { ...validation.state, campaigns, activeCampaignId: id }, ok: true as const, reason: `${campaign.title} iniciado. Primer hito: ${campaign.milestones[0].title}.` };
}

function nextMetrics(previous: TycoonState, next: TycoonState, roverReturned: boolean): CampaignMetrics {
  const cycleClosed = next.cycle > previous.cycle;
  const enduredDust = cycleClosed && previous.sector === "selenite" && previous.cycle > 1 && previous.cycle % 4 === 0 && next.resources.energy >= 24;
  const nominal = cycleClosed && !next.alerts.some((alert) => alert.tone === "danger");
  return {
    cyclesClosed: previous.campaignMetrics.cyclesClosed + (cycleClosed ? 1 : 0),
    nominalCycles: previous.campaignMetrics.nominalCycles + (nominal ? 1 : 0),
    roverReturns: previous.campaignMetrics.roverReturns + (roverReturned ? 1 : 0),
    regolithCollected: previous.campaignMetrics.regolithCollected + Math.max(0, next.resources.regolith - previous.resources.regolith),
    dataGenerated: previous.campaignMetrics.dataGenerated + Math.max(0, next.resources.data - previous.resources.data),
    dustCyclesWithReserve: previous.campaignMetrics.dustCyclesWithReserve + (enduredDust ? 1 : 0),
  };
}

function increaseCapacity(state: TycoonState, key: ResourceKey, amount: number) {
  return { ...state, capacity: { ...state.capacity, [key]: state.capacity[key] + amount } };
}

function completionReward(state: TycoonState, id: CampaignId) {
  if (id === "surface-pioneers") return increaseCapacity({ ...state, campaignBonuses: { ...state.campaignBonuses, expeditionRewardBonus: state.campaignBonuses.expeditionRewardBonus + 0.25 } }, "regolith", 20);
  if (id === "cooperation-protocol") return increaseCapacity({ ...state, campaignBonuses: { ...state.campaignBonuses, dataRateBonus: state.campaignBonuses.dataRateBonus + 1 } }, "energy", 8);
  return increaseCapacity({ ...state, campaignBonuses: { ...state.campaignBonuses, waterRateBonus: state.campaignBonuses.waterRateBonus + 0.6, energyReserve: state.campaignBonuses.energyReserve + 4 } }, "energy", 12);
}

export function evaluateCampaignProgress(previous: TycoonState, state: TycoonState, roverReturned = false) {
  let next = refreshAvailability({ ...state, campaignMetrics: nextMetrics(previous, state, roverReturned) });
  const activeId = next.activeCampaignId;
  if (!activeId) return { state: next, milestone: null as string | null, completed: null as CampaignId | null };
  const campaign = getCampaign(activeId);
  const entry = next.campaigns[activeId];
  const baseline = entry.startedMetrics ?? next.campaignMetrics;
  const activeMilestone = campaign.milestones.find((milestone) => !entry.completedMilestones.includes(milestone.id));
  const newlyCompleted = activeMilestone && activeMilestone.current(next, next.campaignMetrics, baseline) >= activeMilestone.target ? activeMilestone.id : null;
  const completedMilestones = newlyCompleted ? [...entry.completedMilestones, newlyCompleted] : entry.completedMilestones;
  const allComplete = completedMilestones.length === campaign.milestones.length;
  const campaigns = { ...next.campaigns, [activeId]: { ...entry, completedMilestones, status: allComplete ? "complete" as const : "active" as const, completedAt: allComplete ? Date.now() : entry.completedAt, rewardsClaimed: allComplete && !entry.rewardsClaimed.includes("completion") ? [...entry.rewardsClaimed, "completion"] : entry.rewardsClaimed } };
  next = { ...next, campaigns, activeCampaignId: allComplete ? null : activeId };
  if (allComplete && !entry.rewardsClaimed.includes("completion")) next = completionReward(next, activeId);
  return { state: refreshAvailability(next), milestone: newlyCompleted, completed: allComplete ? activeId : null };
}
