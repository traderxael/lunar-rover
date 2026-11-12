import * as THREE from "three";
import { MISSION_MAPS, type MissionMap } from "@/game/MissionMap";
import type { TycoonState } from "@/game/TycoonState";
import { ASSET_URLS } from "@/game/assets";
import { BaseWorld } from "./base";
import { InputManager } from "./input";
import { createRover, type Rover } from "./rover";
import { createSky } from "./sky";
import { createLunarTerrain, createRegolithTexture, type LunarTerrain } from "./terrain";

export type GameHandle = {
  syncTycoonState: (state: TycoonState) => void;
  showBase: () => void;
  showMission: (sector: TycoonState["sector"]) => void;
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
 * Expone un contrato estable (`sync`, `show*`, `dispose`) para que React no
 * tenga que saber qué motor hay debajo.
 */
export async function createGameScene(canvas: HTMLCanvasElement, initialState: TycoonState): Promise<GameHandle> {
  const renderer = createRenderer(canvas);
  const input = new InputManager();

  // ---- Escena de base -------------------------------------------------------
  const baseScene = new THREE.Scene();
  baseScene.background = new THREE.Color(initialState.sector === "selenite" ? "#14100F" : "#050912");
  baseScene.fog = new THREE.FogExp2(new THREE.Color("#101821"), 0.0042);
  addLights(baseScene);

  const baseSky = createSky();
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
  missionScene.add(missionSky.group);

  const missionCamera = new THREE.PerspectiveCamera(55, 1, 0.5, 500);
  missionCamera.position.set(0, 34, 46);
  missionCamera.lookAt(0, 0, 0);

  let missionTerrain: LunarTerrain | null = null;
  let missionRegolith: THREE.Texture | null = null;
  let missionRover: Rover | null = null;
  let missionMap: MissionMap = MISSION_MAPS[0];
  const cameraTarget = new THREE.Vector3();
  const desiredCamera = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();

  const buildMission = (map: MissionMap) => {
    missionTerrain?.dispose();
    missionTerrain?.mesh.removeFromParent();
    missionRegolith?.dispose();
    missionRover?.dispose();

    missionMap = map;
    missionRegolith = createRegolithTexture(map.terrainTexture === "deepCraterRegolith" ? ASSET_URLS.deepCraterRegolith : ASSET_URLS.regolith);
    missionTerrain = createLunarTerrain(map, missionRegolith);
    missionScene.add(missionTerrain.mesh);

    const start = new THREE.Vector3(map.start.x, 0, map.start.z);
    missionRover = createRover(map, start);
    missionScene.add(missionRover.object);

    missionScene.background = new THREE.Color(map.skyColor);
    (missionScene.fog as THREE.FogExp2).color = new THREE.Color(map.ambientColor);

    // La cámara arranca ya detrás del rover para que el primer fotograma no
    // venga desde el origen del mundo.
    updateChaseCamera(1, true);
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

    const blend = snap ? 1 : 1 - Math.exp(-delta * 4.2);
    missionCamera.position.lerp(desiredCamera, blend);

    lookTarget.set(missionRover.position.x, missionRover.position.y + CHASE.look, missionRover.position.z);
    cameraTarget.lerp(lookTarget, snap ? 1 : 1 - Math.exp(-delta * 6));
    missionCamera.lookAt(cameraTarget);
  }

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
  const missionView = { scene: missionScene, camera: missionCamera, sky: missionSky };
  let active: typeof baseView = baseView;
  const clock = new THREE.Clock();

  renderer.setAnimationLoop(() => {
    const delta = Math.min(clock.getDelta(), 0.05);

    if (active === baseView) {
      baseWorld.update(delta);
    } else if (missionRover) {
      const actions = input.read();
      if (actions.reset) missionRover.reset();
      missionRover.update(delta, actions, true);
      updateChaseCamera(delta);
    }

    renderer.render(active.scene, active.camera);
  });

  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).__lunar = {
      renderer,
      baseScene,
      missionScene,
      baseWorld,
      renderFrame: () => renderer.render(active.scene, active.camera),
      setActive: (which: string) => {
        active = which === "mission" ? missionView : baseView;
      },
      tick: (delta: number) => {
        if (active === missionView && missionRover) {
          missionRover.update(delta, input.read(), true);
          updateChaseCamera(delta);
        }
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
    showMission: (sector) => {
      const map = MISSION_MAPS.find((candidate) => candidate.id === sector) ?? MISSION_MAPS[0];
      if (map.id !== missionMap.id) buildMission(map);
      active = missionView;
      updateChaseCamera(1, true);
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
      missionTerrain?.dispose();
      missionRegolith?.dispose();
      missionSky.dispose();

      renderer.dispose();
    },
  };
}