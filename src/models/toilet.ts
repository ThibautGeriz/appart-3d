import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { chrome, darkGap, duroplast, matteBlack, porcelain, satinBlack } from "./materials";
import { loft, mesh, outline } from "./shapes";

/** Seat height of a wall-hung bowl (top of the ceramic). */
export const BOWL_TOP = 0.405;

/**
 * Bowl body, horizontal sections (height, half-width, length from the wall)
 * for a 36 × 56 cm rimless wall-hung bowl. Short low sections near the wall
 * make the underside sweep up towards the front.
 */
const BOWL_SECTIONS: [number, number, number][] = [
  [0.105, 0.085, 0.1],
  [0.12, 0.125, 0.17],
  [0.15, 0.152, 0.27],
  [0.2, 0.168, 0.38],
  [0.26, 0.177, 0.465],
  [0.32, 0.18, 0.525],
  [0.37, 0.181, 0.553],
  [0.395, 0.179, 0.56],
  [BOWL_TOP, 0.172, 0.556],
];

/** Plan outline from the wall (z = back) towards +z. Flat and square at the wall. */
function planOutline(
  segments: number,
  a: number,
  length: number,
  back: number,
  nBack = 6,
): THREE.Vector2[] {
  const rear = length * 0.42;
  return outline(segments, a, length - rear, rear, 2.4, nBack).map(
    (p) => new THREE.Vector2(p.x, p.y + back + rear),
  );
}

function bowl(w: number, d: number): THREE.BufferGeometry {
  const sx = w / 0.36;
  const sz = d / 0.56;
  const back = -d / 2;
  const curve = new THREE.CatmullRomCurve3(
    BOWL_SECTIONS.map(([y, a, l]) => new THREE.Vector3(a * sx, y, l * sz)),
  );
  const rings = curve
    .getPoints(48)
    .map(({ x: a, y, z: length }) =>
      planOutline(96, a, length, back).map((p) => new THREE.Vector3(p.x, y, p.y)),
    );
  return loft(rings);
}

/**
 * Extrude a plan shape downwards from `top`, with rounded (bevelled) edges.
 * Shape coordinates are (x, z).
 */
function slab(shape: THREE.Shape, top: number, thickness: number, bevel: number) {
  const depth = Math.max(thickness - 2 * bevel, 0.001);
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 12,
  });
  // shape y → world z, extrusion → world -y
  g.rotateX(Math.PI / 2);
  g.translate(0, top - bevel, 0);
  return g;
}

/**
 * Rimless wall-hung toilet (lid closed) and its dual-flush plate on the
 * boxed-in cistern. Origin: floor, centered on the footprint, the wall at
 * z = -d/2, front facing +z.
 */
export function toilet(w: number, d: number): THREE.Group {
  const g = new THREE.Group();
  g.name = "toilet";
  const back = -d / 2;
  const sx = w / 0.36;

  g.add(mesh(bowl(w, d), porcelain, 0, 0, 0, "bowl"));

  // Seat (ring) and lid, from the hinges to the front of the bowl
  const seatBack = back + 0.1;
  const seatLength = d - 0.1 - 0.004;
  const seat = new THREE.Shape(planOutline(72, 0.169 * sx, seatLength, seatBack, 3.2));
  seat.holes.push(
    new THREE.Path(planOutline(72, 0.112 * sx, seatLength - 0.13, seatBack + 0.075, 2.6)),
  );
  const seatTop = BOWL_TOP + 0.026;
  g.add(mesh(slab(seat, seatTop, 0.021, 0.006), duroplast, 0, 0, 0, "seat"));
  // the seat rests on four small bumpers: a dark shadow line under it
  g.add(
    mesh(
      slab(
        new THREE.Shape(planOutline(48, 0.15 * sx, seatLength - 0.06, seatBack + 0.03, 3)),
        seatTop - 0.019,
        0.003,
        0.001,
      ),
      darkGap,
      0,
      0,
      0,
      "seat shadow",
    ),
  );
  const lid = new THREE.Shape(
    planOutline(72, 0.172 * sx, seatLength + 0.002, seatBack - 0.004, 3.2),
  );
  const lidTop = seatTop + 0.026;
  g.add(mesh(slab(lid, lidTop, 0.024, 0.008), duroplast, 0, 0, 0, "lid"));

  // Hinges: chrome barrels on small mounting blocks
  for (const side of [-1, 1]) {
    const x = side * 0.075 * sx;
    const base = mesh(
      new RoundedBoxGeometry(0.03, 0.012, 0.045, 3, 0.005),
      chrome,
      x,
      BOWL_TOP + 0.006,
      seatBack - 0.012,
      "hinge base",
    );
    const barrel = mesh(
      new THREE.CylinderGeometry(0.011, 0.011, 0.034, 24),
      chrome,
      x,
      seatTop - 0.004,
      seatBack - 0.012,
      "hinge",
    );
    barrel.rotation.z = Math.PI / 2;
    g.add(base, barrel);
  }

  // Dual-flush plate (matte black, two push buttons), centered above the bowl
  const plateY = 1.0;
  const plateW = 0.246;
  const plateH = 0.164;
  g.add(
    mesh(
      new RoundedBoxGeometry(plateW, plateH, 0.012, 4, 0.004),
      matteBlack,
      0,
      plateY,
      back + 0.006,
      "flush plate",
    ),
  );
  // recess the buttons sit in
  g.add(
    mesh(
      new RoundedBoxGeometry(plateW - 0.03, plateH - 0.03, 0.004, 2, 0.0015),
      darkGap,
      0,
      plateY,
      back + 0.011,
    ),
  );
  // small (left) and large (right) flush buttons
  const gap = 0.004;
  const inner = plateW - 0.034;
  const small = inner * 0.38;
  const large = inner - small - gap;
  for (const [bw, cx] of [
    [small, -inner / 2 + small / 2],
    [large, inner / 2 - large / 2],
  ]) {
    g.add(
      mesh(
        new RoundedBoxGeometry(bw, plateH - 0.034, 0.006, 3, 0.002),
        satinBlack,
        cx,
        plateY,
        back + 0.0135,
        "flush button",
      ),
    );
  }
  return g;
}
