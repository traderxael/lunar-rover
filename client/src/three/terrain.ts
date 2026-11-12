import * as THREE from "three";
import type { Crater, MissionMap } from "@/game/MissionMap";

/**
 * Terreno lunar procedural. `terrainHeight` es la única fuente de verdad para
 * apoyar cualquier objeto: si un mesh y esta función discrepan, el objeto flota
 * o se hunde. Todo lo demás (malla, normales, colisiones visuales) se deriva de
 * aquí.
 */
export function terrainHeight(map: MissionMap, x: number, z: number) {
  let height = Math.sin(x * 0.15) * 0.32 + Math.cos(z * 0.13) * 0.26;
  height += Math.sin((x + z) * 0.09) * 0.22;

  for (const crater of map.craters) {
    const distance = Math.hypot(x - crater.x, z - crater.z);
    if (distance < crater.radius) {
      const ratio = distance / crater.radius;
      height -= crater.depth * (1 - ratio) * (1 - ratio);
      if (ratio > 0.68) height += (0.28 * (ratio - 0.68)) / 0.32;
    }
  }
  return height;
}

export function deepCraterAt(map: MissionMap, x: number, z: number): Crater | undefined {
  return map.craters.find((crater) => crater.deep && Math.hypot(x - crater.x, z - crater.z) < crater.radius * 0.77);
}

export type LunarTerrain = {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  dispose: () => void;
};

export function createLunarTerrain(map: MissionMap, regolith: THREE.Texture | null): LunarTerrain {
  const geometry = new THREE.PlaneGeometry(148, 148, 72, 72);
  geometry.rotateX(-Math.PI / 2);

  const position = geometry.attributes.position as THREE.BufferAttribute;
  for (let index = 0; index < position.count; index += 1) {
    position.setY(index, terrainHeight(map, position.getX(index), position.getZ(index)));
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(map.terrainColor),
    roughness: 0.97,
    metalness: 0.02,
    map: regolith ?? null,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  mesh.name = "lunar-terrain";

  return {
    mesh,
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
}

export function createRegolithTexture(url: string, repeat = 7): THREE.Texture {
  const texture = new THREE.TextureLoader().load(url);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}