import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { bowlSpans, KUBUS_2_KNG_120 } from "../data/sink";
import { brushedSteel, darkGap } from "./materials";
import { grainUVs } from "./furniture/parts";
import { fragranite } from "./furniture/materials";
import { mesh } from "./shapes";

/** Rounded rectangle path centred on (cx, cz) in the plan (x, z). */
function roundedRect(
  cx: number,
  cz: number,
  w: number,
  d: number,
  r: number,
  path: THREE.Path = new THREE.Shape(),
) {
  const x0 = cx - w / 2;
  const x1 = cx + w / 2;
  const z0 = cz - d / 2;
  const z1 = cz + d / 2;
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

/** Plan shape extruded downwards from y = top, `depth` deep (no bevel). */
function extrudeDown(shape: THREE.Shape, top: number, depth: number): THREE.BufferGeometry {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 6 });
  g.rotateX(Math.PI / 2); // shape y → world z, extrusion → down
  g.translate(0, top, 0);
  g.computeVertexNormals();
  return g;
}

/**
 * Kubus square drain: a brushed-steel cover set flush in a square opening,
 * a thin shadow gap all around (water runs off through it). `size` is the
 * opening's side; the cover sits at the bowl floor, its top at y = 0.
 */
function squareDrain(size: number): THREE.Group {
  const g = new THREE.Group();
  const gap = 0.003;
  // dark drain throat under the cover, seen through the gap
  g.add(mesh(new THREE.BoxGeometry(size, 0.002, size), darkGap, 0, -0.008, 0));
  g.add(
    mesh(
      new RoundedBoxGeometry(size - 2 * gap, 0.004, size - 2 * gap, 2, 0.0015),
      brushedSteel,
      0,
      -0.002,
      0,
      "drain cover",
    ),
  );
  return g;
}

/**
 * Franke Kubus 2.0 KNG 120 in Fragranite, undermount: two square bowls (large
 * + small) under the worktop cut-outs. Origin: centre of the rim's top face
 * (= underside of the worktop), the bowls hang below; length along x, front
 * (room side) towards +z.
 */
export function kitchenSink(): THREE.Group {
  const spec = KUBUS_2_KNG_120;
  const g = new THREE.Group();
  g.name = "kitchen sink";
  const t = spec.wall;
  const bowls = bowlSpans(spec);

  // Rim flange under the worktop, with the two bowl openings
  const flange = roundedRect(0, 0, spec.length, spec.width, 0.02) as THREE.Shape;
  for (const [a, b] of bowls) {
    flange.holes.push(
      roundedRect((a + b) / 2, 0, b - a, spec.bowlWidth, spec.radius, new THREE.Path()),
    );
  }
  g.add(mesh(grainUVs(extrudeDown(flange, 0, t), fragranite, "x"), fragranite, 0, 0, 0, "rim"));

  for (const [i, [a, b]] of bowls.entries()) {
    const cx = (a + b) / 2;
    const w = b - a;
    // walls: outer outline minus the inner one, the full bowl depth
    const wall = roundedRect(
      cx,
      0,
      w + 2 * t,
      spec.bowlWidth + 2 * t,
      spec.radius + t,
    ) as THREE.Shape;
    wall.holes.push(roundedRect(cx, 0, w, spec.bowlWidth, spec.radius, new THREE.Path()));
    g.add(
      mesh(
        grainUVs(extrudeDown(wall, -t, spec.bowlDepth - t), fragranite, "x"),
        fragranite,
        0,
        0,
        0,
        "bowl",
      ),
    );
    // bottom, with the drain opening centred in the bowl (both drains in line)
    const drainZ = 0;
    const drainSize = i === 0 ? 0.11 : 0.09;
    const bottom = roundedRect(
      cx,
      0,
      w + 2 * t,
      spec.bowlWidth + 2 * t,
      spec.radius + t,
    ) as THREE.Shape;
    bottom.holes.push(roundedRect(cx, drainZ, drainSize, drainSize, 0.004, new THREE.Path()));
    g.add(
      mesh(
        grainUVs(extrudeDown(bottom, -spec.bowlDepth, t), fragranite, "x"),
        fragranite,
        0,
        0,
        0,
        "bowl bottom",
      ),
    );
    const drain = squareDrain(drainSize);
    drain.position.set(cx, -spec.bowlDepth, drainZ);
    g.add(drain);
  }
  return g;
}
