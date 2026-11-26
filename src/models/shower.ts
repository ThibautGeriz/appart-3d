import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  brushedSteel,
  darkGap,
  glass,
  glassEdge,
  indicatorRed,
  matteBlack,
  satinBlack,
  silicone,
} from "./materials";
import { mesh } from "./shapes";

/** Height of the thermostatic mixer bar axis. */
export const MIXER_Y = 1.05;
/** Height of the shower arm, under the ceiling. */
export const ARM_Y = 2.03;
/** Rain head diameter. */
export const HEAD_DIAMETER = 0.25;

const PIPE = 0.0125; // riser radius (25 mm tube)
const STANDOFF = 0.065; // riser axis from the wall

/** Circular escutcheon (wall cover) facing +z at the wall. */
function escutcheon(x: number, y: number, back: number): THREE.Mesh {
  const m = mesh(
    new THREE.CylinderGeometry(0.03, 0.031, 0.008, 40),
    matteBlack,
    x,
    y,
    back + 0.004,
  );
  m.rotation.x = Math.PI / 2;
  return m;
}

/** Cylinder along the z axis (wall → room). */
function zCylinder(
  r: number,
  length: number,
  x: number,
  y: number,
  z: number,
  material: THREE.Material,
) {
  const m = mesh(new THREE.CylinderGeometry(r, r, length, 32), material, x, y, z);
  m.rotation.x = Math.PI / 2;
  return m;
}

/** Cylinder along the x axis (along the wall). */
function xCylinder(
  r: number,
  length: number,
  x: number,
  y: number,
  z: number,
  material: THREE.Material,
) {
  const m = mesh(new THREE.CylinderGeometry(r, r, length, 40), material, x, y, z);
  m.rotation.z = Math.PI / 2;
  return m;
}

/** Shower face: disc of silicone nozzles in rings, facing down, merged into one mesh. */
function nozzles(radius: number, rings: number, nub: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let ring = 0; ring <= rings; ring++) {
    const r = (ring / rings) * radius;
    const count = ring === 0 ? 1 : Math.round((2 * Math.PI * r) / (radius / rings));
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + ring * 0.37;
      const g = new THREE.CylinderGeometry(nub * 0.7, nub, 0.002, 6, 1, false);
      g.translate(Math.cos(a) * r, -0.001, Math.sin(a) * r);
      parts.push(g);
    }
  }
  return mergeGeometries(parts)!;
}

/** Thin round head: rounded rim (lathe profile) over a nozzle face. Origin at its top. */
function roundHead(radius: number, thickness: number, nozzleRings: number): THREE.Group {
  const g = new THREE.Group();
  const e = thickness / 2;
  const profile: THREE.Vector2[] = [new THREE.Vector2(0, -thickness)];
  for (let i = 0; i <= 12; i++) {
    const a = -Math.PI / 2 + (i / 12) * Math.PI;
    profile.push(new THREE.Vector2(radius - e + Math.cos(a) * e, -e + Math.sin(a) * e));
  }
  profile.push(new THREE.Vector2(0, 0));
  g.add(mesh(new THREE.LatheGeometry(profile, 96), matteBlack, 0, 0, 0, "head"));
  g.add(
    mesh(nozzles(radius - e - 0.012, nozzleRings, 0.0022), silicone, 0, -thickness, 0, "nozzles"),
  );
  return g;
}

/**
 * Thermostatic rain shower column, wall-mounted: mixer bar with temperature
 * and flow knobs, riser bending into the arm, 25 cm round rain head, hand
 * shower in a holder on the riser, and its hose looping down from the mixer.
 * Origin: floor, the wall at z = -d/2 (riser at x = 0), facing +z.
 */
export function showerSet(_w: number, d: number): THREE.Group {
  const g = new THREE.Group();
  g.name = "shower set";
  const back = -d / 2;
  const axisZ = back + STANDOFF;

  // Mixer bar on two S-unions (150 mm centres)
  const barLength = 0.27;
  g.add(xCylinder(0.026, barLength - 0.09, 0, MIXER_Y, axisZ, matteBlack));
  for (const side of [-1, 1]) {
    const x = side * 0.075;
    g.add(escutcheon(x, MIXER_Y, back));
    g.add(
      zCylinder(
        0.011,
        STANDOFF - 0.01,
        x,
        MIXER_Y,
        back + (STANDOFF - 0.01) / 2 + 0.008,
        matteBlack,
      ),
    );
    // knob: knurled grip (rings) and a flat end cap
    const knobX = side * (barLength / 2 - 0.025);
    g.add(xCylinder(0.029, 0.048, knobX, MIXER_Y, axisZ, satinBlack));
    for (let i = 0; i < 4; i++) {
      const ring = mesh(
        new THREE.TorusGeometry(0.029, 0.0016, 8, 48),
        matteBlack,
        knobX + (i - 1.5) * 0.009,
        MIXER_Y,
        axisZ,
      );
      ring.rotation.y = Math.PI / 2;
      g.add(ring);
    }
  }
  // 38 °C safety stop on the temperature knob (left)
  const stop = mesh(
    new THREE.TorusGeometry(0.0292, 0.0012, 8, 48),
    indicatorRed,
    -(barLength / 2 - 0.004),
    MIXER_Y,
    axisZ,
  );
  stop.rotation.y = Math.PI / 2;
  g.add(stop);

  // Riser → bend → arm, one continuous tube
  const headZ = back + STANDOFF + 0.24;
  const path = new THREE.CurvePath<THREE.Vector3>();
  const bendStart = new THREE.Vector3(0, ARM_Y - 0.07, axisZ);
  const bendEnd = new THREE.Vector3(0, ARM_Y, axisZ + 0.07);
  path.add(new THREE.LineCurve3(new THREE.Vector3(0, MIXER_Y + 0.02, axisZ), bendStart));
  path.add(new THREE.QuadraticBezierCurve3(bendStart, new THREE.Vector3(0, ARM_Y, axisZ), bendEnd));
  path.add(new THREE.LineCurve3(bendEnd, new THREE.Vector3(0, ARM_Y, headZ)));
  g.add(mesh(new THREE.TubeGeometry(path, 160, PIPE, 24, false), matteBlack, 0, 0, 0, "riser"));
  // swivel joint and rain head
  g.add(mesh(new THREE.SphereGeometry(PIPE * 1.15, 24, 16), matteBlack, 0, ARM_Y, headZ));
  g.add(
    mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.02, 32), matteBlack, 0, ARM_Y - 0.012, headZ),
  );
  const head = roundHead(HEAD_DIAMETER / 2, 0.008, 9);
  head.position.set(0, ARM_Y - 0.022, headZ);
  g.add(head);
  // wall bracket holding the riser
  const bracketY = ARM_Y - 0.2;
  g.add(escutcheon(0, bracketY, back));
  g.add(zCylinder(0.008, STANDOFF, 0, bracketY, back + STANDOFF / 2, matteBlack));

  // Hand shower in a clamp holder on the riser
  const holderY = 1.42;
  g.add(
    mesh(
      new THREE.CylinderGeometry(PIPE + 0.005, PIPE + 0.005, 0.04, 32),
      satinBlack,
      0,
      holderY,
      axisZ,
    ),
  );
  const holderArm = mesh(
    new RoundedBoxGeometry(0.06, 0.02, 0.03, 2, 0.006),
    satinBlack,
    0.035,
    holderY,
    axisZ + 0.018,
  );
  g.add(holderArm);
  const hand = new THREE.Group();
  hand.name = "hand shower";
  // handle: lathe from the hose end up to the head
  const handle = new THREE.LatheGeometry(
    [
      [0, 0],
      [0.011, 0],
      [0.012, 0.03],
      [0.0135, 0.12],
      [0.016, 0.19],
      [0.02, 0.215],
      [0, 0.215],
    ].map(([r, y]) => new THREE.Vector2(r, y)),
    40,
  );
  hand.add(mesh(handle, matteBlack));
  // conical hose nut under the handle
  hand.add(mesh(new THREE.CylinderGeometry(0.0105, 0.009, 0.022, 32), satinBlack, 0, -0.011, 0));
  const handHead = roundHead(0.05, 0.022, 4);
  handHead.rotation.x = -Math.PI / 2; // nozzle face towards +z (the room)
  handHead.position.set(0, 0.25, -0.011);
  hand.add(handHead);
  hand.position.set(0.065, holderY - 0.19, axisZ + 0.03);
  hand.rotation.x = 0.12; // the head leans forward in the cradle
  g.add(hand);

  // Hose: from the mixer's bottom outlet, a loose U down to the handle
  const outlet = new THREE.Vector3(0, MIXER_Y - 0.03, axisZ);
  const handleEnd = new THREE.Vector3(0.065, holderY - 0.19, axisZ + 0.03);
  g.add(
    mesh(
      new THREE.CylinderGeometry(0.009, 0.011, 0.025, 24),
      matteBlack,
      0,
      MIXER_Y - 0.035,
      axisZ,
    ),
  );
  const hose = new THREE.CatmullRomCurve3([
    outlet.clone().setY(outlet.y - 0.01),
    new THREE.Vector3(0.005, 0.86, axisZ + 0.02),
    new THREE.Vector3(0.03, 0.7, axisZ + 0.05),
    new THREE.Vector3(0.06, 0.68, axisZ + 0.06),
    new THREE.Vector3(0.08, 0.8, axisZ + 0.05),
    new THREE.Vector3(0.07, 1.1, axisZ + 0.035),
    handleEnd.clone().setY(handleEnd.y - 0.018),
  ]);
  g.add(mesh(new THREE.TubeGeometry(hose, 200, 0.0075, 16, false), satinBlack, 0, 0, 0, "hose"));
  return g;
}

/**
 * Fixed walk-in glass screen: 8 mm clear tempered glass with polished green
 * edges, in a matte black wall channel, top and floor profile. The wall is at
 * x = +w/2; the panel stands in the plane z = 0. Origin: floor, centered.
 */
export function showerScreen(w: number, _d: number, h: number): THREE.Group {
  const g = new THREE.Group();
  g.name = "shower screen";
  const profile = 0.02;
  const glassH = h - 2 * profile + 0.01;
  const panel = new THREE.BoxGeometry(w - 0.01, glassH, 0.008);
  // BoxGeometry groups: ±x, ±y edges, then the two faces (±z)
  g.add(
    mesh(
      panel,
      [glassEdge, glassEdge, glassEdge, glassEdge, glass, glass],
      -0.005,
      profile + glassH / 2 - 0.005,
      0,
      "glass",
    ),
  );
  // profiles: floor, top, wall channel
  g.add(
    mesh(
      new RoundedBoxGeometry(w, profile, 0.026, 2, 0.003),
      matteBlack,
      0,
      profile / 2,
      0,
      "floor profile",
    ),
  );
  g.add(
    mesh(
      new RoundedBoxGeometry(w, profile, 0.026, 2, 0.003),
      matteBlack,
      0,
      h - profile / 2,
      0,
      "top profile",
    ),
  );
  g.add(
    mesh(
      new RoundedBoxGeometry(0.022, h, 0.03, 2, 0.003),
      matteBlack,
      w / 2 - 0.011,
      h / 2,
      0,
      "wall channel",
    ),
  );
  return g;
}

/**
 * Linear shower drain flush with the floor: brushed stainless frame, a dark
 * channel and the slot cover leaving a 5 mm gap on each side.
 * Origin: floor, centered, length along x.
 */
export function showerDrain(w: number, d: number, h: number): THREE.Group {
  const g = new THREE.Group();
  g.name = "shower drain";
  const flange = 0.006;
  // frame: four bars around the opening
  const bars: [number, number, number, number][] = [
    [w, flange, 0, -d / 2 + flange / 2],
    [w, flange, 0, d / 2 - flange / 2],
    [flange, d - 2 * flange, -w / 2 + flange / 2, 0],
    [flange, d - 2 * flange, w / 2 - flange / 2, 0],
  ];
  for (const [bw, bd, x, z] of bars) {
    g.add(
      mesh(new RoundedBoxGeometry(bw, h, bd, 1, 0.001), brushedSteel, x, h / 2, z, "drain frame"),
    );
  }
  // channel bottom, in shadow
  g.add(mesh(new THREE.BoxGeometry(w - 2 * flange, 0.002, d - 2 * flange), darkGap, 0, 0.001, 0));
  // cover plate with 5 mm side gaps
  const coverD = d - 2 * flange - 0.01;
  g.add(
    mesh(
      new RoundedBoxGeometry(w - 2 * flange - 0.008, 0.003, coverD, 1, 0.0008),
      brushedSteel,
      0,
      h - 0.0015,
      0,
      "drain cover",
    ),
  );
  // the cover's support legs, glimpsed through the gaps
  for (const x of [-w / 3, 0, w / 3]) {
    g.add(
      mesh(new THREE.BoxGeometry(0.01, h - 0.003, coverD * 0.6), darkGap, x, (h - 0.003) / 2, 0),
    );
  }
  return g;
}
