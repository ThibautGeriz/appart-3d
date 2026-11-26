import * as THREE from "three";
import { matteBlack, porcelain, satinBlack } from "./materials";
import { mesh } from "./shapes";

/** Rounded rectangle centred on (cx, cz), plan (x, z). */
function roundedRect(
  cx: number,
  cz: number,
  w: number,
  d: number,
  r: number,
  path: THREE.Path = new THREE.Shape(),
) {
  const [x0, x1, z0, z1] = [cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2];
  path.moveTo(x0 + r, z0);
  path.lineTo(x1 - r, z0);
  path.quadraticCurveTo(x1, z0, x1, z0 + r);
  path.lineTo(x1, z1 - r);
  path.quadraticCurveTo(x1, z1, x1 - r, z1);
  path.lineTo(x0 + r, z1);
  path.quadraticCurveTo(x0, z1, x0, z1 - r);
  path.lineTo(x0, z0 + r);
  path.quadraticCurveTo(x0, z0, x0 + r, z0);
  return path;
}

/** Plan shape extruded down from `top` by `depth`, edges rounded inside the outline. */
function extrudeDown(
  shape: THREE.Shape,
  top: number,
  depth: number,
  bevel = 0,
): THREE.BufferGeometry {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(depth - 2 * bevel, 0.0005),
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: 4,
    curveSegments: 16,
  });
  g.rotateX(Math.PI / 2);
  g.translate(0, top - bevel, 0);
  g.computeVertexNormals();
  return g;
}

/**
 * Countertop (vessel) basin in glazed porcelain: soft-cornered rectangle with
 * thin walls and a rounded rim, a hollow bowl and a matte black click-clack
 * drain. Origin: centre of its foot on the counter, front towards +z.
 */
export function basin(w: number, d: number, h: number): THREE.Group {
  const g = new THREE.Group();
  g.name = "basin";
  const t = 0.009; // ceramic wall
  const r = 0.07; // outer corner radius
  const floor = 0.018; // solid bottom (the bowl floor sits this high)
  // walls: outline minus the inner outline, rounded rim on top
  const wall = roundedRect(0, 0, w, d, r) as THREE.Shape;
  wall.holes.push(roundedRect(0, 0, w - 2 * t, d - 2 * t, r - t, new THREE.Path()));
  g.add(mesh(extrudeDown(wall, h, h, 0.004), porcelain, 0, 0, 0, "basin wall"));
  // bottom, with the drain hole
  const drainR = 0.032;
  const bottom = roundedRect(0, 0, w - 0.002, d - 0.002, r - 0.001) as THREE.Shape;
  const hole = new THREE.Path();
  hole.absarc(0, 0, drainR, 0, Math.PI * 2, true);
  bottom.holes.push(hole);
  g.add(mesh(extrudeDown(bottom, floor, floor, 0.003), porcelain, 0, 0, 0, "basin bottom"));
  // click-clack drain: dark throat, flat matte black cap with a slim gap
  g.add(
    mesh(new THREE.CylinderGeometry(drainR, drainR, 0.002, 48), satinBlack, 0, floor - 0.012, 0),
  );
  g.add(
    mesh(
      new THREE.CylinderGeometry(drainR - 0.003, drainR - 0.002, 0.004, 48),
      matteBlack,
      0,
      floor - 0.0005,
      0,
      "drain",
    ),
  );
  return g;
}

/**
 * Tall single-lever mixer for a vessel basin, matte black: round column on
 * the counter, straight spout reaching over the basin, lever on top.
 * Origin: counter level, the column at the back (z = -d/2 + 2.5 cm), the
 * spout towards +z.
 */
export function basinTap(_w: number, d: number, h: number): THREE.Group {
  const g = new THREE.Group();
  g.name = "basin tap";
  const z = -d / 2 + 0.025;
  const r = 0.017;
  const spoutY = h - 0.045;
  g.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.005, 48), matteBlack, 0, 0.0025, z));
  g.add(
    mesh(
      new THREE.CylinderGeometry(r, r, h - 0.02, 48),
      matteBlack,
      0,
      (h - 0.02) / 2,
      z,
      "column",
    ),
  );
  // lever: a short cap with a slim handle pointing forward
  g.add(mesh(new THREE.CylinderGeometry(r, r, 0.02, 48), satinBlack, 0, h - 0.01, z));
  const lever = mesh(new THREE.BoxGeometry(0.012, 0.008, 0.06), satinBlack, 0, h - 0.004, z + 0.03);
  lever.rotation.x = -0.15;
  g.add(lever);
  // spout: from the column, straight out and slightly down at the outlet
  const reach = d - 0.045;
  const spout = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, spoutY, z),
    new THREE.Vector3(0, spoutY, z + reach * 0.6),
    new THREE.Vector3(0, spoutY - 0.012, z + reach),
  ]);
  g.add(mesh(new THREE.TubeGeometry(spout, 48, 0.009, 24, false), matteBlack, 0, 0, 0, "spout"));
  g.add(
    mesh(
      new THREE.CylinderGeometry(0.0095, 0.009, 0.012, 24),
      satinBlack,
      0,
      spoutY - 0.02,
      z + reach,
    ),
  );
  return g;
}
