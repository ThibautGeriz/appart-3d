import * as THREE from "three";
import type { Product } from "../../data/catalog";
import {
  darkScrew,
  fir as sharedFir,
  lightElm as sharedLightElm,
  microfibre as sharedMicrofibre,
  oiledOak as sharedOiledOak,
  recycledElm as sharedRecycledElm,
} from "./materials";
import { arcBand, bar, board, slab, tube, v } from "./parts";

/*
 * Chair materials, tuned against the seller's photos. The wood / fabric ones
 * are clones of the shared ones (same name, so the same photo scan at export)
 * with a lighter, less saturated tint: the scans render darker than the photos.
 */
function retint(m: THREE.MeshStandardMaterial, color: string): THREE.MeshStandardMaterial {
  const c = m.clone();
  c.color.set(color);
  return c;
}
const recycledElm = retint(sharedRecycledElm, "#eec8b8");
const oiledOak = retint(sharedOiledOak, "#fff6ea");
const microfibre = retint(sharedMicrofibre, "#ffffff");
const fir = retint(sharedFir, "#ffd9c6");
const lightElm = retint(sharedLightElm, "#ffffff");

/** Aged iron as it shows on the photos: dark grey-brown, not black. */
const agedIron = new THREE.MeshStandardMaterial({
  name: "aged iron chair",
  color: "#574c47",
  metalness: 0.35,
  roughness: 0.6,
});
/** Mackay: aged black sheet metal, a charcoal grey with a soft sheen. */
const agedBlack = new THREE.MeshStandardMaterial({
  name: "aged black chair",
  color: "#464c52",
  metalness: 0.35,
  roughness: 0.55,
});

/*
 * Dining chairs, at the seller's dimensions (W × D × H bounding box).
 * Origin: floor, centered on the footprint, the seat's front facing +z.
 */

/** Rounded plan shape for a seat: `front` wide at +z, `back` wide at -z. */
function seatShape(front: number, back: number, z0: number, z1: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const f = front / 2;
  const b = back / 2;
  s.moveTo(-b + r, z0);
  s.lineTo(b - r, z0);
  s.quadraticCurveTo(b, z0, b, z0 + r);
  s.lineTo(f, z1 - r);
  s.quadraticCurveTo(f, z1, f - r, z1);
  s.lineTo(-f + r, z1);
  s.quadraticCurveTo(-f, z1, -f, z1 - r);
  s.lineTo(-b, z0 + r);
  s.quadraticCurveTo(-b, z0, -b + r, z0);
  return s;
}

/**
 * BISTROT: bent aged-iron frame, crossed flat bars in the back, curved
 * recycled-elm back rail, elm seat, bentwood-style hoop under the seat.
 * L 46 × P 49 × H 92 cm, seat 47.8 cm.
 */
export function bistrot(p: Product): THREE.Group {
  const g = new THREE.Group();
  const { w, d, h } = p;
  const seat = p.seatHeight ?? 0.478;
  const r = 0.0125; // leg tube radius
  const frontZ = d / 2 - r; // feet splay to the footprint edge
  const backZ = -d / 2 + 0.035;
  const seatY = seat - 0.024; // under the elm seat

  // Seat: trapezoid, wider at the front
  g.add(slab(seatShape(0.43, 0.37, -0.19, 0.21, 0.05), seat, 0.024, 0.005, recycledElm));
  // Seat ring under it
  // traced along the seat outline, just inside it
  const ring = seatShape(0.41, 0.35, -0.18, 0.2, 0.04)
    .getSpacedPoints(48)
    .slice(0, -1)
    .map((p) => v(p.x, seatY, p.y));
  g.add(tube(ring, 0.009, agedIron, true));

  for (const sx of [-1, 1]) {
    // Front leg: splayed, from the ring to the floor
    g.add(tube([v(sx * 0.19, seatY + 0.005, 0.185), v(sx * (w / 2 - r), 0, frontZ)], r, agedIron));
    // Back leg: floor → seat → raked up to the back rail
    g.add(
      tube(
        [
          v(sx * (w / 2 - r - 0.012), 0, backZ + 0.02),
          v(sx * 0.18, seatY, -0.165),
          v(sx * 0.178, 0.68, -0.2),
          v(sx * 0.18, h - 0.05, -d / 2 + r + 0.006),
        ],
        r,
        agedIron,
      ),
    );
  }

  // Crossed flat bars, from the seat's back corners to the opposite top
  const topY = h - 0.09;
  for (const sx of [-1, 1]) {
    g.add(
      bar(
        v(sx * 0.165, seat + 0.01, -0.17),
        v(-sx * 0.165, topY, -d / 2 + 0.03),
        // bar() keeps `w` horizontal: on a diagonal in the back plane it is
        // the depth, `t` the visible width (~3 cm flat bars on the photo)
        0.005,
        0.03,
        agedIron,
        0.001,
      ),
    );
  }

  // Curved recycled-elm back rail, screwed onto the back legs
  const railH = 0.075;
  g.add(arcBand(0.42, 0.38, 0.022, -d / 2 + 0.38 + 0.022, h - railH, railH, recycledElm, 0.004));
  for (const sx of [-1, 1]) {
    const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.004, 12), darkScrew);
    screw.rotation.x = Math.PI / 2;
    screw.position.set(sx * 0.18, h - railH / 2, -d / 2 + 0.0015);
    g.add(screw);
  }

  // Bentwood braces: an arch between the front legs, gentler arches on the
  // sides (front leg → back leg), all welded to the legs at 22 cm
  const hoopY = 0.22;
  const legAt = (sx: number, front: boolean, y: number) => {
    // point on the (straight) leg axis at height y
    const [top, foot] = front
      ? [v(sx * 0.19, seatY, 0.185), v(sx * (w / 2 - r), 0, frontZ)]
      : [v(sx * 0.18, seatY, -0.165), v(sx * (w / 2 - r - 0.012), 0, backZ + 0.02)];
    return foot.clone().lerp(top, y / seatY);
  };
  const fl = legAt(-1, true, hoopY);
  const fr = legAt(1, true, hoopY);
  g.add(
    tube(
      [
        fl,
        v(-0.1, hoopY + 0.085, fl.z - 0.004),
        v(0, hoopY + 0.11, fl.z - 0.006),
        v(0.1, hoopY + 0.085, fl.z - 0.004),
        fr,
      ],
      0.0085,
      agedIron,
    ),
  );
  for (const sx of [-1, 1]) {
    const f = legAt(sx, true, hoopY);
    const b = legAt(sx, false, hoopY);
    const mid = f
      .clone()
      .lerp(b, 0.5)
      .setY(hoopY + 0.05);
    g.add(
      tube(
        [
          f,
          f
            .clone()
            .lerp(mid, 0.5)
            .setY(hoopY + 0.035),
          mid,
          b
            .clone()
            .lerp(mid, 0.5)
            .setY(hoopY + 0.035),
          b,
        ],
        0.0085,
        agedIron,
      ),
    );
  }
  return g;
}

/**
 * NORWAY: oiled oak, X in the back between two rails, H stretcher,
 * microfibre seat cushion. L 51 × P 53 × H 105 cm.
 */
export function norway(p: Product): THREE.Group {
  const g = new THREE.Group();
  const { w, d, h } = p;
  const leg = 0.045;
  const x = w / 2 - leg / 2;
  const frontZ = d / 2 - leg / 2;
  const seat = p.seatHeight ?? 0.48;
  const cushion = 0.075;
  const railTop = seat - cushion;

  for (const sx of [-1, 1]) {
    // front leg
    g.add(board(leg, railTop, leg, oiledOak, sx * x, railTop / 2, frontZ, 0.004, "y"));
    // back leg rising into the stile, slightly raked
    g.add(
      bar(
        v(sx * x, 0, -d / 2 + leg / 2 + 0.03),
        v(sx * x, h, -d / 2 + leg / 2),
        leg,
        leg,
        oiledOak,
        0.004,
      ),
    );
    // side apron and low side stretcher
    g.add(
      board(0.022, 0.075, d - 2 * leg, oiledOak, sx * (x - 0.004), railTop - 0.0375, 0, 0.002, "z"),
    );
    g.add(board(0.028, 0.035, d - 2 * leg, oiledOak, sx * x, 0.13, 0.005, 0.003, "z"));
  }
  // front / back aprons, middle stretcher of the H
  g.add(
    board(w - 2 * leg, 0.075, 0.022, oiledOak, 0, railTop - 0.0375, frontZ - 0.008, 0.002, "x"),
  );
  g.add(
    board(
      w - 2 * leg,
      0.075,
      0.022,
      oiledOak,
      0,
      railTop - 0.0375,
      -d / 2 + leg / 2 + 0.024,
      0.002,
      "x",
    ),
  );
  g.add(board(w - 2 * leg, 0.03, 0.028, oiledOak, 0, 0.13, 0.005, 0.003, "x"));

  // Back: top rail, lower rail and the X between them (on the photo the X
  // is taller than wide, the lower rail ~13 cm above the cushion)
  const backZ = -d / 2 + leg / 2 + 0.008;
  const inner = w - 2 * leg;
  const topRail = [h - 0.095, h - 0.015];
  const lowRail = [seat + 0.13, seat + 0.18];
  g.add(
    board(
      inner,
      topRail[1] - topRail[0],
      0.03,
      oiledOak,
      0,
      (topRail[0] + topRail[1]) / 2,
      backZ,
      0.003,
      "x",
    ),
  );
  g.add(
    board(
      inner,
      lowRail[1] - lowRail[0],
      0.03,
      oiledOak,
      0,
      (lowRail[0] + lowRail[1]) / 2,
      backZ + 0.002,
      0.003,
      "x",
    ),
  );
  for (const sx of [-1, 1]) {
    g.add(
      bar(
        v(sx * (inner / 2 - 0.02), lowRail[1] - 0.01, backZ + 0.002),
        v(-sx * (inner / 2 - 0.02), topRail[0] + 0.01, backZ),
        // `w` stays horizontal (the depth here), `t` is the visible width;
        // the two halves are halved into each other
        sx > 0 ? 0.024 : 0.02,
        0.048,
        oiledOak,
        0.003,
      ),
    );
  }

  // Seat cushion, upholstered in microfibre, sitting on the aprons
  g.add(
    board(
      w - 0.03,
      cushion,
      d - leg - 0.025,
      microfibre,
      0,
      railTop + cushion / 2,
      0.012,
      0.022,
      "x",
    ),
  );
  return g;
}

/**
 * WESTMOUNT: aged-iron sled frame (square tube), rough sawn fir seat and back,
 * two planks each, "cerclées de fer": the thick seat sits between the side
 * rails, its front edge bare. L 40 × P 50 × H 88 cm, seat 45 cm.
 */
export function westmount(p: Product): THREE.Group {
  const g = new THREE.Group();
  const { w, d, h } = p;
  const t = 0.02; // tube section
  const x = w / 2 - t / 2;
  const front = d / 2 - t / 2;
  const back = -d / 2 + t / 2;
  const seat = p.seatHeight ?? 0.45;
  const plank = 0.05; // ~5 cm front edge on the photo
  const seatBottom = seat - plank;

  for (const sx of [-1, 1]) {
    const X = sx * x;
    g.add(bar(v(X, 0, front), v(X, seat, front), t, t, agedIron, 0.001)); // front leg, up to the seat top
    g.add(bar(v(X, t / 2, front + t / 2), v(X, t / 2, back - t / 2), t, t, agedIron, 0.001)); // floor runner
    g.add(bar(v(X, 0, back), v(X, h, back), t, t, agedIron, 0.001)); // back upright
    // seat rail: flat bar along the seat's side
    g.add(board(t, plank - 0.01, d - 2 * t, agedIron, X, seat - plank / 2, 0, 0.001, "z"));
  }
  // cross rails: under the back of the seat, top of the back
  g.add(
    bar(v(-x, seatBottom - t / 2, back), v(x, seatBottom - t / 2, back), t, t, agedIron, 0.001),
  );
  g.add(bar(v(-x - t / 2, h - t / 2, back), v(x + t / 2, h - t / 2, back), t, t, agedIron, 0.001));

  // Seat: two planks across, between the side rails
  const seatD = d - t - 0.002;
  const seatZ = t / 2 + 0.001; // from the back upright to the front edge
  for (const i of [0, 1]) {
    const z = seatZ - seatD / 2 + (seatD * (i + 0.5)) / 2 + (i === 0 ? -0.001 : 0.001);
    g.add(board(w - 2 * t, plank, seatD / 2 - 0.002, fir, 0, seat - plank / 2, z, 0.004, "x"));
  }
  // Back: two planks, between the uprights
  const backTop = h - t - 0.008;
  const backBottom = seat + 0.11;
  const ph = (backTop - backBottom) / 2;
  for (const i of [0, 1]) {
    g.add(
      board(w - 2 * t, ph - 0.004, 0.02, fir, 0, backBottom + ph * (i + 0.5), back, 0.003, "x"),
    );
  }
  return g;
}

/**
 * MACKAY: black aged sheet-metal stacking chair: tapered splayed legs,
 * seat pan with a skirt, arched back band on a central spine, light elm
 * seat. L 43 × P 50 × H 82 cm.
 */
export function mackay(p: Product): THREE.Group {
  const g = new THREE.Group();
  const { w, d, h } = p;
  const seat = p.seatHeight ?? 0.46;
  const wood = 0.025;
  const pan = seat - wood;

  // Seat pan with its skirt following the seat's chamfered outline, and the
  // elm seat on it
  const octagon = (a: number, c: number) => {
    const s = new THREE.Shape();
    s.moveTo(-a + c, -a);
    s.lineTo(a - c, -a);
    s.lineTo(a, -a + c);
    s.lineTo(a, a - c);
    s.lineTo(a - c, a);
    s.lineTo(-a + c, a);
    s.lineTo(-a, a - c);
    s.lineTo(-a, -a + c);
    s.closePath();
    return s;
  };
  const skirt = slab(octagon(0.197, 0.055), pan, 0.055, 0.004, agedBlack);
  skirt.position.z = 0.03;
  g.add(skirt);
  const seatMesh = slab(octagon(0.185, 0.05), seat, wood, 0.006, lightElm);
  seatMesh.position.z = 0.03;
  g.add(seatMesh);

  // Legs: tapered square section, splayed to the footprint corners
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const top = v(sx * 0.165, pan - 0.02, 0.03 + sz * 0.165);
      const foot = v(sx * (w / 2 - 0.0135), 0, sz > 0 ? d / 2 - 0.012 : -d / 2 + 0.07);
      const length = top.distanceTo(foot);
      const geo = new THREE.CylinderGeometry(0.026, 0.016, length, 4, 1);
      geo.rotateY(Math.PI / 4);
      const leg = new THREE.Mesh(geo, agedBlack);
      leg.position.copy(top).add(foot).multiplyScalar(0.5);
      leg.quaternion.setFromUnitVectors(v(0, 1, 0), top.clone().sub(foot).normalize());
      g.add(leg);
    }
  }
  // thin braces between the legs, under the skirt
  const by = 0.33;
  for (const sz of [-1, 1])
    g.add(tube([v(-0.17, by, 0.03 + sz * 0.17), v(0.17, by, 0.03 + sz * 0.17)], 0.0045, agedBlack));
  for (const sx of [-1, 1])
    g.add(tube([v(sx * 0.17, by, -0.14), v(sx * 0.17, by, 0.2)], 0.0045, agedBlack));

  // Back: arched band at the top, central spine down to the seat, side
  // strips; the spine flares into the band, leaving two arched openings
  const bandH = 0.085;
  const bandR = 0.27;
  const bandZ = -d / 2 + bandR + 0.004; // band's back at the footprint edge
  g.add(arcBand(w - 0.01, bandR, 0.004, bandZ, h - bandH, bandH, agedBlack, 0.0015));
  const spineFoot = v(0, pan + 0.01, -0.17);
  const spineTop = v(0, h - bandH + 0.01, -d / 2 + 0.012);
  const spineLen = spineFoot.distanceTo(spineTop);
  const outline = new THREE.Shape();
  const flareFrom = spineLen - 0.17;
  outline.moveTo(-0.048, 0);
  outline.lineTo(-0.04, flareFrom);
  outline.quadraticCurveTo(-0.04, spineLen - 0.01, -0.13, spineLen);
  outline.lineTo(0.13, spineLen);
  outline.quadraticCurveTo(0.04, spineLen - 0.01, 0.04, flareFrom);
  outline.lineTo(0.048, 0);
  outline.closePath();
  const spineGeo = new THREE.ExtrudeGeometry(outline, {
    depth: 0.005,
    bevelEnabled: false,
    curveSegments: 8,
  });
  // follow the band's curve: the sides come forward with the arc
  const pos = spineGeo.getAttribute("position");
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i);
    pos.setZ(i, pos.getZ(i) - 0.0025 + bandR - Math.sqrt(bandR * bandR - px * px));
  }
  spineGeo.computeVertexNormals();
  const spine = new THREE.Mesh(spineGeo, agedBlack);
  spine.position.copy(spineFoot);
  spine.quaternion.setFromUnitVectors(v(0, 1, 0), spineTop.clone().sub(spineFoot).normalize());
  g.add(spine);
  // embossed teardrop on the spine
  const drop = bar(
    v(0, pan + 0.12, -0.188),
    v(0, h - bandH - 0.03, -d / 2 + 0.02),
    0.05,
    0.006,
    agedBlack,
    0.0025,
  );
  g.add(drop);
  const half = Math.asin((w - 0.01) / 2 / (bandR + 0.004));
  const endX = Math.sin(half) * bandR;
  const endZ = bandZ - Math.cos(half) * bandR;
  for (const sx of [-1, 1]) {
    // flat sheet-metal strip from the band's end (inset by half its width) down to the seat pan
    g.add(
      bar(
        v(sx * (endX - 0.009), h - bandH + 0.01, endZ - 0.01),
        v(sx * 0.19, pan - 0.01, -0.12),
        0.022,
        0.004,
        agedBlack,
        0.0015,
      ),
    );
  }
  return g;
}

export const CHAIR_BUILDERS: Record<string, (p: Product) => THREE.Group> = {
  "chair-bistrot": bistrot,
  "chair-norway": norway,
  "chair-westmount": westmount,
  "chair-mackay": mackay,
};
