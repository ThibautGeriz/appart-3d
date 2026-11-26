import * as THREE from "three";
import { matteBlack, satinBlack } from "./materials";
import { mesh } from "./shapes";

/**
 * Single-lever kitchen mixer, matte black: round body on the worktop, high
 * arched spout reaching over the bowl, lever on the side. Origin: worktop
 * level, centred on the footprint; the body at the back (z = -d/2 + 3 cm),
 * the spout reaching towards +z (the room).
 */
export function kitchenTap(_w: number, d: number, h: number): THREE.Group {
  const g = new THREE.Group();
  g.name = "kitchen tap";
  const bodyZ = -d / 2 + 0.03;
  const reach = d - 0.06; // spout outlet above the bowl
  // escutcheon and body
  g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.006, 48), matteBlack, 0, 0.003, bodyZ));
  g.add(
    mesh(new THREE.CylinderGeometry(0.024, 0.026, 0.17, 48), matteBlack, 0, 0.091, bodyZ, "body"),
  );
  // lever on the right side of the body
  const lever = mesh(
    new THREE.CylinderGeometry(0.007, 0.009, 0.09, 24),
    satinBlack,
    0.045,
    0.15,
    bodyZ,
  );
  lever.rotation.z = Math.PI / 2 - 0.25;
  g.add(lever);
  g.add(mesh(new THREE.SphereGeometry(0.014, 24, 16), satinBlack, 0.024, 0.14, bodyZ));
  // spout: up from the body, arching over, down to the aerator
  const top = h - 0.012;
  const spout = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.17, bodyZ),
    new THREE.Vector3(0, top - 0.06, bodyZ),
    new THREE.Vector3(0, top, bodyZ + 0.05),
    new THREE.Vector3(0, top - 0.015, bodyZ + reach * 0.55),
    new THREE.Vector3(0, top - 0.06, bodyZ + reach * 0.9),
    new THREE.Vector3(0, top - 0.1, bodyZ + reach),
  ]);
  g.add(mesh(new THREE.TubeGeometry(spout, 120, 0.012, 24, false), matteBlack, 0, 0, 0, "spout"));
  // aerator at the outlet
  g.add(
    mesh(
      new THREE.CylinderGeometry(0.013, 0.012, 0.02, 32),
      satinBlack,
      0,
      top - 0.11,
      bodyZ + reach,
    ),
  );
  return g;
}
