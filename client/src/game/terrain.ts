import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import type { Scene } from "@babylonjs/core/scene";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { ASSET_URLS } from "./assets";

const CRATERS = [
  { x: -24, z: -9, radius: 8, depth: 1.9 },
  { x: 17, z: 21, radius: 6, depth: 1.2 },
  { x: 29, z: -27, radius: 11, depth: 2.35 },
  { x: -31, z: 31, radius: 7, depth: 1.35 },
  { x: 4, z: -36, radius: 6, depth: 1.1 },
];

export function terrainHeight(x: number, z: number) {
  let height = Math.sin(x * 0.15) * 0.32 + Math.cos(z * 0.13) * 0.26;
  height += Math.sin((x + z) * 0.09) * 0.22;

  for (const crater of CRATERS) {
    const distance = Math.hypot(x - crater.x, z - crater.z);
    if (distance < crater.radius) {
      const ratio = distance / crater.radius;
      height -= crater.depth * (1 - ratio) * (1 - ratio);
      if (ratio > 0.68) height += 0.28 * (ratio - 0.68) / 0.32;
    }
  }
  return height;
}

export function createLunarTerrain(scene: Scene) {
  const ground = MeshBuilder.CreateGround("lunar-terrain", { width: 148, height: 148, subdivisions: 72, updatable: true }, scene);
  const positions = ground.getVerticesData(VertexBuffer.PositionKind);
  if (positions) {
    for (let index = 0; index < positions.length; index += 3) {
      positions[index + 1] = terrainHeight(positions[index], positions[index + 2]);
    }
    ground.updateVerticesData(VertexBuffer.PositionKind, positions);
  }

  const material = new StandardMaterial("regolith-material", scene);
  material.diffuseColor = Color3.FromHexString("#9A9690");
  material.specularColor = new Color3(0.03, 0.03, 0.03);
  material.ambientColor = Color3.FromHexString("#32343A");
  const regolith = new Texture(ASSET_URLS.regolith, scene, true, false);
  regolith.uScale = 7;
  regolith.vScale = 7;
  material.diffuseTexture = regolith;
  ground.material = material;
  ground.receiveShadows = true;
  return ground as Mesh;
}

export { CRATERS };

