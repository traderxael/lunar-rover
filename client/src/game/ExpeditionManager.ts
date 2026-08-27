import { campaignBonusesTemplate, type ExpeditionRecord, type ResourceKey, type Resources, type TycoonState } from "./TycoonState";

const EXPEDITION_ENERGY_COST = 12;

export function startExpedition(state: TycoonState, expeditionId: string) {
  const expedition = state.expeditions.find((candidate) => candidate.id === expeditionId);
  if (!expedition) return { state, ok: false as const, reason: "Expedición no disponible." };
  if (expedition.state === "active") return { state, ok: false as const, reason: "El rover ya está en ruta." };
  if (state.resources.energy < EXPEDITION_ENERGY_COST) return { state, ok: false as const, reason: "Reserva de energía insuficiente para lanzar el rover." };
  const started: ExpeditionRecord = { ...expedition, state: "active", secondsRemaining: 3 };
  return { state: { ...state, resources: { ...state.resources, energy: state.resources.energy - EXPEDITION_ENERGY_COST }, expeditions: state.expeditions.map((candidate) => candidate.id === expeditionId ? started : candidate) }, ok: true as const, reason: "Rover desplegado: levantamiento de regolito en curso." };
}

export function advanceExpeditions(state: TycoonState) {
  let completed: ExpeditionRecord | null = null;
  const expeditions = state.expeditions.map((expedition) => {
    if (expedition.state !== "active") return expedition;
    const secondsRemaining = Math.max(0, expedition.secondsRemaining - 1);
    if (secondsRemaining > 0) return { ...expedition, secondsRemaining };
    completed = { ...expedition, state: "complete", secondsRemaining: 0, completedAt: Date.now() };
    return completed;
  });
  if (!completed) return { state: { ...state, expeditions }, completed: null };
  const finished = completed as ExpeditionRecord;
  const multiplier = (state.research.includes("rover-autonomy") ? 1.25 : 1) + (state.campaignBonuses ?? campaignBonusesTemplate()).expeditionRewardBonus;
  const resources = { ...state.resources };
  (Object.entries(finished.reward) as Array<[ResourceKey, number]>).forEach(([key, value]) => {
    resources[key] = Math.min(state.capacity[key], resources[key] + Math.round(value * multiplier));
  });
  return { state: { ...state, resources, expeditions }, completed: finished };
}

export function expeditionRewardLabel(reward: Partial<Resources>) {
  return Object.entries(reward).map(([key, value]) => `${value} ${key === "regolith" ? "reg." : key}`).join(" · ");
}
