/** Babylon ownership for the tycoon scene: terrain, mission props, rover and base modules. */
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import "@babylonjs/loaders/glTF";
import type { Scene } from "@babylonjs/core/scene";
import type { BaseBuilding, BuildingKind, TycoonState } from "./TycoonState";
import { createLunarTerrain, terrainHeight } from "./terrain";
import { MISSION_MAPS } from "./MissionMap";
import { ASSET_URLS } from "./assets";

export const BUILD_NODES = [
  { id: "n-01", label: "A1", x: -13, z: 8 }, { id: "n-02", label: "A2", x: -4, z: 8 }, { id: "n-03", label: "A3", x: 5, z: 8 }, { id: "n-04", label: "A4", x: 14, z: 8 },
  { id: "n-05", label: "B1", x: -13, z: -1 }, { id: "n-06", label: "B2", x: -4, z: -1 }, { id: "n-07", label: "B3", x: 5, z: -1 }, { id: "n-08", label: "B4", x: 14, z: -1 },
  { id: "n-09", label: "C1", x: -13, z: -10 }, { id: "n-10", label: "C2", x: -4, z: -10 }, { id: "n-11", label: "C3", x: 5, z: -10 }, { id: "n-12", label: "C4", x: 14, z: -10 },
];

function mapForSector(id: TycoonState["sector"]) {
  return MISSION_MAPS.find((map) => map.id === id) ?? MISSION_MAPS[0];
}

export class BaseWorld {
  private readonly roots = new Map<string, AbstractMesh[]>();
  private readonly nodeMeshes: AbstractMesh[] = [];
  private readonly surfaceMeshes: AbstractMesh[] = [];
  private readonly pulseMeshes: AbstractMesh[] = [];
  private readonly rotorMeshes: AbstractMesh[] = [];
  private readonly materials: Record<string, StandardMaterial>;
  private readonly roverLights: PointLight[] = [];
  private readonly glbRoverMeshes: AbstractMesh[] = [];
  private elapsed = 0;
  private roverRoot: TransformNode | null = null;
  private glbRoverRoot: TransformNode | null = null;
  private roverDish: AbstractMesh | null = null;
  private disposed = false;
  private roverOrigin = new Vector3(-23, 0, -15);
  private roverOnExpedition = false;
  private activeMap: typeof MISSION_MAPS[number];
  private terrain: AbstractMesh | null = null;

  constructor(private readonly scene: Scene, private state: TycoonState) {
    this.activeMap = mapForSector(state.sector);
    this.terrain = createLunarTerrain(scene, this.activeMap);
    this.materials = this.createMaterials();
    this.createBuildNodes();
    this.createSurfaceDetails();
    this.createLandingRover();
    void this.loadGeneratedRover();
    this.sync(state);
  }

  sync(state: TycoonState) {
    if (this.activeMap.id !== state.sector) {
      this.clearSurfaceDetails();
      this.terrain?.dispose();
      this.activeMap = mapForSector(state.sector);
      this.terrain = createLunarTerrain(this.scene, this.activeMap);
      this.createSurfaceDetails();
      this.nodeMeshes.forEach((mesh) => {
        const node = BUILD_NODES.find((candidate) => `build-node-${candidate.id}` === mesh.name);
        if (node) mesh.position.y = terrainHeight(this.activeMap, node.x, node.z) + 0.11;
      });
      this.roverOrigin = new Vector3(-23, terrainHeight(this.activeMap, -23, -15) + 0.82, -15);
      if (this.roverRoot) this.roverRoot.position.copyFrom(this.roverOrigin);
      if (this.glbRoverRoot) this.glbRoverRoot.position.copyFrom(this.roverOrigin);
    }
    this.state = state;
    this.roots.forEach((meshes) => meshes.forEach((mesh) => mesh.dispose()));
    this.roots.clear();
    this.rotorMeshes.length = 0;
    this.roverOnExpedition = state.expeditions.some((expedition) => expedition.state === "active");
    state.buildings.forEach((building) => this.createBuilding(building));
    this.nodeMeshes.forEach((node) => {
      const nodeId = node.name.replace("build-node-", "");
      node.isVisible = !state.buildings.some((building) => building.nodeId === nodeId);
    });
  }

  update(delta: number) {
    this.elapsed += delta;
    this.nodeMeshes.forEach((node, index) => { node.rotation.y += delta * (index % 2 ? 0.18 : -0.18); });
    this.pulseMeshes.forEach((mesh, index) => {
      const pulse = 0.92 + Math.sin(this.elapsed * 2.3 + index * 0.7) * 0.1;
      mesh.scaling.x = pulse;
      mesh.scaling.z = pulse;
    });
    this.rotorMeshes.forEach((mesh, index) => { mesh.rotation.y += delta * (index % 2 ? -1.3 : 0.9); });
    if (this.roverRoot || this.glbRoverRoot) {
      const offset = this.roverOnExpedition ? new Vector3(Math.sin(this.elapsed * 1.1) * 10, 0, Math.cos(this.elapsed * 1.1) * 6) : Vector3.Zero();
      [this.roverRoot, this.glbRoverRoot].forEach((root) => {
        if (!root) return;
        root.position.x = this.roverOrigin.x + offset.x;
        root.position.z = this.roverOrigin.z + offset.z;
        root.position.y = terrainHeight(this.activeMap, root.position.x, root.position.z) + 0.82;
        root.rotation.y = 0.24 + Math.sin(this.elapsed * 0.42) * 0.04;
      });
    }
    if (this.roverDish) this.roverDish.rotation.y = Math.sin(this.elapsed * 0.55) * 0.22;
  }

  dispose() {
    this.disposed = true;
    this.roots.forEach((meshes) => meshes.forEach((mesh) => mesh.dispose()));
    this.nodeMeshes.forEach((node) => node.dispose());
    this.clearSurfaceDetails();
    this.terrain?.dispose();
    this.roverLights.forEach((light) => light.dispose());
    this.roverRoot?.dispose();
    this.glbRoverMeshes.forEach((mesh) => mesh.dispose());
    this.glbRoverRoot?.dispose();
  }

  private async loadGeneratedRover() {
    try {
      const result = await SceneLoader.ImportMeshAsync("", ASSET_URLS.roverModel, "", this.scene);
      if (this.disposed) {
        result.meshes.forEach((mesh) => mesh.dispose());
        return;
      }
      if (result.meshes.length < 4) {
        console.warn("Generated rover GLB has insufficient part separation; keeping the procedural rover visible.");
        result.meshes.forEach((mesh) => mesh.dispose());
        return;
      }
      const root = new TransformNode("generated-rover-root", this.scene);
      result.meshes.forEach((mesh) => {
        this.glbRoverMeshes.push(mesh);
        if (!mesh.parent) mesh.parent = root;
      });
      root.scaling = new Vector3(0.62, 0.62, 0.62);
      root.position.copyFrom(this.roverOrigin);
      root.rotation.y = 0.24;
      this.glbRoverRoot = root;
      this.roverRoot?.setEnabled(false);
    } catch (error) {
      console.warn("Generated rover GLB unavailable; using procedural fallback.", error);
    }
  }

  private createMaterials() {
    const make = (name: string, hex: string, emissive?: string) => {
      const material = new StandardMaterial(name, this.scene);
      material.diffuseColor = Color3.FromHexString(hex);
      material.emissiveColor = Color3.FromHexString(emissive ?? "#000000");
      material.specularColor = Color3.FromHexString("#20262B");
      return material;
    };
    return {
      ivory: make("base-ivory", "#CFC9B9"), white: make("base-white", "#E7E0CF"), gunmetal: make("base-gunmetal", "#202A32"), dark: make("base-dark", "#0F151B"),
      solar: make("base-solar", "#15344D", "#10263A"), solarGrid: make("base-solar-grid", "#4F8390", "#1C4652"), amber: make("base-amber", "#E8A332", "#7D4810"), cyan: make("base-cyan", "#4ABDC0", "#174A52"),
      node: make("base-node", "#4ABDC0", "#123C45"), rock: make("surface-rock", "#5F5B58"), rockLight: make("surface-rock-highlight", "#817A70"), rim: make("crater-rim", "#746F68"), crater: make("deep-crater-rim", "#B8782A", "#4B2A0E"), glass: make("rover-glass", "#233F4D", "#102C38"),
    };
  }

  private createBuildNodes() {
    BUILD_NODES.forEach((node, index) => {
      const mesh = MeshBuilder.CreateTorus(`build-node-${node.id}`, { diameter: 3.7, thickness: 0.09, tessellation: 32 }, this.scene);
      mesh.rotation.x = Math.PI / 2;
      mesh.position = new Vector3(node.x, terrainHeight(this.activeMap, node.x, node.z) + 0.11, node.z);
      mesh.material = index % 3 === 0 ? this.materials.amber : this.materials.node;
      this.nodeMeshes.push(mesh);
    });
  }

  private createSurfaceDetails() {
    this.activeMap.rocks.forEach(([x, z, size], index) => {
      const rock = MeshBuilder.CreateIcoSphere(`surface-rock-${index}`, { radius: size, subdivisions: 1 }, this.scene);
      rock.position = new Vector3(x, terrainHeight(this.activeMap, x, z) + size * 0.48, z);
      rock.scaling = new Vector3(1.18, 0.68 + (index % 3) * 0.08, 0.94);
      rock.rotation = new Vector3(index * 0.42, index * 0.71, index * 0.18);
      rock.material = index % 3 === 0 ? this.materials.rockLight : this.materials.rock;
      this.surfaceMeshes.push(rock);

      const shard = MeshBuilder.CreateIcoSphere(`surface-shard-${index}`, { radius: size * 0.35, subdivisions: 1 }, this.scene);
      shard.position = rock.position.add(new Vector3(size * 0.7, size * 0.22, -size * 0.35));
      shard.scaling = new Vector3(1.4, 0.55, 0.75);
      shard.material = this.materials.rockLight;
      this.surfaceMeshes.push(shard);
    });

    this.activeMap.craters.forEach((crater, index) => {
      const rim = MeshBuilder.CreateTorus(`crater-rim-${index}`, { diameter: crater.radius * 1.98, thickness: crater.deep ? 0.16 : 0.1, tessellation: 48 }, this.scene);
      rim.rotation.x = Math.PI / 2;
      rim.position = new Vector3(crater.x, terrainHeight(this.activeMap, crater.x, crater.z) + crater.depth * 0.22 + 0.08, crater.z);
      rim.material = crater.deep ? this.materials.crater : this.materials.rim;
      this.surfaceMeshes.push(rim);
      if (crater.deep) {
        const inner = MeshBuilder.CreateTorus(`crater-inner-rim-${index}`, { diameter: crater.radius * 1.44, thickness: 0.065, tessellation: 40 }, this.scene);
        inner.rotation.x = Math.PI / 2;
        inner.position = rim.position.add(new Vector3(0, -0.06, 0));
        inner.material = this.materials.gunmetal;
        this.surfaceMeshes.push(inner);
      }
    });

    this.activeMap.samples.forEach((sample, index) => {
      const y = terrainHeight(this.activeMap, sample.x, sample.z);
      const mast = MeshBuilder.CreateCylinder(`sample-mast-${index}`, { height: 1.1, diameter: 0.055, tessellation: 8 }, this.scene);
      mast.position = new Vector3(sample.x, y + 0.55, sample.z);
      mast.material = this.materials.cyan;
      this.surfaceMeshes.push(mast);
      const cap = MeshBuilder.CreateSphere(`sample-cap-${index}`, { diameter: 0.34, segments: 10 }, this.scene);
      cap.position = new Vector3(sample.x, y + 1.16, sample.z);
      cap.material = this.materials.amber;
      this.surfaceMeshes.push(cap);
      this.pulseMeshes.push(cap);
      const ring = MeshBuilder.CreateTorus(`sample-ring-${index}`, { diameter: 1.3, thickness: 0.045, tessellation: 28 }, this.scene);
      ring.rotation.x = Math.PI / 2;
      ring.position = new Vector3(sample.x, y + 0.08, sample.z);
      ring.material = this.materials.cyan;
      this.surfaceMeshes.push(ring);
      this.pulseMeshes.push(ring);
    });

    const beaconY = terrainHeight(this.activeMap, this.activeMap.beacon.x, this.activeMap.beacon.z);
    const beacon = MeshBuilder.CreateCylinder("mission-beacon", { height: 3.8, diameterTop: 0.12, diameterBottom: 0.35, tessellation: 8 }, this.scene);
    beacon.position = new Vector3(this.activeMap.beacon.x, beaconY + 1.9, this.activeMap.beacon.z);
    beacon.material = this.materials.gunmetal;
    this.surfaceMeshes.push(beacon);
    const beaconLamp = MeshBuilder.CreateSphere("mission-beacon-lamp", { diameter: 0.42, segments: 10 }, this.scene);
    beaconLamp.position = new Vector3(this.activeMap.beacon.x, beaconY + 3.9, this.activeMap.beacon.z);
    beaconLamp.material = this.materials.amber;
    this.surfaceMeshes.push(beaconLamp);
    this.pulseMeshes.push(beaconLamp);
  }

  private clearSurfaceDetails() {
    this.surfaceMeshes.forEach((mesh) => mesh.dispose());
    this.surfaceMeshes.length = 0;
    this.pulseMeshes.length = 0;
  }

  private createLandingRover() {
    this.roverRoot = new TransformNode("base-rover-root", this.scene);
    this.roverOrigin = new Vector3(-23, terrainHeight(this.activeMap, -23, -15) + 0.82, -15);
    this.roverRoot.position.copyFrom(this.roverOrigin);

    const chassisMaterial = this.materials.ivory;
    const panelMaterial = this.materials.gunmetal;
    const wheelMaterial = this.materials.dark;
    const hubMaterial = this.materials.amber;

    const add = (mesh: AbstractMesh, position: Vector3, material: StandardMaterial, scale?: Vector3) => {
      mesh.parent = this.roverRoot;
      mesh.position = position;
      mesh.material = material;
      if (scale) mesh.scaling = scale;
      return mesh;
    };

    add(MeshBuilder.CreateBox("base-rover-chassis", { width: 2.9, height: 0.38, depth: 3.5 }, this.scene), new Vector3(0, 0.65, 0), chassisMaterial);
    add(MeshBuilder.CreateBox("base-rover-underbody", { width: 2.25, height: 0.26, depth: 2.8 }, this.scene), new Vector3(0, 0.4, 0), panelMaterial);
    add(MeshBuilder.CreateBox("base-rover-cabin", { width: 2.12, height: 0.78, depth: 1.55 }, this.scene), new Vector3(0, 1.12, -0.38), panelMaterial);
    add(MeshBuilder.CreateBox("base-rover-cabin-window", { width: 1.55, height: 0.28, depth: 0.06 }, this.scene), new Vector3(0, 1.31, 0.41), this.materials.glass);
    add(MeshBuilder.CreateBox("base-rover-solar-deck", { width: 1.7, height: 0.08, depth: 1.72 }, this.scene), new Vector3(0, 1.56, -0.34), this.materials.solar);

    [-1.35, 1.35].forEach((x) => [-1.22, 0, 1.22].forEach((z, index) => {
      const wheel = add(MeshBuilder.CreateCylinder(`base-rover-wheel-${x}-${z}`, { diameter: 0.84, height: 0.34, tessellation: 16 }, this.scene), new Vector3(x, 0.3, z), wheelMaterial);
      wheel.rotation.z = Math.PI / 2;
      const hub = add(MeshBuilder.CreateCylinder(`base-rover-hub-${x}-${z}`, { diameter: 0.34, height: 0.37, tessellation: 12 }, this.scene), new Vector3(x, 0.3, z), hubMaterial);
      hub.rotation.z = Math.PI / 2;
      if (index === 1) hub.scaling = new Vector3(1.08, 1, 1.08);
    }));

    const mast = add(MeshBuilder.CreateCylinder("base-rover-mast", { height: 1.55, diameter: 0.075, tessellation: 8 }, this.scene), new Vector3(-0.63, 2.28, -0.26), chassisMaterial);
    mast.rotation.z = -0.08;
    this.roverDish = add(MeshBuilder.CreateDisc("base-rover-dish", { radius: 0.3, tessellation: 20 }, this.scene), new Vector3(-0.63, 3.04, -0.26), this.materials.white);
    this.roverDish.rotation.x = Math.PI / 2.65;
    add(MeshBuilder.CreateCylinder("base-rover-sensor-boom", { height: 1.1, diameter: 0.08, tessellation: 8 }, this.scene), new Vector3(0.82, 2.02, 0.52), chassisMaterial).rotation.z = Math.PI / 2;
    add(MeshBuilder.CreateSphere("base-rover-front-sensor", { diameter: 0.38, segments: 10 }, this.scene), new Vector3(1.37, 1.62, 0.52), this.materials.amber);

    const decal = new Texture(ASSET_URLS.instrumentDecal, this.scene, true, false);
    decal.onLoadObservable.addOnce(() => { this.materials.glass.diffuseTexture = decal; });
    const lamp = new PointLight("base-rover-lamp", new Vector3(0, 1.45, 1.75), this.scene);
    lamp.parent = this.roverRoot;
    lamp.diffuse = Color3.FromHexString("#F3A533");
    lamp.intensity = 2.1;
    lamp.range = 7;
    this.roverLights.push(lamp);
  }

  private createBuilding(building: BaseBuilding) {
    const node = BUILD_NODES.find((candidate) => candidate.id === building.nodeId);
    if (!node) return;
    const at = new Vector3(node.x, terrainHeight(this.activeMap, node.x, node.z), node.z);
    const meshes = this.buildMeshes(building.kind, building.id, at, building.level);
    if (building.integrity < 80) meshes.forEach((mesh) => mesh.material = this.materials.gunmetal);
    this.roots.set(building.id, meshes);
  }

  private buildMeshes(kind: BuildingKind, id: string, at: Vector3, level: number) {
    const meshes: AbstractMesh[] = [];
    const add = (mesh: AbstractMesh, material: StandardMaterial, offset = Vector3.Zero()) => {
      mesh.position = at.add(offset);
      mesh.material = material;
      meshes.push(mesh);
      return mesh;
    };
    const pad = MeshBuilder.CreateCylinder(`${id}-landing-pad`, { diameter: 5.6, height: 0.12, tessellation: 32 }, this.scene);
    add(pad, this.materials.dark, new Vector3(0, 0.06, 0));

    if (kind === "solar") {
      for (let index = 0; index < 4; index += 1) {
        const panel = MeshBuilder.CreateBox(`${id}-panel-${index}`, { width: 1.65, height: 0.09, depth: 2.15 }, this.scene);
        panel.rotation.z = -0.27;
        add(panel, this.materials.solar, new Vector3(-2.55 + index * 1.7, 1.02, 0));
        const grid = MeshBuilder.CreateBox(`${id}-grid-${index}`, { width: 1.5, height: 0.025, depth: 0.05 }, this.scene);
        grid.rotation.z = -0.27;
        add(grid, this.materials.solarGrid, new Vector3(-2.55 + index * 1.7, 1.09, 0));
      }
      const spine = MeshBuilder.CreateCylinder(`${id}-spine`, { height: 6.7, diameter: 0.16, tessellation: 10 }, this.scene);
      spine.rotation.z = Math.PI / 2;
      add(spine, this.materials.gunmetal, new Vector3(0, 0.68, 0));
      const junction = MeshBuilder.CreateBox(`${id}-junction`, { width: 0.7, height: 0.5, depth: 0.65 }, this.scene);
      add(junction, this.materials.amber, new Vector3(0, 0.42, -1.45));
    } else if (kind === "habitat") {
      const capsule = MeshBuilder.CreateCylinder(`${id}-capsule`, { diameter: 3.3, height: 4.8, tessellation: 18 }, this.scene);
      capsule.rotation.z = Math.PI / 2;
      add(capsule, this.materials.ivory, new Vector3(0, 1.7, 0));
      const airlock = MeshBuilder.CreateCylinder(`${id}-airlock`, { diameter: 1.15, height: 1.4, tessellation: 12 }, this.scene);
      airlock.rotation.z = Math.PI / 2;
      add(airlock, this.materials.gunmetal, new Vector3(2.8, 1.28, 0));
      const lamp = MeshBuilder.CreateSphere(`${id}-lamp`, { diameter: 0.34, segments: 8 }, this.scene);
      add(lamp, this.materials.cyan, new Vector3(2.75, 1.32, -0.52));
      [-1, 0, 1].forEach((index) => {
        const porthole = MeshBuilder.CreateCylinder(`${id}-porthole-${index}`, { diameter: 0.38, height: 0.04, tessellation: 16 }, this.scene);
        porthole.rotation.x = Math.PI / 2;
        add(porthole, this.materials.cyan, new Vector3(index * 1.12, 2.05, -1.66));
      });
    } else if (kind === "laboratory") {
      const lab = MeshBuilder.CreateBox(`${id}-lab`, { width: 5.4, height: 2.05, depth: 3.2 }, this.scene);
      add(lab, this.materials.ivory, new Vector3(0, 1.15, 0));
      const roof = MeshBuilder.CreateCylinder(`${id}-roof`, { diameterTop: 3.55, diameterBottom: 5.65, height: 0.3, tessellation: 4 }, this.scene);
      roof.rotation.y = Math.PI / 4;
      add(roof, this.materials.gunmetal, new Vector3(0, 2.35, 0));
      for (let index = 0; index < 3; index += 1) {
        const window = MeshBuilder.CreateBox(`${id}-window-${index}`, { width: 0.85, height: 0.56, depth: 0.06 }, this.scene);
        add(window, this.materials.cyan, new Vector3(-1.35 + index * 1.35, 1.3, -1.64));
      }
      const vent = MeshBuilder.CreateCylinder(`${id}-vent`, { height: 1.05, diameter: 0.22, tessellation: 10 }, this.scene);
      add(vent, this.materials.amber, new Vector3(1.8, 2.73, 0.7));
      this.rotorMeshes.push(vent);
    } else if (kind === "extractor") {
      const base = MeshBuilder.CreateCylinder(`${id}-base`, { diameter: 3.1, height: 0.62, tessellation: 10 }, this.scene);
      add(base, this.materials.gunmetal, new Vector3(0, 0.36, 0));
      const mast = MeshBuilder.CreateCylinder(`${id}-mast`, { diameter: 0.38, height: 3.2, tessellation: 8 }, this.scene);
      add(mast, this.materials.amber, new Vector3(0, 1.9, 0));
      this.rotorMeshes.push(mast);
      const hopper = MeshBuilder.CreateBox(`${id}-hopper`, { width: 1.75, height: 1.15, depth: 1.3 }, this.scene);
      add(hopper, this.materials.ivory, new Vector3(1.55, 0.92, 0));
      const auger = MeshBuilder.CreateCylinder(`${id}-auger`, { height: 1.4, diameter: 0.28, tessellation: 10 }, this.scene);
      auger.rotation.z = Math.PI / 2;
      add(auger, this.materials.cyan, new Vector3(0, 0.92, 1.12));
      this.rotorMeshes.push(auger);
    } else {
      const tower = MeshBuilder.CreateCylinder(`${id}-tower`, { diameterTop: 0.14, diameterBottom: 0.38, height: 5.8, tessellation: 6 }, this.scene);
      add(tower, this.materials.gunmetal, new Vector3(0, 3, 0));
      const dish = MeshBuilder.CreateSphere(`${id}-dish`, { diameter: 1.25, segments: 12 }, this.scene);
      dish.scaling.y = 0.24;
      add(dish, this.materials.cyan, new Vector3(0, 5.9, 0));
      this.rotorMeshes.push(dish);
      [-1, 1].forEach((x) => {
        const brace = MeshBuilder.CreateCylinder(`${id}-brace-${x}`, { height: 2.1, diameter: 0.055, tessellation: 6 }, this.scene);
        brace.rotation.z = x * 0.44;
        add(brace, this.materials.gunmetal, new Vector3(x * 0.62, 1.08, 0));
      });
    }
    if (level > 1) {
      const upgrade = MeshBuilder.CreateTorus(`${id}-upgrade`, { diameter: 3.9, thickness: 0.08, tessellation: 24 }, this.scene);
      upgrade.rotation.x = Math.PI / 2;
      add(upgrade, this.materials.amber, new Vector3(0, 0.16, 0));
    }
    return meshes;
  }
}
