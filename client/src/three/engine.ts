import * as THREE from "three";
import { MISSION_MAPS, type MissionMap } from "@/game/MissionMap";
import type { TycoonState } from "@/game/TycoonState";
import { ASSET_URLS } from "@/game/assets";
import { createMissionState, missionResult, startMission, stepMission, type MissionResult, type MissionState, type Obstacle } from "@/game/mission";
import { TelemetryStore } from "@/game/telemetry";
import { BaseWorld } from "./base";
import { InputManager } from "./input";
import { createMissionView, type MissionView } from "./missionView";
import { createRover, type Rover } from "./rover";
import { createSky } from "./sky";
import { createLunarTerrain, createRegolithTexture, deepCraterAt, type LunarTerrain } from "./terrain";

export type GameHandle = {
  syncTycoonState: (state: TycoonState) => void;
  showBase: () => void;
  startMission: (sector: TycoonState["sector"]) => void;
  restartMission: () => void;
  telemetry: TelemetryStore;
  setMissionCompleteHandler: (handler: ((result: MissionResult, success: boolean, missionId: string) => void) | null) => void;
  setPaused: (paused: boolean) => void;
  dispose: () => void;
};

const ORBIT = { azimuth: -2.18, elevation: 1.03, radius: 42, target: new THREE.Vector3(0, 0, -1) };
const CHASE = { distance: 13.5, height: 6.8, look: 1.3 };

function createRenderer(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  return renderer;
}

function addLights(scene: THREE.Scene) {
  const hemisphere = new THREE.HemisphereLight(new THREE.Color("#DDE3E2"), new THREE.Color("#101722"), 0.72);
  scene.add(hemisphere);

  const sun = new THREE.DirectionalLight(new THREE.Color("#FFE2AF"), 2.1);
  sun.position.set(-30, 50, -25);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 180;
  sun.shadow.camera.left = -70;
  sun.shadow.camera.right = 70;
  sun.shadow.camera.top = 70;
  sun.shadow.camera.bottom = -70;
  sun.shadow.bias = -0.0008;
  scene.add(sun);
  scene.add(sun.target);

  const rim = new THREE.DirectionalLight(new THREE.Color("#4ABDC0"), 0.55);
  rim.position.set(30, 28, 32);
  scene.add(rim);
}

/**
 * Dueño del renderer y de las dos escenas del juego: la base y la superficie.
 * Expone un contrato estable para que React no tenga que saber qué motor hay
 * debajo, y un canal de telemetría efímero para el HUD.
 */
export async function createGameScene(canvas: HTMLCanvasElement, initialState: TycoonState): Promise<GameHandle> {
  const renderer = createRenderer(canvas);
  const input = new InputManager();
  const demoMode = new URLSearchParams(window.location.search).has("demo");
  const telemetry = new TelemetryStore();

  // ---- Escena de base -------------------------------------------------------
  const baseScene = new THREE.Scene();
  baseScene.background = new THREE.Color(initialState.sector === "selenite" ? "#14100F" : "#050912");
  baseScene.fog = new THREE.FogExp2(new THREE.Color("#101821"), 0.0042);
  addLights(baseScene);

  const baseSky = createSky();
  baseSky.earth.position.set(-150, 74, 128);
  baseScene.add(baseSky.group);

  const baseCamera = new THREE.PerspectiveCamera(48, 1, 0.5, 500);
  const baseWorld = new BaseWorld(baseScene, initialState);
  baseScene.add(baseWorld.object);

  // ---- Escena de misión -----------------------------------------------------
  const missionScene = new THREE.Scene();
  missionScene.background = new THREE.Color("#050912");
  missionScene.fog = new THREE.FogExp2(new THREE.Color("#101821"), 0.0038);
  addLights(missionScene);

  const missionSky = createSky();
  missionSky.earth.position.set(118, 52, 104);
  missionScene.add(missionSky.group);

  const missionCamera = new THREE.PerspectiveCamera(55, 1, 0.5, 500);
  missionCamera.position.set(0, 34, 46);
  missionCamera.lookAt(0, 0, 0);

  let missionTerrain: LunarTerrain | null = null;
  let missionRegolith: THREE.Texture | null = null;
  let missionRover: Rover | null = null;
  let missionView: MissionView | null = null;
  let missionMap: MissionMap = MISSION_MAPS[0];
  let missionState: MissionState = createMissionState(missionMap);
  let missionElapsed = 0;
  let missionCounter = 0;
  let stuckTimer = 0;
  let avoidTimer = 0;
  let resultDelivered = false;
  let paused = false;
  const missionComplete: { handler: ((result: MissionResult, success: boolean, missionId: string) => void) | null } = { handler: null };

  const cameraTarget = new THREE.Vector3();
  const desiredCamera = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();

  const publishTelemetry = (speed: number) => {
    telemetry.set({
      status: missionState.status,
      sector: missionState.sector,
      sectorName: missionMap.name,
      sectorIndex: missionMap.index,
      energy: missionState.energy,
      maxEnergy: missionState.maxEnergy,
      collected: missionState.collected,
      total: missionState.total,
      optionalCollected: missionState.optionalCollected,
      optionalTotal: missionState.optionalTotal,
      elapsed: missionState.elapsed,
      speed,
      distanceToTarget: missionState.distanceToTarget,
      hazard: missionState.hazard,
      storm: missionState.storm,
    });
  };

  function updateChaseCamera(delta: number, snap = false) {
    if (!missionRover) return;
    const heading = missionRover.object.rotation.y;
    const forwardX = Math.sin(heading);
    const forwardZ = Math.cos(heading);

    desiredCamera.set(
      missionRover.position.x - forwardX * CHASE.distance,
      missionRover.position.y + CHASE.height,
      missionRover.position.z - forwardZ * CHASE.distance,
    );

    missionCamera.position.lerp(desiredCamera, snap ? 1 : 1 - Math.exp(-delta * 4.2));

    lookTarget.set(missionRover.position.x, missionRover.position.y + CHASE.look, missionRover.position.z);
    cameraTarget.lerp(lookTarget, snap ? 1 : 1 - Math.exp(-delta * 6));
    missionCamera.lookAt(cameraTarget);
  }

  const buildMission = (map: MissionMap) => {
    missionTerrain?.dispose();
    missionTerrain?.mesh.removeFromParent();
    missionRegolith?.dispose();
    missionRover?.dispose();
    missionView?.dispose();

    missionMap = map;
    missionState = createMissionState(map);
    missionElapsed = 0;
    resultDelivered = false;

    missionRegolith = createRegolithTexture(map.terrainTexture === "deepCraterRegolith" ? ASSET_URLS.deepCraterRegolith : ASSET_URLS.regolith);
    missionTerrain = createLunarTerrain(map, missionRegolith);
    missionScene.add(missionTerrain.mesh);

    const obstacles: Obstacle[] = map.rocks.map(([x, z, size]) => ({ x, z, radius: size * 0.6 }));
    missionRover = createRover(map, new THREE.Vector3(map.start.x, 0, map.start.z), obstacles);
    missionScene.add(missionRover.object);

    missionView = createMissionView(map);
    missionScene.add(missionView.group);
    missionView.sync(missionState.samples, 0);

    missionScene.background = new THREE.Color(map.skyColor);
    (missionScene.fog as THREE.FogExp2).color = new THREE.Color(map.ambientColor);

    publishTelemetry(0);
    updateChaseCamera(1, true);
  };

  buildMission(missionMap);

  // ---- Cámara orbital de la base -------------------------------------------
  const updateBaseCamera = () => {
    const { azimuth, elevation, radius, target } = ORBIT;
    baseCamera.position.set(
      target.x + radius * Math.cos(elevation) * Math.sin(azimuth),
      target.y + radius * Math.sin(elevation),
      target.z + radius * Math.cos(elevation) * Math.cos(azimuth),
    );
    baseCamera.lookAt(target);
  };
  updateBaseCamera();

  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  const onPointerDown = (event: PointerEvent) => {
    if (active.camera !== baseCamera) return;
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent) => {
    if (!dragging) return;
    ORBIT.azimuth -= (event.clientX - lastX) * 0.005;
    ORBIT.elevation = THREE.MathUtils.clamp(ORBIT.elevation + (event.clientY - lastY) * 0.004, 0.55, 1.35);
    lastX = event.clientX;
    lastY = event.clientY;
    updateBaseCamera();
  };
  const onPointerUp = (event: PointerEvent) => {
    dragging = false;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  };
  const onWheel = (event: WheelEvent) => {
    if (active.camera !== baseCamera) return;
    event.preventDefault();
    ORBIT.radius = THREE.MathUtils.clamp(ORBIT.radius + event.deltaY * 0.03, 26, 62);
    updateBaseCamera();
  };

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });

  // ---- Tamaño ---------------------------------------------------------------
  const resize = () => {
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    renderer.setSize(width, height, false);
    baseCamera.aspect = width / height;
    baseCamera.updateProjectionMatrix();
    missionCamera.aspect = width / height;
    missionCamera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener("resize", resize);

  // ---- Bucle --------------------------------------------------------------
  const baseView = { scene: baseScene, camera: baseCamera, sky: baseSky };
  const missionViewRef = { scene: missionScene, camera: missionCamera, sky: missionSky };
  let active: { scene: THREE.Scene; camera: THREE.PerspectiveCamera; sky: typeof baseSky } = baseView;
  const clock = new THREE.Clock();

  const stepMissionFrame = (delta: number) => {

    // Piloto automatico del modo demo: conduce hacia la muestra mas cercana.
    const autopilotActions = () => {
      if (!missionRover) return { throttle: 0, steer: 0, boost: false, reset: false };
      const remaining = missionState.samples.filter((sample) => !sample.collected);
      if (!remaining.length) return { throttle: 0, steer: 0, boost: false, reset: false };
      let best = remaining[0];
      let bestDistance = Number.POSITIVE_INFINITY;
      remaining.forEach((sample) => {
        const distance = Math.hypot(sample.x - missionRover!.position.x, sample.z - missionRover!.position.z);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = sample;
        }
      });
      const desired = Math.atan2(best.x - missionRover.position.x, best.z - missionRover.position.z);
      let difference = desired - missionRover.object.rotation.y;
      while (difference > Math.PI) difference -= Math.PI * 2;
      while (difference < -Math.PI) difference += Math.PI * 2;
      // Deteccion de bloqueo: si el rover no avanza con el acelerador pisado,
      // da marcha atras y gira para salir del obstaculo.
      if (avoidTimer > 0) {
        avoidTimer -= delta;
        return { throttle: -1, steer: difference >= 0 ? 1 : -1, boost: false, reset: false };
      }
      if (Math.abs(missionRover.speed) < 0.5) stuckTimer += delta;
      else stuckTimer = 0;
      if (stuckTimer > 0.7) {
        stuckTimer = 0;
        avoidTimer = 1.6;
        return { throttle: -1, steer: difference >= 0 ? 1 : -1, boost: false, reset: false };
      }
      return {
        throttle: Math.abs(difference) > 2.4 ? 0.45 : 1,
        steer: Math.max(-1, Math.min(1, difference * 2.4)),
        boost: false,
        reset: false,
      };
    };

    if (!missionRover || !missionView) return;

    const actions = demoMode ? autopilotActions() : input.read();

    if (actions.reset) {
      missionState = createMissionState(missionMap);
      missionRover.reset();
      missionView.sync(missionState.samples, missionElapsed);
    }

    const canMove = missionState.status === "active" || missionState.status === "briefing";
    const travelled = missionRover.update(delta, actions, canMove);

    if (missionState.status === "briefing" && (actions.throttle !== 0 || actions.steer !== 0)) {
      missionState = startMission(missionState);
    }

    const inDeepCrater = Boolean(deepCraterAt(missionMap, missionRover.position.x, missionRover.position.z));
    if (inDeepCrater) missionRover.applyDrag(1 - 1.6 * delta);

    const previousStatus = missionState.status;
    missionState = stepMission(
      missionState,
      {
        delta,
        x: missionRover.position.x,
        z: missionRover.position.z,
        distance: travelled,
        boosted: actions.boost && travelled > 0,
        inDeepCrater,
      },
      missionMap,
    );

    missionElapsed += delta;

    if (missionState.status !== previousStatus && (missionState.status === "success" || missionState.status === "depleted") && !resultDelivered) {
      resultDelivered = true;
      missionCounter += 1;
      const missionId = `${missionMap.id}-${missionCounter}`;
      const result = missionResult(missionState);
      telemetry.set({ status: missionState.status });
      if (missionComplete.handler) {
        missionComplete.handler(result, missionState.status === "success", missionId);
      }
    }
    missionView.sync(missionState.samples, missionElapsed);
    missionView.update(delta, missionElapsed);
    updateChaseCamera(delta);
    publishTelemetry(Math.abs(missionRover.speed));
  };

  renderer.setAnimationLoop(() => {
    const delta = Math.min(clock.getDelta(), 0.05);
    if (paused) {
      renderer.render(active.scene, active.camera);
      return;
    }
    if (active === baseView) {
      baseWorld.update(delta);
      baseSky.group.position.copy(baseCamera.position);
    } else {
      stepMissionFrame(delta);
      missionSky.group.position.copy(missionCamera.position);
    }
    renderer.render(active.scene, active.camera);
  });

  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).__lunar = {
      renderer,
      baseScene,
      missionScene,
      baseWorld,
      telemetry,
      missionState: () => missionState,
      renderFrame: () => renderer.render(active.scene, active.camera),
      setActive: (which: string) => {
        active = which === "mission" ? missionViewRef : baseView;
      },
      tick: (delta: number) => {
        stepMissionFrame(delta);
        renderer.render(active.scene, active.camera);
      },
      rover: () => missionRover,
    };
  }

  return {
    syncTycoonState: (state) => baseWorld.sync(state),
    showBase: () => {
      active = baseView;
    },
    startMission: (sector) => {
      const map = MISSION_MAPS.find((candidate) => candidate.id === sector) ?? MISSION_MAPS[0];
      if (map.id !== missionMap.id) buildMission(map);
      missionState = startMission(missionState);
      active = missionViewRef;
      updateChaseCamera(1, true);
    },
    restartMission: () => {
      missionState = createMissionState(missionMap);
      missionRover?.reset();
      missionView?.sync(missionState.samples, missionElapsed);
      publishTelemetry(0);
      updateChaseCamera(1, true);
    },
    telemetry,
    setMissionCompleteHandler: (handler) => {
      missionComplete.handler = handler;
    },
    setPaused: (value) => {
      paused = value;
    },
    dispose: () => {
      renderer.setAnimationLoop(null);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);

      input.dispose();
      baseWorld.dispose();
      baseSky.dispose();
      missionRover?.dispose();
      missionView?.dispose();
      missionTerrain?.dispose();
      missionRegolith?.dispose();
      missionSky.dispose();

      renderer.dispose();
    },
  };
}
