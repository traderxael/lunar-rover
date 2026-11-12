import * as THREE from "three";
import { MISSION_MAPS, type MissionMap } from "@/game/MissionMap";
import type { TycoonState } from "@/game/TycoonState";
import { ASSET_URLS } from "@/game/assets";
import { BaseWorld } from "./base";
import { createSky, type Sky } from "./sky";
import { createLunarTerrain, createRegolithTexture, type LunarTerrain } from "./terrain";

export type GameHandle = {
  syncTycoonState: (state: TycoonState) => void;
  showBase: () => void;
  showMission: (sector: TycoonState["sector"]) => void;
  dispose: () => void;
};

type SceneBundle = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  sky: Sky;
};

const ORBIT = { azimuth: -2.18, elevation: 1.03, radius: 42, target: new THREE.Vector3(0, 0, -1) };

function createRenderer(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance", preserveDrawingBuffer: true });
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
 * Expone el mismo contrato que usaba el motor anterior (`sync`, `show*`,
 * `dispose`) para que React no tenga que saber qué motor hay debajo.
 */
export async function createGameScene(canvas: HTMLCanvasElement, initialState: TycoonState): Promise<GameHandle> {
  const renderer = createRenderer(canvas);

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
  let missionMap: MissionMap = MISSION_MAPS[0];

  const buildMissionTerrain = (map: MissionMap) => {
    missionTerrain?.dispose();
    missionTerrain?.mesh.removeFromParent();
    missionRegolith?.dispose();

    missionMap = map;
    missionRegolith = createRegolithTexture(map.terrainTexture === "deepCraterRegolith" ? ASSET_URLS.deepCraterRegolith : ASSET_URLS.regolith);
    missionTerrain = createLunarTerrain(map, missionRegolith);
    missionScene.add(missionTerrain.mesh);

    missionScene.background = new THREE.Color(map.skyColor);
    (missionScene.fog as THREE.FogExp2).color = new THREE.Color(map.ambientColor);
  };

  buildMissionTerrain(missionMap);

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
  let active: SceneBundle = { scene: baseScene, camera: baseCamera, sky: baseSky };
  const clock = new THREE.Clock();

  renderer.setAnimationLoop(() => {
    const delta = Math.min(clock.getDelta(), 0.05);
    if (active.scene === baseScene) baseWorld.update(delta);
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
        active = which === "mission" ? { scene: missionScene, camera: missionCamera, sky: missionSky } : { scene: baseScene, camera: baseCamera, sky: baseSky };
      },
    };
  }

  return {
    syncTycoonState: (state) => baseWorld.sync(state),
    showBase: () => {
      active = { scene: baseScene, camera: baseCamera, sky: baseSky };
    },
    showMission: (sector) => {
      const map = MISSION_MAPS.find((candidate) => candidate.id === sector) ?? MISSION_MAPS[0];
      if (map.id !== missionMap.id) buildMissionTerrain(map);
      active = { scene: missionScene, camera: missionCamera, sky: missionSky };
    },
    dispose: () => {
      renderer.setAnimationLoop(null);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);

      baseWorld.dispose();
      baseSky.dispose();
      missionTerrain?.dispose();
      missionRegolith?.dispose();
      missionSky.dispose();

      renderer.dispose();
    },
  };
}
