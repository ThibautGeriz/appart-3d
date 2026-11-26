import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

/**
 * Front-loading washing machine, modelled from primitives (no CC0 scan
 * exists). Phong materials, converted to PBR at export. Local frame: origin
 * at the floor, centered on the footprint, front facing +z.
 */

const enamel = new THREE.MeshPhongMaterial({
  color: "#f4f5f6",
  specular: "#666666",
  shininess: 60,
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
export function washingMachine(w: number, d: number, h: number): THREE.Group {
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
