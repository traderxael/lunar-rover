import * as THREE from "three";
import type { MissionMap } from "@/game/MissionMap";
import type { GameActions } from "./input";
import { resolveObstacles, type Obstacle } from "@/game/mission";
import { terrainHeight } from "./terrain";

/**
 * Rover de superficie: modelo cinemático determinista, sin motor de física.
 *
 * La conducción se resuelve con un escalar de velocidad y un rumbo; la
 * inclinación del chasis se deriva de muestrear el terreno en las cuatro
 * ruedas, que es lo que hace que el vehículo se sienta apoyado y no flotando.
 */

const ACCELERATION = 7.2;
const BRAKING = 1.7;
const MAX_SPEED = 9.7;
const MAX_REVERSE = -4.2;
const BOOST_ACCELERATION = 5.1;
const BOOST_CEILING = 3.4;
const CLEARANCE = 0.83;
const WHEEL_RADIUS = 0.44;
const ROVER_RADIUS = 1.6;

export type Rover = {
  object: THREE.Group;
  position: THREE.Vector3;
  speed: number;
  update: (delta: number, actions: GameActions, canMove: boolean) => number;
  applyDrag: (factor: number) => void;
  reset: () => void;
  dispose: () => void;
};

export function createRover(map: MissionMap, start: THREE.Vector3, obstacles: Obstacle[] = []): Rover {
  const root = new THREE.Group();
  root.name = "rover";

  const body = new THREE.Group();
  body.name = "rover-body";
  root.add(body);

  const disposables: Array<THREE.BufferGeometry | THREE.Material> = [];
  const track = <T extends THREE.BufferGeometry | THREE.Material>(item: T) => {
    disposables.push(item);
    return item;
  };

  const ivory = track(new THREE.MeshStandardMaterial({ color: new THREE.Color("#E4E0D3"), roughness: 0.62, metalness: 0.28 }));
  const panel = track(new THREE.MeshStandardMaterial({ color: new THREE.Color("#252D35"), roughness: 0.55, metalness: 0.42 }));
  const rubber = track(new THREE.MeshStandardMaterial({ color: new THREE.Color("#202326"), roughness: 0.95, metalness: 0.05 }));
  const amber = track(new THREE.MeshStandardMaterial({ color: new THREE.Color("#F3A533"), emissive: new THREE.Color("#C97E19"), emissiveIntensity: 0.9, roughness: 0.4 }));
  const glass = track(new THREE.MeshStandardMaterial({ color: new THREE.Color("#233F4D"), emissive: new THREE.Color("#102C38"), emissiveIntensity: 0.5, roughness: 0.2, metalness: 0.6 }));

  const chassis = new THREE.Mesh(track(new THREE.BoxGeometry(2.75, 0.42, 3.45)), ivory);
  chassis.position.y = 0.4;

  const cabin = new THREE.Mesh(track(new THREE.BoxGeometry(2.05, 0.72, 1.75)), glass);
  cabin.position.set(0, 0.94, -0.25);

  const sensor = new THREE.Mesh(track(new THREE.BoxGeometry(1.05, 0.45, 0.52)), amber);
  sensor.position.set(0, 0.78, 1.55);

  const mast = new THREE.Mesh(track(new THREE.CylinderGeometry(0.03, 0.03, 1.45, 8)), ivory);
  mast.position.set(-0.66, 1.62, -0.3);

  const dish = new THREE.Mesh(track(new THREE.SphereGeometry(0.27, 18, 12)), panel);
  dish.scale.y = 0.32;
  dish.position.set(-0.66, 2.29, -0.3);

  const solarPanel = new THREE.Mesh(track(new THREE.BoxGeometry(2.3, 0.05, 1.25)), panel);
  solarPanel.position.set(0, 1.36, -1.05);
  solarPanel.rotation.x = -0.16;

  const parts: THREE.Mesh[] = [chassis, cabin, sensor, mast, dish, solarPanel];
  parts.forEach((mesh) => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    body.add(mesh);
  });

  const wheels: THREE.Mesh[] = [];
  const wheelGeometry = track(new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, 0.36, 16));
  [-1.38, 0, 1.38].forEach((z) => {
    [-1.48, 1.48].forEach((x) => {
      const wheel = new THREE.Mesh(wheelGeometry, rubber);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, WHEEL_RADIUS - 0.06, z);
      wheel.castShadow = true;
      body.add(wheel);
      wheels.push(wheel);
    });
  });

  const headlamp = new THREE.SpotLight(new THREE.Color("#F3A533"), 22, 26, Math.PI / 7, 0.45, 1.4);
  headlamp.position.set(0, 1.05, 1.7);
  headlamp.target.position.set(0, 0.2, 9);
  body.add(headlamp);
  body.add(headlamp.target);

  // --- Polvo de ruedas -------------------------------------------------------
  const dustCount = 70;
  const dustPositions = new Float32Array(dustCount * 3);
  const dustVelocity = new Float32Array(dustCount * 3);
  const dustLife = new Float32Array(dustCount);
  for (let index = 0; index < dustCount; index += 1) {
    dustPositions[index * 3 + 1] = -999;
  }
  const dustGeometry = track(new THREE.BufferGeometry());
  dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
  const dustMaterial = track(new THREE.PointsMaterial({
    color: new THREE.Color("#CFC9B9"),
    size: 0.34,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    sizeAttenuation: true,
  }));
  const dust = new THREE.Points(dustGeometry, dustMaterial);
  dust.frustumCulled = false;
  root.add(dust);

  let dustCursor = 0;

  const emitDust = (amount: number) => {
    const count = Math.min(amount, 4);
    for (let index = 0; index < count; index += 1) {
      const slot = dustCursor % dustCount;
      dustCursor += 1;
      dustPositions[slot * 3] = (Math.random() - 0.5) * 2.6;
      dustPositions[slot * 3 + 1] = 0.16;
      dustPositions[slot * 3 + 2] = -1.5 - Math.random() * 1.4;
      dustVelocity[slot * 3] = (Math.random() - 0.5) * 0.9;
      dustVelocity[slot * 3 + 1] = 0.5 + Math.random() * 0.7;
      dustVelocity[slot * 3 + 2] = (Math.random() - 0.5) * 0.9;
      dustLife[slot] = 0.9 + Math.random() * 0.5;
    }
  };

  const updateDust = (delta: number) => {
    for (let index = 0; index < dustCount; index += 1) {
      if (dustLife[index] <= 0) continue;
      dustLife[index] -= delta;
      dustPositions[index * 3] += dustVelocity[index * 3] * delta;
      dustPositions[index * 3 + 1] += dustVelocity[index * 3 + 1] * delta;
      dustPositions[index * 3 + 2] += dustVelocity[index * 3 + 2] * delta;
      dustVelocity[index * 3 + 1] -= 0.55 * delta;
      if (dustLife[index] <= 0) dustPositions[index * 3 + 1] = -999;
    }
    (dustGeometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  };

  // --- Estado ----------------------------------------------------------------
  let speed = 0;
  let wheelPhase = 0;
  const heading = { value: 0.82 };
  const origin = start.clone();

  const applyGrounding = () => {
    const forwardX = Math.sin(heading.value);
    const forwardZ = Math.cos(heading.value);
    const rightX = Math.cos(heading.value);
    const rightZ = -Math.sin(heading.value);

    const front = terrainHeight(map, root.position.x + forwardX * 1.4, root.position.z + forwardZ * 1.4);
    const back = terrainHeight(map, root.position.x - forwardX * 1.4, root.position.z - forwardZ * 1.4);
    const left = terrainHeight(map, root.position.x - rightX * 1.1, root.position.z - rightZ * 1.1);
    const right = terrainHeight(map, root.position.x + rightX * 1.1, root.position.z + rightZ * 1.1);

    const center = terrainHeight(map, root.position.x, root.position.z);
    root.position.y = center + CLEARANCE;

    const targetPitch = Math.atan2(front - back, 2.8);
    const targetRoll = Math.atan2(right - left, 2.2);
    body.rotation.x += (targetPitch - body.rotation.x) * 0.18;
    body.rotation.z += (targetRoll - body.rotation.z) * 0.18;
  };

  const reset = () => {
    root.position.copy(origin);
    root.position.y = terrainHeight(map, origin.x, origin.z) + CLEARANCE;
    heading.value = 0.82;
    root.rotation.y = heading.value;
    speed = 0;
    wheelPhase = 0;
    body.rotation.set(0, 0, 0);
    applyGrounding();
  };

  reset();

  return {
    object: root,
    get position() {
      return root.position;
    },
    get speed() {
      return speed;
    },
    update(delta, actions, canMove) {
      if (!canMove) {
        updateDust(delta);
        return 0;
      }

      if (actions.throttle !== 0) {
        speed += actions.throttle * ACCELERATION * delta;
      } else {
        const braking = Math.min(Math.abs(speed), BRAKING * delta);
        speed -= Math.sign(speed) * braking;
      }

      speed = THREE.MathUtils.clamp(speed, MAX_REVERSE, MAX_SPEED);

      const direction = speed === 0 ? 1 : Math.sign(speed);
      const steerWeight = 0.58 + Math.min(Math.abs(speed) / MAX_SPEED, 0.42);
      heading.value += actions.steer * 1.58 * steerWeight * direction * delta;
      root.rotation.y = heading.value;

      let boosted = false;
      if (actions.boost) {
        speed = Math.min(speed + BOOST_ACCELERATION, MAX_SPEED + BOOST_CEILING);
        boosted = true;
      }

      const forwardX = Math.sin(heading.value);
      const forwardZ = Math.cos(heading.value);
      const distance = speed * delta;

      root.position.x += forwardX * distance;
      root.position.z += forwardZ * distance;

      const resolved = resolveObstacles(root.position.x, root.position.z, ROVER_RADIUS, obstacles);
      if (resolved.hit) {
        root.position.x = resolved.x;
        root.position.z = resolved.z;
        speed *= 0.35;
      }

      const edge = 67;
      if (Math.abs(root.position.x) > edge || Math.abs(root.position.z) > edge) {
        root.position.x = THREE.MathUtils.clamp(root.position.x, -edge, edge);
        root.position.z = THREE.MathUtils.clamp(root.position.z, -edge, edge);
        speed *= -0.16;
      }

      applyGrounding();

      wheelPhase += distance * 2.8;
      wheels.forEach((wheel) => {
        wheel.rotation.x = wheelPhase;
      });

      if (Math.abs(speed) > 1.4) emitDust(boosted ? 4 : 2);
      updateDust(delta);

      return Math.abs(distance);
    },
    applyDrag(factor) {
      speed *= factor;
    },
    reset,
    dispose() {
      dustGeometry.dispose();
      disposables.forEach((item) => item.dispose());
      root.removeFromParent();
      root.clear();
    },
  };
}
