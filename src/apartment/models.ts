import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import type { ModelSlot } from "./build";
import { MODEL_FILES, type ModelName } from "./modelFiles";
import { groupBy, instanced } from "./instancing";
import { ktx2Loader } from "./ktx2";
import type { RoomCuller } from "./rooms";

// every exported model, as hashed asset URLs
const urls = import.meta.glob("../../models/*.glb", {
  query: "?url",
  import: "default",
  eager: true,
}) as Record<string, string>;

// models are meshopt-compressed, their textures KTX2
let loader: GLTFLoader | null = null;
const gltfLoader = () => {
  if (!loader) {
    loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const ktx2 = ktx2Loader();
    if (ktx2) loader.setKTX2Loader(ktx2);
  }
  return loader;
};
const cache = new Map<string, Promise<THREE.Object3D>>();

/** models/<file>.glb, loaded once and shared (clone it before adding it). */
/** Hashed URL of models/<file>.glb (undefined: not exported). */
export function modelUrl(file: string): string | undefined {
  return urls[`../../models/${file}.glb`];
}

export function loadFile(file: string): Promise<THREE.Object3D> {
  let pending = cache.get(file);
  if (!pending) {
    const url = urls[`../../models/${file}.glb`];
    if (!url)
      return Promise.reject(new Error(`models/${file}.glb is missing (npm run export:glb)`));
    pending = gltfLoader()
      .loadAsync(url)
      .then((gltf) => shareTextures(gltf.scene));
    cache.set(file, pending);
  }
  return pending;
}

const load = (name: ModelName) => loadFile(MODEL_FILES[name]);

const TEXTURE_SLOTS = ["map", "normalMap", "roughnessMap", "metalnessMap"] as const;
type Textured = Partial<Record<(typeof TEXTURE_SLOTS)[number], THREE.Texture | null>>;
/** scan name → its texture, from the first model that brought it */
const sharedTextures = new Map<string, THREE.Texture>();

/**
 * Every GLB embeds its own copy of a scan (the oak of five pieces of
 * furniture): keep one texture per scan, so video memory holds it once.
 */
export function shareTextures(model: THREE.Object3D): THREE.Object3D {
  model.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    for (const material of [o.material].flat() as (THREE.Material & Textured)[]) {
      for (const slot of TEXTURE_SLOTS) {
        const texture = material[slot];
        if (!texture?.name) continue;
        const shared = sharedTextures.get(texture.name);
        if (!shared) sharedTextures.set(texture.name, texture);
        else if (shared !== texture) {
          material[slot] = shared;
          texture.dispose();
        }
      }
    }
  });
  return model;
}

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
 * Load the mannequin into the avatar right away (models face +z, the player
 * faces -z), and each room's props (sink, shower, toilet…) the first time the
 * room can be seen; identical props in a room (the two basins) are drawn as
 * instances. `onLoaded` runs after each batch, with its rooms (lights, shadows, probes).
 */
export function loadModels(
  slots: ModelSlot[],
  avatar: THREE.Object3D,
  isTouch: boolean,
  culler: RoomCuller,
  roomOf: (slot: THREE.Object3D) => string,
  onLoaded: (rooms?: Set<string>) => void,
): void {
  const report = (results: PromiseSettledResult<unknown>[], rooms: string[]) => {
    // one missing or broken model must not keep the others (and the shadows) from updating
    for (const r of results) if (r.status === "rejected") console.warn(r.reason);
    onLoaded(new Set(rooms));
  };
  void load("avatar").then(
    (m) => {
      const model = prepare(m.clone(), isTouch);
      model.rotation.y = Math.PI;
      avatar.add(model);
      onLoaded(new Set()); // in no room: the probes do not capture it
    },
    (e) => console.warn(e),
  );
  for (const { slot } of slots) culler.add(slot, roomOf(slot));
  const loaded = new Set<string>();
  culler.onReveal(async (rooms) => {
    const fresh = [...rooms].filter((r) => !loaded.has(r));
    for (const r of fresh) loaded.add(r);
    const inRooms = slots.filter(({ slot }) => fresh.includes(roomOf(slot)));
    const batches = groupBy(inRooms, ({ model, slot }) => `${roomOf(slot)}|${model}`);
    report(
      await Promise.allSettled(
        batches.map(async (batch) => {
          const model = prepare((await load(batch[0].model)).clone(), isTouch);
          if (batch.length === 1) {
            batch[0].slot.add(model);
            return;
          }
          // copies: one instanced set in the first slot's parent, placed by every slot
          const transforms = batch.map(({ slot }) => {
            slot.updateWorldMatrix(true, false);
            return slot.matrixWorld.clone();
          });
          const holder = instanced(model, transforms);
          const first = batch[0].slot;
          first.parent?.add(holder);
          culler.add(holder, roomOf(first));
        }),
      ),
      fresh,
    );
  });
}
