import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { ApartmentDef, Finish, Rect } from "../data/apartment";
import { finishSize, surfaceMaterial } from "./textures";
import { applyWorldUVs } from "./uv";
import { buildColliders, wallPieces, type Box } from "./plan";
import type { Collider } from "../player/movement";

export interface BuiltApartment {
  group: THREE.Group;
  colliders: Collider[];
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

/** Four thin bars around an opening, flush with the glass. */
function frameBoxes(opening: Box): Box[] {
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
  return [
    thin({ ...opening, maxY: opening.minY + FRAME }),
    thin({ ...opening, minY: opening.maxY - FRAME }),
    thin({ ...opening, ...span(start, start + FRAME) }),
    thin({ ...opening, ...span(end - FRAME, end) }),
  ];
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
  geometry: THREE.BufferGeometry;
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

/** Group geometries by material (color + finish) and merge each group. */
function mergedByMaterial(items: Surface[]): THREE.Mesh[] {
  const groups = new Map<string, Surface[]>();
  for (const item of items) {
    const key = `${item.color}|${item.finish ?? ""}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups.values()].map((surfaces) =>
    mergedMesh(
      surfaces.map((surface) => surface.geometry),
      surfaceMaterial(surfaces[0].color, surfaces[0].finish),
    ),
  );
}

/** Build the apartment scene graph and colliders from the layout data. */
export function buildApartment(def: ApartmentDef): BuiltApartment {
  const group = new THREE.Group();
  const { wallHeight } = def;

  // Walls, glazing and window frames
  const wallGeometries: THREE.BufferGeometry[] = [];
  const glassGeometries: THREE.BufferGeometry[] = [];
  const frameGeometries: THREE.BufferGeometry[] = [];
  const leaves: { color: string; geometry: THREE.BufferGeometry }[] = [];
  for (const wall of def.walls) {
    const pieces = wallPieces(wall, wallHeight);
    wallGeometries.push(...pieces.solid.map((b) => finished(boxGeometry(b), def.wallFinish)));
    for (const leaf of pieces.leaves) {
      leaves.push({ color: leaf.color, geometry: boxGeometry(leaf.box) });
    }
    glassGeometries.push(...pieces.glass.map(boxGeometry));
    for (const glass of pieces.glass) frameGeometries.push(...frameBoxes(glass).map(boxGeometry));
  }
  group.add(mergedMesh(wallGeometries, surfaceMaterial(def.wallColor, def.wallFinish)));
  for (const mesh of mergedByMaterial(leaves)) group.add(mesh);
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
      finished(horizontalPlane(area.rect, wallHeight, false), def.ceilingFinish),
    );
    if (area.ceiling !== undefined && area.ceiling < wallHeight) {
      ceilingGeometries.push(
        finished(boxGeometry(rectBox(area.rect, area.ceiling, wallHeight)), def.ceilingFinish),
      );
    }
  }
  for (const mesh of mergedByMaterial(
    def.areas.map((area) => ({
      color: area.floorColor,
      finish: area.floorFinish,
      geometry: finished(horizontalPlane(area.rect, 0, true), area.floorFinish),
    })),
  )) {
    group.add(mesh);
  }
  group.add(mergedMesh(ceilingGeometries, surfaceMaterial(def.ceilingColor, def.ceilingFinish)));

  // Furniture (per material), patterns start at each item's corner
  for (const mesh of mergedByMaterial(
    def.furniture.map((item) => {
      const y = item.y ?? 0;
      const geometry = boxGeometry(rectBox(item.rect, y, y + item.h));
      return {
        color: item.color,
        finish: item.finish,
        geometry: finished(geometry, item.finish, [item.rect[0], y, item.rect[1]]),
      };
    }),
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

  return { group, colliders: buildColliders(def) };
}
