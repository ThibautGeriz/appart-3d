import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { ApartmentDef, Finish, PropModel, Rect } from "../data/apartment";
import { finishSize, followScans, surfaceMaterial } from "./textures";
import { applyWorldUVs } from "./uv";
import { facingVector } from "./facing";
import {
  allFurniture,
  buildColliders,
  exteriorSide,
  guardrailBars,
  wallPieces,
  type Box,
} from "./plan";
import type { Collider } from "../player/movement";
import { boxLightmapUVs, lightmapAtlas, LIGHTMAP_RANGE, type Atlas } from "../lighting/lightmap";
import { roomAt } from "./furnishing";

/** Empty node, placed and rotated in the room, that receives a loaded GLB model. */
export interface ModelSlot {
  model: PropModel;
  slot: THREE.Group;
}

export interface BuiltApartment {
  group: THREE.Group;
  colliders: Collider[];
  /** filled asynchronously by loadModels (src/apartment/models.ts) */
  models: ModelSlot[];
}

const FRAME = 0.05;

function boxGeometry(box: Box): THREE.BufferGeometry {
  const geometry = new THREE.BoxGeometry(
    box.maxX - box.minX,
    box.maxY - box.minY,
    box.maxZ - box.minZ,
  );
  geometry.translate(
    (box.minX + box.maxX) / 2,
    (box.minY + box.maxY) / 2,
    (box.minZ + box.maxZ) / 2,
  );
  return geometry;
}

function rectBox(rect: Rect, minY: number, maxY: number): Box {
  const [minX, minZ, maxX, maxZ] = rect;
  return { minX, maxX, minY, maxY, minZ, maxZ };
}

function horizontalPlane(rect: Rect, y: number, facingUp: boolean): THREE.BufferGeometry {
  const [minX, minZ, maxX, maxZ] = rect;
  const geometry = new THREE.PlaneGeometry(maxX - minX, maxZ - minZ);
  geometry.rotateX(facingUp ? -Math.PI / 2 : Math.PI / 2);
  geometry.translate((minX + maxX) / 2, y, (minZ + maxZ) / 2);
  return geometry;
}

/**
 * Thin bars around an opening, flush with the glass. With several panes,
 * double-width meeting rails between the leaves and a handle on the rail
 * (casement opening in the middle).
 */
function frameBoxes(opening: Box, panes: number): Box[] {
  const alongX = opening.maxX - opening.minX > opening.maxZ - opening.minZ;
  const cx = (opening.minX + opening.maxX) / 2;
  const cz = (opening.minZ + opening.maxZ) / 2;
  const thin = (b: Box): Box =>
    alongX
      ? { ...b, minZ: cz - FRAME, maxZ: cz + FRAME }
      : { ...b, minX: cx - FRAME, maxX: cx + FRAME };
  const start = alongX ? opening.minX : opening.minZ;
  const end = alongX ? opening.maxX : opening.maxZ;
  const span = (a: number, b: number): Partial<Box> =>
    alongX ? { minX: a, maxX: b } : { minZ: a, maxZ: b };
  const bars = [
    thin({ ...opening, maxY: opening.minY + FRAME }),
    thin({ ...opening, minY: opening.maxY - FRAME }),
    thin({ ...opening, ...span(start, start + FRAME) }),
    thin({ ...opening, ...span(end - FRAME, end) }),
  ];
  const paneWidth = (end - start) / panes;
  for (let i = 1; i < panes; i++) {
    const at = start + i * paneWidth;
    bars.push(thin({ ...opening, ...span(at - FRAME, at + FRAME) }));
    // handle on the meeting rail, sticking out on both sides
    const handleY = Math.min(opening.minY + 1.0, (opening.minY + opening.maxY) / 2);
    const handle = {
      ...opening,
      minY: handleY,
      maxY: handleY + 0.16,
      ...span(at + FRAME, at + FRAME + 0.03),
    };
    bars.push(
      alongX
        ? { ...handle, minZ: cz - FRAME - 0.05, maxZ: cz + FRAME + 0.05 }
        : { ...handle, minX: cx - FRAME - 0.05, maxX: cx + FRAME + 0.05 },
    );
  }
  return bars;
}

/** Merge geometries into one mesh (one draw call). */
function mergedMesh(geometries: THREE.BufferGeometry[], material: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(mergeGeometries(geometries), material);
  for (const geometry of geometries) geometry.dispose();
  return mesh;
}

interface Surface {
  color: string;
  finish?: Finish;
  opacity?: number;
  geometry: THREE.BufferGeometry;
  /** room it stands in (one mesh per room: each room has its own reflection probe) */
  room?: string;
}

/** Lightmap UVs (uv1) for a geometry built from `box` (world coordinates). */
function withLightmapUVs(
  atlas: Atlas,
  geometry: THREE.BufferGeometry,
  box: Box,
): THREE.BufferGeometry {
  const pos = geometry.getAttribute("position");
  const nor = geometry.getAttribute("normal");
  geometry.setAttribute(
    "uv1",
    new THREE.BufferAttribute(boxLightmapUVs(atlas, box, pos.array, nor.array), 2),
  );
  return geometry;
}

const bakedMaterials = new Map<THREE.Material, THREE.Material>();

/**
 * The lightmapped version of a surface material: the baked texture carries
 * the indirect light (the hemisphere's flat fill is switched off for it, see
 * roomMask.ts). One copy per source material.
 */
function baked(material: THREE.Material, lightmap: THREE.Texture | undefined): THREE.Material {
  if (!lightmap) return material;
  let copy = bakedMaterials.get(material);
  if (!copy) {
    copy = material.clone();
    Object.assign(copy, { lightMap: lightmap, lightMapIntensity: LIGHTMAP_RANGE });
    copy.userData = { ...material.userData, baked: true };
    followScans(material, copy); // its scans may still be loading
    bakedMaterials.set(material, copy);
  }
  return copy;
}

export interface BuildOptions {
  /** the baked lightmap (its layout must match: see lightmapAtlas) */
  lightmap?: THREE.Texture;
}

/** Texture a geometry in world meters (origin = where the pattern starts). */
function finished(
  geometry: THREE.BufferGeometry,
  finish: Finish | undefined,
  origin?: [number, number, number],
): THREE.BufferGeometry {
  if (finish) applyWorldUVs(geometry, finishSize(finish), origin);
  return geometry;
}

/** Group geometries by material (color + finish) and room, and merge each group. */
function mergedByMaterial(items: Surface[], lightmap?: THREE.Texture): THREE.Mesh[] {
  const groups = new Map<string, Surface[]>();
  for (const item of items) {
    const key = `${item.color}|${item.finish ?? ""}|${item.opacity ?? 1}|${item.room ?? ""}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups.values()].map((surfaces) => {
    const { color, finish, opacity, room } = surfaces[0];
    const material = surfaceMaterial(color, finish, opacity);
    const mesh = mergedMesh(
      surfaces.map((surface) => surface.geometry),
      opacity !== undefined && opacity < 1 ? material : baked(material, lightmap),
    );
    if (room) mesh.userData.room = room;
    // see-through items (shower screen) let the light through like the windows
    if (opacity !== undefined && opacity < 1) mesh.name = "glass";
    return mesh;
  });
}

/** Build the apartment scene graph and colliders from the layout data. */
export function buildApartment(def: ApartmentDef, options: BuildOptions = {}): BuiltApartment {
  const group = new THREE.Group();
  const { wallHeight } = def;
  const { lightmap } = options;
  const atlas = lightmapAtlas(def);
  const uv1 = (geometry: THREE.BufferGeometry, box: Box) => withLightmapUVs(atlas, geometry, box);
  const slab = (rect: Rect, y: number, up: boolean) =>
    rectBox(rect, up ? y - 0.1 : y, up ? y : y + 0.1);

  // Walls, glazing and window frames
  const wallGeometries: THREE.BufferGeometry[] = [];
  const glassGeometries: THREE.BufferGeometry[] = [];
  const frameGeometries: THREE.BufferGeometry[] = [];
  const leaves: { color: string; geometry: THREE.BufferGeometry }[] = [];
  for (const wall of def.walls) {
    const pieces = wallPieces(wall, wallHeight);
    wallGeometries.push(
      ...pieces.solid.map((b) => uv1(finished(boxGeometry(b), def.wallFinish), b)),
    );
    for (const leaf of pieces.leaves) {
      leaves.push({ color: leaf.color, geometry: uv1(boxGeometry(leaf.box), leaf.box) });
      for (const handle of leaf.handles) {
        leaves.push({ color: def.frameColor, geometry: uv1(boxGeometry(handle), handle) });
      }
    }
    glassGeometries.push(...pieces.glass.map(boxGeometry));
    const side = exteriorSide(def, wall);
    for (const opening of pieces.guarded) {
      frameGeometries.push(...guardrailBars(wall, opening, side || 1).map(boxGeometry));
    }
    pieces.glass.forEach((glass, i) =>
      frameGeometries.push(...frameBoxes(glass, pieces.panes[i]).map(boxGeometry)),
    );
  }
  group.add(
    mergedMesh(wallGeometries, baked(surfaceMaterial(def.wallColor, def.wallFinish), lightmap)),
  );
  for (const mesh of mergedByMaterial(leaves, lightmap)) group.add(mesh);
  if (glassGeometries.length > 0) {
    const glassMaterial = new THREE.MeshLambertMaterial({
      color: def.glassColor,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
    });
    const glass = mergedMesh(glassGeometries, glassMaterial);
    glass.name = "glass";
    group.add(glass);
    group.add(
      mergedMesh(frameGeometries, new THREE.MeshLambertMaterial({ color: def.frameColor })),
    );
  }

  // Floors (per color), ceilings and lowered-ceiling soffits (HSFP)
  const ceilingGeometries: THREE.BufferGeometry[] = [];
  for (const area of def.areas) {
    if (area.outdoor) continue;
    ceilingGeometries.push(
      uv1(
        finished(horizontalPlane(area.rect, wallHeight, false), def.ceilingFinish),
        slab(area.rect, wallHeight, false),
      ),
    );
    if (area.ceiling !== undefined && area.ceiling < wallHeight) {
      const box = rectBox(area.rect, area.ceiling, wallHeight);
      ceilingGeometries.push(uv1(finished(boxGeometry(box), def.ceilingFinish), box));
    }
  }
  for (const mesh of mergedByMaterial(
    def.areas.map((area, i) => ({
      color: area.floorColor,
      finish: area.floorFinish,
      room: area.room ?? area.label ?? `#${i}`,
      geometry: uv1(
        finished(horizontalPlane(area.rect, 0, true), area.floorFinish),
        slab(area.rect, 0, true),
      ),
    })),
    lightmap,
  )) {
    group.add(mesh);
  }
  group.add(
    mergedMesh(
      ceilingGeometries,
      baked(surfaceMaterial(def.ceilingColor, def.ceilingFinish), lightmap),
    ),
  );

  // Furniture (per material), patterns start at each item's corner
  for (const mesh of mergedByMaterial(
    allFurniture(def)
      .filter((item) => !item.model)
      .map((item) => {
        const y = item.y ?? 0;
        const box = rectBox(item.rect, y, y + item.h);
        const geometry = uv1(boxGeometry(box), box);
        return {
          color: item.color,
          finish: item.finish,
          opacity: item.opacity,
          room: roomAt(def, (item.rect[0] + item.rect[2]) / 2, (item.rect[1] + item.rect[3]) / 2),
          geometry: finished(
            geometry,
            item.finish,
            item.uvOrigin ?? [item.rect[0], y, item.rect[1]],
          ),
        };
      }),
    lightmap,
  )) {
    group.add(mesh);
  }

  // Everything casts and receives sun shadows, except the glazing (lets the light in)
  group.traverse((object) => {
    if (object instanceof THREE.Mesh && object.name !== "glass") {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });

  // Detailed models (washing machine, toilet, shower), rotated to face the
  // room; the GLBs are exported at the footprint size, centered on it
  const models: ModelSlot[] = allFurniture(def)
    .filter((item) => item.model)
    .map((item) => {
      const [minX, minZ, maxX, maxZ] = item.rect;
      const [fx, fz] = facingVector(item.facing ?? "+z");
      const slot = new THREE.Group();
      slot.name = item.name;
      slot.position.set((minX + maxX) / 2, item.y ?? 0, (minZ + maxZ) / 2);
      slot.rotation.y = Math.atan2(fx, fz);
      group.add(slot);
      return { model: item.model!, slot };
    });

  return { group, colliders: buildColliders(def), models };
}
