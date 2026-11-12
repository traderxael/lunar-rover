import type { MissionStatus } from "./mission";

/**
 * Telemetría de misión: canal efímero, fuera del estado persistido.
 *
 * React la consume con `useSyncExternalStore`, así que el HUD se actualiza a
 * la cadencia del juego sin escribir `localStorage` en cada fotograma.
 */
export type Telemetry = {
  status: MissionStatus;
  sector: string;
  sectorName: string;
  sectorIndex: string;
  energy: number;
  maxEnergy: number;
  collected: number;
  total: number;
  optionalCollected: number;
  optionalTotal: number;
  elapsed: number;
  speed: number;
  distanceToTarget: number;
  hazard: boolean;
  storm: boolean;
};

export const initialTelemetry: Telemetry = {
  status: "briefing",
  sector: "tranquility",
  sectorName: "Mare Tranquillitatis",
  sectorIndex: "01",
  energy: 100,
  maxEnergy: 100,
  collected: 0,
  total: 5,
  optionalCollected: 0,
  optionalTotal: 3,
  elapsed: 0,
  speed: 0,
  distanceToTarget: 0,
  hazard: false,
  storm: false,
};

export class TelemetryStore {
  private snapshot: Telemetry = initialTelemetry;
  private readonly listeners = new Set<() => void>();

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.snapshot;

  set(patch: Partial<Telemetry>) {
    let changed = false;
    const next = { ...this.snapshot };

    (Object.keys(patch) as Array<keyof Telemetry>).forEach((key) => {
      const value = patch[key];
      if (value === undefined || next[key] === value) return;
      (next[key] as unknown) = value;
      changed = true;
    });

    if (!changed) return;
    this.snapshot = next;
    this.listeners.forEach((listener) => listener());
  }
}