import { useSyncExternalStore } from "react";
import type { TelemetryStore } from "@/game/telemetry";

const clock = (seconds: number) => {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const rest = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${rest}`;
};

type Props = {
  store: TelemetryStore;
  onStart: () => void;
  onRestart: () => void;
  onExit: () => void;
};

/**
 * HUD de misión. Se alimenta del canal efímero de telemetría, así que se
 * actualiza con el juego sin escribir en el almacenamiento local.
 */
export default function MissionHud({ store, onStart, onRestart, onExit }: Props) {
  const telemetry = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  const energyRatio = Math.max(0, Math.min(1, telemetry.energy / telemetry.maxEnergy));
  const critical = energyRatio < 0.26;
  const playing = telemetry.status === "active";
  const finished = telemetry.status === "success" || telemetry.status === "depleted";

  return (
    <section className="mission-hud" aria-label={`Misión en ${telemetry.sectorName}`}>
      <header className="mission-bar">
        <div className="mission-sector">
          <span>
            Sector {telemetry.sectorIndex} · Cartografía activa
          </span>
          <b>{telemetry.sectorName}</b>
        </div>
        <div className="mission-clock" aria-label="Tiempo de misión">
          <span>Tiempo</span>
          <b>{clock(telemetry.elapsed)}</b>
        </div>
      </header>

      <div className="mission-energy">
        <div className="mission-energy-head">
          <span>Energía</span>
          <b className={critical ? "critical" : undefined}>{Math.ceil(telemetry.energy)}%</b>
        </div>
        <div
          className="mission-energy-track"
          role="progressbar"
          aria-valuenow={Math.round(telemetry.energy)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Energía restante"
        >
          <span className={critical ? "critical" : undefined} style={{ width: `${energyRatio * 100}%` }} />
        </div>
      </div>

      <div className="mission-readouts">
        <div>
          <span>Muestras</span>
          <b>
            {telemetry.collected}/{telemetry.total}
          </b>
        </div>
        <div>
          <span>Distancia</span>
          <b>{Math.ceil(telemetry.distanceToTarget)} m</b>
        </div>
        <div>
          <span>Velocidad</span>
          <b>{(telemetry.speed * 9.6).toFixed(0)} km/h</b>
        </div>
        <div>
          <span>Desafío</span>
          <b>
            {telemetry.optionalCollected}/{telemetry.optionalTotal}
          </b>
        </div>
      </div>

      <p className="mission-prompt" aria-live="polite">
        {telemetry.status === "briefing" && "Pulsa avanzar para salir a la superficie."}
        {playing && telemetry.hazard && "Borde inestable: retrocede y bordea el cráter profundo."}
        {playing && !telemetry.hazard && telemetry.storm && "Tormenta activa: visibilidad y consumo elevados."}
        {playing && !telemetry.hazard && !telemetry.storm && "Recupera las muestras y conserva energía de retorno."}
        {telemetry.status === "success" && "Muestras aseguradas. La carga vuelve a la base."}
        {telemetry.status === "depleted" && "Energía agotada. Calcula una ruta más corta."}
      </p>

      <div className="mission-actions">
        {telemetry.status === "briefing" && (
          <button type="button" className="mission-primary" onClick={onStart}>
            Iniciar misión
          </button>
        )}
        {playing && (
          <button type="button" onClick={onRestart}>
            Reiniciar <kbd>R</kbd>
          </button>
        )}
        {finished && (
          <>
            <button type="button" className="mission-primary" onClick={onRestart}>
              Repetir misión
            </button>
            <button type="button" onClick={onExit}>
              Volver a la base
            </button>
          </>
        )}
      </div>
    </section>
  );
}