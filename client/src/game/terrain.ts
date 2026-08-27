import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import type { Scene } from "@babylonjs/core/scene";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { ASSET_URLS } from "./assets";
import type { Crater, MissionMap } from "./MissionMap";

export function terrainHeight(map: MissionMap, x: number, z: number) {
  let height = Math.sin(x * 0.15) * 0.32 + Math.cos(z * 0.13) * 0.26;
  height += Math.sin((x + z) * 0.09) * 0.22;

  for (const crater of map.craters) {
    const distance = Math.hypot(x - crater.x, z - crater.z);
    if (distance < crater.radius) {
      const ratio = distance / crater.radius;
      height -= crater.depth * (1 - ratio) * (1 - ratio);
      if (ratio > 0.68) height += 0.28 * (ratio - 0.68) / 0.32;
    }
  }
  return height;
}

export function deepCraterAt(map: MissionMap, x: number, z: number): Crater | undefined {
  return map.craters.find((crater) => crater.deep && Math.hypot(x - crater.x, z - crater.z) < crater.radius * 0.77);
}

export function createLunarTerrain(scene: Scene, map: MissionMap) {
  const ground = MeshBuilder.CreateGround("lunar-terrain", { width: 148, height: 148, subdivisions: 72, updatable: true }, scene);
  const positions = ground.getVerticesData(VertexBuffer.PositionKind);
  if (positions) {
    for (let index = 0; index < positions.length; index += 3) {
      positions[index + 1] = terrainHeight(map, positions[index], positions[index + 2]);
    }
    ground.updateVerticesData(VertexBuffer.PositionKind, positions);
    const indices = ground.getIndices();
    if (indices) {
      const normals: number[] = [];
      VertexData.ComputeNormals(positions, indices, normals);
      ground.updateVerticesData(VertexBuffer.NormalKind, normals);
    }
    ground.refreshBoundingInfo(true);
  }

  const material = new StandardMaterial("regolith-material", scene);
  material.diffuseColor = Color3.FromHexString(map.terrainColor);
  material.specularColor = new Color3(0.03, 0.03, 0.03);
  material.ambientColor = Color3.FromHexString("#32343A");
  const textureUrl = map.terrainTexture === "deepCraterRegolith" ? ASSET_URLS.deepCraterRegolith : ASSET_URLS.regolith;
  const regolith = new Texture(textureUrl, scene, true, false);
  regolith.uScale = 7;
  regolith.vScale = 7;
  material.diffuseTexture = regolith;
  ground.material = material;
  ground.receiveShadows = true;
  return ground as Mesh;
}
