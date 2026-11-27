import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { bowlSpans, cutOutSpans, KUBUS_2_KNG_120 } from "../data/sink";
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
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    curveSegments: 6,
  });
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
 * Fragranite "gris ardoise": a warm slate grey on the Franke photo (flat
 * areas ~#67635f–#74706d), not blue-grey. Same name as the shared material,
 * so it keeps its speckle scan; only the sink uses it.
 */
const slateFragranite = fragranite.clone();
slateFragranite.color.set("#74706c");

/**
 * Overflow on the back wall, near the rim (DF section: ~6 × 2.5 cm, above
 * the large bowl's drain): a stainless plate with a dark slot.
 */
function overflow(): THREE.Group {
  const g = new THREE.Group();
  g.add(
    mesh(new RoundedBoxGeometry(0.06, 0.024, 0.004, 2, 0.0015), brushedSteel, 0, 0, 0, "overflow"),
  );
  g.add(mesh(new THREE.BoxGeometry(0.044, 0.006, 0.001), darkGap, 0, 0, 0.0025));
  return g;
}

/**
 * Franke Kubus 2.0 KNG 120 in Fragranite, undermount: one 72 × 42 cm opening
 * under the worktop cut-out, split lower down by a low divider into a large
 * and a small square bowl. Origin: centre of the rim's top face (= underside
 * of the worktop), the sink hangs `bowlDepth` below; length along x, front
 * (room side) towards +z.
 */
export function kitchenSink(): THREE.Group {
  const spec = KUBUS_2_KNG_120;
  const mat = slateFragranite;
  const g = new THREE.Group();
  g.name = "kitchen sink";
  const t = spec.wall;
  const r = spec.radius;
  const bw = spec.bowlWidth;
  const floorTop = -(spec.bowlDepth - t);
  const add = (geo: THREE.BufferGeometry, name: string) =>
    g.add(mesh(grainUVs(geo, mat, "x"), mat, 0, 0, 0, name));
  /** wall ring around an opening, from `top` down to `bottom` */
  const ring = (cx: number, w: number, top: number, bottom: number) => {
    const s = roundedRect(cx, 0, w + 2 * t, bw + 2 * t, r + t) as THREE.Shape;
    s.holes.push(roundedRect(cx, 0, w, bw, r, new THREE.Path()));
    return extrudeDown(s, top, top - bottom);
  };

  const bowls = bowlSpans(spec);
  // Rim flange under the worktop, with the single opening over both bowls,
  // the upper basin common to both down to the divider, and the divider top.
  // One mesh: grainUVs draws from a shared seeded RNG, so the number of calls
  // here must not change or every model exported after the sink shifts.
  const [[o0, o1]] = cutOutSpans(spec);
  const flange = roundedRect(0, 0, spec.length, spec.width, r) as THREE.Shape;
  flange.holes.push(roundedRect((o0 + o1) / 2, 0, o1 - o0, bw, r, new THREE.Path()));
  const upper = [extrudeDown(flange, 0, t), ring((o0 + o1) / 2, o1 - o0, -t, -spec.dividerDrop)];
  for (let i = 1; i < bowls.length; i++) {
    const [x0, x1] = [bowls[i - 1][1], bowls[i][0]];
    upper.push(
      new THREE.BoxGeometry(x1 - x0, t, bw)
        .translate((x0 + x1) / 2, -spec.dividerDrop - t / 2, 0)
        .toNonIndexed(),
    );
  }
  add(mergeGeometries(upper), "rim");

  for (const [a, b] of bowls) {
    const cx = (a + b) / 2;
    const w = b - a;
    add(ring(cx, w, -spec.dividerDrop, floorTop), "bowl");
    // floor, with the square drain behind the bowl centre (both in line)
    const bottom = roundedRect(cx, 0, w + 2 * t, bw + 2 * t, r + t) as THREE.Shape;
    const ds = spec.drainSize;
    bottom.holes.push(roundedRect(cx, -spec.drainBack, ds, ds, 0.004, new THREE.Path()));
    add(extrudeDown(bottom, floorTop, t), "bowl bottom");
    const drain = squareDrain(ds);
    drain.position.set(cx, floorTop, -spec.drainBack);
    g.add(drain);
  }
  const of = overflow();
  of.position.set((bowls[0][0] + bowls[0][1]) / 2, -0.033, -bw / 2 + 0.002);
  g.add(of);
  return g;
}
