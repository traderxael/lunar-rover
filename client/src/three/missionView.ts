import * as THREE from "three";
import type { MissionMap } from "@/game/MissionMap";
import type { MissionSample } from "@/game/mission";

/**
 * Piezas de la misión que viven en la escena: muestras, baliza de misión y
 * tormenta de polvo. Reciben el estado puro de `game/mission` y sólo lo
 * representan.
 */

export type MissionView = {
  group: THREE.Group;
  sync: (samples: MissionSample[], elapsed: number) => void;
  update: (delta: number, elapsed: number) => void;
  dispose: () => void;
};

export function createMissionView(map: MissionMap): MissionView {
  const group = new THREE.Group();
  group.name = "mission-view";

  const disposables: Array<THREE.BufferGeometry | THREE.Material> = [];

  // --- Muestras --------------------------------------------------------------
  const sampleGeometry = new THREE.OctahedronGeometry(0.52, 0);
  const sampleMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#F3A533"),
    emissive: new THREE.Color("#C97E19"),
    emissiveIntensity: 1.1,
    roughness: 0.28,
    metalness: 0.15,
  });
  disposables.push(sampleGeometry, sampleMaterial);

  const optionalGeometry = new THREE.OctahedronGeometry(0.38, 0);
  const optionalMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#4ABDC0"),
    emissive: new THREE.Color("#174A52"),
    emissiveIntensity: 1,
    roughness: 0.3,
    metalness: 0.2,
  });
  disposables.push(optionalGeometry, optionalMaterial);

  const markers = new Map<string, THREE.Mesh>();

  const ensureMarkers = (samples: MissionSample[]) => {
    samples.forEach((sample) => {
      if (markers.has(sample.id)) return;
      const mesh = new THREE.Mesh(sample.optional ? optionalGeometry : sampleGeometry, sample.optional ? optionalMaterial : sampleMaterial);
      mesh.position.set(sample.x, 1.1, sample.z);
      mesh.castShadow = true;
      mesh.name = `sample-${sample.id}`;
      group.add(mesh);
      markers.set(sample.id, mesh);
    });
  };

  // --- Baliza de misión ------------------------------------------------------
  const beaconGroup = new THREE.Group();
  beaconGroup.position.set(map.beacon.x, 0, map.beacon.z);

  const mastGeometry = new THREE.CylinderGeometry(0.09, 0.13, 5.4, 8);
  const mastMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color("#CFC9B9"), roughness: 0.6, metalness: 0.35 });
  const mast = new THREE.Mesh(mastGeometry, mastMaterial);
  mast.position.y = 2.7;
  mast.castShadow = true;
  beaconGroup.add(mast);

  const beaconGeometry = new THREE.SphereGeometry(0.3, 14, 10);
  const beaconMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#F3A533"),
    emissive: new THREE.Color("#F3A533"),
    emissiveIntensity: 1.6,
    roughness: 0.3,
  });
  const beaconLamp = new THREE.Mesh(beaconGeometry, beaconMaterial);
  beaconLamp.position.y = 5.5;
  beaconGroup.add(beaconLamp);

  const beaconLight = new THREE.PointLight(new THREE.Color("#F3A533"), 8, 16, 1.8);
  beaconLight.position.y = 5.4;
  beaconGroup.add(beaconLight);

  disposables.push(mastGeometry, mastMaterial, beaconGeometry, beaconMaterial);
  group.add(beaconGroup);

  // --- Tormenta de polvo -----------------------------------------------------
  const stormCount = map.storm.active ? map.storm.particles * 2 : 0;
  const stormPositions = new Float32Array(Math.max(stormCount, 1) * 3);
  const stormSpeed = map.storm.windSpeed;

  for (let index = 0; index < stormCount; index += 1) {
    stormPositions[index * 3] = THREE.MathUtils.randFloatSpread(140);
    stormPositions[index * 3 + 1] = Math.random() * 12 + 0.4;
    stormPositions[index * 3 + 2] = THREE.MathUtils.randFloatSpread(140);
  }

  const stormGeometry = new THREE.BufferGeometry();
  stormGeometry.setAttribute("position", new THREE.BufferAttribute(stormPositions, 3));
  const stormMaterial = new THREE.PointsMaterial({
    color: new THREE.Color("#D8C7A6"),
    size: map.storm.strength === "severa" ? 1.5 : 1,
    transparent: true,
    opacity: map.storm.active ? 0.34 : 0,
    depthWrite: false,
    sizeAttenuation: true,
  });
  disposables.push(stormGeometry, stormMaterial);

  const storm = new THREE.Points(stormGeometry, stormMaterial);
  storm.frustumCulled = false;
  storm.visible = map.storm.active;
  group.add(storm);

  let stormOffset = 0;

  return {
    group,
    sync(samples) {
      ensureMarkers(samples);
      samples.forEach((sample) => {
        const marker = markers.get(sample.id);
        if (!marker) return;
        marker.visible = !sample.collected;
      });
    },
    update(delta, elapsed) {
      markers.forEach((marker, id) => {
        if (!marker.visible) return;
        marker.rotation.y += delta * 1.1;
        marker.position.y = 1.1 + Math.sin(elapsed * 1.6 + id.length) * 0.16;
      });

      beaconLamp.scale.setScalar(1 + Math.sin(elapsed * 2.4) * 0.12);
      beaconLight.intensity = 7 + Math.sin(elapsed * 2.4) * 2.2;

      if (!map.storm.active) return;
      stormOffset = (stormOffset + delta * stormSpeed) % 140;
      const position = stormGeometry.attributes.position as THREE.BufferAttribute;
      for (let index = 0; index < stormCount; index += 1) {
        let x = position.getX(index) + delta * stormSpeed;
        if (x > 70) x -= 140;
        position.setX(index, x);
      }
      position.needsUpdate = true;
    },
    dispose() {
      markers.clear();
      disposables.forEach((item) => item.dispose());
      group.removeFromParent();
      group.clear();
    },
  };
}