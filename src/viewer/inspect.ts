import * as THREE from "three";

/** Measured facts about a model, for comparing against a product sheet. */
export interface ModelReport {
  /** bounding box in cm: width (x), depth (z), height (y) */
  size: { w: number; d: number; h: number };
  materials: MaterialReport[];
}

export interface MaterialReport {
  name: string;
  type: string;
  color: string;
  /** Phong shininess, or Standard roughness / metalness when present */
  shininess?: number;
  roughness?: number;
  metalness?: number;
  opacity: number;
  textured: boolean;
  meshes: number;
}

const cm = (m: number) => Math.round(m * 1000) / 10;

/** Bounding box and material inventory of an object. Pure (no rendering). */
export function inspectModel(object: THREE.Object3D): ModelReport {
  object.updateMatrixWorld(true);
  // precise: per-vertex, so rotated or quantized meshes do not inflate the box
  const box = new THREE.Box3().setFromObject(object, true);
  const size = box.getSize(new THREE.Vector3());
  const byMaterial = new Map<THREE.Material, MaterialReport>();
  object.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const list: THREE.Material[] = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of list) {
      const known = byMaterial.get(m);
      if (known) {
        known.meshes++;
        continue;
      }
      const any = m as THREE.Material & {
        color?: THREE.Color;
        shininess?: number;
        roughness?: number;
        metalness?: number;
        map?: THREE.Texture | null;
      };
      byMaterial.set(m, {
        name: m.name,
        type: m.type,
        color: any.color ? `#${any.color.getHexString()}` : "",
        shininess: any.shininess,
        roughness: any.roughness,
        metalness: any.metalness,
        opacity: m.opacity,
        textured: Boolean(any.map),
        meshes: 1,
      });
    }
  });
  return {
    size: { w: cm(size.x), d: cm(size.z), h: cm(size.y) },
    materials: [...byMaterial.values()],
  };
}
