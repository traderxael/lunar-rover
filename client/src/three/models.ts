import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/**
 * Carga de modelos GLTF con normalización y reserva.
 *
 * Los modelos descargados llegan con escalas y orientaciones arbitrarias: se
 * centran en el origen, se apoyan en y = 0 y se escalan a un tamaño objetivo.
 * Si la carga falla se devuelve `null` y el llamador construye geometría
 * procedural: la escena nunca se queda sin rover ni sin hitos.
 */
export type LoadedModel = {
  object: THREE.Group;
  dispose: () => void;
};

const loader = new GLTFLoader();

export async function loadModel(url: string, targetSize?: number): Promise<LoadedModel | null> {
  try {
    const gltf = await loader.loadAsync(url);
    const object = gltf.scene;

    const box = new THREE.Box3().setFromObject(object);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const largest = Math.max(size.x, size.y, size.z) || 1;
    const scale = targetSize ? targetSize / largest : 1;
    object.scale.setScalar(scale);

    // Recomputar tras escalar para apoyarlo de verdad en el suelo.
    box.setFromObject(object);
    box.getCenter(center);
    object.position.x -= center.x;
    object.position.z -= center.z;
    object.position.y -= box.min.y;

    object.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        if (mesh.material) {
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach((material) => {
            const standard = material as THREE.MeshStandardMaterial;
            if (standard.map) standard.map.colorSpace = THREE.SRGBColorSpace;
          });
        }
      }
    });

    return {
      object,
      dispose: () => {
        object.traverse((child) => {
          const mesh = child as THREE.Mesh;
          if (!mesh.isMesh) return;
          mesh.geometry?.dispose();
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach((material) => material?.dispose());
        });
        object.clear();
      },
    };
  } catch (error) {
    console.warn(`Modelo no disponible (${url}); se usa la reserva procedural.`, error);
    return null;
  }
}