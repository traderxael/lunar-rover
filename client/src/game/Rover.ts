import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";
import type { GameActions } from "./InputManager";
import { ASSET_URLS } from "./assets";

export type RoverStep = { distance: number; usedEnergy: number; boosted: boolean };

export class Rover {
  readonly root: TransformNode;
  private readonly wheels: Mesh[] = [];
  private readonly origin = new Vector3(-47, 0, 36);
  private speed = 0;
  private wheelPhase = 0;
  private readonly maxSpeed = 9.7;
  private readonly maxReverse = -4.2;

  constructor(scene: Scene, private readonly surfaceHeight: (x: number, z: number) => number) {
    this.root = new TransformNode("lunar-rover", scene);
    this.createModel(scene);
    this.reset();
  }

  get position() {
    return this.root.position;
  }

  get currentSpeed() {
    return Math.abs(this.speed);
  }

  reset() {
    this.root.position.copyFrom(this.origin);
    this.root.position.y = this.surfaceHeight(this.origin.x, this.origin.z) + 0.83;
    this.root.rotation.y = 0.82;
    this.speed = 0;
    this.wheelPhase = 0;
  }

  update(delta: number, actions: GameActions, canMove: boolean, energy: number): RoverStep {
    if (!canMove) return { distance: 0, usedEnergy: 0, boosted: false };

    const throttle = actions.throttle;
    if (throttle !== 0) {
      this.speed += throttle * 7.2 * delta;
    } else {
      const braking = Math.min(Math.abs(this.speed), 1.7 * delta);
      this.speed -= Math.sign(this.speed) * braking;
    }

    this.speed = Math.max(this.maxReverse, Math.min(this.maxSpeed, this.speed));
    const motionDirection = this.speed === 0 ? 1 : Math.sign(this.speed);
    const steeringWeight = 0.58 + Math.min(Math.abs(this.speed) / this.maxSpeed, 0.42);
    this.root.rotation.y += actions.steer * 1.58 * steeringWeight * delta * motionDirection;

    let boosted = false;
    if (actions.boost && energy > 8) {
      this.speed = Math.min(this.speed + 5.1, this.maxSpeed + 3.4);
      boosted = true;
    }

    const forward = new Vector3(Math.sin(this.root.rotation.y), 0, Math.cos(this.root.rotation.y));
    const move = forward.scale(this.speed * delta);
    this.root.position.addInPlace(move);
    const edge = 67;
    if (Math.abs(this.root.position.x) > edge || Math.abs(this.root.position.z) > edge) {
      this.root.position.x = Math.max(-edge, Math.min(edge, this.root.position.x));
      this.root.position.z = Math.max(-edge, Math.min(edge, this.root.position.z));
      this.speed *= -0.16;
    }

    this.root.position.y = this.surfaceHeight(this.root.position.x, this.root.position.z) + 0.83;
    this.wheelPhase += this.speed * delta * 2.8;
    this.wheels.forEach((wheel, index) => {
      wheel.rotation.x = this.wheelPhase;
      wheel.rotation.y = index % 2 === 0 ? 0.08 : -0.08;
    });

    const distance = move.length();
    return { distance, usedEnergy: distance * 0.3 + (boosted ? 4.5 : 0), boosted };
  }

  dispose() {
    this.root.getChildMeshes().forEach((mesh) => mesh.dispose());
    this.root.dispose();
  }

  private createModel(scene: Scene) {
    const chassisMaterial = new StandardMaterial("rover-chassis", scene);
    chassisMaterial.diffuseColor = Color3.FromHexString("#E4E0D3");
    chassisMaterial.specularColor = Color3.FromHexString("#3D4147");

    const panelMaterial = new StandardMaterial("rover-panel", scene);
    panelMaterial.diffuseColor = Color3.FromHexString("#252D35");
    panelMaterial.specularColor = Color3.FromHexString("#56616A");
    panelMaterial.diffuseTexture = new Texture(ASSET_URLS.instrumentDecal, scene, true, false);

    const wheelMaterial = new StandardMaterial("rover-wheels", scene);
    wheelMaterial.diffuseColor = Color3.FromHexString("#202326");
    wheelMaterial.specularColor = Color3.FromHexString("#0B0D0F");

    const amberMaterial = new StandardMaterial("rover-lamps", scene);
    amberMaterial.diffuseColor = Color3.FromHexString("#F3A533");
    amberMaterial.emissiveColor = Color3.FromHexString("#C97E19");

    const base = MeshBuilder.CreateBox("rover-base", { width: 2.75, height: 0.42, depth: 3.45 }, scene);
    base.parent = this.root;
    base.position.y = 0.4;
    base.material = chassisMaterial;

    const cabin = MeshBuilder.CreateBox("rover-cabin", { width: 2.05, height: 0.72, depth: 1.75 }, scene);
    cabin.parent = this.root;
    cabin.position = new Vector3(0, 0.94, -0.25);
    cabin.material = panelMaterial;

    const sensor = MeshBuilder.CreateBox("rover-sensor", { width: 1.05, height: 0.45, depth: 0.52 }, scene);
    sensor.parent = this.root;
    sensor.position = new Vector3(0, 0.78, 1.55);
    sensor.material = amberMaterial;

    const mast = MeshBuilder.CreateCylinder("rover-mast", { height: 1.45, diameter: 0.06, tessellation: 8 }, scene);
    mast.parent = this.root;
    mast.position = new Vector3(-0.66, 1.62, -0.3);
    mast.material = chassisMaterial;
    const dish = MeshBuilder.CreateDisc("rover-dish", { radius: 0.27, tessellation: 20 }, scene);
    dish.parent = this.root;
    dish.position = new Vector3(-0.66, 2.29, -0.3);
    dish.rotation.x = Math.PI / 2.65;
    dish.material = panelMaterial;

    [-1.38, 0, 1.38].forEach((z) => {
      [-1.48, 1.48].forEach((x) => {
        const wheel = MeshBuilder.CreateCylinder("rover-wheel", { diameter: 0.88, height: 0.36, tessellation: 16 }, scene);
        wheel.parent = this.root;
        wheel.position = new Vector3(x, 0.22, z);
        wheel.rotation.z = Math.PI / 2;
        wheel.material = wheelMaterial;
        this.wheels.push(wheel);
      });
    });

    const lamp = new PointLight("rover-lamp", new Vector3(0, 0.9, 1.85), scene);
    lamp.parent = this.root;
    lamp.diffuse = Color3.FromHexString("#F3A533");
    lamp.intensity = 2.5;
    lamp.range = 7;
  }
}

