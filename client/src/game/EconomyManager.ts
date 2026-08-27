import { campaignBonusesTemplate, type BaseAlert, type BaseBuilding, type ResourceKey, type Resources, type TycoonState } from "./TycoonState";
import { buildingCount } from "./BuildingManager";

const LIMIT = 1000;
const clamp = (value: number, max = LIMIT) => Math.max(0, Math.min(max, value));

export function resourceRate(state: TycoonState): Resources {
  const campaignBonuses = state.campaignBonuses ?? campaignBonusesTemplate();
  const solar = buildingCount(state, "solar");
  const habitat = buildingCount(state, "habitat");
  const laboratory = buildingCount(state, "laboratory");
  const extractor = buildingCount(state, "extractor");
  const antenna = buildingCount(state, "antenna");
  const crewTotal = state.crew.engineers + state.crew.scientists + state.crew.explorers;
  const research = (id: string) => state.research.includes(id);
  const energyNet = solar * 6 - habitat * 0.8 - laboratory * 2 - extractor * 2.5 - antenna * 1.2;
  const hasGrid = state.resources.energy > 0.5 || solar > 0;
  return {
    energy: energyNet,
    oxygen: hasGrid ? habitat * 1.4 - crewTotal * 0.42 : -crewTotal * 0.42,
    water: hasGrid ? habitat * (research("water-loop") ? 1.05 : 0.35) - crewTotal * 0.22 + campaignBonuses.waterRateBonus : -crewTotal * 0.22,
    regolith: hasGrid ? extractor * 2.4 : 0,
    data: hasGrid ? laboratory * (research("joint-laboratory") ? 2.1 : 1.1) + antenna * (research("orbital-telemetry") ? 1.4 : 0.4) + campaignBonuses.dataRateBonus : 0,
  };
}

export function resolveAlerts(state: TycoonState, rates = resourceRate(state)): BaseAlert[] {
  const alerts: BaseAlert[] = [];
  const alertFor = (key: ResourceKey, label: string, detail: string, tone: BaseAlert["tone"] = "danger") => {
    if (state.resources[key] < state.capacity[key] * 0.2) alerts.push({ id: `${key}-low`, tone, label, detail });
  };
  alertFor("energy", "Reserva de energía", "Instala un campo solar o pausa módulos de alto consumo.");
  alertFor("oxygen", "Oxígeno limitado", "Construye o repara un hábitat antes del siguiente ciclo.");
  alertFor("water", "Circuito de agua limitado", "Investiga el circuito de agua o conserva la tripulación actual.");
  if (rates.energy < 0) alerts.push({ id: "grid-deficit", tone: "amber", label: "Déficit de red", detail: `La base consume ${Math.abs(rates.energy).toFixed(1)} más energía por ciclo.` });
  if (!alerts.length) alerts.push({ id: "nominal", tone: "cyan", label: "Sistemas nominales", detail: "La base mantiene producción y soporte vital estables." });
  return alerts.slice(0, 3);
}

export function advanceEconomy(state: TycoonState): TycoonState {
  const campaignBonuses = state.campaignBonuses ?? campaignBonusesTemplate();
  const rates = resourceRate(state);
  const resources = (Object.keys(state.resources) as ResourceKey[]).reduce<Resources>((next, key) => {
    next[key] = clamp(state.resources[key] + rates[key], state.capacity[key]);
    return next;
  }, { energy: 0, oxygen: 0, water: 0, regolith: 0, data: 0 });
  if (state.sector === "selenite" && state.cycle > 1 && state.cycle % 4 === 0) resources.energy = Math.max(0, resources.energy - Math.max(3, 9 - campaignBonuses.energyReserve));
  const damageEvent = (state.cycle > 1 && state.cycle % 12 === 0) || (state.sector === "tycho" && state.cycle > 1 && state.cycle % 6 === 0);
  const damage = state.sector === "tycho" ? 18 : 28;
  const buildings: BaseBuilding[] = damageEvent ? state.buildings.map((building, index) => index === state.cycle % state.buildings.length ? { ...building, integrity: Math.max(55, building.integrity - damage), status: "damaged" as const } : building) : state.buildings;
  const next = { ...state, cycle: state.cycle + 1, resources, buildings };
  return { ...next, alerts: resolveAlerts(next, rates) };
}
