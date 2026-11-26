import * as THREE from "three";
import type { Product } from "../../data/catalog";
import { darkGap } from "../materials";
import { agedBlack, darkScrew, oiledOak, recycledPine } from "./materials";
import { bar, board, v } from "./parts";

/*
 * Sideboards (bahuts) at the seller's dimensions. Origin: floor, centred;
 * width along x, the front facing +z.
 */

/**
 * BIWA: recycled pine, two doors faced with a woven lattice of small slats
 * (dark gaps between them), three drawers in the middle with slot pulls,
 * splayed legs. L 160 × P 48 × H 85 cm.
 */
export function biwa(p: Product, center: "drawers" | "niches" = "drawers"): THREE.Group {
  const g = new THREE.Group();
  const { w, d, h } = p;
  const legH = 0.13;
  const top = 0.03;
  const t = 0.025; // carcass boards
  const bodyD = d - 0.01;
  const body0 = legH;
  const body1 = h - top;
  const front = bodyD / 2;
  g.add(board(w, top, d, recycledPine, 0, h - top / 2, 0, 0.004, "x"));
  g.add(board(w - 0.02, t, bodyD, recycledPine, 0, body0 + t / 2, 0, 0.003, "x"));
  for (const sx of [-1, 1])
    g.add(
      board(
        t,
        body1 - body0,
        bodyD,
        recycledPine,
        sx * (w / 2 - 0.01 - t / 2),
        (body0 + body1) / 2,
        0,
        0.003,
        "y",
      ),
    );
  g.add(
    board(
      w - 0.04,
      body1 - body0,
      0.012,
      darkGap,
      0,
      (body0 + body1) / 2,
      -bodyD / 2 + 0.006,
      0.001,
    ),
  );

  // front layout: door | drawers | door, with stiles between
  const inner0 = -w / 2 + 0.01 + t;
  const inner1 = w / 2 - 0.01 - t;
  const doorW = (inner1 - inner0) * 0.335;
  const stile = 0.025;
  const drawers0 = inner0 + doorW + stile;
  const drawers1 = inner1 - doorW - stile;
  const fy0 = body0 + t;
  const fy1 = body1;
  for (const x of [drawers0 - stile / 2, drawers1 + stile / 2]) {
    g.add(board(stile, fy1 - fy0, bodyD - 0.01, recycledPine, x, (fy0 + fy1) / 2, 0, 0.002, "y"));
  }
  // middle: three drawers (sideboard), or one drawer under two open niches (TV unit)
  const dh = (fy1 - fy0) / 3;
  if (center === "niches") {
    const mx = (drawers0 + drawers1) / 2;
    const mw = drawers1 - drawers0;
    for (const y of [fy0 + dh, fy0 + 2 * dh]) {
      g.add(board(mw, 0.02, bodyD - 0.03, recycledPine, mx, y + 0.01, -0.005, 0.002, "x")); // shelves
    }
    // the niches' back, in pine (the dark back is behind the doors only)
    g.add(
      board(
        mw,
        fy1 - fy0 - dh,
        0.012,
        recycledPine,
        mx,
        fy0 + dh + (fy1 - fy0 - dh) / 2,
        -bodyD / 2 + 0.014,
        0.001,
        "x",
      ),
    );
  }
  for (let i = 0; i < (center === "niches" ? 1 : 3); i++) {
    const y = fy0 + dh * (i + 0.5);
    g.add(
      board(
        drawers1 - drawers0 - 0.006,
        dh - 0.006,
        0.02,
        recycledPine,
        (drawers0 + drawers1) / 2,
        y,
        front - 0.01,
        0.002,
        "x",
      ),
    );
    g.add(
      board(
        0.14,
        0.012,
        0.004,
        darkGap,
        (drawers0 + drawers1) / 2,
        y + dh / 2 - 0.035,
        front + 0.0005,
        0.001,
      ),
    );
  }
  // doors: frame + woven lattice (alternating horizontal / vertical slats)
  for (const [x0, x1] of [
    [inner0, inner0 + doorW],
    [drawers1 + stile, inner1],
  ]) {
    const cxDoor = (x0 + x1) / 2;
    const frame = 0.035;
    const dz = front - 0.012;
    g.add(
      board(x1 - x0 - 0.004, frame, 0.022, recycledPine, cxDoor, fy1 - frame / 2, dz, 0.002, "x"),
    );
    g.add(
      board(x1 - x0 - 0.004, frame, 0.022, recycledPine, cxDoor, fy0 + frame / 2, dz, 0.002, "x"),
    );
    g.add(
      board(
        frame,
        fy1 - fy0 - 2 * frame,
        0.022,
        recycledPine,
        x0 + frame / 2,
        (fy0 + fy1) / 2,
        dz,
        0.002,
        "y",
      ),
    );
    g.add(
      board(
        frame,
        fy1 - fy0 - 2 * frame,
        0.022,
        recycledPine,
        x1 - frame / 2,
        (fy0 + fy1) / 2,
        dz,
        0.002,
        "y",
      ),
    );
    const lx0 = x0 + frame;
    const lx1 = x1 - frame;
    const ly0 = fy0 + frame;
    const ly1 = fy1 - frame;
    g.add(board(lx1 - lx0, ly1 - ly0, 0.01, darkGap, cxDoor, (ly0 + ly1) / 2, dz - 0.008, 0.001));
    const cols = 5;
    const rows = Math.round((ly1 - ly0) / ((lx1 - lx0) / cols));
    const cw = (lx1 - lx0) / cols;
    const ch = (ly1 - ly0) / rows;
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        // basket weave: every cell holds a slat, alternating horizontal /
        // vertical, a little short of the cell so dark squares show between
        const horizontal = (i + j) % 2 === 0;
        const depth = horizontal ? 0.004 : 0; // the weave goes over / under
        g.add(
          board(
            cw * (horizontal ? 0.94 : 0.56),
            ch * (horizontal ? 0.56 : 0.94),
            0.014,
            recycledPine,
            lx0 + cw * (i + 0.5),
            ly0 + ch * (j + 0.5),
            dz + 0.002 + depth,
            0.002,
            horizontal ? "x" : "y",
          ),
        );
      }
    }
  }
  // splayed legs
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const topAt = v(sx * (w / 2 - 0.09), legH + 0.01, sz * (bodyD / 2 - 0.05));
      // lifted a little: the tilted leg's corners then stop at the floor
      const foot = v(sx * (w / 2 - 0.045), 0.007, sz * (bodyD / 2 - 0.03));
      g.add(bar(foot, topAt, 0.04, 0.04, recycledPine, 0.004));
    }
  }
  return g;
}

/**
 * NORWAY: solid oiled oak, square corner posts as legs, three drawers with
 * black iron cup pulls over three framed doors with latch handles, pegged
 * joints. L 150 × P 50 × H 88 cm.
 */
export function norwaySideboard(p: Product, tv = false): THREE.Group {
  const g = new THREE.Group();
  const { w, d, h } = p;
  const post = 0.065;
  const top = 0.035;
  const bottom = 0.09; // underside of the carcass
  g.add(board(w, top, d, oiledOak, 0, h - top / 2, 0, 0.004, "x"));
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      g.add(
        board(
          post,
          h - top,
          post,
          oiledOak,
          sx * (w / 2 - post / 2),
          (h - top) / 2,
          sz * (d / 2 - post / 2),
          0.004,
          "y",
        ),
      );
    }
    // side panel between the posts
    g.add(
      board(
        0.02,
        h - top - bottom - 0.02,
        d - 2 * post,
        oiledOak,
        sx * (w / 2 - post / 2),
        (h - top + bottom) / 2,
        0,
        0.002,
        "y",
      ),
    );
  }
  const inner = w - 2 * post;
  const front = d / 2 - 0.034; // pulls and latches stay within the depth
  const y0 = bottom;
  const y1 = h - top;
  // bottom rail and back
  g.add(board(inner, 0.05, 0.025, oiledOak, 0, y0 + 0.025, front - 0.005, 0.002, "x"));
  g.add(board(inner, y1 - y0, 0.012, oiledOak, 0, (y0 + y1) / 2, -d / 2 + 0.03, 0.001, "x"));
  g.add(board(inner, 0.02, d - 0.05, oiledOak, 0, y0 + 0.01, 0, 0.001, "x"));
  const drawerH = 0.14;
  if (tv) {
    // TV unit: three drawers at the bottom, an open niche above them
    const col = inner / 3;
    const dy = y0 + 0.05 + drawerH / 2 + 0.004;
    for (let i = 0; i < 3; i++) {
      const x = -inner / 2 + col * (i + 0.5);
      g.add(board(col - 0.008, drawerH - 0.008, 0.022, oiledOak, x, dy, front, 0.002, "x"));
      g.add(board(0.07, 0.025, 0.012, agedBlack, x, dy, front + 0.016, 0.004));
      g.add(board(0.05, 0.006, 0.014, darkGap, x, dy - 0.01, front + 0.017, 0.001));
    }
    // niche floor over the drawers
    g.add(board(inner, 0.02, d - 0.05, oiledOak, 0, y0 + 0.05 + drawerH + 0.02, 0, 0.002, "x"));
  }
  const doorTop = y1 - drawerH - 0.012;
  const doorBottom = y0 + 0.05;
  const col = inner / 3;
  for (let i = 0; i < (tv ? 0 : 3); i++) {
    const x = -inner / 2 + col * (i + 0.5);
    // drawer front + cup pull
    g.add(
      board(
        col - 0.008,
        drawerH - 0.008,
        0.022,
        oiledOak,
        x,
        y1 - drawerH / 2 - 0.006,
        front,
        0.002,
        "x",
      ),
    );
    g.add(board(0.07, 0.025, 0.012, agedBlack, x, y1 - drawerH / 2 - 0.006, front + 0.016, 0.004));
    g.add(board(0.05, 0.006, 0.014, darkGap, x, y1 - drawerH / 2 - 0.016, front + 0.017, 0.001));
    // framed door: four rails + a recessed raised panel, latch handle
    const dw = col - 0.008;
    const dh = doorTop - doorBottom;
    const dy = (doorTop + doorBottom) / 2;
    const rail = 0.05;
    g.add(board(dw, rail, 0.022, oiledOak, x, doorTop - rail / 2, front, 0.002, "x"));
    g.add(board(dw, rail, 0.022, oiledOak, x, doorBottom + rail / 2, front, 0.002, "x"));
    g.add(
      board(rail, dh - 2 * rail, 0.022, oiledOak, x - dw / 2 + rail / 2, dy, front, 0.002, "y"),
    );
    g.add(
      board(rail, dh - 2 * rail, 0.022, oiledOak, x + dw / 2 - rail / 2, dy, front, 0.002, "y"),
    );
    g.add(
      board(
        dw - 2 * rail + 0.004,
        dh - 2 * rail + 0.004,
        0.016,
        oiledOak,
        x,
        dy,
        front - 0.004,
        0.006,
        "y",
      ),
    );
    const side = i === 1 ? -1 : i === 0 ? 1 : -1; // handles near the meeting stiles
    g.add(
      board(
        0.012,
        0.06,
        0.012,
        agedBlack,
        x + side * (dw / 2 - 0.035),
        dy + 0.05,
        front + 0.016,
        0.003,
      ),
    );
  }
  // pegs at the post joints
  for (const sx of [-1, 1]) {
    for (const y of [y1 - 0.03, y0 + 0.03]) {
      const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.004, 10), darkScrew);
      peg.rotation.x = Math.PI / 2;
      peg.position.set(sx * (w / 2 - post / 2), y, d / 2 + 0.0005);
      g.add(peg);
    }
  }
  return g;
}

export const SIDEBOARD_BUILDERS: Record<string, (p: Product) => THREE.Group> = {
  "sideboard-biwa": (p) => biwa(p),
  "sideboard-norway": (p) => norwaySideboard(p),
  "tv-biwa": (p) => biwa(p, "niches"),
  "tv-norway": (p) => norwaySideboard(p, true),
};
