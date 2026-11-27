import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { modelFootprint } from "../src/apartment/facing";
import { MODEL_FILES, type ModelName } from "../src/apartment/modelFiles";
import { allFurniture } from "../src/apartment/plan";
import { APARTMENT_DEF, type PropModel } from "../src/data/apartment";
import { mannequin, PROP_BUILDERS } from "../src/models";
import { CATALOG } from "../src/data/catalog";
import { plant, rug } from "../src/models/furniture/decor";
import { woolCharcoal, woolCream, woolGrey } from "../src/models/furniture/materials";
import { CHAIR_BUILDERS } from "../src/models/furniture/chairs";
import { TABLE_BUILDERS } from "../src/models/furniture/tables";
import { SOFA_BUILDERS } from "../src/models/furniture/sofa";
import { SIDEBOARD_BUILDERS } from "../src/models/furniture/sideboards";
import { BEDROOM_BUILDERS } from "../src/models/furniture/bedroom";
import { STUDY_BUILDERS } from "../src/models/furniture/study";
import { PHOTO_TEXTURES } from "../src/models/furniture/materials";

export interface ModelEntry {
  /** output file name, without .glb */
  file: string;
  build: () => THREE.Object3D;
  /** photo textures to attach after export, by material name (repo-relative paths) */
  textures?: Record<string, TextureFiles>;
  /** keep the node hierarchy (named joints) instead of merging meshes */
  rigged?: boolean;
}

export interface TextureFiles {
  base: string;
  normal?: string;
  roughness?: string;
}

/** The furniture scans, encoded to KTX2: <scan>_diff / _nor / _rough (the oak colour map is the floor scan). */
const FURNITURE_TEXTURES: Record<string, TextureFiles> = Object.fromEntries(
  Object.entries(PHOTO_TEXTURES).map(([material, { scan, flat, noRoughness }]) => {
    const dir = "src/assets/textures/furniture/ktx2";
    const base =
      scan === "oak_veneer_01" ? `${dir}/oak_veneer_01.ktx2` : `${dir}/${scan}_diff.ktx2`;
    const maps = flat
      ? {}
      : noRoughness
        ? { normal: `${dir}/${scan}_nor.ktx2` }
        : { normal: `${dir}/${scan}_nor.ktx2`, roughness: `${dir}/${scan}_rough.ktx2` };
    return [material, { base, ...maps }];
  }),
);

const FURNITURE_BUILDERS = {
  ...CHAIR_BUILDERS,
  ...TABLE_BUILDERS,
  ...SOFA_BUILDERS,
  ...SIDEBOARD_BUILDERS,
  ...BEDROOM_BUILDERS,
  ...STUDY_BUILDERS,
};

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
  ...props.map((model) => ({
    file: MODEL_FILES[model],
    build: () => prop(model),
    textures: FURNITURE_TEXTURES,
  })),
  {
    file: MODEL_FILES["avatar" satisfies ModelName],
    build: mannequin,
    rigged: true,
    textures: { wood: { base: "src/assets/textures/furniture/ktx2/oak_veneer_01.ktx2" } },
  },
  // room decor (not sold: no budget), placed by the furnishing layout
  { file: "decor-plant", build: plant, textures: FURNITURE_TEXTURES },
  {
    file: "decor-rug-living",
    build: () => rug(2.0, 1.4, woolCream, woolCharcoal),
    textures: FURNITURE_TEXTURES,
  },
  {
    file: "decor-rug-bedroom",
    build: () => rug(2.3, 1.6, woolGrey, woolCream),
    textures: FURNITURE_TEXTURES,
  },
  // catalog furniture, at the seller's dimensions
  ...CATALOG.map((p) => ({
    file: p.id,
    build: () => {
      const g = FURNITURE_BUILDERS[p.id](p);
      g.name = p.id;
      return g;
    },
    textures: FURNITURE_TEXTURES,
    // wall beds keep their moving parts (fold, feet) as named nodes
    rigged: p.kind === "wallBed",
  })),
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

/**
 * Math.sin/cos differ in the last bits between platforms (e.g. cos(π/2) is
 * 6e-17 on one, 0 on another): snap vertex data to a 2^-20 grid (~1 µm) so
 * the exported bytes are identical on macOS and Linux CI.
 */
const GRID = 2 ** 20;
function snap(geometry: THREE.BufferGeometry): void {
  for (const attribute of Object.values(geometry.attributes)) {
    const array = attribute.array;
    if (!(array instanceof Float32Array)) continue;
    for (let i = 0; i < array.length; i++) array[i] = Math.round(array[i] * GRID) / GRID;
  }
}

export async function toGlb(object: THREE.Object3D): Promise<ArrayBuffer> {
  const converted = new Map<THREE.Material, THREE.Material>();
  const snapped = new Set<THREE.BufferGeometry>();
  object.traverse((o) => {
    if (o instanceof THREE.Mesh && !snapped.has(o.geometry)) {
      snap(o.geometry);
      snapped.add(o.geometry);
    }
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
