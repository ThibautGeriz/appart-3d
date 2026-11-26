import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { ApartmentDef, Rect } from "../data/apartment";
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

/** Group geometries by color and merge each group. */
function mergedByColor(items: { color: string; geometry: THREE.BufferGeometry }[]): THREE.Mesh[] {
  const byColor = new Map<string, THREE.BufferGeometry[]>();
  for (const { color, geometry } of items) {
    byColor.set(color, [...(byColor.get(color) ?? []), geometry]);
  }
  return [...byColor].map(([color, geometries]) =>
    mergedMesh(geometries, new THREE.MeshLambertMaterial({ color })),
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
    wallGeometries.push(...pieces.solid.map(boxGeometry));
    for (const leaf of pieces.leaves) {
      leaves.push({ color: leaf.color, geometry: boxGeometry(leaf.box) });
    }
    glassGeometries.push(...pieces.glass.map(boxGeometry));
    for (const glass of pieces.glass) frameGeometries.push(...frameBoxes(glass).map(boxGeometry));
  }
  group.add(mergedMesh(wallGeometries, new THREE.MeshLambertMaterial({ color: def.wallColor })));
  for (const mesh of mergedByColor(leaves)) group.add(mesh);
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
    ceilingGeometries.push(horizontalPlane(area.rect, wallHeight, false));
    if (area.ceiling !== undefined && area.ceiling < wallHeight) {
      ceilingGeometries.push(boxGeometry(rectBox(area.rect, area.ceiling, wallHeight)));
    }
  }
  for (const mesh of mergedByColor(
    def.areas.map((area) => ({
      color: area.floorColor,
      geometry: horizontalPlane(area.rect, 0, true),
    })),
  )) {
    group.add(mesh);
  }
  group.add(
    mergedMesh(ceilingGeometries, new THREE.MeshLambertMaterial({ color: def.ceilingColor })),
  );

  // Furniture (per color)
  for (const mesh of mergedByColor(
    def.furniture.map((item) => {
      const y = item.y ?? 0;
      return { color: item.color, geometry: boxGeometry(rectBox(item.rect, y, y + item.h)) };
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
