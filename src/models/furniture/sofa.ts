import * as THREE from "three";
import type { Product } from "../../data/catalog";
import { romaFabric, titanio } from "./materials";
import { board } from "./parts";

/*
 * Mobilier de France ROMA, in 3D mesh fabric: low upholstered base on slim
 * titanio blade legs (13.5 cm), seat cushions quilted in four with a button,
 * tall back cushions in two parts (lower back + headrest), wide flat arms.
 * Origin: floor, centre of the bounding box, the long side's front facing +z;
 * a corner sofa's return is on the left (-x) and comes forward (+z).
 */

const LEG = 0.135; // leg height (product sheet)
const BASE_TOP = 0.31; // top of the upholstered base
const ARM = 0.24; // arm width
const ARM_TOP = 0.5;
const RAIL = 0.09; // upholstered back rail thickness
const BACK = 0.15; // back cushion thickness
const RECLINE = 0.08; // back cushions lean back (rad)

/** Plan rectangle in sofa coordinates. */
interface Box2 {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

const cx = (b: Box2) => (b.x0 + b.x1) / 2;
const cz = (b: Box2) => (b.z0 + b.z1) / 2;

function base(g: THREE.Group, b: Box2, top = BASE_TOP): void {
  g.add(
    board(b.x1 - b.x0, top - LEG, b.z1 - b.z0, romaFabric, cx(b), (LEG + top) / 2, cz(b), 0.03),
  );
}

/** Seat cushion quilted in four panels (seams between them) with a button in the middle. */
function seatCushion(g: THREE.Group, b: Box2, top: number): void {
  const seam = 0.006;
  const w = (b.x1 - b.x0 - seam) / 2;
  const d = (b.z1 - b.z0 - seam) / 2;
  const h = top - BASE_TOP;
  for (const i of [0, 1]) {
    for (const j of [0, 1]) {
      g.add(
        board(
          w,
          h,
          d,
          romaFabric,
          b.x0 + w / 2 + i * (w + seam),
          BASE_TOP + h / 2,
          b.z0 + d / 2 + j * (d + seam),
          0.035,
        ),
      );
    }
  }
  const button = new THREE.Mesh(new THREE.SphereGeometry(0.009, 16, 10), romaFabric);
  button.position.set(cx(b), top - 0.006, cz(b));
  button.scale.y = 0.5;
  g.add(button);
}

/**
 * Back cushion standing on the seat, its back against the rail, in two parts
 * (lower back + headrest), reclined. `facing` +z: along x; +x: along z.
 */
function backCushion(
  g: THREE.Group,
  from: number,
  to: number,
  at: number,
  facing: "+z" | "+x",
  top: number,
  seat: number,
): void {
  const length = to - from - 0.02;
  // reclined, the front top edge rises by BACK·sin: keep it at `top`
  const height = (top - seat - BACK * Math.sin(RECLINE)) / Math.cos(RECLINE) - 0.002;
  const pivot = new THREE.Group();
  const lower = height * 0.56;
  const upper = height - lower - 0.008;
  // built facing +z: back face at z = 0, front at z = BACK
  pivot.add(board(length, lower, BACK, romaFabric, 0, lower / 2, BACK / 2, 0.04));
  pivot.add(
    board(length, upper, BACK * 0.9, romaFabric, 0, lower + 0.008 + upper / 2, BACK * 0.45, 0.04),
  );
  pivot.rotation.x = -RECLINE; // top leans back
  const holder = new THREE.Group();
  holder.add(pivot);
  if (facing === "+z") {
    holder.position.set((from + to) / 2, seat, at + RECLINE * height * 0.5);
  } else {
    holder.rotation.y = Math.PI / 2; // local +z → +x
    holder.position.set(at + RECLINE * height * 0.5, seat, (from + to) / 2);
  }
  g.add(holder);
}

/** Wide flat arm: base block and a padded top. */
function arm(g: THREE.Group, b: Box2): void {
  base(g, b, ARM_TOP - 0.09);
  g.add(board(b.x1 - b.x0, 0.09, b.z1 - b.z0, romaFabric, cx(b), ARM_TOP - 0.045, cz(b), 0.035));
}

/** Slim blade leg, leaning out towards (dx, dz). */
function leg(g: THREE.Group, x: number, z: number, dx: number, dz: number): void {
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.012, LEG + 0.02, 0.07), titanio);
  m.position.set(x, (LEG + 0.02) / 2, z);
  m.rotation.y = Math.atan2(dx, dz);
  m.rotation.x = 0; // the blade itself is vertical; its foot points outwards
  const foot = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.008, 0.11), titanio);
  foot.position.set(x + dx * 0.02, 0.004, z + dz * 0.02);
  foot.rotation.y = Math.atan2(dx, dz);
  g.add(m, foot);
}

export function roma(p: Product): THREE.Group {
  const g = new THREE.Group();
  g.name = p.id;
  const W = p.w;
  const D = p.d;
  const depth = p.sofa?.depth ?? D;
  const seatTop = p.seatHeight ?? 0.44;
  const corner = D > depth + 0.01;
  const back = -D / 2;
  const left = -W / 2;
  const inset = 0.07;

  // Long side: [corner block | seats | arm], or [arm | seats | arm]
  const longStart = corner ? left + depth : left + ARM;
  const seatsEnd = W / 2 - ARM;
  const seatCount = Math.max(1, Math.round((seatsEnd - longStart) / 0.95));
  const seatW = (seatsEnd - longStart) / seatCount;
  const front = back + depth;
  const backFront = back + RAIL + BACK; // seat cushions start in front of the backs

  if (!corner) arm(g, { x0: left, x1: left + ARM, z0: back, z1: front });
  arm(g, { x0: seatsEnd, x1: W / 2, z0: back, z1: front });
  // rail along the back of the long side
  g.add(
    board(
      W - (corner ? 0 : 2 * ARM),
      0.62 - BASE_TOP,
      RAIL,
      romaFabric,
      corner ? 0 : 0,
      (BASE_TOP + 0.62) / 2,
      back + RAIL / 2,
      0.03,
    ),
  );
  for (let i = 0; i < seatCount; i++) {
    const x0 = longStart + i * seatW;
    base(g, { x0, x1: x0 + seatW, z0: back, z1: front });
    seatCushion(g, { x0: x0 + 0.005, x1: x0 + seatW - 0.005, z0: backFront, z1: front }, seatTop);
    backCushion(g, x0, x0 + seatW, back + RAIL, "+z", p.h, seatTop);
  }

  if (corner) {
    // corner block: backs on both rear sides
    const leftFront = left + RAIL + BACK;
    base(g, { x0: left, x1: left + depth, z0: back, z1: front });
    seatCushion(
      g,
      { x0: leftFront, x1: left + depth - 0.005, z0: backFront, z1: front - 0.005 },
      seatTop,
    );
    backCushion(g, left + RAIL, left + depth, back + RAIL, "+z", p.h, seatTop);
    // return: rail along the left side, seat(s), arm at its end
    const returnEnd = D / 2 - ARM;
    g.add(
      board(
        RAIL,
        0.62 - BASE_TOP,
        D - RAIL,
        romaFabric,
        left + RAIL / 2,
        (BASE_TOP + 0.62) / 2,
        back + RAIL + (D - RAIL) / 2,
        0.03,
      ),
    );
    const seats = Math.max(1, Math.round((returnEnd - front) / 0.95));
    const len = (returnEnd - front) / seats;
    for (let i = 0; i < seats; i++) {
      const z0 = front + i * len;
      base(g, { x0: left, x1: left + depth, z0, z1: z0 + len });
      seatCushion(
        g,
        { x0: leftFront, x1: left + depth, z0: z0 + 0.005, z1: z0 + len - 0.005 },
        seatTop,
      );
      backCushion(g, z0, z0 + len, left + RAIL, "+x", p.h, seatTop);
    }
    backCushion(g, back + RAIL + BACK, front, left + RAIL, "+x", p.h, seatTop); // corner's side back
    arm(g, { x0: left, x1: left + depth, z0: returnEnd, z1: D / 2 });
    // legs: outer corners, inner corner, return end
    leg(g, left + inset, back + inset, -1, -1);
    leg(g, W / 2 - inset, back + inset, 1, -1);
    leg(g, W / 2 - inset, front - inset, 1, 1);
    leg(g, left + depth - inset, front + inset, 1, 1);
    leg(g, left + inset, D / 2 - inset, -1, 1);
    leg(g, left + depth - inset, D / 2 - inset, 1, 1);
  } else {
    leg(g, left + inset, back + inset, -1, -1);
    leg(g, W / 2 - inset, back + inset, 1, -1);
    leg(g, left + inset, front - inset, -1, 1);
    leg(g, W / 2 - inset, front - inset, 1, 1);
  }
  return g;
}

export const SOFA_BUILDERS: Record<string, (p: Product) => THREE.Group> = {
  "sofa-roma-corner": roma,
  "sofa-roma-210": roma,
};
