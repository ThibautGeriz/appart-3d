import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { PropModel } from "../data/apartment";

/**
 * Detailed appliances and sanitary ware, modelled from primitives (no CC0
 * scans exist for these). Phong materials give enamel / porcelain / chrome
 * their highlights. Local frame: origin at the floor, centered on the
 * footprint, front facing +z.
 */

const enamel = new THREE.MeshPhongMaterial({
  color: "#f4f5f6",
  specular: "#666666",
  shininess: 60,
});
const porcelain = new THREE.MeshPhongMaterial({
  color: "#fafaf8",
  specular: "#777777",
  shininess: 90,
});
const chrome = new THREE.MeshPhongMaterial({
  color: "#b8bcc2",
  specular: "#ffffff",
  shininess: 140,
});
const panelGray = new THREE.MeshPhongMaterial({
  color: "#e4e7ea",
  specular: "#444444",
  shininess: 40,
});
const darkRubber = new THREE.MeshLambertMaterial({ color: "#3a3d42" });
const display = new THREE.MeshBasicMaterial({ color: "#16242c" });
const steel = new THREE.MeshPhongMaterial({
  color: "#8e959c",
  specular: "#cccccc",
  shininess: 100,
});
const glass = new THREE.MeshPhongMaterial({
  color: "#55606b",
  specular: "#ffffff",
  shininess: 160,
  transparent: true,
  opacity: 0.45,
  depthWrite: false,
});

function mesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
): THREE.Mesh {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  return m;
}

/** Front-loading washing machine, 60 × 60 × 85 cm. */
function washingMachine(w: number, d: number, h: number): THREE.Group {
  const g = new THREE.Group();
  const front = d / 2;
  g.add(mesh(new RoundedBoxGeometry(w, h - 0.02, d, 4, 0.025), enamel, 0, h / 2 + 0.01, 0));
  // feet
  for (const [fx, fz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]) {
    g.add(
      mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 0.012, 8),
        darkRubber,
        fx * (w / 2 - 0.05),
        0.006,
        fz * (d / 2 - 0.05),
      ),
    );
  }
  // control panel: drawer, display, program knob, buttons
  const panelY = h - 0.07;
  g.add(mesh(new THREE.BoxGeometry(w - 0.02, 0.1, 0.01), panelGray, 0, panelY, front + 0.002));
  g.add(
    mesh(new THREE.BoxGeometry(0.17, 0.07, 0.012), enamel, -w / 2 + 0.11, panelY, front + 0.006),
  );
  g.add(
    mesh(
      new THREE.BoxGeometry(0.13, 0.004, 0.004),
      darkRubber,
      -w / 2 + 0.11,
      panelY - 0.025,
      front + 0.013,
    ),
  );
  g.add(
    mesh(new THREE.BoxGeometry(0.1, 0.035, 0.004), display, 0.06, panelY + 0.01, front + 0.008),
  );
  const knob = mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.025, 32),
    chrome,
    -0.06,
    panelY,
    front + 0.015,
  );
  knob.rotation.x = Math.PI / 2;
  g.add(knob);
  for (let i = 0; i < 4; i++) {
    g.add(
      mesh(
        new THREE.BoxGeometry(0.018, 0.01, 0.005),
        panelGray,
        0.025 + i * 0.025,
        panelY - 0.025,
        front + 0.009,
      ),
    );
  }
  // porthole: chrome ring, rubber gasket, tinted glass, steel drum behind
  const doorY = 0.4;
  const ring = mesh(new THREE.TorusGeometry(0.165, 0.028, 16, 48), chrome, 0, doorY, front + 0.025);
  g.add(ring);
  g.add(mesh(new THREE.TorusGeometry(0.135, 0.012, 12, 48), darkRubber, 0, doorY, front + 0.03));
  const pane = mesh(
    new THREE.CylinderGeometry(0.14, 0.14, 0.01, 48),
    glass,
    0,
    doorY,
    front + 0.03,
  );
  pane.rotation.x = Math.PI / 2;
  g.add(pane);
  const drum = mesh(
    new THREE.CylinderGeometry(0.15, 0.15, 0.01, 48),
    steel,
    0,
    doorY,
    front + 0.004,
  );
  drum.rotation.x = Math.PI / 2;
  g.add(drum);
  // drum lifters seen through the glass
  for (let i = 0; i < 3; i++) {
    const lifter = mesh(new THREE.BoxGeometry(0.02, 0.07, 0.01), panelGray, 0, 0, 0);
    const a = (i / 3) * Math.PI * 2;
    lifter.position.set(Math.cos(a) * 0.11, doorY + Math.sin(a) * 0.11, front + 0.012);
    lifter.rotation.z = a + Math.PI / 2;
    g.add(lifter);
  }
  // door handle recess on the ring's right
  g.add(mesh(new THREE.BoxGeometry(0.02, 0.07, 0.015), chrome, 0.185, doorY, front + 0.03));
  return g;
}

/**
 * Wall-hung toilet: elongated porcelain bowl, closed seat + lid, hinges,
 * and the dual flush plate on the boxed-in cistern behind it.
 */
function toilet(w: number, d: number): THREE.Group {
  const g = new THREE.Group();
  const back = -d / 2;
  const bowlTop = 0.4;
  // bowl: lathe profile (radius, height), stretched front-to-back
  const profile = [
    [0.0, 0.12],
    [0.1, 0.12],
    [0.135, 0.16],
    [0.165, 0.24],
    [0.18, 0.32],
    [0.182, bowlTop - 0.02],
    [0.172, bowlTop],
    [0.0, bowlTop],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const bowlGeometry = new THREE.LatheGeometry(profile, 48);
  const stretch = (d - 0.05) / 0.364; // front-to-back length / bowl diameter
  bowlGeometry.scale(w / 0.364, 1, stretch);
  const bowl = mesh(bowlGeometry, porcelain, 0, 0, back + (d - 0.05) / 2 + 0.05);
  g.add(bowl);
  // back block fixing the bowl to the wall
  g.add(
    mesh(new RoundedBoxGeometry(w * 0.75, 0.26, 0.16, 3, 0.03), porcelain, 0, 0.27, back + 0.08),
  );
  // seat + lid (closed), slightly warmer white
  const lidGeometry = new THREE.CylinderGeometry(0.18, 0.18, 0.035, 48);
  lidGeometry.scale(w / 0.364, 1, stretch);
  const lid = mesh(lidGeometry, enamel, 0, bowlTop + 0.018, back + (d - 0.05) / 2 + 0.055);
  g.add(lid);
  for (const hx of [-0.07, 0.07]) {
    const hinge = mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.03, 16),
      chrome,
      hx,
      bowlTop + 0.02,
      back + 0.12,
    );
    hinge.rotation.z = Math.PI / 2;
    g.add(hinge);
  }
  // dual flush plate on the boxing (centered above the bowl)
  g.add(mesh(new RoundedBoxGeometry(0.24, 0.16, 0.012, 2, 0.004), chrome, 0, 1.0, back + 0.006));
  g.add(
    mesh(
      new RoundedBoxGeometry(0.105, 0.13, 0.008, 2, 0.003),
      panelGray,
      -0.058,
      1.0,
      back + 0.014,
    ),
  );
  g.add(
    mesh(new RoundedBoxGeometry(0.105, 0.13, 0.008, 2, 0.003), panelGray, 0.058, 1.0, back + 0.014),
  );
  return g;
}

/** Build a prop for a footprint of width `w` (local x) and depth `d` (local z). */
export function buildProp(model: PropModel, w: number, d: number, h: number): THREE.Group {
  const group = model === "washingMachine" ? washingMachine(w, d, h) : toilet(w, d);
  group.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = o.material !== glass;
      o.receiveShadow = true;
    }
  });
  return group;
}
