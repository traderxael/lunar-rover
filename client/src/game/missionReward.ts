import type { MissionMap } from "./MissionMap";
import type { MissionResult } from "./mission";
import { gradeMission } from "./Progression";
import { recordDiscovery } from "./DiscoveryManager";
import type { TycoonState } from "./TycoonState";

/**
 * Recompensa de una misión de superficie y su aplicación al estado de la base.
 *
 * Es una función pura: recibe el estado y el resultado, y devuelve un estado
 * nuevo junto a los descubrimientos que hay que registrar. No toca la escena
 * ni el almacenamiento.
 */

export type MissionReward = {
  regolith: number;
  data: number;
  grade: "S" | "A" | "B" | "C";
  label: string;
};

const gradeDataBonus = { S: 6, A: 4, B: 2, C: 0 } as const;

export function missionReward(result: MissionResult): MissionReward {
  const grade = gradeMission(result.elapsed, result.energy);
  const regolith = result.collected * 2 + result.optionalCollected;
  const data = result.collected + result.optionalCollected * 2 + gradeDataBonus[grade];
  const label = `${result.collected} muestras · ${result.optionalCollected}/${result.optionalTotal} opcionales · grado ${grade}`;

  return { regolith, data, grade, label };
}

export type MissionOutcome = {
  state: TycoonState;
  reward: MissionReward | null;
  discovered: boolean;
};

/**
 * Acredita el resultado de una misión en la base. Sólo una misión exitosa
 * aporta recursos; una misión agotada no registra nada para no premiar el
 * fracaso, pero deja constancia en la bitácora.
 */
export function applyMissionResult(
  state: TycoonState,
  result: MissionResult,
  map: MissionMap,
  options: { success: boolean; missionId: string },
): MissionOutcome {
  const discoveryId = `mission:${options.missionId}`;

  // Guarda de idempotencia: la misma mision no puede acreditarse dos veces,
  // ni en recursos ni en bitacora.
  if (state.discoveries.some((entry) => entry.id === discoveryId)) {
    return { state, reward: null, discovered: false };
  }

  if (!options.success) {
    const next = recordDiscovery(state, {
      id: discoveryId,
      kind: "expedition",
      title: "Exploración interrumpida",
      detail: `El rover quedó sin energía en ${map.name} con ${result.collected} de ${result.total} muestras.`,
    });
    return { state: next, reward: null, discovered: next !== state };
  }

  const reward = missionReward(result);

  const next = recordDiscovery(
    {
      ...state,
      resources: {
        ...state.resources,
        regolith: state.resources.regolith + reward.regolith,
        data: state.resources.data + reward.data,
      },
      expeditions: state.expeditions.map((expedition) =>
        expedition.sector === map.id ? { ...expedition, state: "complete", secondsRemaining: 0, completedAt: Date.now() } : expedition,
      ),
    },
    {
      id: discoveryId,
      kind: "expedition",
      title: `Retorno de ${map.name}`,
      detail: `${reward.label}. La carga se transfirió a la base.`,
      reward: `+${reward.regolith} regolito · +${reward.data} datos`,
    },
  );

  return { state: next, reward, discovered: next !== state };
}
