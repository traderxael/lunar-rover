/** DOM HUD kept outside React state so gameplay does not trigger render churn. */
export type MissionState = "briefing" | "active" | "success" | "depleted";

export type HudSnapshot = {
  energy: number;
  collected: number;
  total: number;
  targetDistance: number;
  elapsed: number;
  speed: number;
  state: MissionState;
  boosted?: boolean;
  mapName: string;
  mapIndex: string;
  stormLabel: string;
  hazard: boolean;
  grade?: string;
  completionNote?: string;
};

export class Hud {
  private startListener: (() => void) | null = null;
  private restartListener: (() => void) | null = null;
  private lastUpdate = 0;

  constructor() {
    document.getElementById("mission-start")?.addEventListener("click", this.onStart);
    document.getElementById("mission-restart")?.addEventListener("click", this.onRestart);
  }

  onStart = () => this.startListener?.();
  onRestart = () => this.restartListener?.();

  bind(start: () => void, restart: () => void) {
    this.startListener = start;
    this.restartListener = restart;
  }

  update(snapshot: HudSnapshot) {
    const now = performance.now();
    if (now - this.lastUpdate < 90 && !snapshot.boosted) return;
    this.lastUpdate = now;

    this.setText("energy-value", `${Math.ceil(snapshot.energy)}%`);
    this.setText("sample-value", `${snapshot.collected}/${snapshot.total}`);
    this.setText("distance-value", `${Math.ceil(snapshot.targetDistance)} m`);
    this.setText("speed-value", `${Math.round(snapshot.speed * 9.6)} km/h`);
    this.setText("mission-time", this.clock(snapshot.elapsed));
    this.setText("map-title", `${snapshot.mapIndex} · ${snapshot.mapName}`);
    this.setText("storm-value", snapshot.stormLabel);

    const energyBar = document.getElementById("energy-bar");
    if (energyBar) {
      energyBar.style.width = `${Math.max(0, snapshot.energy)}%`;
      energyBar.classList.toggle("is-critical", snapshot.energy < 26);
    }

    const prompt = document.getElementById("mission-prompt");
    if (prompt) {
      prompt.textContent = snapshot.hazard
        ? "Borde inestable: retrocede y bordea el cráter profundo"
        : snapshot.boosted
        ? "Impulso activado — controla la inercia"
        : snapshot.state === "active"
          ? `Muestra ${Math.min(snapshot.collected + 1, snapshot.total)} localizada: vigila el estado de ruta`
          : "Esperando la siguiente instrucción";
    }

    document.getElementById("mission-hud")?.classList.toggle("is-playing", snapshot.state !== "briefing");
    const result = document.getElementById("mission-result");
    const resultTitle = document.getElementById("result-title");
    const resultCopy = document.getElementById("result-copy");
    if (snapshot.state === "success") {
      result?.classList.add("is-visible");
      if (resultTitle) resultTitle.textContent = "Muestras aseguradas";
      if (resultCopy) resultCopy.textContent = `Grado ${snapshot.grade ?? "C"} · ${snapshot.mapName} en ${this.clock(snapshot.elapsed)} con ${Math.ceil(snapshot.energy)}% de energía. ${snapshot.completionNote ?? "La bitácora queda lista para transmisión."}`;
      const unlock = document.getElementById("result-unlock");
      if (unlock) unlock.textContent = snapshot.completionNote ?? "El desempeño se guardó en esta bitácora local.";
    } else if (snapshot.state === "depleted") {
      result?.classList.add("is-visible");
      if (resultTitle) resultTitle.textContent = "Energía agotada";
      if (resultCopy) resultCopy.textContent = `Recuperaste ${snapshot.collected} de ${snapshot.total} muestras en ${snapshot.mapName}. Calcula una ruta más corta e inténtalo de nuevo.`;
    } else {
      result?.classList.remove("is-visible");
    }
  }

  dispose() {
    document.getElementById("mission-start")?.removeEventListener("click", this.onStart);
    document.getElementById("mission-restart")?.removeEventListener("click", this.onRestart);
    this.startListener = null;
    this.restartListener = null;
  }

  private setText(id: string, value: string) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  private clock(seconds: number) {
    const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
    const remainder = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${minutes}:${remainder}`;
  }
}
