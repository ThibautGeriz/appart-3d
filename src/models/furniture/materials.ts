import * as THREE from "three";

/**
 * Furniture materials. Wood and fabric get photo textures (CC0 scans from
 * Poly Haven, see src/assets/textures/furniture/README.md) attached at export,
 * by material name; the color here tints the scan to match the product photos.
 */

export interface PhotoTexture {
  /** files in src/assets/textures/furniture/: <scan>_diff.jpg, _nor.jpg, _rough.jpg */
  scan: string;
  /** real-world size of one texture repeat, in meters */
  size: number;
  /** direction of the wood grain in the image */
  grain: "u" | "v";
  /** colour map only (no normal / roughness scans) */
  flat?: boolean;
  /** colour + normal maps, no roughness map */
  noRoughness?: boolean;
}

function textured(name: string, color: string, roughness = 1): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ name, color, roughness, metalness: 0 });
}

/** Valmo: recycled teak, deep red-brown, oiled. */
export const recycledTeak = textured("recycled teak", "#9c6c54", 0.85);
/** Willow: solid teak live-edge slab, warm brown. */
export const teak = textured("teak", "#c99474", 0.85);
/** Raia: suar (monkeypod), pale gold with darker streaks, oiled. */
export const suar = textured("suar", "#f2dcbc", 0.85);
/** Norway: oiled oak. */
export const oiledOak = textured("oiled oak", "#f2d6ac", 0.9);
/** Bistrot: recycled elm, sawn and worn. */
export const recycledElm = textured("recycled elm", "#c99366", 1);
/** Mackay: light solid elm. */
export const lightElm = textured("light elm", "#f3dcc2", 0.9);
/** Biwa sideboard: recycled pine, warm and worn. */
export const recycledPine = textured("recycled pine", "#c88d5c", 0.95);
/** Lunja bed: brushed solid pine, dark ("bois foncé"), rustic. */
export const darkPine = textured("dark pine", "#8a6446", 0.9);
/** Janis / Petra beds: solid pine, honey oiled / waxed. */
export const honeyPine = textured("honey pine", "#e9b884", 0.75);
/** Lundby / Oregon bedside tables: ash, rough sawn or brushed. */
export const roughAsh = textured("rough ash", "#d9a878", 1);
/** Bedding (not sold with the beds, but a bed reads as one with it). */
export const linen = new THREE.MeshStandardMaterial({
  name: "linen",
  color: "#e9e6e0",
  roughness: 0.95,
});
export const linenDark = new THREE.MeshStandardMaterial({
  name: "linen grey",
  color: "#9fa3a6",
  roughness: 0.95,
});
/** Westmount: rough sawn fir. */
export const fir = textured("fir", "#d8a06a", 1);
/** Norway: brown microfibre, suede look. */
export const microfibre = textured("microfibre", "#a07658", 1);

/** Kitchen sink: Fragranite "gris ardoise", matte speckled granite composite. */
export const fragranite = textured("fragranite", "#6c7074", 0.62);

/**
 * Roma sofa: 3D mesh fabric ("maillage 3D"). White: the app tints it with the
 * colour picked in the toolbar (the map only carries the weave's light/dark).
 */
export const romaFabric = textured("roma fabric", "#ffffff", 0.92);

/**
 * Olivia chair: textured chenille ("tissu texturé"), a weave of soft loops.
 * White: tinted with the colour picked in the toolbar.
 */
export const oliviaFabric = textured("olivia fabric", "#ffffff", 0.95);
/** Albatros: chenille ("Castello", cat. Super), tinted by the toolbar. */
export const albatrosFabric = textured("albatros fabric", "#ffffff", 0.95);

/** Roma legs: painted iron, "titanio" (dark titanium grey). */
export const titanio = new THREE.MeshStandardMaterial({
  name: "titanio",
  color: "#3b3d40",
  metalness: 0.75,
  roughness: 0.42,
});

/** Rugs: wool loops (generated weave), tinted. */
export const woolCream = textured("wool cream", "#e9e0cf", 1);
export const woolGrey = textured("wool grey", "#b9bbb8", 1);
export const woolCharcoal = textured("wool charcoal", "#4a4845", 1);

/** Photo scan behind each textured material (by material name). */
export const PHOTO_TEXTURES: Record<string, PhotoTexture> = {
  // tables: scans enlarged so the figure reads at the scale of a 2 m slab
  [recycledTeak.name]: { scan: "rosewood_veneer_02", size: 2.2, grain: "u" },
  [teak.name]: { scan: "european_walnut_veneer_04", size: 2.4, grain: "u" },
  [suar.name]: { scan: "ash_veneer", size: 2.4, grain: "u" },
  [oiledOak.name]: { scan: "oak_veneer_01", size: 1.83, grain: "v" },
  [recycledElm.name]: { scan: "brown_planks_08", size: 1, grain: "u" },
  [lightElm.name]: { scan: "ash_veneer", size: 1, grain: "u" },
  [fir.name]: { scan: "brown_planks_09", size: 1, grain: "u" },
  [darkPine.name]: { scan: "brown_planks_09", size: 1, grain: "u" },
  [honeyPine.name]: { scan: "brown_planks_09", size: 1.2, grain: "u" },
  [roughAsh.name]: { scan: "brown_planks_08", size: 0.8, grain: "u" },
  [recycledPine.name]: { scan: "brown_planks_08", size: 0.8, grain: "u" },
  [microfibre.name]: { scan: "fabric_leather_01", size: 0.4, grain: "u" },
  // generated speckle (quartz grains in a dark matrix), not a scan
  [fragranite.name]: { scan: "fragranite", size: 0.25, grain: "u", flat: true },
  // generated weave (scripts/gen-roma-mesh.py): ~3 mm between holes
  [romaFabric.name]: { scan: "roma_mesh", size: 0.05, grain: "u", noRoughness: true },
  // generated chenille weave (scripts/gen-chenille.py): ~3.3 mm loops
  [oliviaFabric.name]: { scan: "olivia_weave", size: 0.04, grain: "u", noRoughness: true },
  // the same chenille weave, a little coarser
  [albatrosFabric.name]: { scan: "olivia_weave", size: 0.05, grain: "u", noRoughness: true },
  // generated weave (scripts/gen-wool.py)
  [woolCream.name]: { scan: "wool", size: 0.25, grain: "u", noRoughness: true },
  [woolGrey.name]: { scan: "wool", size: 0.25, grain: "u", noRoughness: true },
  [woolCharcoal.name]: { scan: "wool", size: 0.25, grain: "u", noRoughness: true },
};

/** Aged (vieilli) iron: dark brown-black with a soft sheen. */
export const agedIron = new THREE.MeshStandardMaterial({
  name: "aged iron",
  color: "#2b2521",
  metalness: 0.7,
  roughness: 0.55,
});

/** Black lacquered / powder-coated steel of the table bases. */
export const blackSteel = new THREE.MeshStandardMaterial({
  name: "black steel",
  color: "#121212",
  metalness: 0.45,
  roughness: 0.4,
});

/** Mackay: black aged metal, a little worn. */
export const agedBlack = new THREE.MeshStandardMaterial({
  name: "aged black",
  color: "#1b1b1c",
  metalness: 0.6,
  roughness: 0.48,
});

/** Screw heads, felt pads. */
export const darkScrew = new THREE.MeshStandardMaterial({
  name: "screw",
  color: "#0d0d0d",
  metalness: 0.8,
  roughness: 0.35,
});
