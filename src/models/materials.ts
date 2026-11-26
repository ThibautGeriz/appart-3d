import * as THREE from "three";

/**
 * Physically based materials for the exported models (glTF metallic-roughness,
 * plus clearcoat for glazed ceramics). Shared instances so each GLB carries
 * one copy per material. Realism comes mostly from the environment reflections
 * the app adds (see lighting/environment.ts).
 */

/** Glazed vitreous china: white body under a glassy coat. */
export const porcelain = new THREE.MeshPhysicalMaterial({
  name: "porcelain",
  color: "#f4f4f1",
  roughness: 0.3,
  clearcoat: 1,
  clearcoatRoughness: 0.03,
});

/** Duroplast toilet seat: a little less glossy than the ceramic. */
export const duroplast = new THREE.MeshPhysicalMaterial({
  name: "duroplast",
  color: "#f7f7f5",
  roughness: 0.35,
  clearcoat: 0.6,
  clearcoatRoughness: 0.12,
});

export const chrome = new THREE.MeshStandardMaterial({
  name: "chrome",
  color: "#f2f4f6",
  metalness: 1,
  roughness: 0.06,
});

/** Matte black PVD finish of the taps, shower and flush plate. */
export const matteBlack = new THREE.MeshStandardMaterial({
  name: "matte black",
  color: "#141414",
  metalness: 0.35,
  roughness: 0.42,
});

/** Slightly glossier black for push buttons and knobs. */
export const satinBlack = new THREE.MeshStandardMaterial({
  name: "satin black",
  color: "#101010",
  metalness: 0.4,
  roughness: 0.28,
});

export const brushedSteel = new THREE.MeshStandardMaterial({
  name: "brushed steel",
  color: "#c9cdd1",
  metalness: 1,
  roughness: 0.34,
});

/** Silicone nozzles and rubber. */
export const silicone = new THREE.MeshStandardMaterial({
  name: "silicone",
  color: "#202224",
  roughness: 0.75,
});

/** Shadowed gap (drain channel, button joints). */
export const darkGap = new THREE.MeshStandardMaterial({
  name: "dark gap",
  color: "#0b0b0b",
  roughness: 0.9,
});

/** Clear tempered glass: faint tint, mirror-like reflections. */
export const glass = new THREE.MeshStandardMaterial({
  name: "glass",
  color: "#eaf3f1",
  metalness: 0,
  roughness: 0.02,
  transparent: true,
  opacity: 0.14,
  depthWrite: false,
  side: THREE.DoubleSide,
});

/** Polished glass edge: the green of the iron in soda-lime glass. */
export const glassEdge = new THREE.MeshStandardMaterial({
  name: "glass edge",
  color: "#8fbfb2",
  roughness: 0.05,
  transparent: true,
  opacity: 0.7,
});

/** Thermostat indicator (red 38 °C stop). */
export const indicatorRed = new THREE.MeshStandardMaterial({
  name: "indicator red",
  color: "#b3261e",
  roughness: 0.4,
});

/** Varnished wood; the export attaches the oak veneer photo as its base color. */
export const wood = new THREE.MeshStandardMaterial({
  name: "wood",
  color: "#ffffff",
  roughness: 0.48,
});
