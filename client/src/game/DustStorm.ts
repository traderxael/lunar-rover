import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { Scene } from "@babylonjs/core/scene";
import type { StormConfig } from "./MissionMap";
import { ASSET_URLS } from "./assets";

type DustParticle = { mesh: Mesh; offset: number; speed: number };

export class DustStorm {
  private readonly particles: DustParticle[] = [];

  constructor(scene: Scene, private readonly config: StormConfig) {
    if (!config.active) return;
    const material = new StandardMaterial("storm-dust", scene);
    material.diffuseColor = Color3.FromHexString("#D7B17A");
    material.emissiveColor = Color3.FromHexString("#573A21");
    material.alpha = 0.22;
    const dustTexture = new Texture(ASSET_URLS.dustStorm, scene, true, false);
    dustTexture.onLoadObservable.addOnce(() => {
      material.diffuseTexture = dustTexture;
      material.opacityTexture = dustTexture;
      material.useAlphaFromDiffuseTexture = true;
    });

    for (let index = 0; index < config.particles; index += 1) {
      const particle = MeshBuilder.CreatePlane(`dust-cloud-${index}`, { size: 4 + (index % 5) * 1.7 }, scene);
      particle.billboardMode = Mesh.BILLBOARDMODE_ALL;
      particle.position.x = -66 + ((index * 17) % 132);
      particle.position.z = -55 + ((index * 29) % 110);
      particle.position.y = 0.8 + ((index * 7) % 17) / 7;
      particle.material = material;
      this.particles.push({ mesh: particle, offset: index * 1.73, speed: 0.58 + (index % 6) * 0.11 });
    }
  }

  update(delta: number, elapsed: number) {
    if (!this.config.active) return;
    this.particles.forEach((particle) => {
      particle.mesh.position.x += this.config.windSpeed * particle.speed * delta;
      particle.mesh.position.z += Math.sin(elapsed * 0.75 + particle.offset) * 0.22 * delta;
      particle.mesh.position.y += Math.sin(elapsed * 1.2 + particle.offset) * 0.05 * delta;
      if (particle.mesh.position.x > 70) particle.mesh.position.x = -70;
    });
  }

  dispose() {
    this.particles.forEach(({ mesh }) => mesh.dispose());
  }
}
