import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { modelFootprint } from "../src/apartment/facing";
import { MODEL_FILES, type ModelName } from "../src/apartment/modelFiles";
import { allFurniture } from "../src/apartment/plan";
import { APARTMENT_DEF, type PropModel } from "../src/data/apartment";
import { mannequin, PROP_BUILDERS } from "../src/models";

export interface ModelEntry {
  /** output file name, without .glb */
  file: string;
  build: () => THREE.Object3D;
  /** photo textures to attach after export: material name → image path (repo-relative) */
  textures?: Record<string, string>;
  /** keep the node hierarchy (named joints) instead of merging meshes */
  rigged?: boolean;
}

/** Build a prop at the size the layout data gives it (first item using it). */
function prop(model: PropModel): THREE.Object3D {
  const item = allFurniture(APARTMENT_DEF).find((f) => f.model === model);
  if (!item) throw new Error(`no furniture uses model ${model}`);
  const [w, d] = modelFootprint(item.rect, item.facing ?? "+z");
  const g = PROP_BUILDERS[model](w, d, item.h);
  g.name = model;
  return g;
}

const props = Object.keys(PROP_BUILDERS) as PropModel[];

export const MODELS: ModelEntry[] = [
  ...props.map((model) => ({ file: MODEL_FILES[model], build: () => prop(model) })),
  {
    file: MODEL_FILES["avatar" satisfies ModelName],
    build: mannequin,
    rigged: true,
    textures: { wood: "src/assets/textures/oak_veneer_01.jpg" },
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
