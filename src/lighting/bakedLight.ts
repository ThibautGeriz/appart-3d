import * as THREE from "three";
import type { ApartmentDef } from "../data/apartment";
import { lightmapAtlas } from "./lightmap";
import lightmapUrl from "../assets/lightmap/lightmap.png";
import baked from "../assets/lightmap/lightmap.json";

/**
 * The baked lightmap texture, or undefined when it was baked for another
 * layout (walls or built-in furniture changed since: npm run bake:lightmap),
 * in which case the architecture keeps the flat hemisphere fill.
 */
export function loadLightmap(def: ApartmentDef): THREE.Texture | undefined {
  const atlas = lightmapAtlas(def);
  if (baked.signature !== atlas.signature) {
    console.warn("lightmap is stale (layout changed): run npm run bake:lightmap");
    return undefined;
  }
  const texture = new THREE.TextureLoader().load(lightmapUrl);
  texture.flipY = false; // the PNG's first row is v = 0
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.channel = 1; // uv1
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}
