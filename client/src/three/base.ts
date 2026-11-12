import * as THREE from "three";
import { MISSION_MAPS, type MissionMap } from "@/game/MissionMap";
import type { BaseBuilding, BuildingKind, TycoonState } from "@/game/TycoonState";
import { ASSET_URLS } from "@/game/assets";
import { createLunarTerrain, createRegolithTexture, terrainHeight, type LunarTerrain } from "./terrain";

export const BUILD_NODES = [
  { id: "n-01", label: "A1", x: -13, z: 8 }, { id: "n-02", label: "A2", x: -4, z: 8 }, { id: "n-03", label: "A3", x: 5, z: 8 }, { id: "n-04", label: "A4", x: 14, z: 8 },
  { id: "n-05", label: "B1", x: -13, z: -1 }, { id: "n-06", label: "B2", x: -4, z: -1 }, { id: "n-07", label: "B3", x: 5, z: -1 }, { id: "n-08", label: "B4", x: 14, z: -1 },
  { id: "n-09", label: "C1", x: -13, z: -10 }, { id: "n-10", label: "C2", x: -4, z: -10 }, { id: "n-11", label: "C3", x: 5, z: -10 }, { id: "n-12", label: "C4", x: 14, z: -10 },
];

function mapForSector(id: TycoonState["sector"]): MissionMap {
  return MISSION_MAPS.find((map) => map.id === id) ?? MISSION_MAPS[0];
}

type MaterialKey = "ivory" | "white" | "gunmetal" | "dark" | "solar" | "solarGrid" | "amber" | "cyan" | "node" | "rock" | "rockLight" | "crater";

/**
 * Escena de la base: terreno del sector, nodos de montaje, módulos construidos,
 * rover de superficie y detalles de regolito. Se reconstruye desde
 * `TycoonState`; no guarda reglas de juego.
 */
export class BaseWorld {
  private readonly root = new THREE.Group();
  private readonly buildingRoots = new Map<string, THREE.Object3D[]>();
  private readonly nodeMeshes: THREE.Mesh[] = [];
  private readonly pulseMeshes: THREE.Mesh[] = [];
  private readonly rotorMeshes: THREE.Object3D[] = [];
  private readonly materials: Record<MaterialKey, THREE.MeshStandardMaterial>;
  private readonly roverLights: THREE.PointLight[] = [];
  private roverRoot: THREE.Group | null = null;
  private roverOrigin = new THREE.Vector3(-23, 0, -15);
  private roverDish: THREE.Object3D | null = null;
  private roverOnExpedition = false;
  private elapsed = 0;
  private activeMap: MissionMap;
  private terrain: LunarTerrain | null = null;
  private regolith: THREE.Texture | null = null;
  private state: TycoonState;

  constructor(private readonly scene: THREE.Scene, state: TycoonState) {
    this.state = state;
    this.activeMap = mapForSector(state.sector);
    this.materials = this.createMaterials();
    this.root.name = "base-world";
    scene.add(this.root);

    this.buildSector();
    this.createBuildNodes();
    this.createSurfaceDetails();
    this.createLandingRover();
    this.sync(state);
  }

  get object() {
    return this.root;
  }

  private buildSector() {
    this.terrain?.dispose();
    this.terrain?.mesh.removeFromParent();

    this.regolith?.dispose();
    this.regolith = createRegolithTexture(this.activeMap.terrainTexture === "deepCraterRegolith" ? ASSET_URLS.deepCraterRegolith : ASSET_URLS.regolith);

    this.terrain = createLunarTerrain(this.activeMap, this.regolith);
    this.root.add(this.terrain.mesh);
  }

  private createMaterials(): Record<MaterialKey, THREE.MeshStandardMaterial> {
    const make = (name: string, hex: string, emissive?: string, emissiveIntensity = 0.6) => {
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(hex),
        roughness: 0.72,
        metalness: 0.22,
      });
      if (emissive) {
        material.emissive = new THREE.Color(emissive);
        material.emissiveIntensity = emissiveIntensity;
      }
      material.name = name;
      return material;
    };

    return {
      ivory: make("base-ivory", "#CFC9B9"),
      white: make("base-white", "#E7E0CF"),
      gunmetal: make("base-gunmetal", "#202A32"),
      dark: make("base-dark", "#0F151B"),
      solar: make("base-solar", "#15344D", "#10263A", 0.35),
      solarGrid: make("base-solar-grid", "#4F8390", "#1C4652", 0.5),
      amber: make("base-amber", "#E8A332", "#7D4810"),
      cyan: make("base-cyan", "#4ABDC0", "#174A52"),
      node: make("base-node", "#4ABDC0", "#123C45"),
      rock: make("surface-rock", "#5F5B58"),
      rockLight: make("surface-rock-highlight", "#817A70"),
      crater: make("deep-crater-rim", "#B8782A", "#4B2A0E", 0.45),
    };
  }

  private createBuildNodes() {
    const geometry = new THREE.CylinderGeometry(2.4, 2.4, 0.22, 6);
    const ring = new THREE.TorusGeometry(2.55, 0.06, 8, 6);

    BUILD_NODES.forEach((node) => {
      const mesh = new THREE.Mesh(geometry, this.materials.node);
      mesh.name = `build-node-${node.id}`;
      mesh.position.set(node.x, terrainHeight(this.activeMap, node.x, node.z) + 0.11, node.z);
      mesh.rotation.y = Math.PI / 6;
      mesh.receiveShadow = true;
      this.root.add(mesh);
      this.nodeMeshes.push(mesh);

      const outline = new THREE.Mesh(ring, this.materials.cyan);
      outline.rotation.x = Math.PI / 2;
      outline.position.y = 0.14;
      mesh.add(outline);
      this.pulseMeshes.push(outline);
    });
  }

  private createSurfaceDetails() {
    const rockGeometry = new THREE.DodecahedronGeometry(1, 0);

    this.activeMap.rocks.forEach(([x, z, size], index) => {
      const rock = new THREE.Mesh(rockGeometry, index % 3 === 0 ? this.materials.rockLight : this.materials.rock);
      rock.position.set(x, terrainHeight(this.activeMap, x, z) + size * 0.42, z);
      rock.scale.setScalar(size * 0.72);
      rock.rotation.set(index * 0.7, index * 1.3, index * 0.4);
      rock.castShadow = true;
      rock.receiveShadow = true;
      rock.name = `surface-rock-${index}`;
      this.root.add(rock);
    });

    this.activeMap.craters
      .filter((crater) => crater.deep)
      .forEach((crater, index) => {
        const rim = new THREE.Mesh(new THREE.TorusGeometry(crater.radius * 0.82, 0.11, 8, 44), this.materials.crater);
        rim.rotation.x = Math.PI / 2;
        rim.position.set(crater.x, terrainHeight(this.activeMap, crater.x, crater.z) + 0.35, crater.z);
        rim.name = `crater-rim-${index}`;
        this.root.add(rim);
      });
  }

  private createLandingRover() {
    const rover = new THREE.Group();
    rover.name = "landing-rover";

    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.75, 0.42, 3.45), this.materials.ivory);
    chassis.position.y = 0.4;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.72, 1.75), this.materials.gunmetal);
    cabin.position.set(0, 0.94, -0.25);
    const sensor = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.45, 0.52), this.materials.amber);
    sensor.position.set(0, 0.78, 1.55);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.45, 8), this.materials.white);
    mast.position.set(-0.66, 1.62, -0.3);
    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.27, 16, 10), this.materials.gunmetal);
    dish.scale.y = 0.32;
    dish.position.set(-0.66, 2.29, -0.3);

    [chassis, cabin, sensor, mast, dish].forEach((mesh) => {
      mesh.castShadow = true;
      rover.add(mesh);
    });
    this.roverDish = dish;

    const wheelGeometry = new THREE.CylinderGeometry(0.44, 0.44, 0.36, 16);
    [-1.38, 0, 1.38].forEach((z) => {
      [-1.48, 1.48].forEach((x) => {
        const wheel = new THREE.Mesh(wheelGeometry, this.materials.dark);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, 0.22, z);
        wheel.castShadow = true;
        rover.add(wheel);
      });
    });

    const lamp = new THREE.PointLight(new THREE.Color("#F3A533"), 6, 9, 1.6);
    lamp.position.set(0, 1.2, 1.85);
    rover.add(lamp);
    this.roverLights.push(lamp);

    this.roverRoot = rover;
    this.root.add(rover);
  }

  sync(state: TycoonState) {
    if (this.activeMap.id !== state.sector) {
      this.clearSurfaceDetails();
      this.activeMap = mapForSector(state.sector);
      this.buildSector();
      this.nodeMeshes.forEach((mesh) => {
        const node = BUILD_NODES.find((candidate) => `build-node-${candidate.id}` === mesh.name);
        if (node) mesh.position.y = terrainHeight(this.activeMap, node.x, node.z) + 0.11;
      });
      this.roverOrigin.set(-23, terrainHeight(this.activeMap, -23, -15) + 0.02, -15);
      if (this.roverRoot) this.roverRoot.position.copy(this.roverOrigin);
    }

    this.state = state;
    this.buildingRoots.forEach((meshes) => meshes.forEach((mesh) => mesh.removeFromParent()));
    this.buildingRoots.clear();
    this.rotorMeshes.length = 0;

    this.roverOnExpedition = state.expeditions.some((expedition) => expedition.state === "active");
    state.buildings.forEach((building) => this.createBuilding(building));
    this.nodeMeshes.forEach((node) => {
      const nodeId = node.name.replace("build-node-", "");
      node.visible = !state.buildings.some((building) => building.nodeId === nodeId);
    });
  }

  update(delta: number) {
    this.elapsed += delta;

    this.nodeMeshes.forEach((node, index) => {
      node.rotation.y += delta * (index % 2 ? 0.18 : -0.18);
    });

    this.pulseMeshes.forEach((mesh, index) => {
      const pulse = 1 + Math.sin(this.elapsed * 2.3 + index * 0.7) * 0.06;
      mesh.scale.set(pulse, pulse, 1);
    });

    this.rotorMeshes.forEach((mesh, index) => {
      mesh.rotation.y += delta * (index % 2 ? -1.3 : 0.9);
    });

    if (this.roverRoot) {
      const offset = this.roverOnExpedition
        ? new THREE.Vector3(Math.sin(this.elapsed * 1.1) * 10, 0, Math.cos(this.elapsed * 1.1) * 6)
        : new THREE.Vector3();
      this.roverRoot.position.x = this.roverOrigin.x + offset.x;
      this.roverRoot.position.z = this.roverOrigin.z + offset.z;
      this.roverRoot.position.y = terrainHeight(this.activeMap, this.roverRoot.position.x, this.roverRoot.position.z) + 0.02;
      this.roverRoot.rotation.y = 0.24 + Math.sin(this.elapsed * 0.42) * 0.04;
    }

    if (this.roverDish) this.roverDish.rotation.y = Math.sin(this.elapsed * 0.55) * 0.22;
  }

  dispose() {
    this.clearSurfaceDetails();
    this.buildingRoots.forEach((meshes) => meshes.forEach((mesh) => mesh.removeFromParent()));
    this.buildingRoots.clear();

    this.terrain?.dispose();
    this.regolith?.dispose();
    this.roverLights.forEach((light) => light.dispose());
    this.root.removeFromParent();

    this.root.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry?.dispose();
    });

    Object.values(this.materials).forEach((material) => material.dispose());
    this.nodeMeshes.length = 0;
    this.pulseMeshes.length = 0;
    this.rotorMeshes.length = 0;
  }

  private clearSurfaceDetails() {
    this.root.children
      .filter((child) => child.name.startsWith("surface-rock-") || child.name.startsWith("crater-rim-"))
      .forEach((child) => {
        const mesh = child as THREE.Mesh;
        mesh.geometry?.dispose();
        child.removeFromParent();
      });
  }

  private createBuilding(building: BaseBuilding) {
    const node = BUILD_NODES.find((candidate) => candidate.id === building.nodeId);
    if (!node) return;
    const at = new THREE.Vector3(node.x, terrainHeight(this.activeMap, node.x, node.z), node.z);
    const meshes = this.buildMeshes(building.kind, building.id, at, building.level);

    if (building.integrity < 80) {
      meshes.forEach((mesh) => {
        const target = mesh as THREE.Mesh;
        if (target.isMesh) target.material = this.materials.gunmetal;
      });
    }

    this.buildingRoots.set(building.id, meshes);
  }

  private buildMeshes(kind: BuildingKind, id: string, at: THREE.Vector3, level: number): THREE.Object3D[] {
    const meshes: THREE.Object3D[] = [];
    const add = (mesh: THREE.Mesh, material: THREE.Material, offset: [number, number, number] = [0, 0, 0]) => {
      mesh.position.set(at.x + offset[0], at.y + offset[1], at.z + offset[2]);
      mesh.material = material;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.root.add(mesh);
      meshes.push(mesh);
      return mesh;
    };

    const pad = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 0.12, 32), this.materials.dark);
    add(pad, this.materials.dark, [0, 0.06, 0]);

    if (kind === "solar") {
      for (let index = 0; index < 4; index += 1) {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.09, 2.15), this.materials.solar);
        panel.rotation.z = -0.27;
        add(panel, this.materials.solar, [-2.55 + index * 1.7, 1.02, 0]);

        const grid = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.025, 0.05), this.materials.solarGrid);
        grid.rotation.z = -0.27;
        add(grid, this.materials.solarGrid, [-2.55 + index * 1.7, 1.09, 0]);
      }
      const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 6.7, 10), this.materials.gunmetal);
      spine.rotation.z = Math.PI / 2;
      add(spine, this.materials.gunmetal, [0, 0.68, 0]);

      add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.65), this.materials.amber), this.materials.amber, [0, 0.42, -1.45]);
    } else if (kind === "habitat") {
      const capsule = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.65, 4.8, 18), this.materials.ivory);
      capsule.rotation.z = Math.PI / 2;
      add(capsule, this.materials.ivory, [0, 1.7, 0]);

      const airlock = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 1.4, 12), this.materials.gunmetal);
      airlock.rotation.z = Math.PI / 2;
      add(airlock, this.materials.gunmetal, [2.8, 1.28, 0]);

      add(new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), this.materials.cyan), this.materials.cyan, [2.75, 1.32, -0.52]);

      [-1, 0, 1].forEach((index) => {
        const porthole = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.04, 16), this.materials.cyan);
        porthole.rotation.x = Math.PI / 2;
        add(porthole, this.materials.cyan, [index * 1.12, 2.05, -1.66]);
      });
    } else if (kind === "laboratory") {
      add(new THREE.Mesh(new THREE.BoxGeometry(5.4, 2.05, 3.2), this.materials.ivory), this.materials.ivory, [0, 1.15, 0]);

      const roof = new THREE.Mesh(new THREE.CylinderGeometry(1.78, 2.83, 0.3, 4), this.materials.gunmetal);
      roof.rotation.y = Math.PI / 4;
      add(roof, this.materials.gunmetal, [0, 2.35, 0]);

      for (let index = 0; index < 3; index += 1) {
        add(new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.56, 0.06), this.materials.cyan), this.materials.cyan, [-1.35 + index * 1.35, 1.3, -1.64]);
      }

      const vent = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1.05, 10), this.materials.amber);
      add(vent, this.materials.amber, [1.8, 2.73, 0.7]);
      this.rotorMeshes.push(vent);
    } else if (kind === "extractor") {
      add(new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.55, 0.62, 10), this.materials.gunmetal), this.materials.gunmetal, [0, 0.36, 0]);

      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 3.2, 8), this.materials.amber);
      add(mast, this.materials.amber, [0, 1.9, 0]);
      this.rotorMeshes.push(mast);

      add(new THREE.Mesh(new THREE.BoxGeometry(1.75, 1.15, 1.3), this.materials.ivory), this.materials.ivory, [1.55, 0.92, 0]);

      const auger = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.4, 10), this.materials.cyan);
      auger.rotation.z = Math.PI / 2;
      add(auger, this.materials.cyan, [0, 0.92, 1.12]);
      this.rotorMeshes.push(auger);
    } else {
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.19, 5.8, 6), this.materials.gunmetal);
      add(tower, this.materials.gunmetal, [0, 3, 0]);

      const dish = new THREE.Mesh(new THREE.SphereGeometry(0.62, 14, 10), this.materials.cyan);
      dish.scale.y = 0.24;
      add(dish, this.materials.cyan, [0, 5.9, 0]);
      this.rotorMeshes.push(dish);

      [-1, 1].forEach((x) => {
        const brace = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 2.1, 6), this.materials.gunmetal);
        brace.rotation.z = x * 0.44;
        add(brace, this.materials.gunmetal, [x * 0.62, 1.08, 0]);
      });
    }

    if (level > 1) {
      const upgrade = new THREE.Mesh(new THREE.TorusGeometry(1.95, 0.04, 8, 24), this.materials.amber);
      upgrade.rotation.x = Math.PI / 2;
      add(upgrade, this.materials.amber, [0, 0.16, 0]);
    }

    return meshes;
  }
}