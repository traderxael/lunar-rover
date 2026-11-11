import { Engine } from "@babylonjs/core/Engines/engine";
import "@babylonjs/core/Shaders/default.vertex";
import "@babylonjs/core/Shaders/default.fragment";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { GlowLayer } from "@babylonjs/core/Layers/glowLayer";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Scene } from "@babylonjs/core/scene";
import { BaseWorld } from "./BaseWorld";
import { createInitialTycoonState, type TycoonState } from "./TycoonState";

export type GameHandle = { scene: Scene; syncTycoonState: (state: TycoonState) => void; dispose: () => void };

export async function createGameScene(engine: Engine, canvas: HTMLCanvasElement, initialState: TycoonState = createInitialTycoonState()): Promise<GameHandle> {
  const scene = new Scene(engine);
  scene.clearColor = Color4.FromColor3(Color3.FromHexString("#050912"));
  scene.ambientColor = Color3.FromHexString("#273343");
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.0023;
  scene.fogColor = Color3.FromHexString("#101821");

  const camera = new ArcRotateCamera("base-camera", -2.18, 1.03, 42, new Vector3(0, 0, -1), scene);
  scene.activeCamera = camera;
  camera.fov = 0.83;
  camera.lowerRadiusLimit = 31;
  camera.upperRadiusLimit = 58;
  camera.lowerBetaLimit = 0.78;
  camera.upperBetaLimit = 1.31;
  camera.wheelPrecision = 110;
  camera.panningSensibility = 135;
  camera.inertia = 0.78;
  camera.attachControl(canvas, true);

  const hemisphere = new HemisphericLight("base-ambient", new Vector3(-0.2, 1, -0.1), scene);
  hemisphere.intensity = 0.7;
  hemisphere.diffuse = Color3.FromHexString("#DDE3E2");
  hemisphere.groundColor = Color3.FromHexString("#101722");
  const sun = new DirectionalLight("base-sun", new Vector3(-0.52, -1, 0.35), scene);
  sun.position = new Vector3(30, 50, -25);
  sun.intensity = 1.05;
  sun.diffuse = Color3.FromHexString("#FFE2AF");
  const rim = new DirectionalLight("base-rim", new Vector3(0.42, -0.55, -0.4), scene);
  rim.position = new Vector3(-30, 28, 32);
  rim.intensity = 0.32;
  rim.diffuse = Color3.FromHexString("#4ABDC0");

  const glow = new GlowLayer("mission-glow", scene, { mainTextureFixedSize: 1024 });
  glow.intensity = 0.44;
  createSkyObjects(scene);
  const world = new BaseWorld(scene, initialState);
  scene.onBeforeRenderObservable.add(() => world.update(Math.min(scene.getEngine().getDeltaTime() / 1000, 0.05)));
  return { scene, syncTycoonState: (state) => world.sync(state), dispose: () => { world.dispose(); glow.dispose(); scene.dispose(); } };
}

function createSkyObjects(scene: Scene) {
  const starMaterial = new StandardMaterial("base-stars", scene);
  starMaterial.emissiveColor = Color3.FromHexString("#EFF6FF");
  starMaterial.disableLighting = true;
  for (let index = 0; index < 118; index += 1) {
    const angle = index * 2.39996;
    const radius = 83 + (index % 9) * 8;
    const star = MeshBuilder.CreateSphere(`base-star-${index}`, { diameter: index % 7 === 0 ? 0.18 : 0.07, segments: 4 }, scene);
    star.position = new Vector3(Math.cos(angle) * radius, 24 + (index % 11) * 3.1, Math.sin(angle) * radius);
    star.material = starMaterial;
  }
  const earthMaterial = new StandardMaterial("base-earth", scene);
  earthMaterial.diffuseColor = Color3.FromHexString("#527DAA");
  earthMaterial.emissiveColor = Color3.FromHexString("#123860");
  const earth = MeshBuilder.CreateSphere("base-earth-horizon", { diameter: 8, segments: 20 }, scene);
  earth.position = new Vector3(-42, 33, 25);
  earth.material = earthMaterial;
}
