import { Engine } from "@babylonjs/core/Engines/engine";
import "@babylonjs/core/Shaders/default.vertex";
import "@babylonjs/core/Shaders/default.fragment";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Scene } from "@babylonjs/core/scene";
import { GameWorld } from "./GameWorld";
import { Hud } from "./Hud";
import { InputManager } from "./InputManager";
import { createLunarTerrain } from "./terrain";
import { getMissionMap, type MissionMap } from "./MissionMap";

export type GameHandle = { scene: Scene; dispose: () => void };

export async function createGameScene(engine: Engine, _canvas: HTMLCanvasElement): Promise<GameHandle> {
  const map = getMissionMap();
  const scene = new Scene(engine);
  scene.clearColor = Color4.FromColor3(Color3.FromHexString(map.skyColor));
  scene.ambientColor = Color3.FromHexString(map.ambientColor);
  if (map.storm.active) {
    scene.fogMode = Scene.FOGMODE_EXP2;
    scene.fogColor = Color3.FromHexString("#584432");
    scene.fogDensity = 0.0028;
  }

  const camera = new ArcRotateCamera("mission-camera", -2.34, 1.07, 43, new Vector3(-17, 0, 10), scene);
  scene.activeCamera = camera;
  camera.fov = 0.9;
  camera.lowerRadiusLimit = 43;
  camera.upperRadiusLimit = 43;
  camera.lowerBetaLimit = 1.07;
  camera.upperBetaLimit = 1.07;
  camera.lowerAlphaLimit = -2.34;
  camera.upperAlphaLimit = -2.34;

  const hemisphere = new HemisphericLight("moon-ambient", new Vector3(0.15, 1, -0.25), scene);
  hemisphere.intensity = 0.72;
  hemisphere.diffuse = Color3.FromHexString("#E0D8C6");
  hemisphere.groundColor = Color3.FromHexString(map.storm.active ? "#2B211C" : "#111826");
  const sun = new DirectionalLight("sun-angle", new Vector3(-0.6, -1, 0.42), scene);
  sun.position = new Vector3(36, 58, -30);
  sun.intensity = 0.92;
  sun.diffuse = Color3.FromHexString("#FFE5BA");

  createLunarTerrain(scene, map);
  createSkyObjects(scene, map);

  const hud = new Hud();
  const input = new InputManager();
  const world = new GameWorld(scene, input, hud, map);

  scene.onBeforeRenderObservable.add(() => {
    const delta = Math.min(scene.getEngine().getDeltaTime() / 1000, 0.05);
    world.update(delta);
    camera.setTarget(world.cameraTarget);
  });

  return {
    scene,
    dispose: () => {
      input.dispose();
      hud.dispose();
      world.dispose();
      scene.dispose();
    },
  };
}

function createSkyObjects(scene: Scene, map: MissionMap) {
  const starMaterial = new StandardMaterial("star-material", scene);
  starMaterial.emissiveColor = Color3.FromHexString("#EFF6FF");
  starMaterial.disableLighting = true;
  for (let index = 0; index < 88; index += 1) {
    const angle = index * 2.39996;
    const radius = 85 + (index % 9) * 8;
    const star = MeshBuilder.CreateSphere(`star-${index}`, { diameter: index % 7 === 0 ? 0.19 : 0.08, segments: 4 }, scene);
    star.position = new Vector3(Math.cos(angle) * radius, 24 + (index % 11) * 3.1, Math.sin(angle) * radius);
    star.material = starMaterial;
  }

  const earthMaterial = new StandardMaterial("earth-material", scene);
  earthMaterial.diffuseColor = Color3.FromHexString(map.storm.active ? "#B27E55" : "#527DAA");
  earthMaterial.emissiveColor = Color3.FromHexString(map.storm.active ? "#5C3422" : "#123860");
  const earth = MeshBuilder.CreateSphere("earth-over-horizon", { diameter: 9, segments: 20 }, scene);
  earth.position = new Vector3(-44, 34, 24);
  earth.material = earthMaterial;
}
