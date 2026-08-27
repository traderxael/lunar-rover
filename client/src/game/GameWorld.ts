import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";
import { InputManager, type GameActions } from "./InputManager";
import { Hud, type MissionState } from "./Hud";
import { Rover } from "./Rover";
import { terrainHeight } from "./terrain";

type Sample = { root: TransformNode; position: Vector3; collected: boolean; bobOffset: number };

const SAMPLE_POSITIONS = [
  new Vector3(-27, 0, 20),
  new Vector3(-6, 0, 4),
  new Vector3(17, 0, -10),
  new Vector3(33, 0, 22),
  new Vector3(45, 0, -27),
];

export class GameWorld {
  private readonly rover: Rover;
  private readonly samples: Sample[] = [];
  private readonly targetRing: Mesh;
  private readonly targetLight: PointLight;
  private energy = 100;
  private elapsed = 0;
  private collected = 0;
  private state: MissionState;
  private readonly isDemo: boolean;
  private followTarget: Vector3;
  private boostFlash = false;

  constructor(private readonly scene: Scene, private readonly input: InputManager, private readonly hud: Hud) {
    this.isDemo = new URLSearchParams(window.location.search).has("demo");
    this.state = this.isDemo ? "active" : "briefing";
    this.rover = new Rover(scene, terrainHeight);
    this.followTarget = this.rover.position.clone();
    this.createSamples();
    this.createDecorations();

    this.targetRing = MeshBuilder.CreateTorus("objective-ring", { diameter: 4.8, thickness: 0.075, tessellation: 40 }, scene);
    this.targetRing.rotation.x = Math.PI / 2;
    const ringMaterial = new StandardMaterial("objective-ring-material", scene);
    ringMaterial.diffuseColor = Color3.FromHexString("#F3A533");
    ringMaterial.emissiveColor = Color3.FromHexString("#D98218");
    this.targetRing.material = ringMaterial;

    this.targetLight = new PointLight("objective-light", new Vector3(0, 5, 0), scene);
    this.targetLight.diffuse = Color3.FromHexString("#F3A533");
    this.targetLight.intensity = 12;
    this.targetLight.range = 15;
    this.updateObjectiveMarker();

    this.hud.bind(() => this.start(), () => this.reset());
    this.refreshHud();
  }

  get cameraTarget() {
    return this.followTarget;
  }

  start() {
    if (this.state !== "briefing") return;
    this.state = "active";
    this.refreshHud();
  }

  reset() {
    this.energy = 100;
    this.elapsed = 0;
    this.collected = 0;
    this.state = "active";
    this.rover.reset();
    this.samples.forEach((sample) => {
      sample.collected = false;
      sample.root.setEnabled(true);
    });
    this.updateObjectiveMarker();
    this.refreshHud();
  }

  update(delta: number) {
    let actions = this.input.read();
    if (actions.reset) this.reset();
    if (this.state === "active" && this.isDemo) actions = this.getDemoActions();

    const isActive = this.state === "active";
    const step = this.rover.update(delta, actions, isActive, this.energy);
    this.boostFlash = step.boosted;
    if (isActive) {
      this.elapsed += delta;
      this.energy = Math.max(0, this.energy - step.usedEnergy - (step.distance > 0.01 ? delta * 0.12 : 0));
      this.checkSamples();
      if (this.energy <= 0) this.state = "depleted";
    }

    this.samples.forEach((sample) => {
      if (!sample.collected) {
        sample.root.rotation.y += delta * 0.85;
        sample.root.position.y = terrainHeight(sample.position.x, sample.position.z) + 0.7 + Math.sin(this.elapsed * 2.1 + sample.bobOffset) * 0.12;
      }
    });

    const target = this.rover.position.clone();
    this.followTarget = Vector3.Lerp(this.followTarget, target, Math.min(delta * 2.1, 1));
    this.targetRing.rotation.z += delta * 0.32;
    this.refreshHud();
  }

  dispose() {
    this.rover.dispose();
    this.samples.forEach((sample) => sample.root.dispose());
    this.targetRing.dispose();
    this.targetLight.dispose();
  }

  private checkSamples() {
    const target = this.samples[this.collected];
    if (!target || target.collected) return;
    const distance = Vector3.Distance(this.rover.position, target.root.position);
    if (distance < 3.25) {
      target.collected = true;
      target.root.setEnabled(false);
      this.collected += 1;
      if (this.collected >= this.samples.length) {
        this.state = "success";
      } else {
        this.energy = Math.min(100, this.energy + 8);
        this.updateObjectiveMarker();
      }
    }
  }

  private refreshHud() {
    const target = this.samples[this.collected];
    const targetDistance = target && !target.collected ? Vector3.Distance(this.rover.position, target.root.position) : 0;
    this.hud.update({
      energy: this.energy,
      collected: this.collected,
      total: this.samples.length,
      targetDistance,
      elapsed: this.elapsed,
      speed: this.rover.currentSpeed,
      state: this.state,
      boosted: this.boostFlash,
    });
    this.boostFlash = false;
  }

  private getDemoActions(): GameActions {
    const target = this.samples[this.collected];
    if (!target) return { throttle: 0, steer: 0, boost: false, reset: false };
    const delta = target.position.subtract(this.rover.position);
    const desiredAngle = Math.atan2(delta.x, delta.z);
    const currentAngle = this.rover.root.rotation.y;
    const difference = Math.atan2(Math.sin(desiredAngle - currentAngle), Math.cos(desiredAngle - currentAngle));
    return {
      throttle: Math.abs(difference) > 0.85 ? 0.22 : 1,
      steer: Math.abs(difference) < 0.055 ? 0 : Math.sign(difference),
      boost: false,
      reset: false,
    };
  }

  private updateObjectiveMarker() {
    const target = this.samples[this.collected];
    if (!target) {
      this.targetRing.setEnabled(false);
      this.targetLight.setEnabled(false);
      return;
    }
    this.targetRing.setEnabled(true);
    this.targetLight.setEnabled(true);
    this.targetRing.position = target.position.clone();
    this.targetRing.position.y = terrainHeight(target.position.x, target.position.z) + 0.08;
    this.targetLight.position = this.targetRing.position.add(new Vector3(0, 2.8, 0));
  }

  private createSamples() {
    const sampleMaterial = new StandardMaterial("sample-material", this.scene);
    sampleMaterial.diffuseColor = Color3.FromHexString("#54CCD0");
    sampleMaterial.emissiveColor = Color3.FromHexString("#25787E");
    const capMaterial = new StandardMaterial("sample-cap-material", this.scene);
    capMaterial.diffuseColor = Color3.FromHexString("#E8E3D4");

    SAMPLE_POSITIONS.forEach((position, index) => {
      position.y = terrainHeight(position.x, position.z);
      const root = new TransformNode(`sample-${index}`, this.scene);
      root.position = position.clone();
      root.position.y += 0.7;

      const core = MeshBuilder.CreateCylinder(`sample-core-${index}`, { height: 0.88, diameter: 0.46, tessellation: 8 }, this.scene);
      core.parent = root;
      core.material = sampleMaterial;
      const cap = MeshBuilder.CreateSphere(`sample-cap-${index}`, { diameter: 0.48, segments: 8 }, this.scene);
      cap.parent = root;
      cap.position.y = 0.47;
      cap.material = capMaterial;
      const halo = MeshBuilder.CreateTorus(`sample-halo-${index}`, { diameter: 1.35, thickness: 0.04, tessellation: 24 }, this.scene);
      halo.parent = root;
      halo.rotation.x = Math.PI / 2;
      halo.position.y = -0.42;
      halo.material = sampleMaterial;
      this.samples.push({ root, position: position.clone(), collected: false, bobOffset: index * 0.73 });
    });
  }

  private createDecorations() {
    const rockMaterial = new StandardMaterial("moon-rock", this.scene);
    rockMaterial.diffuseColor = Color3.FromHexString("#5E6268");
    rockMaterial.specularColor = Color3.FromHexString("#111317");
    const rocks = [
      [-39, 11, 1.9], [-34, 28, 1.2], [-17, -17, 2.5], [-4, 31, 1.45], [8, 19, 2.1], [14, -26, 1.7], [28, 6, 2.4], [45, 30, 1.5], [49, -7, 2.1], [4, -44, 2.7], [-43, -34, 2.2],
    ];
    rocks.forEach(([x, z, size], index) => {
      const rock = MeshBuilder.CreateIcoSphere(`moon-rock-${index}`, { radius: size, subdivisions: 1 }, this.scene);
      rock.scaling.y = 0.52;
      rock.position = new Vector3(x, terrainHeight(x, z) + size * 0.28, z);
      rock.rotation = new Vector3(index * 0.17, index * 1.39, index * 0.09);
      rock.material = rockMaterial;
    });

    const beaconMaterial = new StandardMaterial("distant-beacon", this.scene);
    beaconMaterial.diffuseColor = Color3.FromHexString("#F3A533");
    beaconMaterial.emissiveColor = Color3.FromHexString("#A85F11");
    const beacon = MeshBuilder.CreateCylinder("survey-beacon", { height: 5.5, diameterTop: 0.12, diameterBottom: 0.48, tessellation: 6 }, this.scene);
    beacon.position = new Vector3(54, terrainHeight(54, 47) + 2.75, 47);
    beacon.material = beaconMaterial;
  }
}

