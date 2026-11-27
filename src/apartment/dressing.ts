import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { ApartmentDef, Facing, WallDef } from "../data/apartment";
import { wallLength, type Box } from "./plan";
import { roomAt } from "./furnishing";
import { facingVector } from "./facing";

/*
 * Set dressing derived from the layout: what makes a room look finished.
 * Skirting boards along the interior wall faces (not across door openings),
 * door frames, window sills, light switches by the doors, the sockets of the
 * plans, and curtains at the windows. Pure geometry planning first (boxes),
 * then meshes merged per room and material (each room has its own probe).
 */

const SKIRTING = { height: 0.07, thickness: 0.012 };
const ARCHITRAVE = { width: 0.065, thickness: 0.014 };
const PLATE = 0.082; // switch / socket plate

export type DressingKind = "skirting" | "architrave" | "sill" | "plate" | "socketHole" | "rod";

export interface DressingBox {
  kind: DressingKind;
  box: Box;
}

/**
 * Is the side `side` of a wall indoors at `along` (metres from the wall's
 * start)? Not outdoors (the balcony is an area too), not outside the plan. Pure.
 */
export function sideIndoors(
  def: ApartmentDef,
  wall: WallDef,
  side: 1 | -1,
  along: number,
): boolean {
  const alongX = wall.from[1] === wall.to[1];
  const start = alongX ? Math.min(wall.from[0], wall.to[0]) : Math.min(wall.from[1], wall.to[1]);
  const n = (alongX ? wall.from[1] : wall.from[0]) + side * (wall.thickness / 2 + 0.08);
  const [x, z] = alongX ? [start + along, n] : [n, start + along];
  const area = def.areas.find(
    ({ rect }) => x > rect[0] && x < rect[2] && z > rect[1] && z < rect[3],
  );
  return area !== undefined && !area.outdoor;
}

const SIDES = [1, -1] as const;

/** Box from wall-local coordinates: `a…b` along the wall, `n0…n1` off its centre line, `y0…y1`. */
function wallBox(
  wall: WallDef,
  a: number,
  b: number,
  n0: number,
  n1: number,
  y0: number,
  y1: number,
): Box {
  const alongX = wall.from[1] === wall.to[1];
  const start = alongX ? Math.min(wall.from[0], wall.to[0]) : Math.min(wall.from[1], wall.to[1]);
  const c = alongX ? wall.from[1] : wall.from[0];
  const [lo, hi] = [Math.min(n0, n1), Math.max(n0, n1)];
  return alongX
    ? { minX: start + a, maxX: start + b, minY: y0, maxY: y1, minZ: c + lo, maxZ: c + hi }
    : { minX: c + lo, maxX: c + hi, minY: y0, maxY: y1, minZ: start + a, maxZ: start + b };
}

/** Skirting boards, door frames, sills, switches by the doors. Pure. */
export function dressingPlan(def: ApartmentDef): DressingBox[] {
  const out: DressingBox[] = [];
  for (const wall of def.walls) {
    const len = wallLength(wall);
    const half = wall.thickness / 2;
    const openings = [...(wall.openings ?? [])].sort((p, q) => p.at - q.at);
    for (const side of SIDES) {
      const face = side * half;
      const proud = (t: number) => [face, face + side * t] as const;
      // skirting: the wall's length minus the floor-level openings, where that side is indoors
      let cursor = 0;
      for (const o of [
        ...openings.filter((o) => o.sill === 0),
        { at: len, width: 0, sill: 0, head: 0 },
      ]) {
        if (o.at - cursor > 0.05 && sideIndoors(def, wall, side, (cursor + o.at) / 2)) {
          out.push({
            kind: "skirting",
            box: wallBox(wall, cursor, o.at, ...proud(SKIRTING.thickness), 0, SKIRTING.height),
          });
        }
        cursor = Math.max(cursor, o.at + o.width);
      }
      for (const o of openings) {
        if (!sideIndoors(def, wall, side, o.at + o.width / 2)) continue;
        const a = o.at;
        const b = o.at + o.width;
        if (o.sill === 0 && !o.glass) {
          // door: two jambs and a head, then a switch on the lock side
          const w = ARCHITRAVE.width;
          out.push({
            kind: "architrave",
            box: wallBox(wall, a - w, a, ...proud(ARCHITRAVE.thickness), 0, o.head + w),
          });
          out.push({
            kind: "architrave",
            box: wallBox(wall, b, b + w, ...proud(ARCHITRAVE.thickness), 0, o.head + w),
          });
          out.push({
            kind: "architrave",
            box: wallBox(wall, a, b, ...proud(ARCHITRAVE.thickness), o.head, o.head + w),
          });
          const at = b + w + 0.1;
          if (at + PLATE < len) {
            out.push({
              kind: "plate",
              box: wallBox(
                wall,
                at,
                at + PLATE,
                ...proud(0.01),
                1.05 - PLATE / 2,
                1.05 + PLATE / 2,
              ),
            });
          }
        } else if (o.sill > 0 && o.glass) {
          // window: an inner sill board
          out.push({
            kind: "sill",
            box: wallBox(wall, a - 0.02, b + 0.02, ...proud(0.035), o.sill - 0.02, o.sill),
          });
        }
        if (o.glass) {
          // curtain rod across the window, past its sides
          out.push({
            kind: "rod",
            box: wallBox(
              wall,
              a - 0.18,
              b + 0.18,
              face + side * 0.07,
              face + side * 0.085,
              o.head + 0.09,
              o.head + 0.105,
            ),
          });
        }
      }
    }
  }
  return out;
}

export interface OutletDef {
  /** point on the wall face */
  at: [number, number];
  /** the way the plate faces (into the room) */
  facing: Facing;
  y: number;
  kind: "socket" | "switch";
}

/** Sockets and switches of the plans: a plate, and for a socket its two holes. Pure. */
export function outletBoxes(outlets: OutletDef[]): DressingBox[] {
  const out: DressingBox[] = [];
  for (const o of outlets) {
    const [fx, fz] = facingVector(o.facing);
    const [x, z] = o.at;
    const h = PLATE / 2;
    const plate: Box =
      fx !== 0
        ? {
            minX: Math.min(x, x + fx * 0.01),
            maxX: Math.max(x, x + fx * 0.01),
            minY: o.y - h,
            maxY: o.y + h,
            minZ: z - h,
            maxZ: z + h,
          }
        : {
            minX: x - h,
            maxX: x + h,
            minY: o.y - h,
            maxY: o.y + h,
            minZ: Math.min(z, z + fz * 0.01),
            maxZ: Math.max(z, z + fz * 0.01),
          };
    out.push({ kind: "plate", box: plate });
    if (o.kind === "socket") {
      for (const s of [-1, 1]) {
        const c = 0.0095;
        const along = s * 0.0095;
        out.push({
          kind: "socketHole",
          box:
            fx !== 0
              ? {
                  minX: Math.min(x + fx * 0.0101, x + fx * 0.0106),
                  maxX: Math.max(x + fx * 0.0101, x + fx * 0.0106),
                  minY: o.y - 0.003,
                  maxY: o.y + 0.003,
                  minZ: z + along - c / 3,
                  maxZ: z + along + c / 3,
                }
              : {
                  minX: x + along - c / 3,
                  maxX: x + along + c / 3,
                  minY: o.y - 0.003,
                  maxY: o.y + 0.003,
                  minZ: Math.min(z + fz * 0.0101, z + fz * 0.0106),
                  maxZ: Math.max(z + fz * 0.0101, z + fz * 0.0106),
                },
        });
      }
    }
  }
  return out;
}

/** Curtains at a window: a pleated panel on each side, from the rod to the floor. */
export interface CurtainPlan {
  /** the panel's span along the wall (world), its plane, its side */
  wall: WallDef;
  side: 1 | -1;
  a: number;
  b: number;
  top: number;
}

export function curtainPlan(def: ApartmentDef): CurtainPlan[] {
  const out: CurtainPlan[] = [];
  for (const wall of def.walls) {
    for (const side of SIDES) {
      for (const o of wall.openings ?? []) {
        if (!o.glass || !sideIndoors(def, wall, side, o.at + o.width / 2)) continue;
        const width = Math.max(0.3, Math.min(0.5, o.width * 0.28));
        out.push({ wall, side, a: o.at - 0.14, b: o.at - 0.14 + width, top: o.head + 0.08 });
        out.push({
          wall,
          side,
          a: o.at + o.width + 0.14 - width,
          b: o.at + o.width + 0.14,
          top: o.head + 0.08,
        });
      }
    }
  }
  return out;
}

function boxGeometry(b: Box): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(b.maxX - b.minX, b.maxY - b.minY, b.maxZ - b.minZ);
  g.translate((b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2, (b.minZ + b.maxZ) / 2);
  return g;
}

/** A pleated curtain panel: folds across its width, hanging straight. */
function curtainGeometry(c: CurtainPlan): THREE.BufferGeometry {
  const width = c.b - c.a;
  const folds = Math.max(3, Math.round(width / 0.09));
  const g = new THREE.PlaneGeometry(width, c.top - 0.01, folds * 6, 1);
  const pos = g.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    pos.setZ(i, 0.022 * Math.sin(((x + width / 2) / width) * folds * Math.PI * 2));
  }
  g.translate(0, (c.top - 0.01) / 2 + 0.01, 0);
  g.computeVertexNormals();
  const alongX = c.wall.from[1] === c.wall.to[1];
  const start = alongX
    ? Math.min(c.wall.from[0], c.wall.to[0])
    : Math.min(c.wall.from[1], c.wall.to[1]);
  const off = (alongX ? c.wall.from[1] : c.wall.from[0]) + c.side * (c.wall.thickness / 2 + 0.06);
  const mid = start + (c.a + c.b) / 2;
  if (alongX) g.translate(mid, 0, off);
  else {
    g.rotateY(Math.PI / 2);
    g.translate(off, 0, mid);
  }
  return g;
}

const materials = {
  trim: new THREE.MeshStandardMaterial({ name: "trim", color: "#f2f1ec", roughness: 0.45 }),
  plate: new THREE.MeshStandardMaterial({
    name: "switch plate",
    color: "#f4f4f2",
    roughness: 0.35,
  }),
  hole: new THREE.MeshStandardMaterial({ name: "socket hole", color: "#2a2a2a", roughness: 0.8 }),
  rod: new THREE.MeshStandardMaterial({
    name: "curtain rod",
    color: "#1a1a1a",
    metalness: 0.6,
    roughness: 0.4,
  }),
  curtain: new THREE.MeshStandardMaterial({
    name: "curtain linen",
    color: "#ece6db",
    roughness: 0.95,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.88,
  }),
};

const MATERIAL_OF: Record<DressingKind, THREE.Material> = {
  skirting: materials.trim,
  architrave: materials.trim,
  sill: materials.trim,
  plate: materials.plate,
  socketHole: materials.hole,
  rod: materials.rod,
};

/** The set dressing as meshes, merged per room and material. */
export function buildDressing(def: ApartmentDef, outlets: OutletDef[]): THREE.Group {
  const group = new THREE.Group();
  group.name = "dressing";
  const buckets = new Map<
    string,
    { material: THREE.Material; room: string; geometries: THREE.BufferGeometry[] }
  >();
  const put = (material: THREE.Material, room: string, g: THREE.BufferGeometry) => {
    const key = `${material.name}|${room}`;
    const b = buckets.get(key) ?? { material, room, geometries: [] };
    b.geometries.push(g);
    buckets.set(key, b);
  };
  const roomOfBox = (b: Box) => roomAt(def, (b.minX + b.maxX) / 2, (b.minZ + b.maxZ) / 2);
  for (const d of [...dressingPlan(def), ...outletBoxes(outlets)])
    put(MATERIAL_OF[d.kind], roomOfBox(d.box), boxGeometry(d.box));
  for (const c of curtainPlan(def)) {
    const g = curtainGeometry(c);
    g.computeBoundingBox();
    const centre = g.boundingBox!.getCenter(new THREE.Vector3());
    put(materials.curtain, roomAt(def, centre.x, centre.z), g);
  }
  for (const { material, room, geometries } of buckets.values()) {
    const mesh = new THREE.Mesh(
      mergeGeometries(geometries.map((g) => (g.index ? g.toNonIndexed() : g))),
      material,
    );
    mesh.userData.room = room;
    mesh.castShadow = !material.transparent;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  return group;
}
