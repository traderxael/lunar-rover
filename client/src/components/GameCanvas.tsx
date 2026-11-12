/**
 * Dirección visual: bitácora de base científica lunar; interfaz asimétrica con
 * reglito mineral, control de recursos y ámbar/cian de función operacional.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createGameScene, type GameHandle } from "@/three/engine";
import { ASSET_URLS } from "@/game/assets";
import { BUILD_NODES } from "@/three/base";
import { BUILDINGS, constructBuilding, repairBuilding, type BuildingDefinition } from "@/game/BuildingManager";
import { advanceEconomy, resourceRate } from "@/game/EconomyManager";
import { loadTycoonState, saveTycoonState, type BuildingKind, type ResourceKey, type TycoonState } from "@/game/TycoonState";
import { advanceExpeditions, expeditionRewardLabel, startExpedition } from "@/game/ExpeditionManager";
import { completeResearch } from "@/game/ResearchManager";
import ScienceArchive from "@/components/ScienceArchive";
import MissionHud from "@/components/MissionHud";
import type { TelemetryStore } from "@/game/telemetry";
import { BASE_SECTORS, changeSector, canAccessSector } from "@/game/SectorManager";
import { advanceDemoStep, createDemoTycoonState } from "@/game/DemoManager";
import { campaignProgressFor, evaluateCampaignProgress, getCampaign, startCampaign } from "@/game/CampaignManager";
import { recordDiscoveries, recordDiscovery, type DiscoveryDraft } from "@/game/DiscoveryManager";
import { RESEARCH_NODES } from "@/game/ResearchManager";
import { MISSION_MAPS } from "@/game/MissionMap";
import { applyMissionResult } from "@/game/missionReward";
import { recordMission } from "@/game/Progression";

const RESOURCE_META: Array<{ key: ResourceKey; label: string; unit: string; tone: "amber" | "cyan" }> = [
  { key: "energy", label: "Energía", unit: "kWh", tone: "amber" },
  { key: "oxygen", label: "Oxígeno", unit: "%", tone: "cyan" },
  { key: "water", label: "Agua", unit: "L", tone: "cyan" },
  { key: "regolith", label: "Regolito", unit: "kg", tone: "amber" },
  { key: "data", label: "Datos", unit: "u", tone: "cyan" },
];

function formatCost(definition: BuildingDefinition) {
  return Object.entries(definition.cost).map(([resource, value]) => `${value} ${resource === "regolith" ? "reg." : resource === "energy" ? "ene." : resource}`).join(" · ");
}

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<GameHandle | null>(null);
  const startedRef = useRef(false);
  const stateRef = useRef<TycoonState | null>(null);
  const demoModeRef = useRef(new URLSearchParams(window.location.search).has("demo"));
  const isDemo = demoModeRef.current;
  const [state, setState] = useState<TycoonState>(() => isDemo ? createDemoTycoonState() : loadTycoonState());
  const [selectedNode, setSelectedNode] = useState("n-03");
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingKind>("laboratory");
  const [notice, setNotice] = useState("Bitácora inicial cargada. La base está en estado operativo.");
  const [scienceOpen, setScienceOpen] = useState(false);
  const [telemetry, setTelemetry] = useState<TelemetryStore | null>(null);

  stateRef.current = state;
  const freeNodes = useMemo(() => BUILD_NODES.filter((node) => !state.buildings.some((building) => building.nodeId === node.id)), [state.buildings]);
  const rates = useMemo(() => resourceRate(state), [state]);

  const commit = useCallback((next: TycoonState, message: string) => {
    const saved = isDemo ? { ...next, lastSavedAt: Date.now() } : saveTycoonState(next);
    stateRef.current = saved;
    setState(saved);
    setNotice(message);
  }, [isDemo]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || startedRef.current) return;
    startedRef.current = true;
    let handle: GameHandle | null = null;
    let disposed = false;
    void createGameScene(canvas, stateRef.current ?? loadTycoonState()).then((game) => {
      if (disposed) { game.dispose(); return; }
      handle = game;
      handleRef.current = game;
      setTelemetry(game.telemetry);
      game.syncTycoonState(stateRef.current ?? loadTycoonState());
    });
    return () => { disposed = true; handle?.dispose(); handleRef.current = null; setTelemetry(null); startedRef.current = false; };
  }, []);

  useEffect(() => { handleRef.current?.syncTycoonState(state); }, [state]);
  // La misión acredita su resultado en la base una sola vez. El motor avisa
  // cuando el estado pasa a éxito o agotamiento; esta guarda es la que evita
  // pagar dos veces si el efecto se vuelve a montar.
  useEffect(() => {
    const handle = handleRef.current;
    if (!telemetry || !handle) return;

    handle.setMissionCompleteHandler((result, success, missionId) => {
      const map = MISSION_MAPS.find((candidate) => candidate.id === result.sector) ?? MISSION_MAPS[0];
      const outcome = applyMissionResult(stateRef.current ?? loadTycoonState(), result, map, { success, missionId });
      if (!outcome.discovered) return;

      if (!success) {
        commit(outcome.state, `Exploración interrumpida en ${map.name}. No se transfirió carga.`);
        return;
      }

      const report = recordMission(result.sector, map.name, result.elapsed, result.energy, result.optionalCollected, result.optionalTotal);
      const cargo = outcome.reward ? ` +${outcome.reward.regolith} regolito, +${outcome.reward.data} datos.` : "";
      const unlock = report.newUnlock ? ` Nuevo sector desbloqueado: ${report.newUnlock}.` : "";
      commit(outcome.state, `Misión cumplida en ${map.name}.${cargo}${unlock}`);
    });

    return () => handle.setMissionCompleteHandler(null);
  }, [telemetry, commit]);

  useEffect(() => {
    if (state.version === 3 && state.campaigns && state.campaignMetrics && state.campaignBonuses && state.discoveries) return;
    const migrated = loadTycoonState();
    stateRef.current = migrated;
    setState(migrated);
    setNotice("Partida actualizada: los programas científicos están disponibles en el archivo.");
  }, [state]);

  useEffect(() => {
    if (!isDemo) return;
    const timer = window.setInterval(() => {
      const next = advanceDemoStep(stateRef.current ?? createDemoTycoonState());
      stateRef.current = next;
      setState(next);
      setNotice(next.expeditions[0].state === "active" ? "Demostración: el rover y la red avanzan de forma autónoma." : "Demostración: la carga científica fue recibida en la base.");
    }, 1800);
    return () => window.clearInterval(timer);
  }, [isDemo]);

  const activeExpedition = state.expeditions.find((expedition) => expedition.state === "active");
  const activeCampaign = state.activeCampaignId ? getCampaign(state.activeCampaignId) : null;
  const activeMilestone = activeCampaign ? campaignProgressFor(state, activeCampaign.id).find((milestone) => !milestone.complete) : null;

  const build = (kind: BuildingKind) => {
    const nodeId = freeNodes.some((node) => node.id === selectedNode) ? selectedNode : freeNodes[0]?.id;
    if (!nodeId) { setNotice("Todos los nodos disponibles están ocupados. Amplía la base en otro sector."); return; }
    const result = constructBuilding(state, kind, nodeId);
    if (!result.ok) { setNotice(result.reason); return; }
    const nextFree = BUILD_NODES.find((node) => !result.state.buildings.some((building) => building.nodeId === node.id));
    if (nextFree) setSelectedNode(nextFree.id);
    const built = result.state.buildings.find((building) => !state.buildings.some((previous) => previous.id === building.id));
    const definition = BUILDINGS.find((building) => building.kind === kind)!;
    const next = built ? recordDiscovery(result.state, { id: `infrastructure:${built.id}`, kind: "infrastructure", title: `${definition.shortName} instalado`, detail: `El módulo quedó conectado en el nodo ${BUILD_NODES.find((node) => node.id === nodeId)?.label ?? nodeId}.` }) : result.state;
    commit(next, result.reason);
  };

  const repair = (buildingId: string) => {
    const result = repairBuilding(state, buildingId);
    if (!result.ok) { setNotice(result.reason); return; }
    const building = result.state.buildings.find((candidate) => candidate.id === buildingId);
    const label = building ? BUILDINGS.find((definition) => definition.kind === building.kind)?.shortName ?? "Módulo" : "Módulo";
    commit(recordDiscovery(result.state, { id: `repair:${buildingId}:${state.cycle}`, kind: "infrastructure", title: `${label} recalibrado`, detail: "La integridad del módulo fue restaurada con regolito de mantenimiento." }), result.reason);
  };

  const runCycle = () => {
    const economyState = advanceEconomy(state);
    const expedition = advanceExpeditions(economyState);
    const campaign = evaluateCampaignProgress(state, expedition.state, Boolean(expedition.completed));
    const milestoneTitle = campaign.milestone && state.activeCampaignId ? getCampaign(state.activeCampaignId).milestones.find((milestone) => milestone.id === campaign.milestone)?.title : null;
    const discoveries: DiscoveryDraft[] = [];
    if (expedition.completed) discoveries.push({ id: `expedition:${expedition.completed.id}:${expedition.completed.completedAt ?? campaign.state.cycle}`, kind: "expedition", title: "Carga de prospección recibida", detail: `El rover transfirió ${expeditionRewardLabel(expedition.completed.reward)} a la base.`, reward: expeditionRewardLabel(expedition.completed.reward) });
    if (campaign.milestone && state.activeCampaignId) discoveries.push({ id: `milestone:${state.activeCampaignId}:${campaign.milestone}`, kind: "milestone", title: "Hito científico confirmado", detail: `${milestoneTitle ?? "Objetivo"} quedó validado en la bitácora de misión.` });
    if (campaign.completed) discoveries.push({ id: `reward:${campaign.completed}:completion`, kind: "reward", title: `${getCampaign(campaign.completed).title} completado`, detail: "El programa alcanzó sus objetivos y dejó una mejora permanente en la red.", reward: getCampaign(campaign.completed).reward });
    const note = campaign.completed
      ? `${getCampaign(campaign.completed).title} completado. Recompensa permanente aplicada a la red.`
      : milestoneTitle
        ? `Hito científico confirmado: ${milestoneTitle}.`
        : expedition.completed
          ? `Exploración concluida: ${expeditionRewardLabel(expedition.completed.reward)} transferidos a la base.`
          : `Ciclo ${campaign.state.cycle} cerrado. La red y el soporte vital fueron recalculados.`;
    commit(recordDiscoveries(campaign.state, discoveries), note);
  };

  const research = (id: string) => {
    const result = completeResearch(state, id);
    if (!result.ok) { setNotice(result.reason); return; }
    const researchNode = RESEARCH_NODES.find((node) => node.id === id);
    commit(recordDiscovery(result.state, { id: `research:${id}`, kind: "research", title: researchNode?.title ?? "Tecnología confirmada", detail: researchNode ? `${researchNode.description} ${researchNode.effect}` : "Investigación incorporada al archivo científico." }), result.reason);
  };

  const launchExpedition = () => {
    const target = state.expeditions[0];
    const result = startExpedition(state, target.id);
    if (result.ok) commit(result.state, result.reason); else setNotice(result.reason);
  };

  const launchCampaign = (id: NonNullable<TycoonState["activeCampaignId"]>) => {
    const result = startCampaign(state, id);
    if (!result.ok) { setNotice(result.reason); return; }
    const campaign = getCampaign(id);
    commit(recordDiscovery(result.state, { id: `campaign:${id}:started`, kind: "milestone", title: `${campaign.title} iniciado`, detail: `Programa activado. Primer hito: ${campaign.milestones[0].title}.` }), result.reason);
  };

  const selectSector = (id: TycoonState["sector"]) => {
    const result = changeSector(state, id);
    if (!result.ok) { setNotice(result.reason); return; }
    const sector = BASE_SECTORS.find((candidate) => candidate.id === id);
    commit(recordDiscovery(result.state, { id: `sector:${id}`, kind: "sector", title: `${sector?.name ?? id} habilitado`, detail: "El equipo científico inició operaciones en este nuevo sector de asentamiento." }), result.reason);
  };

  return (
    <main className="tycoon-shell" aria-label="Lunar Science Base, juego de gestión científica lunar">
      <canvas ref={canvasRef} className="tycoon-canvas" aria-label="Vista isométrica interactiva de la base lunar" />
      <section className="tycoon-hud" aria-live="polite">
        <header className="tycoon-header">
          <div className="base-brand"><img src={ASSET_URLS.logo} alt="Emblema orbital de Lunar Science Base" /><div><p>Consorcio científico lunar · Sector 01 {isDemo && <em className="demo-badge">Modo demo</em>}</p><h1>Lunar Science <span>Base</span></h1></div></div>
          <div className="cycle-block"><span>Ciclo operativo</span><strong>{String(state.cycle).padStart(3, "0")}</strong><div><button type="button" className="science-trigger" onClick={() => setScienceOpen(true)}>Archivo científico</button><button type="button" onClick={runCycle}>Cerrar ciclo <b>↗</b></button></div></div>
        </header>

        <section className="resource-strip" aria-label="Recursos de la base">
          {RESOURCE_META.map((resource) => {
            const value = state.resources[resource.key];
            const capacity = state.capacity[resource.key];
            const rate = rates[resource.key];
            return <div className={`resource-tile ${resource.tone}`} key={resource.key}><span>{resource.label}</span><strong>{Math.round(value)}<small>{resource.unit}</small></strong><i><b style={{ width: `${Math.min(100, value / capacity * 100)}%` }} /></i><em className={rate >= 0 ? "positive" : "negative"}>{rate >= 0 ? "+" : ""}{rate.toFixed(1)}/ciclo</em></div>;
          })}
        </section>

        <section className="field-readout" aria-label="Estado de cartografía"><span>Cartografía activa</span><b>{BASE_SECTORS.find((sector) => sector.id === state.sector)?.name}</b><small>{activeExpedition ? `Rover en ruta · ${activeExpedition.secondsRemaining} ciclos` : `${freeNodes.length} nodos de montaje disponibles`}</small></section>

        <aside className="build-console" aria-label="Catálogo de construcción">
          <div className="panel-title"><span>01 / Construcción</span><b>{BASE_SECTORS.find((sector) => sector.id === state.sector)?.name}</b></div>
          <button type="button" className="mobile-archive-trigger" onClick={() => setScienceOpen(true)}>Archivo científico <b>↗</b></button>
          <div className="sector-selector" aria-label="Sectores de asentamiento">{BASE_SECTORS.map((sector) => <button key={sector.id} type="button" disabled={!canAccessSector(state, sector.id)} onClick={() => selectSector(sector.id)} className={state.sector === sector.id ? "active" : ""}><span>{sector.index}</span><b>{sector.name}</b><small>{canAccessSector(state, sector.id) ? sector.hazard : sector.requirementText}</small></button>)}</div>
          <p className="panel-copy">Selecciona un módulo y un nodo libre. La red de energía define la capacidad operativa.</p>
          <div className="building-catalog">
            {BUILDINGS.map((building) => <button type="button" key={building.kind} onClick={() => setSelectedBuilding(building.kind)} className={`building-card ${selectedBuilding === building.kind ? "selected" : ""}`}><img src={building.image} alt="" /><span className={`accent ${building.accent}`} /><strong>{building.shortName}</strong><small>{formatCost(building)}</small></button>)}
          </div>
          <div className="node-picker"><div><span>Nodo de montaje</span><b>{BUILD_NODES.find((node) => node.id === selectedNode)?.label ?? "—"}</b></div><div className="node-list">{freeNodes.map((node) => <button type="button" key={node.id} onClick={() => setSelectedNode(node.id)} className={selectedNode === node.id ? "selected" : ""}>{node.label}</button>)}</div></div>
          <button type="button" className="build-action" onClick={() => build(selectedBuilding)}>Instalar {BUILDINGS.find((building) => building.kind === selectedBuilding)?.shortName} <span>+</span></button>
        </aside>

        <aside className="operations-console" aria-label="Estado operativo de la base">
          <div className="panel-title"><span>02 / Operaciones</span><b>Red de superficie</b></div>
          <div className="alert-stack">{state.alerts.length ? state.alerts.map((alert) => <article key={alert.id} className={`alert ${alert.tone}`}><b>{alert.label}</b><p>{alert.detail}</p></article>) : <article className="alert cyan"><b>Sistemas nominales</b><p>Ejecuta un ciclo para generar el primer diagnóstico.</p></article>}</div>
          <section className={`campaign-monitor ${activeCampaign ? "active" : ""}`}><span>03 / Programa científico</span>{activeCampaign && activeMilestone ? <><b>{activeCampaign.code} · {activeCampaign.title}</b><p>{activeMilestone.title} · {activeMilestone.value}/{activeMilestone.target} {activeMilestone.label}</p><i><em style={{ width: `${activeMilestone.value / activeMilestone.target * 100}%` }} /></i></> : <p>Sin programa activo. Consulta el archivo científico.</p>}</section>
          <div className="crew-line"><span>Tripulación activa</span><b>{state.crew.engineers} ing. · {state.crew.scientists} cie. · {state.crew.explorers} exp.</b></div>
          <div className="module-list"><span>Módulos instalados ({state.buildings.length}/12)</span>{state.buildings.map((building) => <div key={building.id} className="module-row"><b>{BUILDINGS.find((definition) => definition.kind === building.kind)?.shortName}</b><i>{building.integrity}%</i>{building.integrity < 100 && <button type="button" onClick={() => repair(building.id)}>Reparar</button>}</div>)}</div>
        </aside>

        <footer className="base-log"><span>Bitácora de mando</span><p>{notice}</p><div className="expedition-line"><span>Rover de prospección</span><b>{activeExpedition ? `En ruta · ${activeExpedition.secondsRemaining} ciclos` : state.expeditions[0].state === "complete" ? "Regresó con carga" : `Listo · ${expeditionRewardLabel(state.expeditions[0].reward)}`}</b><button type="button" disabled={Boolean(activeExpedition)} onClick={launchExpedition}>{activeExpedition ? "Explorando" : "Lanzar exploración"} <i>↗</i></button></div><b>Arrastra la vista para inspeccionar los nodos · la simulación sólo avanza al cerrar un ciclo.</b></footer>
      </section>
      <ScienceArchive state={state} open={scienceOpen} onClose={() => setScienceOpen(false)} onResearch={research} onStartCampaign={launchCampaign} />
      {telemetry && (
        <MissionHud
          store={telemetry}
          onStart={() => handleRef.current?.startMission(state.sector)}
          onRestart={() => handleRef.current?.restartMission()}
          onExit={() => handleRef.current?.showBase()}
        />
      )}
    </main>
  );
}
