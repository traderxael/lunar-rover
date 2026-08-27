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
import { DustStorm } from "./DustStorm";
import type { MissionMap } from "./MissionMap";
import { recordMission, recordOptionalProgress, type CompletionReport } from "./Progression";
import { deepCraterAt, terrainHeight } from "./terrain";

type Sample = { root: TransformNode; position: Vector3; collected: boolean; bobOffset: number };
type SecondaryMarker = { root: TransformNode; position: Vector3; collected: boolean; bobOffset: number };

export class GameWorld {
  private readonly rover: Rover;
  private readonly samples: Sample[] = [];
  private readonly secondaryMarkers: SecondaryMarker[] = [];
  private readonly targetRing: Mesh;
  private readonly targetLight: PointLight;
  private readonly dustStorm: DustStorm;
  private readonly hazardRings: Mesh[] = [];
  private energy = 100;
  private elapsed = 0;
  private collected = 0;
  private optionalCollected = 0;
  private state: MissionState;
  private readonly isDemo: boolean;
  private followTarget: Vector3;
  private boostFlash = false;
  private completion: CompletionReport | null = null;
  private optionalNewBest = false;

  constructor(private readonly scene: Scene, private readonly input: InputManager, private readonly hud: Hud, private readonly map: MissionMap) {
    this.isDemo = new URLSearchParams(window.location.search).has("demo");
    this.state = this.isDemo ? "active" : "briefing";
    this.rover = new Rover(scene, (x, z) => terrainHeight(this.map, x, z), map.start);
    this.followTarget = this.rover.position.clone();
    this.createSamples();
    this.createSecondaryMarkers();
    this.createDecorations();
    this.createCraterHazards();
    this.dustStorm = new DustStorm(scene, map.storm);

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
    this.optionalCollected = 0;
    this.optionalNewBest = false;
    this.completion = null;
    this.state = "active";
    this.rover.reset();
    this.samples.forEach((sample) => {
      sample.collected = false;
      sample.root.setEnabled(true);
    });
    this.secondaryMarkers.forEach((marker) => {
      marker.collected = false;
      marker.root.setEnabled(true);
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
    const crater = deepCraterAt(this.map, this.rover.position.x, this.rover.position.z);
    const craterHazard = Boolean(crater && isActive);
    if (crater && isActive) this.rover.repelFromCrater(crater.x, crater.z, crater.radius * 0.77);
    if (isActive) {
      this.elapsed += delta;
      const motionDrain = step.distance > 0.01 ? delta * (0.12 + this.map.storm.energyDrain) : 0;
      const craterDrain = craterHazard ? 3.1 * delta : 0;
      this.energy = Math.max(0, this.energy - step.usedEnergy - motionDrain - craterDrain);
      this.checkSamples();
      this.checkSecondaryObjective();
      if (this.energy <= 0) this.state = "depleted";
    }

    this.dustStorm.update(delta, this.elapsed);

    this.samples.forEach((sample) => {
      if (!sample.collected) {
        sample.root.rotation.y += delta * 0.85;
        sample.root.position.y = terrainHeight(this.map, sample.position.x, sample.position.z) + 0.7 + Math.sin(this.elapsed * 2.1 + sample.bobOffset) * 0.12;
      }
    });

    this.secondaryMarkers.forEach((marker) => {
      if (!marker.collected) {
        marker.root.rotation.y -= delta * 0.52;
        marker.root.position.y = terrainHeight(this.map, marker.position.x, marker.position.z) + 0.8 + Math.sin(this.elapsed * 1.7 + marker.bobOffset) * 0.1;
      }
    });

    const target = this.rover.position.clone();
    this.followTarget = Vector3.Lerp(this.followTarget, target, Math.min(delta * 7.5, 1));
    this.targetRing.rotation.z += delta * 0.32;
    this.refreshHud(craterHazard);
  }

  dispose() {
    this.rover.dispose();
    this.samples.forEach((sample) => sample.root.dispose());
    this.secondaryMarkers.forEach((marker) => marker.root.dispose());
    this.hazardRings.forEach((ring) => ring.dispose());
    this.dustStorm.dispose();
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
        this.completion = recordMission(this.map.id, this.map.name, this.elapsed, this.energy, this.optionalCollected, this.secondaryMarkers.length);
      } else {
        this.energy = Math.min(100, this.energy + 8);
        this.updateObjectiveMarker();
      }
    }
  }

  private checkSecondaryObjective() {
    const marker = this.secondaryMarkers.find((candidate) => !candidate.collected);
    if (!marker || Vector3.Distance(this.rover.position, marker.root.position) >= 2.9) return;
    marker.collected = true;
    marker.root.setEnabled(false);
    this.optionalCollected += 1;
    this.optionalNewBest = recordOptionalProgress(this.map.id, this.optionalCollected) || this.optionalNewBest;
  }

  private refreshHud(hazard = false) {
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
      mapName: this.map.name,
      mapIndex: this.map.index,
      stormLabel: this.map.storm.active ? `Polvo · ${this.map.storm.strength}` : "Visibilidad · plena",
      hazard,
      optionalCollected: this.optionalCollected,
      optionalTotal: this.secondaryMarkers.length,
      secondaryTitle: this.map.secondary.title,
      grade: this.completion?.grade,
      completionNote: this.getCompletionNote(),
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
    this.targetRing.position.y = terrainHeight(this.map, target.position.x, target.position.z) + 0.08;
    this.targetLight.position = this.targetRing.position.add(new Vector3(0, 2.8, 0));
  }

  private createSamples() {
    const sampleMaterial = new StandardMaterial("sample-material", this.scene);
    sampleMaterial.diffuseColor = Color3.FromHexString("#54CCD0");
    sampleMaterial.emissiveColor = Color3.FromHexString("#25787E");
    const capMaterial = new StandardMaterial("sample-cap-material", this.scene);
    capMaterial.diffuseColor = Color3.FromHexString("#E8E3D4");

    this.map.samples.forEach((position, index) => {
      position.y = terrainHeight(this.map, position.x, position.z);
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

  private createSecondaryMarkers() {
    const markerMaterial = new StandardMaterial("secondary-marker-material", this.scene);
    markerMaterial.diffuseColor = Color3.FromHexString("#D8B178");
    markerMaterial.emissiveColor = Color3.FromHexString("#7E5528");
    const bandMaterial = new StandardMaterial("secondary-marker-band", this.scene);
    bandMaterial.diffuseColor = Color3.FromHexString("#54CCD0");
    bandMaterial.emissiveColor = Color3.FromHexString("#286B73");
    this.map.secondary.positions.forEach((position, index) => {
      const anchored = position.clone();
      anchored.y = terrainHeight(this.map, anchored.x, anchored.z);
      const root = new TransformNode(`secondary-marker-${index}`, this.scene);
      root.position = anchored.add(new Vector3(0, 0.78, 0));
      const post = MeshBuilder.CreateCylinder(`secondary-post-${index}`, { height: 1.26, diameter: 0.26, tessellation: 6 }, this.scene);
      post.parent = root;
      post.material = markerMaterial;
      const band = MeshBuilder.CreateTorus(`secondary-band-${index}`, { diameter: 0.62, thickness: 0.065, tessellation: 20 }, this.scene);
      band.parent = root;
      band.rotation.x = Math.PI / 2;
      band.position.y = 0.52;
      band.material = bandMaterial;
      this.secondaryMarkers.push({ root, position: anchored, collected: false, bobOffset: index * 0.93 + 0.27 });
    });
  }

  private getCompletionNote() {
    if (!this.completion) return undefined;
    const labels = { tycho: "Fosa de Tycho", selenite: "Cuenca de Selenita", tranquility: "Mare Tranquillitatis" };
    const notes: string[] = [];
    if (this.completion.newUnlock) notes.push(`Nuevo sector desbloqueado: ${labels[this.completion.newUnlock]}.`);
    notes.push(`Puntuación de expedición: ${this.completion.score.toLocaleString("es-ES")} · puesto local #${this.completion.rank}.`);
    if (this.optionalCollected === this.secondaryMarkers.length) notes.push(`Desafío secundario completado: ${this.map.secondary.reward}.`);
    if (!notes.length && this.optionalNewBest) notes.push(`Nuevo avance opcional registrado: ${this.optionalCollected}/${this.secondaryMarkers.length}.`);
    if (!notes.length && this.completion.grade === "C") notes.push("El grado C registra la misión; para desbloquear el próximo sector consigue grado B.");
    if (!notes.length) notes.push(this.completion.isNewBest ? "Nuevo mejor desempeño registrado en la bitácora." : "El mejor desempeño previo se conserva en la bitácora.");
    return notes.join(" ");
  }

  private createDecorations() {
    const rockMaterial = new StandardMaterial("moon-rock", this.scene);
    rockMaterial.diffuseColor = Color3.FromHexString("#5E6268");
    rockMaterial.specularColor = Color3.FromHexString("#111317");
    this.map.rocks.forEach(([x, z, size], index) => {
      const rock = MeshBuilder.CreateIcoSphere(`moon-rock-${index}`, { radius: size, subdivisions: 1 }, this.scene);
      rock.scaling.y = 0.52;
      rock.position = new Vector3(x, terrainHeight(this.map, x, z) + size * 0.28, z);
      rock.rotation = new Vector3(index * 0.17, index * 1.39, index * 0.09);
      rock.material = rockMaterial;
    });

    const beaconMaterial = new StandardMaterial("distant-beacon", this.scene);
    beaconMaterial.diffuseColor = Color3.FromHexString("#F3A533");
    beaconMaterial.emissiveColor = Color3.FromHexString("#A85F11");
    const beacon = MeshBuilder.CreateCylinder("survey-beacon", { height: 5.5, diameterTop: 0.12, diameterBottom: 0.48, tessellation: 6 }, this.scene);
    beacon.position = this.map.beacon.clone();
    beacon.position.y = terrainHeight(this.map, beacon.position.x, beacon.position.z) + 2.75;
    beacon.material = beaconMaterial;
  }

  private createCraterHazards() {
    const hazardMaterial = new StandardMaterial("deep-crater-warning", this.scene);
    hazardMaterial.diffuseColor = Color3.FromHexString("#F3A533");
    hazardMaterial.emissiveColor = Color3.FromHexString("#5A300B");
    hazardMaterial.alpha = 0.78;
    const floorMaterial = new StandardMaterial("deep-crater-floor", this.scene);
    floorMaterial.diffuseColor = Color3.FromHexString("#29252A");
    floorMaterial.emissiveColor = Color3.FromHexString("#08090C");
    floorMaterial.alpha = 0.7;
    this.map.craters.filter((crater) => crater.deep).forEach((crater, index) => {
      const floor = MeshBuilder.CreateDisc(`deep-crater-floor-${index}`, { radius: crater.radius * 0.63, tessellation: 48 }, this.scene);
      floor.rotation.x = Math.PI / 2;
      floor.position = new Vector3(crater.x, terrainHeight(this.map, crater.x, crater.z) + 0.17, crater.z);
      floor.material = floorMaterial;
      this.hazardRings.push(floor);
      const ring = MeshBuilder.CreateTorus(`deep-crater-limit-${index}`, { diameter: crater.radius * 1.55, thickness: 0.11, tessellation: 48 }, this.scene);
      ring.rotation.x = Math.PI / 2;
      ring.position = new Vector3(crater.x, terrainHeight(this.map, crater.x, crater.z) + 0.15, crater.z);
      ring.material = hazardMaterial;
      this.hazardRings.push(ring);
    });
  }
}
