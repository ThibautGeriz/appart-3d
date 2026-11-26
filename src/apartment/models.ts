import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import type { ModelSlot } from "./build";
import { MODEL_FILES, type ModelName } from "./modelFiles";

// every exported model, as hashed asset URLs
const urls = import.meta.glob("../../models/*.glb", {
  query: "?url",
  import: "default",
  eager: true,
}) as Record<string, string>;

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder); // models are meshopt-compressed
const cache = new Map<string, Promise<THREE.Object3D>>();

/** models/<file>.glb, loaded once and shared (clone it before adding it). */
export function loadFile(file: string): Promise<THREE.Object3D> {
  let pending = cache.get(file);
  if (!pending) {
    const url = urls[`../../models/${file}.glb`];
    if (!url)
      return Promise.reject(new Error(`models/${file}.glb is missing (npm run export:glb)`));
    pending = loader.loadAsync(url).then((gltf) => gltf.scene);
    cache.set(file, pending);
  }
  return pending;
}

const load = (name: ModelName) => loadFile(MODEL_FILES[name]);

/** Clearcoat costs a second specular lobe: on phones, plain standard PBR. */
function simplify(material: THREE.Material): THREE.Material {
  if (!(material instanceof THREE.MeshPhysicalMaterial)) return material;
  const simple = new THREE.MeshStandardMaterial();
  THREE.MeshStandardMaterial.prototype.copy.call(simple, material);
  simple.roughness = Math.min(material.roughness, 0.2); // keep the glazed look
  return simple;
}

/** Shadows (not for glass), and plain PBR on phones. */
export function prepare(model: THREE.Object3D, isTouch: boolean): THREE.Object3D {
  const swapped = new Map<THREE.Material, THREE.Material>();
  model.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const materials = (Array.isArray(o.material) ? o.material : [o.material]) as THREE.Material[];
    o.castShadow = !materials.some((m) => m.transparent); // glass lets the light in
    o.receiveShadow = true;
    if (!isTouch) return;
    const simple = materials.map((m) => {
      if (!swapped.has(m)) swapped.set(m, simplify(m));
      return swapped.get(m)!;
    });
    o.material = Array.isArray(o.material) ? simple : simple[0];
  });
  return model;
}

/**
 * Load the GLB models into their slots, and the mannequin into the avatar
 * (models face +z, the player faces -z). Resolves once everything is placed.
 */
export async function loadModels(
  slots: ModelSlot[],
  avatar: THREE.Object3D,
  isTouch: boolean,
): Promise<void> {
  const fill = async (name: ModelName, parent: THREE.Object3D, rotationY = 0) => {
    const model = prepare((await load(name)).clone(), isTouch);
    model.rotation.y = rotationY;
    parent.add(model);
  };
  // one missing or broken model must not keep the others (and the shadows) from updating
  const results = await Promise.allSettled([
    ...slots.map(({ model, slot }) => fill(model, slot)),
    fill("avatar", avatar, Math.PI),
  ]);
  for (const r of results) if (r.status === "rejected") console.warn(r.reason);
}
