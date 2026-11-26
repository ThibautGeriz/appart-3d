import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { wood } from "./materials";
import { loft, mesh, outline, scaleUVs, seeded, WOOD_TEXTURE_SIZE } from "./shapes";

/** Mannequin height (top of the head), eyes at about 1.6 m like the player. */
export const MANNEQUIN_HEIGHT = 1.74;

const random = seeded(7);

/**
 * Turned limb segment hanging down from its pivot: radius r0 at the top, r1 at
 * the bottom, with a muscle bulge and rounded ends. Grain runs along the limb.
 */
function limb(length: number, r0: number, r1: number, bulge = 0): THREE.BufferGeometry {
  const steps = 20;
  const end = 0.08;
  const points: THREE.Vector2[] = [];
  for (let i = steps; i >= 0; i--) {
    const t = i / steps; // 0 = top, 1 = bottom; lathe profile goes bottom → top
    const round = Math.min(1, Math.sqrt(Math.min(t, 1 - t) / end));
    const r = (r0 + (r1 - r0) * t + bulge * Math.sin(Math.PI * t)) * round;
    points.push(new THREE.Vector2(Math.max(r, 0), -t * length));
  }
  const g = new THREE.LatheGeometry(points, 40);
  const avgR = (r0 + r1) / 2 + bulge / 2;
  scaleUVs(g, (2 * Math.PI * avgR) / WOOD_TEXTURE_SIZE, length / WOOD_TEXTURE_SIZE, random());
  return g;
}

/** Ball joint. */
function ball(r: number): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(r, 32, 20);
  scaleUVs(g, (2 * Math.PI * r) / WOOD_TEXTURE_SIZE, (Math.PI * r) / WOOD_TEXTURE_SIZE, random());
  return g;
}

/** Torso piece lofted through elliptical-ish sections (y, half-width, half-depth). */
function torsoPiece(sections: [number, number, number][]): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(sections.map(([y, a, b]) => new THREE.Vector3(a, y, b)));
  const rings = curve
    .getPoints(28)
    .map(({ x: a, y, z: b }) =>
      outline(64, a, b, b, 2.6, 2.6).map((p) => new THREE.Vector3(p.x, y, p.y)),
    );
  return loft(rings);
}

/** Pivot node (a joint) with its wooden parts. */
function joint(
  name: string,
  x: number,
  y: number,
  z: number,
  ...parts: THREE.Object3D[]
): THREE.Group {
  const j = new THREE.Group();
  j.name = name;
  j.position.set(x, y, z);
  j.add(...parts);
  return j;
}

function arm(side: 1 | -1): THREE.Group {
  const s = side === 1 ? "L" : "R";
  const hand = mesh(new THREE.SphereGeometry(1, 32, 20), wood, 0, -0.085, 0.005, `hand_${s}`);
  hand.scale.set(0.022, 0.085, 0.045);
  const thumb = mesh(limb(0.05, 0.011, 0.008), wood, 0, -0.02, 0.03);
  thumb.rotation.x = -0.6;
  const wrist = joint(`wrist_${s}`, 0, -0.25, 0, mesh(ball(0.021), wood), hand, thumb);
  wrist.rotation.z = side * 0.05;
  const elbow = joint(
    `elbow_${s}`,
    0,
    -0.285,
    0,
    mesh(ball(0.034), wood),
    mesh(limb(0.25, 0.032, 0.022, 0.006), wood),
    wrist,
  );
  elbow.rotation.x = -0.18; // forearm slightly forward
  const shoulder = joint(
    `shoulder_${s}`,
    side * 0.2,
    1.405,
    0,
    mesh(ball(0.05), wood),
    mesh(limb(0.285, 0.042, 0.032, 0.006), wood),
    elbow,
  );
  shoulder.rotation.z = side * 0.12; // arms a little away from the body
  shoulder.rotation.x = 0.04;
  return shoulder;
}

function leg(side: 1 | -1): THREE.Group {
  const s = side === 1 ? "L" : "R";
  const footGeometry = new RoundedBoxGeometry(0.085, 0.055, 0.24, 4, 0.024);
  scaleUVs(footGeometry, 0.24 / WOOD_TEXTURE_SIZE, 0.24 / WOOD_TEXTURE_SIZE, random());
  const foot = mesh(footGeometry, wood, 0, -0.057, 0.055, `foot_${s}`);
  foot.rotation.x = 0.04;
  const ankle = joint(`ankle_${s}`, 0, -0.4, 0, mesh(ball(0.032), wood), foot);
  const knee = joint(
    `knee_${s}`,
    0,
    -0.41,
    0,
    mesh(ball(0.046), wood),
    mesh(limb(0.4, 0.046, 0.03, 0.01), wood),
    ankle,
  );
  knee.rotation.x = 0.03;
  const hip = joint(
    `hip_${s}`,
    side * 0.09,
    0.9,
    0,
    mesh(ball(0.062), wood),
    mesh(limb(0.41, 0.07, 0.047, 0.006), wood),
    knee,
  );
  hip.rotation.x = -0.03;
  hip.rotation.z = side * 0.02;
  return hip;
}

/**
 * Artist's wooden mannequin, 1.74 m, relaxed standing pose. Built as a
 * hierarchy of named joints (hips, spine, neck, shoulder_L, elbow_L, …) so it
 * can be posed or animated later. Origin at the feet, facing +z.
 */
export function mannequin(): THREE.Group {
  const root = new THREE.Group();
  root.name = "mannequin";

  const pelvis = mesh(
    torsoPiece([
      [0.84, 0.1, 0.08],
      [0.9, 0.155, 0.1],
      [0.97, 0.165, 0.105],
      [1.03, 0.14, 0.095],
      [1.065, 0.07, 0.05], // closes inside the waist joint, no flat lid
    ]),
    wood,
  );
  const chest = mesh(
    torsoPiece([
      [1.06, 0.07, 0.05],
      [1.1, 0.13, 0.09],
      [1.18, 0.145, 0.1],
      [1.3, 0.175, 0.11],
      [1.38, 0.19, 0.105],
      [1.43, 0.165, 0.09],
      [1.455, 0.09, 0.06],
    ]),
    wood,
  );
  const waist = mesh(ball(0.085), wood, 0, 1.06, 0);
  waist.scale.set(1.35, 0.6, 1.05);

  const head = mesh(new THREE.SphereGeometry(1, 48, 32), wood, 0, 0.075, 0.008, "head");
  head.scale.set(0.088, 0.118, 0.102);
  // slight chin: tilt the egg forward
  head.rotation.x = -0.12;
  const neck = joint(
    "neck",
    0,
    1.48,
    0,
    mesh(limb(0.09, 0.038, 0.042), wood, 0, 0.07, 0),
    mesh(ball(0.044), wood),
  );
  const headJoint = joint("head", 0, 0.07, 0.005, head);
  neck.add(headJoint);

  const spine = joint("spine", 0, 0, 0, chest, waist, neck, arm(1), arm(-1));
  root.add(joint("hips", 0, 0, 0, pelvis, spine, leg(1), leg(-1)));
  return root;
}
