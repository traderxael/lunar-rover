/**
 * Dirección visual: Bitácora de Exploración Analógica — instrumentación periférica,
 * alto contraste mineral y ámbar selenita como señal de misión.
 */
import { useEffect, useRef } from "react";
import { Engine } from "@babylonjs/core/Engines/engine";
import { createGameScene, type GameHandle } from "@/game/scene";
import { ASSET_URLS } from "@/game/assets";
import { getMissionMap, MISSION_MAPS } from "@/game/MissionMap";
import { getProgress, isMapUnlocked, requirementLabel } from "@/game/Progression";

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startedRef = useRef(false);
  const activeMap = getMissionMap();
  const progress = getProgress();

  const chooseMap = (mapId: string) => {
    if (!isMapUnlocked(mapId as "tranquility" | "tycho" | "selenite", progress)) return;
    const query = new URLSearchParams(window.location.search);
    query.set("map", mapId);
    query.delete("demo");
    window.location.search = query.toString();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || startedRef.current) return;
    startedRef.current = true;
    const engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      adaptToDeviceRatio: true,
    });

    let handle: GameHandle | null = null;
    let disposed = false;
    createGameScene(engine, canvas).then((game) => {
      if (disposed) {
        game.dispose();
        return;
      }
      handle = game;
      engine.runRenderLoop(() => game.scene.render());
    });

    const onResize = () => engine.resize();
    window.addEventListener("resize", onResize);
    return () => {
      disposed = true;
      window.removeEventListener("resize", onResize);
      handle?.dispose();
      engine.dispose();
      startedRef.current = false;
    };
  }, []);

  return (
    <main className="game-shell" aria-label="Juego Lunar Rover Expedition">
      <canvas ref={canvasRef} className="game-canvas" style={{ touchAction: "none" }} />
      <section id="mission-hud" className="mission-hud" aria-live="polite">
        <div className={`storm-veil ${activeMap.storm.active ? "is-active" : ""}`} aria-hidden="true" />
        <header className="mission-header">
          <div className="brand-lockup">
            <img src={ASSET_URLS.logo} alt="Emblema orbital del rover" className="brand-mark" />
            <div>
              <p className="eyebrow">Misión de superficie · {activeMap.index}</p>
              <h1>Lunar Rover <span>Expedition</span></h1>
            </div>
          </div>
          <div className="mission-clock"><span>Tiempo de misión</span><strong id="mission-time">00:00</strong></div>
        </header>

        <aside className="telemetry-panel" aria-label="Telemetría del rover">
          <p className="panel-kicker">Telemetría de campo</p>
          <div className="meter-block">
            <div className="meter-row"><span>Energía</span><strong id="energy-value">100%</strong></div>
            <div className="energy-track"><i id="energy-bar" /></div>
          </div>
          <dl className="telemetry-list">
            <div><dt>Muestras</dt><dd id="sample-value">0/5</dd></div>
            <div><dt>Objetivo</dt><dd id="distance-value">— m</dd></div>
            <div><dt>Velocidad</dt><dd id="speed-value">0 km/h</dd></div>
            <div><dt>Sector</dt><dd id="map-title">{activeMap.index} · {activeMap.name}</dd></div>
          </dl>
          <div className="terrain-code"><span>Estado de ruta</span><b id="storm-value">Visibilidad · plena</b></div>
          <div className="optional-readout"><span>Desafío auxiliar</span><strong id="optional-value">0/{activeMap.secondary.positions.length}</strong><small id="optional-name">{activeMap.secondary.title}</small></div>
        </aside>

        <section className="mission-brief" aria-label="Objetivo de la misión">
          <p className="panel-kicker">Objetivo operativo</p>
          <p id="mission-prompt">{activeMap.objectiveCopy}</p>
          <div className="control-legend"><span><kbd>WASD</kbd> o <kbd>← ↑ ↓ →</kbd> conducir</span><span><kbd>Espacio</kbd> impulso</span><span><kbd>R</kbd> reiniciar</span></div>
        </section>

        <div className="mission-intro">
          <img src={ASSET_URLS.visualTarget} alt="Referencia de la misión lunar" />
          <div className="intro-shade" />
          <div className="intro-content">
            <p className="eyebrow">Bitácora de exploración · {activeMap.name}</p>
            <h2>La ruta está marcada.<br /><em>Haz que cuente.</em></h2>
            <p>{activeMap.briefing}</p>
            <div className="secondary-brief"><span>Desafío auxiliar · {activeMap.secondary.title}</span><b>{activeMap.secondary.directive}</b></div>
            <div className="map-selector" aria-label="Seleccionar mapa de exploración">
              <p>Selecciona una zona de aterrizaje</p>
              <div className="map-options">
                {MISSION_MAPS.map((map) => (
                  <button key={map.id} type="button" disabled={!isMapUnlocked(map.id, progress)} onClick={() => chooseMap(map.id)} className={`map-option ${map.id === activeMap.id ? "is-active" : ""} ${!isMapUnlocked(map.id, progress) ? "is-locked" : ""}`}>
                    <span>{map.index}</span><strong>{map.name}</strong><small>{isMapUnlocked(map.id, progress) ? `${progress.records[map.id].grade ? `Mejor grado ${progress.records[map.id].grade} · ` : ""}${map.subtitle}${progress.records[map.id].bestOptional ? ` · Aux. ${progress.records[map.id].bestOptional}/${map.secondary.positions.length}` : ""}` : `⌁ ${requirementLabel(map.id, progress)}`}</small>
                  </button>
                ))}
              </div>
              <p className="progress-key"><b>Certificación B</b> · 5 muestras · ≥30% de energía · ≤ 2:30</p>
            </div>
            <button id="mission-start" className="primary-action">Iniciar exploración <span>↗</span></button>
          </div>
        </div>

        <section id="mission-result" className="mission-result" aria-live="assertive">
          <p className="eyebrow">Informe de superficie</p>
          <h2 id="result-title">Muestras aseguradas</h2>
          <p id="result-copy" />
          <p id="result-unlock" className="result-unlock" />
          <button id="mission-restart" className="primary-action">Reiniciar misión <span>↻</span></button>
        </section>

        <div className="touch-controls" aria-label="Controles táctiles">
          <div className="touch-steering"><button data-game-action="left" aria-label="Girar a la izquierda">←</button><button data-game-action="right" aria-label="Girar a la derecha">→</button></div>
          <div className="touch-drive"><button data-game-action="backward" aria-label="Retroceder">↓</button><button data-game-action="forward" aria-label="Avanzar">↑</button><button data-game-action="boost" className="boost-button" aria-label="Activar impulso">⟐</button></div>
        </div>
      </section>
    </main>
  );
}
