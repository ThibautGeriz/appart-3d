import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { buildProp } from "../src/apartment/props";
import { createAvatar } from "../src/player/avatar";
import { allFurniture } from "../src/apartment/plan";
import { APARTMENT_DEF, type PropModel } from "../src/data/apartment";

export interface ModelEntry {
  name: string;
  build: () => THREE.Object3D;
}

/** Build a prop at the size the layout data gives it. */
function prop(model: PropModel): THREE.Object3D {
  const item = allFurniture(APARTMENT_DEF).find((f) => f.model === model);
  if (!item) throw new Error(`no furniture uses model ${model}`);
  const [x0, z0, x1, z1] = item.rect;
  const g = buildProp(model, Math.abs(x1 - x0), Math.abs(z1 - z0), item.h);
  g.name = model;
  return g;
}

export const MODELS: ModelEntry[] = [
  { name: "washing-machine", build: () => prop("washingMachine") },
  { name: "toilet", build: () => prop("toilet") },
  {
    name: "avatar",
    build: () => {
      const a = createAvatar();
      a.visible = true;
      a.name = "avatar";
      return a;
    },
  },
];

/**
 * glTF only knows PBR (and unlit) materials: map Phong/Lambert to
 * MeshStandardMaterial so chrome stays metallic and enamel stays glossy.
 */
function toPbr(material: THREE.Material): THREE.Material {
  if (material instanceof THREE.MeshPhongMaterial) {
    const metallic = material.specular.getHex() === 0xffffff || material.specular.r > 0.75;
    return new THREE.MeshStandardMaterial({
      name: material.name,
      color: material.color,
      roughness: Math.sqrt(2 / (material.shininess + 2)),
      metalness: metallic ? 0.9 : 0,
      transparent: material.transparent,
      opacity: material.opacity,
      depthWrite: material.depthWrite,
    });
  }
  if (material instanceof THREE.MeshLambertMaterial) {
    return new THREE.MeshStandardMaterial({
      name: material.name,
      color: material.color,
      roughness: 1,
      metalness: 0,
    });
  }
  return material;
}

export async function toGlb(object: THREE.Object3D): Promise<ArrayBuffer> {
  const converted = new Map<THREE.Material, THREE.Material>();
  object.traverse((o) => {
    if (o instanceof THREE.Mesh && o.material instanceof THREE.Material) {
      const m = o.material;
      if (!converted.has(m)) converted.set(m, toPbr(m));
      o.material = converted.get(m);
    }
  });
  const result = await new GLTFExporter().parseAsync(object, { binary: true });
  if (!(result instanceof ArrayBuffer)) throw new Error("expected binary glTF");
  return result;
}
