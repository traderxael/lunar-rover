import * as THREE from "three";

/**
 * Cielo lunar: vacío negro azulado, estrellas de intensidad variable y la
 * Tierra en el horizonte. No hay atmósfera, así que no hay gradiente: el
 * interés lo ponen las estrellas y el disco terrestre.
 */
export type Sky = {
  group: THREE.Group;
  earth: THREE.Mesh;
  dispose: () => void;
};

export function createSky(): Sky {
  const group = new THREE.Group();
  group.name = "sky";

  const starCount = 900;
  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);
  const color = new THREE.Color();

  for (let index = 0; index < starCount; index += 1) {
    const radius = 150 + Math.random() * 90;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
    positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[index * 3 + 1] = Math.abs(radius * Math.cos(phi)) * 0.85 + 6;
    positions[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

    const warm = Math.random() > 0.82;
    color.setHSL(warm ? 0.09 : 0.58, warm ? 0.35 : 0.12, 0.62 + Math.random() * 0.34);
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
  }

  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  starGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const starMaterial = new THREE.PointsMaterial({
    size: 1.35,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    fog: false,
  });

  const stars = new THREE.Points(starGeometry, starMaterial);
  stars.name = "stars";
  group.add(stars);

  const earthGeometry = new THREE.SphereGeometry(6.4, 44, 30);
  const earthMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#3E6FA8"),
    emissive: new THREE.Color("#16375F"),
    emissiveIntensity: 0.85,
    roughness: 0.85,
    metalness: 0,
    fog: false,
  });
  const earth = new THREE.Mesh(earthGeometry, earthMaterial);
  earth.position.set(-46, 34, 28);
  earth.name = "earth";
  group.add(earth);

  const haloGeometry = new THREE.SphereGeometry(7.3, 34, 24);
  const haloMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#6FA6D8"),
    transparent: true,
    opacity: 0.12,
    side: THREE.BackSide,
    fog: false,
  });
  const halo = new THREE.Mesh(haloGeometry, haloMaterial);
  halo.position.copy(earth.position);
  group.add(halo);

  return {
    group,
    earth,
    dispose: () => {
      starGeometry.dispose();
      starMaterial.dispose();
      earthGeometry.dispose();
      earthMaterial.dispose();
      haloGeometry.dispose();
      haloMaterial.dispose();
      group.clear();
    },
  };
}
