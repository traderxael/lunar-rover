import { useMemo } from "react";
import { MISSION_MAPS, type MissionMap } from "@/game/MissionMap";
import type { MissionResult } from "@/game/mission";
import {
  MAP_ORDER,
  calculateScore,
  getProgress,
  gradeMission,
  isMapUnlocked,
  requirementLabel,
  type MapId,
} from "@/game/Progression";

/**
 * Pantallas del juego: título, selección de sector, briefing, pausa y
 * resultado. Todas son control por teclado y no escriben en el estado.
 */

type MapCardProps = {
  map: MissionMap;
  unlocked: boolean;
  best: string | null;
  onSelect: (id: MapId) => void;
};

function MapCard({ map, unlocked, best, onSelect }: MapCardProps) {
  return (
    <button
      type="button"
      className={`map-card ${unlocked ? "" : "locked"}`}
      disabled={!unlocked}
      onClick={() => onSelect(map.id)}
      aria-label={`${map.name}${unlocked ? "" : " (bloqueado)"}`}
    >
      <span className="map-index">{map.index}</span>
      <strong>{map.name}</strong>
      <small>{map.subtitle}</small>
      <em>{unlocked ? best ?? "Sin registro todavía" : "Sector bloqueado"}</em>
    </button>
  );
}

export function TitleScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="screen title-screen">
      <div className="title-inner">
        <p className="title-kicker">Exploración científica · Luna</p>
        <h1>
          Lunar Rover
          <span> Expedition</span>
        </h1>
        <p className="title-copy">
          Conduce un rover por la superficie, recoge muestras y administra la energía. Lo que traes
          levanta una base que abre sectores nuevos.
        </p>
        <div className="title-actions">
          <button type="button" className="primary" onClick={onStart}>
            Comenzar
          </button>
        </div>
        <dl className="title-controls">
          <div>
            <dt>Conducir</dt>
            <dd>W A S D o flechas</dd>
          </div>
          <div>
            <dt>Impulso</dt>
            <dd>Espacio</dd>
          </div>
          <div>
            <dt>Reiniciar</dt>
            <dd>R</dd>
          </div>
          <div>
            <dt>Pausa</dt>
            <dd>Esc</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

export function SectorSelect({ onSelect }: { onSelect: (id: MapId) => void }) {
  const progress = useMemo(() => getProgress(), []);

  return (
    <div className="screen">
      <div className="screen-inner">
        <p className="screen-kicker">Selección de sector</p>
        <h2>Dónde aterrizar</h2>
        <div className="map-grid">
          {MAP_ORDER.map((id) => {
            const map = MISSION_MAPS.find((candidate) => candidate.id === id)!;
            const record = progress.records[id];
            const best =
              record.grade && record.bestTime !== null
                ? `Grado ${record.grade} · ${Math.floor(record.bestTime / 60)}:${String(Math.floor(record.bestTime % 60)).padStart(2, "0")}`
                : null;
            return (
              <MapCard
                key={id}
                map={map}
                unlocked={isMapUnlocked(id, progress)}
                best={best}
                onSelect={onSelect}
              />
            );
          })}
        </div>
        <p className="screen-hint">
          {MISSION_MAPS.filter((map) => !isMapUnlocked(map.id, progress))
            .map((map) => requirementLabel(map.id, progress))
            .join(" · ") || "Todos los sectores están disponibles."}
        </p>
      </div>
    </div>
  );
}

export function Briefing({ map, onLaunch }: { map: MissionMap; onLaunch: () => void }) {
  return (
    <div className="screen">
      <div className="screen-inner briefing">
        <p className="screen-kicker">
          Sector {map.index} · {map.subtitle}
        </p>
        <h2>{map.name}</h2>
        <p>{map.briefing}</p>
        <ul className="briefing-list">
          <li>
            <span>Objetivo</span>
            <b>{map.objectiveCopy}</b>
          </li>
          <li>
            <span>Muestras</span>
            <b>{map.samples.length} obligatorias</b>
          </li>
          <li>
            <span>Desafío opcional</span>
            <b>
              {map.secondary.title} — {map.secondary.directive}
            </b>
          </li>
          <li>
            <span>Riesgo</span>
            <b>{map.storm.active ? "Tormenta de polvo activa: consumo elevado." : "Terreno estable."}</b>
          </li>
        </ul>
        <button type="button" className="primary" onClick={onLaunch}>
          Salir a la superficie
        </button>
      </div>
    </div>
  );
}

export function PausePanel({
  onResume,
  onRestart,
  onExit,
}: {
  onResume: () => void;
  onRestart: () => void;
  onExit: () => void;
}) {
  return (
    <div className="screen overlay">
      <div className="screen-inner narrow">
        <p className="screen-kicker">Misión en pausa</p>
        <h2>Secuencia detenida</h2>
        <div className="stack">
          <button type="button" className="primary" onClick={onResume}>
            Continuar
          </button>
          <button type="button" onClick={onRestart}>
            Reiniciar misión
          </button>
          <button type="button" onClick={onExit}>
            Volver a la base
          </button>
        </div>
      </div>
    </div>
  );
}

export function ResultPanel({
  result,
  onRetry,
  onBase,
}: {
  result: MissionResult;
  onRetry: () => void;
  onBase: () => void;
}) {
  const map = MISSION_MAPS.find((candidate) => candidate.id === result.sector) ?? MISSION_MAPS[0];
  const grade = gradeMission(result.elapsed, result.energy);
  const score = calculateScore(result.sector, grade, result.elapsed, result.energy, result.optionalCollected);
  const minutes = Math.floor(result.elapsed / 60);
  const seconds = Math.floor(result.elapsed % 60);

  return (
    <div className="screen overlay">
      <div className="screen-inner narrow">
        <p className="screen-kicker">{map.name}</p>
        <h2>
          Grado <span>{grade}</span>
        </h2>
        <dl className="result-grid">
          <div>
            <dt>Muestras</dt>
            <dd>
              {result.collected}/{result.total}
            </dd>
          </div>
          <div>
            <dt>Tiempo</dt>
            <dd>
              {minutes}:{String(seconds).padStart(2, "0")}
            </dd>
          </div>
          <div>
            <dt>Energía</dt>
            <dd>{Math.ceil(result.energy)}%</dd>
          </div>
          <div>
            <dt>Opcionales</dt>
            <dd>
              {result.optionalCollected}/{result.optionalTotal}
            </dd>
          </div>
          <div>
            <dt>Puntuación</dt>
            <dd>{score}</dd>
          </div>
        </dl>
        <div className="stack">
          <button type="button" className="primary" onClick={onRetry}>
            Repetir misión
          </button>
          <button type="button" onClick={onBase}>
            Volver a la base
          </button>
        </div>
      </div>
    </div>
  );
}