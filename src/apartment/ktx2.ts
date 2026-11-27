import * as THREE from "three";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";

/**
 * The KTX2 / Basis Universal loader shared by the surfaces and the GLB
 * models: textures stay compressed in video memory, transcoded (in a worker)
 * to the format this GPU reads (BC, ETC2, ASTC). The transcoder is
 * public/basis, a copy of three's (a test keeps it in sync).
 */
let loader: KTX2Loader | null = null;

/** Call once, with the renderer, before building the apartment or loading models. */
export function initKtx2(renderer: THREE.WebGLRenderer): KTX2Loader {
  loader = new KTX2Loader()
    .setTranscoderPath(`${import.meta.env.BASE_URL}basis/`)
    .detectSupport(renderer);
  return loader;
}

export function ktx2Loader(): KTX2Loader | null {
  return loader;
}

const cache = new Map<string, Promise<THREE.Texture>>();

/** Once every map asked for so far is in (or failed). */
export async function mapsLoaded(): Promise<void> {
  await Promise.allSettled(cache.values());
}

/**
 * A tiling KTX2 map, loaded once and shared, handed to `assign` once
 * transcoded (the material shows its plain color until then). Nothing without
 * a renderer (unit tests).
 */
export function tilingMap(url: string, assign: (texture: THREE.Texture) => void): void {
  if (!loader) return;
  let pending = cache.get(url);
  if (!pending) {
    pending = loader.loadAsync(url).then((texture) => {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.anisotropy = 4;
      return texture;
    });
    cache.set(url, pending);
  }
  pending.then(assign, (e) => console.warn(e));
}
