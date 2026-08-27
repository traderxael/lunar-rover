/** Babylon ownership for the tycoon scene: terrain, build nodes and base modules. */
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import type { Scene } from "@babylonjs/core/scene";
import type { BaseBuilding, BuildingKind, TycoonState } from "./TycoonState";
import { createLunarTerrain, terrainHeight } from "./terrain";
import { MISSION_MAPS } from "./MissionMap";

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
  private readonly materials: Record<string, StandardMaterial>;
  private elapsed = 0;
  private roverParts: AbstractMesh[] = [];
  private roverOrigin = new Vector3(-23, 0, -15);
  private roverOnExpedition = false;
  private activeMap: typeof MISSION_MAPS[number];
  private terrain: AbstractMesh | null = null;

  constructor(private readonly scene: Scene, private state: TycoonState) {
    this.activeMap = mapForSector(state.sector);
    this.terrain = createLunarTerrain(scene, this.activeMap);
    this.materials = this.createMaterials();
    this.createBuildNodes();
    this.createLandingRover();
    this.sync(state);
  }

  sync(state: TycoonState) {
    if (this.activeMap.id !== state.sector) {
      this.terrain?.dispose();
      this.activeMap = mapForSector(state.sector);
      this.terrain = createLunarTerrain(this.scene, this.activeMap);
      this.nodeMeshes.forEach((mesh) => {
        const node = BUILD_NODES.find((candidate) => `build-node-${candidate.id}` === mesh.name);
        if (node) mesh.position.y = terrainHeight(this.activeMap, node.x, node.z) + 0.11;
      });
      this.roverOrigin.y = terrainHeight(this.activeMap, this.roverOrigin.x, this.roverOrigin.z) + 0.75;
    }
    this.state = state;
    this.roots.forEach((meshes) => meshes.forEach((mesh) => mesh.dispose()));
    this.roots.clear();
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
    if (this.roverParts.length) {
      const offset = this.roverOnExpedition ? new Vector3(Math.sin(this.elapsed * 1.1) * 10, 0, Math.cos(this.elapsed * 1.1) * 6) : Vector3.Zero();
      this.roverParts.forEach((part) => { part.position.x = this.roverOrigin.x + offset.x; part.position.z = this.roverOrigin.z + offset.z; });
    }
  }

  dispose() {
    this.roots.forEach((meshes) => meshes.forEach((mesh) => mesh.dispose()));
    this.nodeMeshes.forEach((node) => node.dispose());
    this.terrain?.dispose();
  }

  private createMaterials() {
    const make = (name: string, hex: string, emissive?: string) => {
      const material = new StandardMaterial(name, this.scene);
      material.diffuseColor = Color3.FromHexString(hex);
      material.emissiveColor = Color3.FromHexString(emissive ?? "#000000");
      material.specularColor = Color3.FromHexString("#171B20");
      return material;
    };
    return {
      ivory: make("base-ivory", "#CFC9B9"), gunmetal: make("base-gunmetal", "#202A32"), solar: make("base-solar", "#15344D", "#10263A"),
      amber: make("base-amber", "#E8A332", "#7D4810"), cyan: make("base-cyan", "#4ABDC0", "#174A52"), node: make("base-node", "#4ABDC0", "#123C45"),
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

  private createLandingRover() {
    const roverBody = MeshBuilder.CreateBox("base-rover", { width: 2.4, height: 0.65, depth: 1.55 }, this.scene);
    this.roverOrigin = new Vector3(-23, terrainHeight(this.activeMap, -23, -15) + 0.75, -15);
    roverBody.position = this.roverOrigin.clone();
    roverBody.material = this.materials.gunmetal;
    const antenna = MeshBuilder.CreateCylinder("base-rover-antenna", { height: 1.45, diameter: 0.06, tessellation: 6 }, this.scene);
    antenna.position = roverBody.position.add(new Vector3(0, 0.92, 0));
    antenna.material = this.materials.cyan;
    this.roverParts = [roverBody, antenna];
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
    if (kind === "solar") {
      for (let index = 0; index < 4; index += 1) {
        const panel = MeshBuilder.CreateBox(`${id}-panel-${index}`, { width: 1.65, height: 0.08, depth: 2.15 }, this.scene);
        panel.rotation.z = -0.27;
        add(panel, this.materials.solar, new Vector3(-2.55 + index * 1.7, 0.82, 0));
      }
      const junction = MeshBuilder.CreateBox(`${id}-junction`, { width: 0.7, height: 0.5, depth: 0.65 }, this.scene);
      add(junction, this.materials.amber, new Vector3(0, 0.28, -1.45));
    } else if (kind === "habitat") {
      const capsule = MeshBuilder.CreateCylinder(`${id}-capsule`, { diameter: 3.3, height: 4.8, tessellation: 18 }, this.scene);
      capsule.rotation.z = Math.PI / 2;
      add(capsule, this.materials.ivory, new Vector3(0, 1.7, 0));
      const airlock = MeshBuilder.CreateCylinder(`${id}-airlock`, { diameter: 1.15, height: 1.4, tessellation: 12 }, this.scene);
      airlock.rotation.z = Math.PI / 2;
      add(airlock, this.materials.gunmetal, new Vector3(2.8, 1.28, 0));
      const lamp = MeshBuilder.CreateSphere(`${id}-lamp`, { diameter: 0.34, segments: 8 }, this.scene);
      add(lamp, this.materials.cyan, new Vector3(2.75, 1.32, -0.52));
    } else if (kind === "laboratory") {
      const lab = MeshBuilder.CreateBox(`${id}-lab`, { width: 5.4, height: 2.05, depth: 3.2 }, this.scene);
      add(lab, this.materials.ivory, new Vector3(0, 1.15, 0));
      for (let index = 0; index < 3; index += 1) {
        const window = MeshBuilder.CreateBox(`${id}-window-${index}`, { width: 0.85, height: 0.56, depth: 0.06 }, this.scene);
        add(window, this.materials.cyan, new Vector3(-1.35 + index * 1.35, 1.3, -1.64));
      }
    } else if (kind === "extractor") {
      const base = MeshBuilder.CreateCylinder(`${id}-base`, { diameter: 3.1, height: 0.62, tessellation: 10 }, this.scene);
      add(base, this.materials.gunmetal, new Vector3(0, 0.36, 0));
      const mast = MeshBuilder.CreateCylinder(`${id}-mast`, { diameter: 0.38, height: 3.2, tessellation: 8 }, this.scene);
      add(mast, this.materials.amber, new Vector3(0, 1.9, 0));
      const hopper = MeshBuilder.CreateBox(`${id}-hopper`, { width: 1.75, height: 1.15, depth: 1.3 }, this.scene);
      add(hopper, this.materials.ivory, new Vector3(1.55, 0.92, 0));
    } else {
      const tower = MeshBuilder.CreateCylinder(`${id}-tower`, { diameterTop: 0.14, diameterBottom: 0.38, height: 5.8, tessellation: 6 }, this.scene);
      add(tower, this.materials.gunmetal, new Vector3(0, 3, 0));
      const dish = MeshBuilder.CreateSphere(`${id}-dish`, { diameter: 1.25, segments: 12 }, this.scene);
      dish.scaling.y = 0.24;
      add(dish, this.materials.cyan, new Vector3(0, 5.9, 0));
    }
    if (level > 1) {
      const upgrade = MeshBuilder.CreateTorus(`${id}-upgrade`, { diameter: 3.9, thickness: 0.08, tessellation: 24 }, this.scene);
      upgrade.rotation.x = Math.PI / 2;
      add(upgrade, this.materials.amber, new Vector3(0, 0.13, 0));
    }
    return meshes;
  }
}
